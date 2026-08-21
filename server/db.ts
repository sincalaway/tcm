import { and, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  aiStudyConversations,
  aiStudyMessages,
  aiStudySummaries,
  classicPassages,
  classicPassageVersions,
  classicChapters,
  classics,
  contentSources,
  learningGoals,
  knowledgeDocuments,
  formulaPassageMappings,
  formulas,
  herbs,
  InsertUser,
  learningPathProgress,
  readingProgress,
  reviewReminderEvents,
  reviewReminders,
  savedItems,
  studyNotes,
  users,
} from "../drizzle/schema";
import { chapterSeed, classicSeed, formulaPassageSeed, formulaSeed, herbSeed, passageVersionSeed, shangHanPassageSeed, sourceSeed } from "./catalogSeed";
import { ENV } from "./_core/env";
import { storageGetSignedUrl, storagePut } from "./storage";
import { extractText } from "unpdf";
import { searchFormulaStudyRecords, type FormulaStudyMatchMode } from "./formulaStudySearch";
import type { PassageLearningRecord } from "./passageLearningMatch";
import type { PassageMatrixRecord } from "@shared/passageComparisonMatrix";

export type ResourceType = "herb" | "formula" | "classic" | "chapter";
const KNOWLEDGE_ALLOWED_TYPES = new Set(["text/plain", "text/markdown", "application/pdf"]);
const KNOWLEDGE_MAX_BYTES = 5 * 1024 * 1024;
const KNOWLEDGE_MAX_TEXT_BYTES = 12 * 1024 * 1024;

let _db: ReturnType<typeof drizzle> | null = null;
let seedPromise: Promise<void> | null = null;
let catalogFiltersCache: { expiresAt: number; value: Awaited<ReturnType<typeof buildCatalogFilters>> } | null = null;
type WikisourceSearchResult = { pageId: number; title: string; timestamp: string; snippet: string; sourceUrl: string };
const wikisourceSearchCache = new Map<string, { expiresAt: number; results: WikisourceSearchResult[] }>();

/**
 * Recovers the two schema batches that can be left incomplete if a serverless
 * build ends while Drizzle is applying DDL. Every statement is idempotent and
 * creates structure only; it never deletes or mutates user-owned records.
 */
