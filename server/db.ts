import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  classicChapters,
  classics,
  contentSources,
  formulas,
  herbs,
  InsertUser,
  readingProgress,
  savedItems,
  studyNotes,
  users,
} from "../drizzle/schema";
import { chapterSeed, classicSeed, formulaSeed, herbSeed, sourceSeed } from "./catalogSeed";
import { ENV } from "./_core/env";

export type ResourceType = "herb" | "formula" | "classic" | "chapter";

let _db: ReturnType<typeof drizzle> | null = null;
let seedPromise: Promise<void> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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
  for (const source of sourceSeed) {
    await db.insert(contentSources).values(source).onDuplicateKeyUpdate({ set: { name: source.name, publisher: source.publisher, baseUrl: source.baseUrl, accessType: source.accessType, licenseNote: source.licenseNote } });
  }
  const allSources = await db.select().from(contentSources);
  const sourceIds = new Map(allSources.map((source) => [source.slug, source.id]));
  const pharmacopoeiaId = sourceIds.get("chinese-pharmacopoeia");
  const wikisourceId = sourceIds.get("zh-wikisource");
  const chineseTextProjectId = sourceIds.get("chinese-text-project");
  for (const record of herbSeed) {
    const [slug, name, pinyin, aliases, category, nature, taste, meridians, medicinalPart, traditionalIndex, learningNote] = record;
    await db.insert(herbs).values({ slug, name, pinyin, aliases, category, nature, taste, meridians, medicinalPart, traditionalIndex, learningNote, sourceId: pharmacopoeiaId, sourceUrl: "https://ydz.chp.org.cn/" }).onDuplicateKeyUpdate({ set: { name, pinyin, aliases, category, nature, taste, meridians, medicinalPart, traditionalIndex, learningNote, sourceId: pharmacopoeiaId, sourceUrl: "https://ydz.chp.org.cn/", reviewedAt: new Date() } });
  }
  for (const record of formulaSeed) {
    const [slug, name, aliases, sourceTitle, sourceExcerpt, ingredients, structuralNote, studyIndex, sourceUrl] = record;
    const formulaSourceId = sourceUrl.includes("ctext.org") ? chineseTextProjectId : wikisourceId;
    await db.insert(formulas).values({ slug, name, aliases, sourceTitle, sourceExcerpt, ingredients: JSON.stringify(ingredients), structuralNote, studyIndex, sourceId: formulaSourceId, sourceUrl }).onDuplicateKeyUpdate({ set: { name, aliases, sourceTitle, sourceExcerpt, ingredients: JSON.stringify(ingredients), structuralNote, studyIndex, sourceId: formulaSourceId, sourceUrl, reviewedAt: new Date() } });
  }
  for (const record of classicSeed) {
    const [slug, title, era, author, category, summary, sourceUrl] = record;
    await db.insert(classics).values({ slug, title, era, author, category, summary, sourceId: wikisourceId, sourceUrl }).onDuplicateKeyUpdate({ set: { title, era, author, category, summary, sourceId: wikisourceId, sourceUrl, reviewedAt: new Date() } });
  }
  const allClassics = await db.select().from(classics);
  const classicIds = new Map(allClassics.map((classic) => [classic.slug, classic.id]));
  for (const record of chapterSeed) {
    const [classicSlug, sequence, title, excerpt, sourceUrl] = record;
    const classicId = classicIds.get(classicSlug);
    if (!classicId) continue;
    await db.insert(classicChapters).values({ classicId, sequence, title, excerpt, sourceUrl }).onDuplicateKeyUpdate({ set: { title, excerpt, sourceUrl } });
  }
}

function includesQuery(query: string, columns: Parameters<typeof or>[0][]) {
  const pattern = `%${query}%`;
  return or(...columns.map((column) => like(column as never, pattern)));
}

export async function getCatalogFilters() {
  await ensureCatalogSeed();
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

export async function getLocalSearch(query: string) {
  const [herbResults, formulaResults, classicResults] = await Promise.all([getHerbs({ query }), getFormulas({ query }), getClassics({ query })]);
  return { herbs: herbResults.slice(0, 8), formulas: formulaResults.slice(0, 8), classics: classicResults.slice(0, 8) };
}

export async function searchWikisource(query: string) {
  const endpoint = new URL("https://zh.wikisource.org/w/api.php");
  endpoint.searchParams.set("action", "query"); endpoint.searchParams.set("list", "search"); endpoint.searchParams.set("srsearch", query); endpoint.searchParams.set("srlimit", "8"); endpoint.searchParams.set("format", "json"); endpoint.searchParams.set("origin", "*");
  const response = await fetch(endpoint, { headers: { "User-Agent": "TCMClassicsLearningIndex/1.0 (public learning search)" } });
  if (!response.ok) throw new Error("古籍公开检索暂时不可用，请稍后重试。");
  const payload = await response.json() as { query?: { search?: Array<{ pageid: number; title: string; timestamp: string; snippet: string }> } };
  return (payload.query?.search ?? []).map((item) => ({ pageId: item.pageid, title: item.title, timestamp: item.timestamp, snippet: item.snippet.replace(/<[^>]*>/g, "").replace(/&quot;/g, "\"").replace(/&amp;/g, "&"), sourceUrl: `https://zh.wikisource.org/wiki/${encodeURIComponent(item.title)}` }));
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