export const CATALOG_SCHEMA_RECOVERY_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS \`ai_study_summaries\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`conversationId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`content\` text NOT NULL,
    \`sourceMessageCount\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`ai_study_summaries_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`ai_study_summary_conversation_unique\` UNIQUE(\`conversationId\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`knowledge_documents\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`title\` varchar(255) NOT NULL,
    \`mimeType\` varchar(128) NOT NULL,
    \`sizeBytes\` int NOT NULL,
    \`storageKey\` varchar(768) NOT NULL,
    \`storageUrl\` varchar(1024) NOT NULL,
    \`textPreview\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`knowledge_documents_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`knowledge_documents_storageKey_unique\` UNIQUE(\`storageKey\`)
  )`,
  "ALTER TABLE `knowledge_documents` ADD COLUMN IF NOT EXISTS `textContent` mediumtext",
  "CREATE INDEX IF NOT EXISTS `ai_study_summaries_user_idx` ON `ai_study_summaries` (`userId`, `updatedAt`)",
  "CREATE INDEX IF NOT EXISTS `knowledge_documents_user_idx` ON `knowledge_documents` (`userId`, `updatedAt`)",
  "CREATE INDEX IF NOT EXISTS `knowledge_documents_title_idx` ON `knowledge_documents` (`userId`, `title`)",
  `CREATE TABLE IF NOT EXISTS \`classic_passage_versions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`passageId\` int NOT NULL,
    \`editionLabel\` varchar(255) NOT NULL,
    \`text\` text NOT NULL,
    \`variantNote\` text,
    \`verificationStatus\` enum('verified','pending','reference_only') NOT NULL DEFAULT 'pending',
    \`sourceReference\` varchar(255) NOT NULL,
    \`sourceUrl\` varchar(1024) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`classic_passage_versions_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`classic_passage_version_unique\` UNIQUE(\`passageId\`, \`editionLabel\`)
  )`,
  "CREATE INDEX IF NOT EXISTS `classic_passage_versions_passage_idx` ON `classic_passage_versions` (`passageId`)",
  "CREATE INDEX IF NOT EXISTS `classic_passage_versions_status_idx` ON `classic_passage_versions` (`verificationStatus`)",
] as const;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const connectionString = process.env.DATABASE_URL;
      const hostname = new URL(connectionString).hostname;

      // TiDB Cloud Serverless rejects unencrypted connections. Configure TLS in
      // code rather than relying on a URL query parameter so the same secret can
      // safely be used by Vercel's serverless runtime and local tooling.
      if (hostname.endsWith(".tidbcloud.com")) {
        _db = drizzle({
          connection: {
            uri: connectionString,
            ssl: { rejectUnauthorized: true },
          },
        });
      } else {
        _db = drizzle(connectionString);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

/** Idempotently loads the source-backed starter catalog after a fresh deployment. */
export async function ensureCatalogSeed() {
  if (!seedPromise) seedPromise = seedCatalog();
  await seedPromise;
}

async function seedCatalog() {
  const db = await getDb();
  if (!db) return;
  for (const statement of CATALOG_SCHEMA_RECOVERY_STATEMENTS) {
    await db.execute(sql.raw(statement));
  }
  // 首次部署时采用批量写入；后续请求走唯一键的轻量 no-op，不再产生数十次串行往返。
  await db.insert(contentSources).values(sourceSeed).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const allSources = await db.select().from(contentSources);
  const sourceIds = new Map(allSources.map((source) => [source.slug, source.id]));
  const pharmacopoeiaId = sourceIds.get("chinese-pharmacopoeia");
  const wikisourceId = sourceIds.get("zh-wikisource");
  const chineseTextProjectId = sourceIds.get("chinese-text-project");
  await db.insert(herbs).values(herbSeed.map(([slug, name, pinyin, aliases, category, nature, taste, meridians, medicinalPart, traditionalIndex, learningNote]) => ({ slug, name, pinyin, aliases, category, nature, taste, meridians, medicinalPart, traditionalIndex, learningNote, sourceId: pharmacopoeiaId, sourceUrl: "https://ydz.chp.org.cn/" }))).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  await db.insert(formulas).values(formulaSeed.map(([slug, name, aliases, sourceTitle, sourceExcerpt, ingredients, structuralNote, studyIndex, sourceUrl]) => ({ slug, name, aliases, sourceTitle, sourceExcerpt, ingredients: JSON.stringify(ingredients), structuralNote, studyIndex, sourceId: sourceUrl.includes("ctext.org") ? chineseTextProjectId : wikisourceId, sourceUrl }))).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  await db.insert(classics).values(classicSeed.map(([slug, title, era, author, category, summary, sourceUrl]) => ({ slug, title, era, author, category, summary, sourceId: wikisourceId, sourceUrl }))).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const allClassics = await db.select().from(classics);
  const classicIds = new Map(allClassics.map((classic) => [classic.slug, classic.id]));
  const chapterRows = chapterSeed.flatMap(([classicSlug, sequence, title, excerpt, sourceUrl]) => {
    const classicId = classicIds.get(classicSlug);
    return classicId ? [{ classicId, sequence, title, excerpt, sourceUrl }] : [];
  });
  if (chapterRows.length) await db.insert(classicChapters).values(chapterRows).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const allChapters = await db.select().from(classicChapters);
  const shangHanId = classicIds.get("shang-han-lun");
  const shangHanChapterIds = new Map(allChapters.filter((chapter) => chapter.classicId === shangHanId).map((chapter) => [chapter.title, chapter.id]));
  const passageRows = shangHanPassageSeed.flatMap(([chapterTitle, passageNumber, title, excerpt, keywords, sourceReference, sourceUrl]) => {
    const chapterId = shangHanChapterIds.get(chapterTitle);
    return shangHanId && chapterId ? [{ classicId: shangHanId, chapterId, passageNumber, title, excerpt, keywords, sourceReference: `《伤寒论》·${chapterTitle}·第${passageNumber}条`, sourceUrl }] : [];
  });
  if (passageRows.length) await db.insert(classicPassages).values(passageRows).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const [allPassages, allFormulas] = await Promise.all([db.select().from(classicPassages), db.select().from(formulas)]);
  const formulaIds = new Map(allFormulas.map((formula) => [formula.slug, formula.id]));
  const passageIds = new Map(allPassages.map((passage) => [`${passage.chapterId}:${passage.passageNumber}`, passage.id]));
  const mappingRows = formulaPassageSeed.flatMap(([formulaSlug, chapterTitle, passageNumber, relationType, studyNote]) => {
    const formulaId = formulaIds.get(formulaSlug); const chapterId = shangHanChapterIds.get(chapterTitle);
    const passageId = chapterId ? passageIds.get(`${chapterId}:${passageNumber}`) : undefined;
    return formulaId && passageId ? [{ formulaId, passageId, relationType, studyNote }] : [];
  });
  if (mappingRows.length) await db.insert(formulaPassageMappings).values(mappingRows).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const versionRows = passageVersionSeed.flatMap(([chapterTitle, passageNumber, editionLabel, text, variantNote, verificationStatus, sourceReference, sourceUrl]) => {
    const chapterId = shangHanChapterIds.get(chapterTitle);
    const passageId = chapterId ? passageIds.get(`${chapterId}:${passageNumber}`) : undefined;
    return passageId ? [{ passageId, editionLabel, text, variantNote, verificationStatus, sourceReference, sourceUrl }] : [];
  });
  if (versionRows.length) await db.insert(classicPassageVersions).values(versionRows).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
}

function includesQuery(query: string, columns: Parameters<typeof or>[0][]) {
  const pattern = `%${query}%`;
  return or(...columns.map((column) => like(column as never, pattern)));
}

export async function getCatalogFilters() {
  await ensureCatalogSeed();
  if (catalogFiltersCache && catalogFiltersCache.expiresAt > Date.now()) return catalogFiltersCache.value;
  const value = await buildCatalogFilters();
  catalogFiltersCache = { value, expiresAt: Date.now() + 5 * 60 * 1000 };
  return value;
}

async function buildCatalogFilters() {
  const db = await getDb();
  if (!db) return { herbCategories: [], natures: [], meridians: [], formulaSources: [], classicCategories: [] };
  const [herbRows, formulaRows, classicRows] = await Promise.all([db.select({ category: herbs.category, nature: herbs.nature, meridians: herbs.meridians }).from(herbs), db.select({ sourceTitle: formulas.sourceTitle }).from(formulas), db.select({ category: classics.category }).from(classics)]);
  return {
    herbCategories: Array.from(new Set(herbRows.map((row) => row.category).filter(Boolean))) as string[],
    natures: Array.from(new Set(herbRows.map((row) => row.nature).filter(Boolean))) as string[],
    meridians: Array.from(new Set(herbRows.flatMap((row) => row.meridians?.split("、") ?? []))),
    formulaSources: Array.from(new Set(formulaRows.map((row) => row.sourceTitle))),
    classicCategories: Array.from(new Set(classicRows.map((row) => row.category).filter(Boolean))) as string[],
  };
}

export async function getHerbs(input: { query?: string; category?: string; nature?: string; meridian?: string }) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (input.query) conditions.push(includesQuery(input.query, [herbs.name, herbs.pinyin, herbs.aliases, herbs.traditionalIndex, herbs.meridians]));
  if (input.category) conditions.push(eq(herbs.category, input.category));
  if (input.nature) conditions.push(eq(herbs.nature, input.nature));
  if (input.meridian) conditions.push(like(herbs.meridians, `%${input.meridian}%`));
  return db.select().from(herbs).where(conditions.length ? and(...conditions) : undefined).orderBy(herbs.name);
}

export async function getFormulas(input: { query?: string; sourceTitle?: string }) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (input.query) conditions.push(includesQuery(input.query, [formulas.name, formulas.aliases, formulas.sourceTitle, formulas.studyIndex, formulas.ingredients]));
  if (input.sourceTitle) conditions.push(eq(formulas.sourceTitle, input.sourceTitle));
  return db.select().from(formulas).where(conditions.length ? and(...conditions) : undefined).orderBy(formulas.name);
}

export async function getFormulaStudySearch(input: { query?: string; sourceTitle?: string; matchMode?: FormulaStudyMatchMode }) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const records = await db.select().from(formulas).orderBy(formulas.name);
  return searchFormulaStudyRecords(records, input);
}

export async function getClassics(input: { query?: string; category?: string }) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (input.query) conditions.push(includesQuery(input.query, [classics.title, classics.author, classics.category, classics.summary]));
  if (input.category) conditions.push(eq(classics.category, input.category));
  return db.select().from(classics).where(conditions.length ? and(...conditions) : undefined).orderBy(classics.title);
}

export async function getClassicChapters(classicId: number) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classicChapters).where(eq(classicChapters.classicId, classicId)).orderBy(classicChapters.sequence);
}

export async function getClassicPassages(chapterId: number) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classicPassages).where(eq(classicPassages.chapterId, chapterId)).orderBy(classicPassages.passageNumber);
}

export async function getShangHanPassageLearningIndex(): Promise<PassageLearningRecord[]> {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: classicPassages.id,
    chapterId: classicPassages.chapterId,
    chapterTitle: classicChapters.title,
    passageNumber: classicPassages.passageNumber,
    title: classicPassages.title,
    excerpt: classicPassages.excerpt,
    keywords: classicPassages.keywords,
    sourceReference: classicPassages.sourceReference,
    sourceUrl: classicPassages.sourceUrl,
  }).from(classicPassages)
    .innerJoin(classicChapters, eq(classicPassages.chapterId, classicChapters.id))
    .innerJoin(classics, eq(classicPassages.classicId, classics.id))
    .where(eq(classics.slug, "shang-han-lun"))
    .orderBy(classicChapters.sequence, classicPassages.passageNumber);
}

export async function getShangHanPassageMatrixRecords(passageIds: number[]): Promise<PassageMatrixRecord[]> {
  const uniqueIds = Array.from(new Set(passageIds)).slice(0, 4);
  if (!uniqueIds.length) return [];
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const records = await db.select({
    id: classicPassages.id,
    chapterTitle: classicChapters.title,
    passageNumber: classicPassages.passageNumber,
    title: classicPassages.title,
    excerpt: classicPassages.excerpt,
    keywords: classicPassages.keywords,
    sourceReference: classicPassages.sourceReference,
    sourceUrl: classicPassages.sourceUrl,
  }).from(classicPassages)
    .innerJoin(classicChapters, eq(classicPassages.chapterId, classicChapters.id))
    .innerJoin(classics, eq(classicPassages.classicId, classics.id))
    .where(and(eq(classics.slug, "shang-han-lun"), inArray(classicPassages.id, uniqueIds)));
  if (!records.length) return [];
  const validIds = records.map(record => record.id);
  const [formulaRows, versionRows] = await Promise.all([
    db.select({
      passageId: formulaPassageMappings.passageId,
      id: formulas.id,
      name: formulas.name,
      slug: formulas.slug,
      relationType: formulaPassageMappings.relationType,
      studyNote: formulaPassageMappings.studyNote,
    }).from(formulaPassageMappings).innerJoin(formulas, eq(formulaPassageMappings.formulaId, formulas.id)).where(inArray(formulaPassageMappings.passageId, validIds)),
    db.select({
      passageId: classicPassageVersions.passageId,
      editionLabel: classicPassageVersions.editionLabel,
      sourceReference: classicPassageVersions.sourceReference,
      sourceUrl: classicPassageVersions.sourceUrl,
    }).from(classicPassageVersions).where(inArray(classicPassageVersions.passageId, validIds)).orderBy(classicPassageVersions.editionLabel),
  ]);
  const formulaByPassage = new Map<number, PassageMatrixRecord["formulas"]>();
  formulaRows.forEach(row => formulaByPassage.set(row.passageId, [...(formulaByPassage.get(row.passageId) ?? []), { id: row.id, name: row.name, slug: row.slug, relationType: row.relationType, studyNote: row.studyNote }]));
  const versionByPassage = new Map<number, PassageMatrixRecord["versions"]>();
  versionRows.forEach(row => versionByPassage.set(row.passageId, [...(versionByPassage.get(row.passageId) ?? []), { editionLabel: row.editionLabel, sourceReference: row.sourceReference, sourceUrl: row.sourceUrl }]));
  const byId = new Map(records.map(record => [record.id, record]));
  return uniqueIds.flatMap(id => {
    const record = byId.get(id);
    return record ? [{ ...record, formulas: formulaByPassage.get(id) ?? [], versions: versionByPassage.get(id) ?? [] }] : [];
  });
}

export async function getPassageVersions(passageId: number) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classicPassageVersions)
    .where(eq(classicPassageVersions.passageId, passageId))
    .orderBy(classicPassageVersions.editionLabel);
}

export async function getFormulaPassages(formulaId: number) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db.select({
    relationType: formulaPassageMappings.relationType,
    studyNote: formulaPassageMappings.studyNote,
    id: classicPassages.id,
    chapterId: classicPassages.chapterId,
    passageNumber: classicPassages.passageNumber,
    title: classicPassages.title,
    excerpt: classicPassages.excerpt,
    keywords: classicPassages.keywords,
    sourceReference: classicPassages.sourceReference,
    sourceUrl: classicPassages.sourceUrl,
    chapterTitle: classicChapters.title,
  }).from(formulaPassageMappings)
    .innerJoin(classicPassages, eq(formulaPassageMappings.passageId, classicPassages.id))
    .innerJoin(classicChapters, eq(classicPassages.chapterId, classicChapters.id))
    .where(eq(formulaPassageMappings.formulaId, formulaId))
    .orderBy(formulaPassageMappings.relationType, classicPassages.passageNumber);
}

export async function getPassageFormulas(passageId: number) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db.select({
    relationType: formulaPassageMappings.relationType,
    studyNote: formulaPassageMappings.studyNote,
    id: formulas.id,
    slug: formulas.slug,
    name: formulas.name,
    sourceTitle: formulas.sourceTitle,
    sourceExcerpt: formulas.sourceExcerpt,
  }).from(formulaPassageMappings)
    .innerJoin(formulas, eq(formulaPassageMappings.formulaId, formulas.id))
    .where(eq(formulaPassageMappings.passageId, passageId))
    .orderBy(formulaPassageMappings.relationType, formulas.name);
}

export async function getLocalSearch(query: string) {
  const [herbResults, formulaResults, classicResults] = await Promise.all([getHerbs({ query }), getFormulas({ query }), getClassics({ query })]);
  return { herbs: herbResults.slice(0, 8), formulas: formulaResults.slice(0, 8), classics: classicResults.slice(0, 8) };
}

export async function searchWikisource(query: string) {
  const normalizedQuery = query.trim();
  const cached = wikisourceSearchCache.get(normalizedQuery);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  const endpoint = new URL("https://zh.wikisource.org/w/api.php");
  endpoint.searchParams.set("action", "query"); endpoint.searchParams.set("list", "search"); endpoint.searchParams.set("srsearch", normalizedQuery); endpoint.searchParams.set("srlimit", "8"); endpoint.searchParams.set("format", "json"); endpoint.searchParams.set("origin", "*");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(endpoint, { headers: { "User-Agent": "TCMClassicsLearningIndex/1.0 (public learning search)" }, signal: controller.signal });
    if (!response.ok) throw new Error("古籍公开检索暂时不可用，请稍后重试。");
    const payload = await response.json() as { query?: { search?: Array<{ pageid: number; title: string; timestamp: string; snippet: string }> } };
    const results = (payload.query?.search ?? []).map((item) => ({ pageId: item.pageid, title: item.title, timestamp: item.timestamp, snippet: item.snippet.replace(/<[^>]*>/g, "").replace(/&quot;/g, "\"").replace(/&amp;/g, "&"), sourceUrl: `https://zh.wikisource.org/wiki/${encodeURIComponent(item.title)}` }));
    wikisourceSearchCache.set(normalizedQuery, { results, expiresAt: Date.now() + 10 * 60 * 1000 });
    return results;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("公开原文检索响应较慢，请稍后重试。");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listSavedItems(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(savedItems).where(eq(savedItems.userId, userId)).orderBy(desc(savedItems.createdAt));
}

export async function toggleSavedItem(userId: number, input: { resourceType: ResourceType; resourceId: number }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const found = await db.select().from(savedItems).where(and(eq(savedItems.userId, userId), eq(savedItems.resourceType, input.resourceType), eq(savedItems.resourceId, input.resourceId))).limit(1);
  if (found[0]) { await db.delete(savedItems).where(eq(savedItems.id, found[0].id)); return { saved: false }; }
  await db.insert(savedItems).values({ userId, resourceType: input.resourceType, resourceId: input.resourceId }); return { saved: true };
}

export async function listStudyNotes(userId: number, resource?: Partial<{ resourceType: ResourceType; resourceId: number }>) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(studyNotes.userId, userId)];
  if (resource?.resourceType) conditions.push(eq(studyNotes.resourceType, resource.resourceType));
  if (resource?.resourceId) conditions.push(eq(studyNotes.resourceId, resource.resourceId));
  return db.select().from(studyNotes).where(and(...conditions)).orderBy(desc(studyNotes.updatedAt));
}

export async function createStudyNote(userId: number, input: { resourceType: ResourceType; resourceId: number; title: string; body: string }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const result = await db.insert(studyNotes).values({ userId, ...input }); return { id: Number(result[0].insertId) };
}

export async function updateStudyNote(userId: number, input: { id: number; title: string; body: string }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.update(studyNotes).set({ title: input.title, body: input.body }).where(and(eq(studyNotes.id, input.id), eq(studyNotes.userId, userId))); return { success: true };
}

export async function deleteStudyNote(userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.delete(studyNotes).where(and(eq(studyNotes.id, id), eq(studyNotes.userId, userId))); return { success: true };
}

export async function setReadingProgress(userId: number, input: { classicId: number; chapterId?: number | null; progressPercent: number }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const now = new Date();
  await db.insert(readingProgress).values({ userId, classicId: input.classicId, chapterId: input.chapterId ?? null, progressPercent: input.progressPercent, lastReadAt: now }).onDuplicateKeyUpdate({ set: { chapterId: input.chapterId ?? null, progressPercent: input.progressPercent, lastReadAt: now } });
  return { success: true };
}

export async function getLearningOverview(userId: number) {
  const db = await getDb();
  if (!db) return { savedCount: 0, noteCount: 0, readingCount: 0, averageReadingProgress: 0, completedPathCount: 0, paths: [] as Array<{ pathSlug: string; completedSteps: number[] }> };
  const [savedRows, noteRows, progressRows, pathRows] = await Promise.all([
    db.select({ id: savedItems.id }).from(savedItems).where(eq(savedItems.userId, userId)),
    db.select({ id: studyNotes.id }).from(studyNotes).where(eq(studyNotes.userId, userId)),
    db.select({ progressPercent: readingProgress.progressPercent }).from(readingProgress).where(eq(readingProgress.userId, userId)),
    db.select({ pathSlug: learningPathProgress.pathSlug, completedSteps: learningPathProgress.completedSteps }).from(learningPathProgress).where(eq(learningPathProgress.userId, userId)),
  ]);
  const paths = pathRows.map((row) => ({ pathSlug: row.pathSlug, completedSteps: parseCompletedSteps(row.completedSteps) }));
  return {
    savedCount: savedRows.length,
    noteCount: noteRows.length,
    readingCount: progressRows.length,
    averageReadingProgress: progressRows.length ? Math.round(progressRows.reduce((sum, item) => sum + item.progressPercent, 0) / progressRows.length) : 0,
    completedPathCount: paths.filter((path) => path.completedSteps.length >= 3).length,
    paths,
  };
}

export async function toggleLearningPathStep(userId: number, input: { pathSlug: string; step: number }) {
  const db = await getDb();
  if (!db) throw new Error("数据库暂不可用");
  const found = await db.select().from(learningPathProgress).where(and(eq(learningPathProgress.userId, userId), eq(learningPathProgress.pathSlug, input.pathSlug))).limit(1);
  const completedSteps = parseCompletedSteps(found[0]?.completedSteps).filter((step) => step >= 1 && step <= 3);
  const next = completedSteps.includes(input.step) ? completedSteps.filter((step) => step !== input.step) : [...completedSteps, input.step].sort((a, b) => a - b);
  await db.insert(learningPathProgress).values({ userId, pathSlug: input.pathSlug, completedSteps: JSON.stringify(next) }).onDuplicateKeyUpdate({ set: { completedSteps: JSON.stringify(next), updatedAt: new Date() } });
  return { completedSteps: next };
}

function parseCompletedSteps(value: string | null | undefined) {
  try { const parsed = JSON.parse(value ?? "[]"); return Array.isArray(parsed) ? parsed.filter((item): item is number => Number.isInteger(item)) : []; } catch { return []; }
}

export type GoalMetric = "path_steps" | "reading_entries" | "study_notes";

export async function getGoalMetricCount(userId: number, metric: GoalMetric) {
  const db = await getDb();
  if (!db) return 0;
  if (metric === "path_steps") {
    const rows = await db.select({ completedSteps: learningPathProgress.completedSteps }).from(learningPathProgress).where(eq(learningPathProgress.userId, userId));
    return rows.reduce((total, row) => total + parseCompletedSteps(row.completedSteps).length, 0);
  }
  if (metric === "reading_entries") {
    const rows = await db.select({ id: readingProgress.id }).from(readingProgress).where(eq(readingProgress.userId, userId));
    return rows.length;
  }
  const rows = await db.select({ id: studyNotes.id }).from(studyNotes).where(eq(studyNotes.userId, userId));
  return rows.length;
}

export async function listLearningGoals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const goals = await db.select().from(learningGoals).where(eq(learningGoals.userId, userId)).orderBy(desc(learningGoals.updatedAt));
  const counts = new Map<GoalMetric, number>();
  await Promise.all((["path_steps", "reading_entries", "study_notes"] as GoalMetric[]).map(async (metric) => counts.set(metric, await getGoalMetricCount(userId, metric))));
  return goals.map((goal) => {
    const currentCount = counts.get(goal.metric) ?? 0;
    return { ...goal, currentCount, completed: currentCount >= goal.targetCount };
  });
}

export async function createLearningGoal(userId: number, input: { title: string; metric: GoalMetric; targetCount: number; deadlineAt?: Date | null }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const result = await db.insert(learningGoals).values({ userId, ...input, deadlineAt: input.deadlineAt ?? null });
  return { id: Number(result[0].insertId) };
}

export async function archiveLearningGoal(userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.update(learningGoals).set({ status: "archived" }).where(and(eq(learningGoals.id, id), eq(learningGoals.userId, userId)));
  return { success: true };
}

export async function updateLearningGoal(userId: number, id: number, input: { title: string; metric: GoalMetric; targetCount: number; deadlineAt?: Date | null }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.update(learningGoals).set({ title: input.title, metric: input.metric, targetCount: input.targetCount, deadlineAt: input.deadlineAt ?? null, status: "active" }).where(and(eq(learningGoals.id, id), eq(learningGoals.userId, userId)));
  return { success: true };
}

function calculateNextReviewAt(intervalDays: number, hourUtc: number, from = new Date()) {
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(hourUtc);
  if (next <= from) next.setUTCDate(next.getUTCDate() + intervalDays);
  return next;
}

export async function createReviewReminder(userId: number, input: { goalId?: number | null; title: string; intervalDays: number; hourUtc: number }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  if (input.goalId) {
    const goal = await db.select({ id: learningGoals.id }).from(learningGoals).where(and(eq(learningGoals.id, input.goalId), eq(learningGoals.userId, userId))).limit(1);
    if (!goal[0]) throw new Error("所选学习目标不存在或无权访问");
  }
  const result = await db.insert(reviewReminders).values({ userId, goalId: input.goalId ?? null, title: input.title, intervalDays: input.intervalDays, hourUtc: input.hourUtc, nextReviewAt: calculateNextReviewAt(input.intervalDays, input.hourUtc) });
  return { id: Number(result[0].insertId) };
}

export async function attachReviewReminderSchedule(userId: number, reminderId: number, taskUid: string) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.update(reviewReminders).set({ scheduleCronTaskUid: taskUid }).where(and(eq(reviewReminders.id, reminderId), eq(reviewReminders.userId, userId)));
}

export async function getReviewReminder(userId: number, id: number) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(reviewReminders).where(and(eq(reviewReminders.id, id), eq(reviewReminders.userId, userId))).limit(1);
  return rows[0];
}

export async function listReviewReminders(userId: number) {
  const db = await getDb(); if (!db) return { reminders: [], pending: [] };
  const [reminders, pending] = await Promise.all([
    db.select({ id: reviewReminders.id, userId: reviewReminders.userId, goalId: reviewReminders.goalId, title: reviewReminders.title, intervalDays: reviewReminders.intervalDays, hourUtc: reviewReminders.hourUtc, enabled: reviewReminders.enabled, scheduleCronTaskUid: reviewReminders.scheduleCronTaskUid, nextReviewAt: reviewReminders.nextReviewAt, lastTriggeredAt: reviewReminders.lastTriggeredAt, createdAt: reviewReminders.createdAt, updatedAt: reviewReminders.updatedAt, goalTitle: learningGoals.title }).from(reviewReminders).leftJoin(learningGoals, eq(reviewReminders.goalId, learningGoals.id)).where(eq(reviewReminders.userId, userId)).orderBy(desc(reviewReminders.updatedAt)),
    db.select({ id: reviewReminderEvents.id, reminderId: reviewReminderEvents.reminderId, dueAt: reviewReminderEvents.dueAt, title: reviewReminders.title, goalTitle: learningGoals.title }).from(reviewReminderEvents).innerJoin(reviewReminders, eq(reviewReminderEvents.reminderId, reviewReminders.id)).leftJoin(learningGoals, eq(reviewReminders.goalId, learningGoals.id)).where(and(eq(reviewReminderEvents.userId, userId), isNull(reviewReminderEvents.seenAt))).orderBy(desc(reviewReminderEvents.dueAt)),
  ]);
  return { reminders, pending };
}

export async function listReviewNotifications(userId: number, input: { status?: "all" | "unread" | "read"; from?: Date; to?: Date }) {
  const db = await getDb(); if (!db) return [];
  const events = await db.select({
    id: reviewReminderEvents.id,
    reminderId: reviewReminderEvents.reminderId,
    dueAt: reviewReminderEvents.dueAt,
    seenAt: reviewReminderEvents.seenAt,
    createdAt: reviewReminderEvents.createdAt,
    title: reviewReminders.title,
    goalTitle: learningGoals.title,
  }).from(reviewReminderEvents)
    .innerJoin(reviewReminders, eq(reviewReminderEvents.reminderId, reviewReminders.id))
    .leftJoin(learningGoals, eq(reviewReminders.goalId, learningGoals.id))
    .where(eq(reviewReminderEvents.userId, userId))
    .orderBy(desc(reviewReminderEvents.dueAt));
  return events.filter((event) => {
    if (input.status === "unread" && event.seenAt) return false;
    if (input.status === "read" && !event.seenAt) return false;
    if (input.from && event.dueAt < input.from) return false;
    if (input.to && event.dueAt > input.to) return false;
    return true;
  });
}

export async function updateReviewReminder(userId: number, id: number, input: { title: string; intervalDays: number; hourUtc: number; enabled: boolean }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const existing = await getReviewReminder(userId, id); if (!existing) throw new Error("复习提醒不存在或无权访问");
  const nextReviewAt = input.enabled ? calculateNextReviewAt(input.intervalDays, input.hourUtc) : existing.nextReviewAt;
  await db.update(reviewReminders).set({ title: input.title, intervalDays: input.intervalDays, hourUtc: input.hourUtc, enabled: input.enabled ? 1 : 0, nextReviewAt }).where(eq(reviewReminders.id, id));
  return { ...existing, ...input, enabled: input.enabled ? 1 : 0, nextReviewAt };
}

export async function deleteReviewReminder(userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.delete(reviewReminderEvents).where(and(eq(reviewReminderEvents.reminderId, id), eq(reviewReminderEvents.userId, userId)));
  await db.delete(reviewReminders).where(and(eq(reviewReminders.id, id), eq(reviewReminders.userId, userId)));
  return { success: true };
}

export async function markReviewReminderSeen(userId: number, eventId: number) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.update(reviewReminderEvents).set({ seenAt: new Date() }).where(and(eq(reviewReminderEvents.id, eventId), eq(reviewReminderEvents.userId, userId)));
  return { success: true };
}

export async function markAllReviewRemindersSeen(userId: number) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.update(reviewReminderEvents).set({ seenAt: new Date() }).where(and(eq(reviewReminderEvents.userId, userId), isNull(reviewReminderEvents.seenAt)));
  return { success: true };
}

export async function deleteReviewNotifications(userId: number, eventIds: number[]) {
  const uniqueIds = Array.from(new Set(eventIds));
  if (!uniqueIds.length) return { success: true, deleted: 0 };
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.delete(reviewReminderEvents).where(and(eq(reviewReminderEvents.userId, userId), inArray(reviewReminderEvents.id, uniqueIds)));
  return { success: true, deleted: uniqueIds.length };
}

export async function triggerReviewReminderByTaskUid(taskUid: string) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const rows = await db.select().from(reviewReminders).where(eq(reviewReminders.scheduleCronTaskUid, taskUid)).limit(1);
  const reminder = rows[0];
  if (!reminder) return { ok: true, skipped: "orphan" as const };
  if (!reminder.enabled) return { ok: true, skipped: "paused" as const };
  const now = new Date();
  if (reminder.nextReviewAt > now) return { ok: true, skipped: "not-due" as const };
  await db.insert(reviewReminderEvents).values({ reminderId: reminder.id, userId: reminder.userId, dueAt: reminder.nextReviewAt }).onDuplicateKeyUpdate({ set: { reminderId: reminder.id } });
  let nextReviewAt = new Date(reminder.nextReviewAt);
  do { nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + reminder.intervalDays); } while (nextReviewAt <= now);
  await db.update(reviewReminders).set({ lastTriggeredAt: now, nextReviewAt }).where(eq(reviewReminders.id, reminder.id));
  return { ok: true, reminderId: reminder.id, nextReviewAt };
}

export type AiConversationKind = "herb" | "formula" | "chapter";

export async function listAiStudyConversations(userId: number, context?: { kind: AiConversationKind; title: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(aiStudyConversations.userId, userId)];
  if (context) { conditions.push(eq(aiStudyConversations.contextKind, context.kind), eq(aiStudyConversations.contextTitle, context.title)); }
  return db.select().from(aiStudyConversations).where(and(...conditions)).orderBy(desc(aiStudyConversations.updatedAt)).limit(20);
}

export async function getAiStudyConversation(userId: number, id: number) {
  const db = await getDb(); if (!db) return undefined;
  const conversation = (await db.select().from(aiStudyConversations).where(and(eq(aiStudyConversations.id, id), eq(aiStudyConversations.userId, userId))).limit(1))[0];
  if (!conversation) return undefined;
  const [messages, summary] = await Promise.all([
    db.select().from(aiStudyMessages).where(eq(aiStudyMessages.conversationId, id)).orderBy(aiStudyMessages.createdAt),
    db.select().from(aiStudySummaries).where(and(eq(aiStudySummaries.conversationId, id), eq(aiStudySummaries.userId, userId))).limit(1),
  ]);
  return { conversation, messages, summary: summary[0] ?? null };
}

export async function createAiStudyConversation(userId: number, input: { title: string; contextKind: AiConversationKind; contextTitle: string }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const result = await db.insert(aiStudyConversations).values({ userId, ...input });
  return { id: Number(result[0].insertId) };
}

export async function appendAiStudyMessage(conversationId: number, role: "user" | "assistant", content: string) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  await db.insert(aiStudyMessages).values({ conversationId, role, content });
  await db.update(aiStudyConversations).set({ updatedAt: new Date() }).where(eq(aiStudyConversations.id, conversationId));
}

export async function getRecentAiStudyMessages(userId: number, conversationId: number, limit = 8) {
  const conversation = await getAiStudyConversation(userId, conversationId);
  if (!conversation) return undefined;
  return { conversation: conversation.conversation, messages: conversation.messages.slice(-limit), summary: conversation.summary };
}

export async function saveAiStudySummary(userId: number, conversationId: number, content: string, sourceMessageCount: number) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const conversation = await getAiStudyConversation(userId, conversationId); if (!conversation) throw new Error("对话不存在或无权访问");
  await db.insert(aiStudySummaries).values({ conversationId, userId, content, sourceMessageCount }).onDuplicateKeyUpdate({ set: { content, sourceMessageCount, updatedAt: new Date() } });
  return { conversationId, content, sourceMessageCount };
}

export async function searchAiStudyConversations(userId: number, query: string) {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalized) return [];
  const db = await getDb(); if (!db) return [];
  const conversations = await db.select().from(aiStudyConversations).where(eq(aiStudyConversations.userId, userId)).orderBy(desc(aiStudyConversations.updatedAt));
  const details = await Promise.all(conversations.map((conversation) => getAiStudyConversation(userId, conversation.id)));
  return details.flatMap((detail) => {
    if (!detail) return [];
    const candidates = [detail.conversation.title, detail.conversation.contextTitle, detail.summary?.content ?? "", ...detail.messages.map((message) => message.content)];
    const matched = candidates.find((text) => text.toLocaleLowerCase("zh-CN").includes(normalized));
    return matched ? [{ id: detail.conversation.id, title: detail.conversation.title, contextKind: detail.conversation.contextKind, contextTitle: detail.conversation.contextTitle, updatedAt: detail.conversation.updatedAt, matchedSnippet: matched.slice(0, 220), hasSummary: Boolean(detail.summary) }] : [];
  });
}

export async function deleteAiStudyConversation(userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const conversation = await getAiStudyConversation(userId, id); if (!conversation) throw new Error("对话不存在或无权访问");
  await db.delete(aiStudyMessages).where(eq(aiStudyMessages.conversationId, id));
  await db.delete(aiStudySummaries).where(and(eq(aiStudySummaries.conversationId, id), eq(aiStudySummaries.userId, userId)));
  await db.delete(aiStudyConversations).where(and(eq(aiStudyConversations.id, id), eq(aiStudyConversations.userId, userId)));
  return { success: true };
}

function normalizeKnowledgeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ");
  return normalized.slice(0, 180) || "knowledge-document";
}

export async function uploadKnowledgeDocument(userId: number, input: { fileName: string; mimeType: string; base64: string }) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  if (!KNOWLEDGE_ALLOWED_TYPES.has(input.mimeType)) throw new Error("仅支持 TXT、Markdown 或 PDF 文件");
  const buffer = Buffer.from(input.base64, "base64");
  if (!buffer.length || buffer.length > KNOWLEDGE_MAX_BYTES) throw new Error("文件必须小于或等于 5MB");
  const title = normalizeKnowledgeFileName(input.fileName);
  let textContent: string | null = null;
  if (input.mimeType === "text/plain" || input.mimeType === "text/markdown") textContent = buffer.toString("utf8");
  if (input.mimeType === "application/pdf") {
    try { const extracted = await extractText(new Uint8Array(buffer), { mergePages: true }); textContent = extracted.text.replace(/\s+/g, " ").trim() || null; } catch { textContent = null; }
  }
  if (textContent && Buffer.byteLength(textContent, "utf8") > KNOWLEDGE_MAX_TEXT_BYTES) throw new Error("文档可检索正文过长，请拆分后上传");
  const { key, url } = await storagePut(`knowledge/${userId}/${Date.now()}-${title}`, buffer, input.mimeType);
  const textPreview = textContent?.slice(0, 6000) || null;
  const result = await db.insert(knowledgeDocuments).values({ userId, title, mimeType: input.mimeType, sizeBytes: buffer.length, storageKey: key, storageUrl: url, textPreview, textContent });
  return { id: Number(result[0].insertId), title, mimeType: input.mimeType, sizeBytes: buffer.length };
}

export async function listKnowledgeDocuments(userId: number, query?: string) {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title, mimeType: knowledgeDocuments.mimeType, sizeBytes: knowledgeDocuments.sizeBytes, textPreview: knowledgeDocuments.textPreview, createdAt: knowledgeDocuments.createdAt, updatedAt: knowledgeDocuments.updatedAt }).from(knowledgeDocuments).where(eq(knowledgeDocuments.userId, userId)).orderBy(desc(knowledgeDocuments.updatedAt));
  const normalized = query?.trim().toLocaleLowerCase("zh-CN");
  return normalized ? rows.filter((row) => `${row.title}\n${row.textPreview ?? ""}`.toLocaleLowerCase("zh-CN").includes(normalized)) : rows;
}

function buildKnowledgeSearchHit(text: string, normalizedQuery: string) {
  const matchIndex = text.toLocaleLowerCase("zh-CN").indexOf(normalizedQuery);
  if (matchIndex < 0) return null;
  const excerptStart = Math.max(0, matchIndex - 96);
  const excerptEnd = Math.min(text.length, matchIndex + normalizedQuery.length + 220);
  const prefix = excerptStart > 0 ? "…" : "";
  const suffix = excerptEnd < text.length ? "…" : "";
  return { matchIndex, excerpt: `${prefix}${text.slice(excerptStart, excerptEnd)}${suffix}`, matchOffset: matchIndex - excerptStart + prefix.length, matchLength: normalizedQuery.length };
}

export async function searchKnowledgeDocuments(userId: number, query: string) {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalized) return [];
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title, mimeType: knowledgeDocuments.mimeType, textPreview: knowledgeDocuments.textPreview, textContent: knowledgeDocuments.textContent, updatedAt: knowledgeDocuments.updatedAt }).from(knowledgeDocuments).where(eq(knowledgeDocuments.userId, userId)).orderBy(desc(knowledgeDocuments.updatedAt));
  return rows.flatMap((row) => {
    const contentHit = buildKnowledgeSearchHit(row.textContent ?? row.textPreview ?? "", normalized);
    const titleHit = buildKnowledgeSearchHit(row.title, normalized);
    const hit = contentHit ?? titleHit;
    if (!hit) return [];
    return [{ id: row.id, title: row.title, mimeType: row.mimeType, updatedAt: row.updatedAt, excerpt: contentHit ? hit.excerpt : (row.textPreview?.slice(0, 320) || row.title), matchOffset: contentHit ? hit.matchOffset : 0, matchLength: contentHit ? hit.matchLength : 0, matchIndex: contentHit ? hit.matchIndex : 0, matchIn: contentHit ? "content" as const : "title" as const, isLegacyPreview: row.textContent === null }];
  });
}

export async function getKnowledgeDocumentCitations(userId: number, documentIds: number[]) {
  const db = await getDb(); if (!db || !documentIds.length) return [];
  const rows = await db.select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title, textPreview: knowledgeDocuments.textPreview }).from(knowledgeDocuments).where(eq(knowledgeDocuments.userId, userId));
  return rows.filter((row) => documentIds.includes(row.id) && row.textPreview).slice(0, 3).map((row) => ({ id: row.id, title: row.title, excerpt: row.textPreview!.slice(0, 2400) }));
}

export async function getKnowledgeDocumentDownload(userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  const row = (await db.select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title, storageKey: knowledgeDocuments.storageKey }).from(knowledgeDocuments).where(and(eq(knowledgeDocuments.id, id), eq(knowledgeDocuments.userId, userId))).limit(1))[0];
  if (!row) throw new Error("文档不存在或无权访问");
  return { id: row.id, title: row.title, storageUrl: await storageGetSignedUrl(row.storageKey) };
}

export async function deleteKnowledgeDocument(userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("数据库暂不可用");
  // 存储层不暴露删除端点；移除用户专属 key 和所有 UI 引用后，对象不再可寻址。
  await db.delete(knowledgeDocuments).where(and(eq(knowledgeDocuments.id, id), eq(knowledgeDocuments.userId, userId)));
  return { success: true };
}

export async function getStudyDesk(userId: number) {
  const db = await getDb();
  if (!db) return { saved: [], notes: [], progress: [] };
  const [savedRows, notes, progress] = await Promise.all([
    listSavedItems(userId),
    listStudyNotes(userId),
    db.select({
      id: readingProgress.id,
      classicId: readingProgress.classicId,
      chapterId: readingProgress.chapterId,
      progressPercent: readingProgress.progressPercent,
      lastReadAt: readingProgress.lastReadAt,
      classicTitle: classics.title,
      chapterTitle: classicChapters.title,
    }).from(readingProgress)
      .leftJoin(classics, eq(readingProgress.classicId, classics.id))
      .leftJoin(classicChapters, eq(readingProgress.chapterId, classicChapters.id))
      .where(eq(readingProgress.userId, userId))
      .orderBy(desc(readingProgress.lastReadAt)),
  ]);
  const saved = await Promise.all(savedRows.map(async (savedItem) => ({ ...savedItem, resource: await getStudyResource(db, savedItem.resourceType, savedItem.resourceId) })));
  return { saved, notes, progress };
}

async function getStudyResource(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, resourceType: ResourceType, resourceId: number) {
  if (resourceType === "herb") {
    const row = await db.select({ title: herbs.name, subtitle: herbs.category }).from(herbs).where(eq(herbs.id, resourceId)).limit(1);
    return row[0] ? { ...row[0], kind: "本草", href: `/bencao?q=${encodeURIComponent(row[0].title)}` } : null;
  }
  if (resourceType === "formula") {
    const row = await db.select({ title: formulas.name, subtitle: formulas.sourceTitle }).from(formulas).where(eq(formulas.id, resourceId)).limit(1);
    return row[0] ? { ...row[0], kind: "经方", href: `/jingfang?q=${encodeURIComponent(row[0].title)}` } : null;
  }
  if (resourceType === "classic") {
    const row = await db.select({ title: classics.title, subtitle: classics.category }).from(classics).where(eq(classics.id, resourceId)).limit(1);
    return row[0] ? { ...row[0], kind: "古籍", href: `/guji?q=${encodeURIComponent(row[0].title)}` } : null;
  }
  const row = await db.select({ title: classicChapters.title, subtitle: classics.title }).from(classicChapters).leftJoin(classics, eq(classicChapters.classicId, classics.id)).where(eq(classicChapters.id, resourceId)).limit(1);
  return row[0] ? { ...row[0], kind: "章节", href: "/guji" } : null;
}
