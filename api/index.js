// server/_core/app.ts
import express from "express";
import { sql as sql2 } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/db.ts
import { and, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { index, int, mediumtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var contentSources = mysqlTable("content_sources", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  publisher: varchar("publisher", { length: 255 }),
  baseUrl: varchar("baseUrl", { length: 1024 }).notNull(),
  accessType: mysqlEnum("accessType", ["catalog", "api", "manual"]).notNull(),
  licenseNote: text("licenseNote"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var herbs = mysqlTable("herbs", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  pinyin: varchar("pinyin", { length: 255 }),
  aliases: text("aliases"),
  category: varchar("category", { length: 128 }),
  nature: varchar("nature", { length: 64 }),
  taste: varchar("taste", { length: 128 }),
  meridians: varchar("meridians", { length: 255 }),
  medicinalPart: varchar("medicinalPart", { length: 255 }),
  traditionalIndex: text("traditionalIndex"),
  learningNote: text("learningNote"),
  sourceId: int("sourceId"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("herbs_name_idx").on(table.name),
  index("herbs_category_idx").on(table.category)
]);
var formulas = mysqlTable("formulas", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  aliases: text("aliases"),
  sourceTitle: varchar("sourceTitle", { length: 255 }).notNull(),
  sourceExcerpt: text("sourceExcerpt"),
  ingredients: text("ingredients").notNull(),
  structuralNote: text("structuralNote"),
  studyIndex: varchar("studyIndex", { length: 512 }),
  sourceId: int("sourceId"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("formulas_name_idx").on(table.name),
  index("formulas_source_title_idx").on(table.sourceTitle)
]);
var classics = mysqlTable("classics", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  era: varchar("era", { length: 128 }),
  author: varchar("author", { length: 255 }),
  category: varchar("category", { length: 128 }),
  summary: text("summary"),
  sourceId: int("sourceId"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("classics_title_idx").on(table.title)]);
var classicChapters = mysqlTable("classic_chapters", {
  id: int("id").autoincrement().primaryKey(),
  classicId: int("classicId").notNull(),
  sequence: int("sequence").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  uniqueIndex("classic_chapter_sequence_unique").on(table.classicId, table.sequence),
  index("classic_chapters_title_idx").on(table.title)
]);
var classicPassages = mysqlTable("classic_passages", {
  id: int("id").autoincrement().primaryKey(),
  classicId: int("classicId").notNull(),
  chapterId: int("chapterId").notNull(),
  passageNumber: int("passageNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: text("excerpt").notNull(),
  keywords: varchar("keywords", { length: 512 }),
  sourceReference: varchar("sourceReference", { length: 128 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  uniqueIndex("classic_passage_chapter_number_unique").on(table.chapterId, table.passageNumber),
  index("classic_passage_classic_idx").on(table.classicId, table.chapterId),
  index("classic_passage_title_idx").on(table.title)
]);
var classicPassageVersions = mysqlTable("classic_passage_versions", {
  id: int("id").autoincrement().primaryKey(),
  passageId: int("passageId").notNull(),
  editionLabel: varchar("editionLabel", { length: 255 }).notNull(),
  text: text("text").notNull(),
  variantNote: text("variantNote"),
  verificationStatus: mysqlEnum("verificationStatus", ["verified", "pending", "reference_only"]).notNull().default("pending"),
  sourceReference: varchar("sourceReference", { length: 255 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  uniqueIndex("classic_passage_version_unique").on(table.passageId, table.editionLabel),
  index("classic_passage_versions_passage_idx").on(table.passageId),
  index("classic_passage_versions_status_idx").on(table.verificationStatus)
]);
var formulaPassageMappings = mysqlTable("formula_passage_mappings", {
  id: int("id").autoincrement().primaryKey(),
  formulaId: int("formulaId").notNull(),
  passageId: int("passageId").notNull(),
  relationType: mysqlEnum("relationType", ["primary", "related"]).notNull().default("primary"),
  studyNote: text("studyNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  uniqueIndex("formula_passage_mapping_unique").on(table.formulaId, table.passageId),
  index("formula_passage_formula_idx").on(table.formulaId),
  index("formula_passage_passage_idx").on(table.passageId)
]);
var savedItems = mysqlTable("saved_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resourceType: mysqlEnum("resourceType", ["herb", "formula", "classic", "chapter"]).notNull(),
  resourceId: int("resourceId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("saved_item_unique").on(table.userId, table.resourceType, table.resourceId),
  index("saved_items_user_idx").on(table.userId, table.createdAt)
]);
var studyNotes = mysqlTable("study_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resourceType: mysqlEnum("resourceType", ["herb", "formula", "classic", "chapter"]).notNull(),
  resourceId: int("resourceId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("study_notes_user_idx").on(table.userId, table.updatedAt),
  index("study_notes_resource_idx").on(table.resourceType, table.resourceId)
]);
var readingProgress = mysqlTable("reading_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  classicId: int("classicId").notNull(),
  chapterId: int("chapterId"),
  progressPercent: int("progressPercent").notNull().default(0),
  lastReadAt: timestamp("lastReadAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  uniqueIndex("reading_progress_unique").on(table.userId, table.classicId),
  index("reading_progress_user_idx").on(table.userId, table.lastReadAt)
]);
var learningPathProgress = mysqlTable("learning_path_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pathSlug: varchar("pathSlug", { length: 96 }).notNull(),
  completedSteps: text("completedSteps").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  uniqueIndex("learning_path_progress_user_path_unique").on(table.userId, table.pathSlug),
  index("learning_path_progress_user_idx").on(table.userId, table.updatedAt)
]);
var learningGoals = mysqlTable("learning_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  metric: mysqlEnum("metric", ["path_steps", "reading_entries", "study_notes"]).notNull(),
  targetCount: int("targetCount").notNull(),
  deadlineAt: timestamp("deadlineAt"),
  status: mysqlEnum("status", ["active", "completed", "archived"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("learning_goals_user_idx").on(table.userId, table.status, table.updatedAt)
]);
var reviewReminders = mysqlTable("review_reminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  goalId: int("goalId"),
  title: varchar("title", { length: 255 }).notNull(),
  intervalDays: int("intervalDays").notNull(),
  hourUtc: int("hourUtc").notNull().default(12),
  enabled: int("enabled").notNull().default(1),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  nextReviewAt: timestamp("nextReviewAt").notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  uniqueIndex("review_reminder_schedule_uid_unique").on(table.scheduleCronTaskUid),
  index("review_reminders_user_idx").on(table.userId, table.enabled, table.nextReviewAt)
]);
var reviewReminderEvents = mysqlTable("review_reminder_events", {
  id: int("id").autoincrement().primaryKey(),
  reminderId: int("reminderId").notNull(),
  userId: int("userId").notNull(),
  dueAt: timestamp("dueAt").notNull(),
  seenAt: timestamp("seenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("review_reminder_event_due_unique").on(table.reminderId, table.dueAt),
  index("review_reminder_events_user_idx").on(table.userId, table.seenAt, table.dueAt)
]);
var aiStudyConversations = mysqlTable("ai_study_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  contextKind: mysqlEnum("contextKind", ["herb", "formula", "chapter"]).notNull(),
  contextTitle: varchar("contextTitle", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("ai_study_conversations_user_idx").on(table.userId, table.updatedAt),
  index("ai_study_conversations_context_idx").on(table.userId, table.contextKind, table.contextTitle)
]);
var aiStudyMessages = mysqlTable("ai_study_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  index("ai_study_messages_conversation_idx").on(table.conversationId, table.createdAt)
]);
var aiStudySummaries = mysqlTable("ai_study_summaries", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  sourceMessageCount: int("sourceMessageCount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  uniqueIndex("ai_study_summary_conversation_unique").on(table.conversationId),
  index("ai_study_summaries_user_idx").on(table.userId, table.updatedAt)
]);
var knowledgeDocuments = mysqlTable("knowledge_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  storageKey: varchar("storageKey", { length: 1024 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
  textPreview: text("textPreview"),
  textContent: mediumtext("textContent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("knowledge_documents_user_idx").on(table.userId, table.updatedAt),
  index("knowledge_documents_title_idx").on(table.userId, table.title)
]);

// server/herbCatalog.ts
var studyNote = (name) => `\u4EE5\u201C${name}\u201D\u4E3A\u68C0\u7D22\u7EBF\u7D22\uFF0C\u53EF\u5728\u7ECF\u65B9\u3001\u6761\u6587\u4E0E\u672C\u8349\u76EE\u5F55\u4E4B\u95F4\u4EA4\u53C9\u7814\u8BFB\uFF1B\u672C\u7AD9\u4EC5\u4F5C\u4F20\u7EDF\u6587\u732E\u5B66\u4E60\u7D22\u5F15\uFF0C\u975E\u5904\u65B9\u6216\u7528\u836F\u5EFA\u8BAE\u3002`;
var row = (slug, name, pinyin, aliases, category, nature, taste, meridians, medicinalPart, traditionalIndex) => [
  slug,
  name,
  pinyin,
  aliases,
  category,
  nature,
  taste,
  meridians,
  medicinalPart,
  traditionalIndex,
  studyNote(name)
];
var coreHerbSeed = [
  // 解表药
  row(
    "ma-huang",
    "\u9EBB\u9EC4",
    "M\xE1 Hu\xE1ng",
    "\u8349\u9EBB\u9EC4\u3001\u4E2D\u9EBB\u9EC4\u3001\u6728\u8D3C\u9EBB\u9EC4",
    "\u89E3\u8868\u836F",
    "\u6E29",
    "\u8F9B\u3001\u5FAE\u82E6",
    "\u80BA\u3001\u8180\u80F1\u7ECF",
    "\u8349\u8D28\u830E",
    "\u53D1\u6C57\u89E3\u8868\u3001\u5BA3\u80BA\u5E73\u5598\u3001\u5229\u6C34\u6D88\u80BF"
  ),
  row(
    "gui-zhi",
    "\u6842\u679D",
    "Gu\xEC Zh\u012B",
    "\u6842\u679D\u5C16",
    "\u89E3\u8868\u836F",
    "\u6E29",
    "\u8F9B\u3001\u7518",
    "\u5FC3\u3001\u80BA\u3001\u8180\u80F1\u7ECF",
    "\u5AE9\u679D",
    "\u53D1\u6C57\u89E3\u808C\u3001\u6E29\u901A\u7ECF\u8109\u3001\u52A9\u9633\u5316\u6C14"
  ),
  row(
    "zi-su-ye",
    "\u7D2B\u82CF\u53F6",
    "Z\u01D0 S\u016B Y\xE8",
    "\u82CF\u53F6\u3001\u7D2B\u82CF",
    "\u89E3\u8868\u836F",
    "\u6E29",
    "\u8F9B",
    "\u80BA\u3001\u813E\u7ECF",
    "\u53F6",
    "\u89E3\u8868\u6563\u5BD2\u3001\u884C\u6C14\u5BBD\u4E2D\u3001\u89E3\u9C7C\u87F9\u6BD2"
  ),
  row(
    "jing-jie",
    "\u8346\u82A5",
    "J\u012Bng Ji\xE8",
    "\u5047\u82CF\u3001\u9999\u8346\u82A5",
    "\u89E3\u8868\u836F",
    "\u5FAE\u6E29",
    "\u8F9B",
    "\u80BA\u3001\u809D\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u89E3\u8868\u6563\u98CE\u3001\u900F\u75B9\u3001\u6D88\u75AE\u3001\u6B62\u8840"
  ),
  row(
    "fang-feng",
    "\u9632\u98CE",
    "F\xE1ng F\u0113ng",
    "\u94DC\u82B8\u3001\u56DE\u4E91",
    "\u89E3\u8868\u836F",
    "\u5FAE\u6E29",
    "\u8F9B\u3001\u7518",
    "\u8180\u80F1\u3001\u809D\u3001\u813E\u7ECF",
    "\u6839",
    "\u795B\u98CE\u89E3\u8868\u3001\u80DC\u6E7F\u6B62\u75DB\u3001\u6B62\u75C9"
  ),
  row(
    "qiang-huo",
    "\u7F8C\u6D3B",
    "Qi\u0101ng Hu\xF3",
    "\u7F8C\u9752\u3001\u62A4\u7F8C\u4F7F\u8005",
    "\u89E3\u8868\u836F",
    "\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u8180\u80F1\u3001\u80BE\u7ECF",
    "\u6839\u830E\u53CA\u6839",
    "\u89E3\u8868\u6563\u5BD2\u3001\u795B\u98CE\u80DC\u6E7F\u3001\u6B62\u75DB"
  ),
  row(
    "bai-zhi",
    "\u767D\u82B7",
    "B\xE1i Zh\u01D0",
    "\u9999\u767D\u82B7\u3001\u676D\u767D\u82B7",
    "\u89E3\u8868\u836F",
    "\u6E29",
    "\u8F9B",
    "\u80BA\u3001\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u6839",
    "\u89E3\u8868\u6563\u5BD2\u3001\u795B\u98CE\u6B62\u75DB\u3001\u5BA3\u901A\u9F3B\u7A8D\u3001\u71E5\u6E7F\u6B62\u5E26"
  ),
  row(
    "xi-xin",
    "\u7EC6\u8F9B",
    "X\xEC X\u012Bn",
    "\u5C0F\u8F9B\u3001\u5C11\u8F9B",
    "\u89E3\u8868\u836F",
    "\u6E29",
    "\u8F9B",
    "\u5FC3\u3001\u80BA\u3001\u80BE\u7ECF",
    "\u5168\u8349",
    "\u89E3\u8868\u6563\u5BD2\u3001\u795B\u98CE\u6B62\u75DB\u3001\u901A\u7A8D\u3001\u6E29\u80BA\u5316\u996E"
  ),
  row(
    "sheng-jiang",
    "\u751F\u59DC",
    "Sh\u0113ng Ji\u0101ng",
    "\u59DC\u6839\u3001\u9C9C\u59DC",
    "\u89E3\u8868\u836F",
    "\u5FAE\u6E29",
    "\u8F9B",
    "\u80BA\u3001\u813E\u3001\u80C3\u7ECF",
    "\u6839\u830E",
    "\u89E3\u8868\u6563\u5BD2\u3001\u6E29\u4E2D\u6B62\u5455\u3001\u5316\u75F0\u6B62\u54B3\u3001\u89E3\u9C7C\u87F9\u6BD2"
  ),
  row(
    "xiang-ru",
    "\u9999\u85B7",
    "Xi\u0101ng R\xFA",
    "\u9999\u8339\u3001\u9999\u8338",
    "\u89E3\u8868\u836F",
    "\u5FAE\u6E29",
    "\u8F9B",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u53D1\u6C57\u89E3\u8868\u3001\u5316\u6E7F\u548C\u4E2D\u3001\u5229\u6C34\u6D88\u80BF"
  ),
  row(
    "bo-he",
    "\u8584\u8377",
    "B\xF2 H\xE9",
    "\u82CF\u8584\u8377\u3001\u8543\u8377\u83DC",
    "\u89E3\u8868\u836F",
    "\u51C9",
    "\u8F9B",
    "\u80BA\u3001\u809D\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u758F\u6563\u98CE\u70ED\u3001\u6E05\u5229\u5934\u76EE\u3001\u5229\u54BD\u3001\u900F\u75B9\u3001\u758F\u809D\u884C\u6C14"
  ),
  row(
    "niu-bang-zi",
    "\u725B\u84A1\u5B50",
    "Ni\xFA B\xE0ng Z\u01D0",
    "\u5927\u529B\u5B50\u3001\u9F20\u7C98\u5B50",
    "\u89E3\u8868\u836F",
    "\u5BD2",
    "\u8F9B\u3001\u82E6",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u679C\u5B9E",
    "\u758F\u6563\u98CE\u70ED\u3001\u5BA3\u80BA\u900F\u75B9\u3001\u5229\u54BD\u6563\u7ED3\u3001\u89E3\u6BD2\u6D88\u80BF"
  ),
  row(
    "chan-tui",
    "\u8749\u8715",
    "Ch\xE1n Tu\xEC",
    "\u8749\u8863\u3001\u866B\u9000",
    "\u89E3\u8868\u836F",
    "\u51C9",
    "\u7518",
    "\u80BA\u3001\u809D\u7ECF",
    "\u8715\u76AE",
    "\u758F\u6563\u98CE\u70ED\u3001\u5229\u54BD\u5F00\u97F3\u3001\u900F\u75B9\u3001\u660E\u76EE\u9000\u7FF3\u3001\u606F\u98CE\u6B62\u75C9"
  ),
  row(
    "sang-ye",
    "\u6851\u53F6",
    "S\u0101ng Y\xE8",
    "\u5BB6\u6851\u53F6\u3001\u94C1\u6247\u5B50",
    "\u89E3\u8868\u836F",
    "\u5BD2",
    "\u7518\u3001\u82E6",
    "\u80BA\u3001\u809D\u7ECF",
    "\u53F6",
    "\u758F\u6563\u98CE\u70ED\u3001\u6E05\u80BA\u6DA6\u71E5\u3001\u5E73\u6291\u809D\u9633\u3001\u6E05\u809D\u660E\u76EE"
  ),
  row(
    "ju-hua",
    "\u83CA\u82B1",
    "J\xFA Hu\u0101",
    "\u7518\u83CA\u3001\u676D\u83CA\u82B1",
    "\u89E3\u8868\u836F",
    "\u5FAE\u5BD2",
    "\u8F9B\u3001\u7518\u3001\u82E6",
    "\u80BA\u3001\u809D\u7ECF",
    "\u5934\u72B6\u82B1\u5E8F",
    "\u758F\u6563\u98CE\u70ED\u3001\u5E73\u6291\u809D\u9633\u3001\u6E05\u809D\u660E\u76EE\u3001\u6E05\u70ED\u89E3\u6BD2"
  ),
  row(
    "ge-gen",
    "\u845B\u6839",
    "G\u011B G\u0113n",
    "\u5E72\u845B\u3001\u7C89\u845B",
    "\u89E3\u8868\u836F",
    "\u51C9",
    "\u7518\u3001\u8F9B",
    "\u813E\u3001\u80C3\u7ECF",
    "\u6839",
    "\u89E3\u808C\u9000\u70ED\u3001\u751F\u6D25\u6B62\u6E34\u3001\u900F\u75B9\u3001\u5347\u9633\u6B62\u6CFB"
  ),
  row(
    "chai-hu",
    "\u67F4\u80E1",
    "Ch\xE1i H\xFA",
    "\u5317\u67F4\u80E1\u3001\u5357\u67F4\u80E1",
    "\u89E3\u8868\u836F",
    "\u5FAE\u5BD2",
    "\u82E6\u3001\u8F9B",
    "\u809D\u3001\u80C6\u3001\u80BA\u7ECF",
    "\u6839",
    "\u89E3\u8868\u9000\u70ED\u3001\u758F\u809D\u89E3\u90C1\u3001\u5347\u4E3E\u9633\u6C14"
  ),
  row(
    "sheng-ma",
    "\u5347\u9EBB",
    "Sh\u0113ng M\xE1",
    "\u5468\u5347\u9EBB\u3001\u7EFF\u5347\u9EBB",
    "\u89E3\u8868\u836F",
    "\u5FAE\u5BD2",
    "\u8F9B\u3001\u5FAE\u7518",
    "\u80BA\u3001\u813E\u3001\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u6839\u830E",
    "\u53D1\u8868\u900F\u75B9\u3001\u6E05\u70ED\u89E3\u6BD2\u3001\u5347\u4E3E\u9633\u6C14"
  ),
  row(
    "dan-dou-chi",
    "\u6DE1\u8C46\u8C49",
    "D\xE0n D\xF2u Ch\u01D0",
    "\u9999\u8C49\u3001\u8C46\u8C49",
    "\u89E3\u8868\u836F",
    "\u51C9",
    "\u82E6\u3001\u8F9B",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u53D1\u9175\u52A0\u5DE5\u54C1",
    "\u89E3\u8868\u9664\u70E6"
  ),
  // 清热药
  row(
    "shi-gao",
    "\u77F3\u818F",
    "Sh\xED G\u0101o",
    "\u7EC6\u7406\u77F3\u3001\u5BD2\u6C34\u77F3",
    "\u6E05\u70ED\u836F",
    "\u5927\u5BD2",
    "\u8F9B\u3001\u7518",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u77FF\u7269",
    "\u6E05\u70ED\u6CFB\u706B\u3001\u9664\u70E6\u6B62\u6E34\u3001\u6536\u655B\u751F\u808C"
  ),
  row(
    "zhi-mu",
    "\u77E5\u6BCD",
    "Zh\u012B M\u01D4",
    "\u8FDE\u6BCD\u3001\u7A7F\u5730\u9F99",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6\u3001\u7518",
    "\u80BA\u3001\u80C3\u3001\u80BE\u7ECF",
    "\u6839\u830E",
    "\u6E05\u70ED\u6CFB\u706B\u3001\u751F\u6D25\u6DA6\u71E5"
  ),
  row(
    "lu-gen",
    "\u82A6\u6839",
    "L\xFA G\u0113n",
    "\u82C7\u6839\u3001\u82A6\u8305\u6839",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u7518",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u6839\u830E",
    "\u6E05\u70ED\u6CFB\u706B\u3001\u751F\u6D25\u6B62\u6E34\u3001\u9664\u70E6\u6B62\u5455\u3001\u5229\u5C3F"
  ),
  row(
    "tian-hua-fen",
    "\u5929\u82B1\u7C89",
    "Ti\u0101n Hu\u0101 F\u011Bn",
    "\u681D\u697C\u6839\u3001\u681D\u848C\u6839\u3001\u74DC\u848C\u6839",
    "\u6E05\u70ED\u836F",
    "\u5FAE\u5BD2",
    "\u7518\u3001\u5FAE\u82E6",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u6839",
    "\u6E05\u70ED\u751F\u6D25\u3001\u6D88\u80BF\u6392\u8113"
  ),
  row(
    "xia-ku-cao",
    "\u590F\u67AF\u8349",
    "Xi\xE0 K\u016B C\u01CEo",
    "\u68D2\u69CC\u8349\u3001\u94C1\u8272\u8349",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u8F9B\u3001\u82E6",
    "\u809D\u3001\u80C6\u7ECF",
    "\u679C\u7A57",
    "\u6E05\u809D\u6CFB\u706B\u3001\u660E\u76EE\u3001\u6563\u7ED3\u6D88\u80BF"
  ),
  row(
    "huang-qin",
    "\u9EC4\u82A9",
    "Hu\xE1ng Q\xEDn",
    "\u5B50\u82A9\u3001\u67AF\u82A9",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u80BA\u3001\u80C6\u3001\u813E\u3001\u5927\u80A0\u3001\u5C0F\u80A0\u7ECF",
    "\u6839",
    "\u6E05\u70ED\u71E5\u6E7F\u3001\u6CFB\u706B\u89E3\u6BD2\u3001\u6B62\u8840\u3001\u5B89\u80CE"
  ),
  row(
    "huang-lian",
    "\u9EC4\u8FDE",
    "Hu\xE1ng Li\xE1n",
    "\u5DDD\u8FDE\u3001\u5473\u8FDE",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u5FC3\u3001\u813E\u3001\u80C3\u3001\u809D\u3001\u80C6\u3001\u5927\u80A0\u7ECF",
    "\u6839\u830E",
    "\u6E05\u70ED\u71E5\u6E7F\u3001\u6CFB\u706B\u89E3\u6BD2"
  ),
  row(
    "huang-bai",
    "\u9EC4\u67CF",
    "Hu\xE1ng B\u01CEi",
    "\u5DDD\u9EC4\u67CF\u3001\u5173\u9EC4\u67CF",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u80BE\u3001\u8180\u80F1\u7ECF",
    "\u6811\u76AE",
    "\u6E05\u70ED\u71E5\u6E7F\u3001\u6CFB\u706B\u9664\u84B8\u3001\u89E3\u6BD2\u7597\u75AE"
  ),
  row(
    "long-dan",
    "\u9F99\u80C6",
    "L\xF3ng D\u01CEn",
    "\u9F99\u80C6\u8349\u3001\u82E6\u80C6\u8349",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u809D\u3001\u80C6\u7ECF",
    "\u6839\u53CA\u6839\u830E",
    "\u6E05\u70ED\u71E5\u6E7F\u3001\u6CFB\u809D\u80C6\u706B"
  ),
  row(
    "ku-shen",
    "\u82E6\u53C2",
    "K\u01D4 Sh\u0113n",
    "\u82E6\u9AA8\u3001\u5730\u69D0",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u5FC3\u3001\u809D\u3001\u80C3\u3001\u5927\u80A0\u3001\u8180\u80F1\u7ECF",
    "\u6839",
    "\u6E05\u70ED\u71E5\u6E7F\u3001\u6740\u866B\u6B62\u75D2\u3001\u5229\u5C3F"
  ),
  row(
    "bai-xian-pi",
    "\u767D\u9C9C\u76AE",
    "B\xE1i Xi\u0101n P\xED",
    "\u5317\u9C9C\u76AE\u3001\u516B\u80A1\u725B",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u813E\u3001\u80C3\u3001\u8180\u80F1\u7ECF",
    "\u6839\u76AE",
    "\u6E05\u70ED\u71E5\u6E7F\u3001\u795B\u98CE\u89E3\u6BD2"
  ),
  row(
    "jin-yin-hua",
    "\u91D1\u94F6\u82B1",
    "J\u012Bn Y\xEDn Hu\u0101",
    "\u5FCD\u51AC\u82B1\u3001\u53CC\u82B1",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u7518",
    "\u80BA\u3001\u5FC3\u3001\u80C3\u7ECF",
    "\u82B1\u857E",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u758F\u6563\u98CE\u70ED"
  ),
  row(
    "lian-qiao",
    "\u8FDE\u7FD8",
    "Li\xE1n Qi\xE0o",
    "\u9EC4\u82B1\u6761\u3001\u9EC4\u5BFF\u4E39\u3001\u8FDE\u8F7A",
    "\u6E05\u70ED\u836F",
    "\u5FAE\u5BD2",
    "\u82E6",
    "\u80BA\u3001\u5FC3\u3001\u5C0F\u80A0\u7ECF",
    "\u679C\u5B9E",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u6D88\u80BF\u6563\u7ED3\u3001\u758F\u6563\u98CE\u70ED"
  ),
  row(
    "pu-gong-ying",
    "\u84B2\u516C\u82F1",
    "P\xFA G\u014Dng Y\u012Bng",
    "\u9EC4\u82B1\u5730\u4E01\u3001\u84B2\u516C\u8349",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6\u3001\u7518",
    "\u809D\u3001\u80C3\u7ECF",
    "\u5168\u8349",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u6D88\u80BF\u6563\u7ED3\u3001\u5229\u6E7F\u901A\u6DCB"
  ),
  row(
    "zi-hua-di-ding",
    "\u7D2B\u82B1\u5730\u4E01",
    "Z\u01D0 Hu\u0101 D\xEC D\u012Bng",
    "\u5730\u4E01\u8349\u3001\u7BAD\u5934\u8349",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6\u3001\u8F9B",
    "\u5FC3\u3001\u809D\u7ECF",
    "\u5168\u8349",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u51C9\u8840\u6D88\u80BF"
  ),
  row(
    "ban-lan-gen",
    "\u677F\u84DD\u6839",
    "B\u01CEn L\xE1n G\u0113n",
    "\u5927\u84DD\u6839\u3001\u975B\u6839",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u5FC3\u3001\u80C3\u7ECF",
    "\u6839",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u51C9\u8840\u5229\u54BD"
  ),
  row(
    "da-qing-ye",
    "\u5927\u9752\u53F6",
    "D\xE0 Q\u012Bng Y\xE8",
    "\u84DD\u53F6\u3001\u83D8\u84DD\u53F6",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u5FC3\u3001\u80C3\u7ECF",
    "\u53F6",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u51C9\u8840\u6D88\u6591"
  ),
  row(
    "chuan-xin-lian",
    "\u7A7F\u5FC3\u83B2",
    "Chu\u0101n X\u012Bn Li\xE1n",
    "\u4E00\u89C1\u559C\u3001\u82E6\u80C6\u8349",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u5FC3\u3001\u80BA\u3001\u5927\u80A0\u3001\u8180\u80F1\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u51C9\u8840\u3001\u6D88\u80BF\u3001\u71E5\u6E7F"
  ),
  row(
    "yu-xing-cao",
    "\u9C7C\u8165\u8349",
    "Y\xFA X\u012Bng C\u01CEo",
    "\u6298\u8033\u6839\u3001\u857A\u83DC",
    "\u6E05\u70ED\u836F",
    "\u5FAE\u5BD2",
    "\u8F9B",
    "\u80BA\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u6D88\u75C8\u6392\u8113\u3001\u5229\u5C3F\u901A\u6DCB"
  ),
  row(
    "bai-tou-weng",
    "\u767D\u5934\u7FC1",
    "B\xE1i T\xF3u W\u0113ng",
    "\u5948\u4F55\u8349\u3001\u8001\u59D1\u8349",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u6839",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u51C9\u8840\u6B62\u75E2"
  ),
  row(
    "qin-pi",
    "\u79E6\u76AE",
    "Q\xEDn P\xED",
    "\u79E6\u767D\u76AE\u3001\u8721\u6811\u76AE",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6\u3001\u6DA9",
    "\u809D\u3001\u80C6\u3001\u5927\u80A0\u7ECF",
    "\u6811\u76AE",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u71E5\u6E7F\u6B62\u5E26\u3001\u6E05\u809D\u660E\u76EE"
  ),
  row(
    "qing-hao",
    "\u9752\u84BF",
    "Q\u012Bng H\u0101o",
    "\u8349\u84BF\u3001\u9999\u84BF",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6\u3001\u8F9B",
    "\u809D\u3001\u80C6\u3001\u80BE\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u6E05\u865A\u70ED\u3001\u9664\u9AA8\u84B8\u3001\u89E3\u6691\u70ED\u3001\u622A\u759F"
  ),
  row(
    "di-gu-pi",
    "\u5730\u9AA8\u76AE",
    "D\xEC G\u01D4 P\xED",
    "\u67B8\u675E\u6839\u76AE\u3001\u675E\u6839",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u7518",
    "\u80BA\u3001\u809D\u3001\u80BE\u7ECF",
    "\u6839\u76AE",
    "\u51C9\u8840\u9664\u84B8\u3001\u6E05\u80BA\u964D\u706B"
  ),
  row(
    "yin-chai-hu",
    "\u94F6\u67F4\u80E1",
    "Y\xEDn Ch\xE1i H\xFA",
    "\u5C71\u9A6C\u5170\u3001\u725B\u809A\u6839",
    "\u6E05\u70ED\u836F",
    "\u5FAE\u5BD2",
    "\u7518",
    "\u809D\u3001\u80C3\u7ECF",
    "\u6839",
    "\u6E05\u865A\u70ED\u3001\u9664\u75B3\u70ED"
  ),
  row(
    "hu-huang-lian",
    "\u80E1\u9EC4\u8FDE",
    "H\xFA Hu\xE1ng Li\xE1n",
    "\u5272\u5B64\u9732\u6CFD\u3001\u80E1\u8FDE",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u809D\u3001\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u6839\u830E",
    "\u9000\u865A\u70ED\u3001\u9664\u75B3\u70ED\u3001\u6E05\u6E7F\u70ED"
  ),
  row(
    "zhi-zi",
    "\u6800\u5B50",
    "Zh\u012B Z\u01D0",
    "\u9EC4\u6800\u5B50\u3001\u5C71\u6800",
    "\u6E05\u70ED\u836F",
    "\u5BD2",
    "\u82E6",
    "\u5FC3\u3001\u80BA\u3001\u4E09\u7126\u7ECF",
    "\u679C\u5B9E",
    "\u6CFB\u706B\u9664\u70E6\u3001\u6E05\u70ED\u5229\u6E7F\u3001\u51C9\u8840\u89E3\u6BD2\u3001\u6D88\u80BF\u6B62\u75DB"
  ),
  // 泻下、祛风湿、化湿
  row(
    "da-huang",
    "\u5927\u9EC4",
    "D\xE0 Hu\xE1ng",
    "\u5C06\u519B\u3001\u5DDD\u519B",
    "\u6CFB\u4E0B\u836F",
    "\u5BD2",
    "\u82E6",
    "\u813E\u3001\u80C3\u3001\u5927\u80A0\u3001\u809D\u3001\u5FC3\u5305\u7ECF",
    "\u6839\u53CA\u6839\u830E",
    "\u6CFB\u4E0B\u653B\u79EF\u3001\u6E05\u70ED\u6CFB\u706B\u3001\u51C9\u8840\u89E3\u6BD2\u3001\u9010\u7600\u901A\u7ECF"
  ),
  row(
    "mang-xiao",
    "\u8292\u785D",
    "M\xE1ng Xi\u0101o",
    "\u6734\u785D\u3001\u76AE\u785D",
    "\u6CFB\u4E0B\u836F",
    "\u5BD2",
    "\u54B8\u3001\u82E6",
    "\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u77FF\u7269\u52A0\u5DE5\u54C1",
    "\u6CFB\u4E0B\u901A\u4FBF\u3001\u6DA6\u71E5\u8F6F\u575A\u3001\u6E05\u706B\u6D88\u80BF"
  ),
  row(
    "fan-xie-ye",
    "\u756A\u6CFB\u53F6",
    "F\u0101n Xi\xE8 Y\xE8",
    "\u6CFB\u53F6\u3001\u65C3\u90A3\u53F6",
    "\u6CFB\u4E0B\u836F",
    "\u5BD2",
    "\u7518\u3001\u82E6",
    "\u5927\u80A0\u7ECF",
    "\u5C0F\u53F6",
    "\u6CFB\u4E0B\u901A\u4FBF\u3001\u6D88\u79EF\u5BFC\u6EDE"
  ),
  row(
    "lu-hui",
    "\u82A6\u835F",
    "L\xFA Hu\xEC",
    "\u5974\u4F1A\u3001\u8C61\u80C6",
    "\u6CFB\u4E0B\u836F",
    "\u5BD2",
    "\u82E6",
    "\u809D\u3001\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u53F6\u6C41\u6D53\u7F29\u5E72\u71E5\u7269",
    "\u6CFB\u4E0B\u901A\u4FBF\u3001\u6E05\u809D\u6CFB\u706B\u3001\u6740\u866B\u7597\u75B3"
  ),
  row(
    "huo-ma-ren",
    "\u706B\u9EBB\u4EC1",
    "Hu\u01D2 M\xE1 R\xE9n",
    "\u9EBB\u5B50\u4EC1\u3001\u9EBB\u4EC1",
    "\u6CFB\u4E0B\u836F",
    "\u5E73",
    "\u7518",
    "\u813E\u3001\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u679C\u5B9E",
    "\u6DA6\u80A0\u901A\u4FBF"
  ),
  row(
    "yu-li-ren",
    "\u90C1\u674E\u4EC1",
    "Y\xF9 L\u01D0 R\xE9n",
    "\u5C71\u6885\u5B50\u3001\u5C0F\u674E\u4EC1",
    "\u6CFB\u4E0B\u836F",
    "\u5E73",
    "\u8F9B\u3001\u82E6\u3001\u7518",
    "\u813E\u3001\u5927\u80A0\u3001\u5C0F\u80A0\u7ECF",
    "\u79CD\u5B50",
    "\u6DA6\u80A0\u901A\u4FBF\u3001\u5229\u6C34\u6D88\u80BF"
  ),
  row(
    "gan-sui",
    "\u7518\u9042",
    "G\u0101n Su\xEC",
    "\u732B\u513F\u773C\u3001\u80BF\u624B\u82B1\u6839",
    "\u6CFB\u4E0B\u836F",
    "\u5BD2",
    "\u82E6\u3001\u7518",
    "\u80BA\u3001\u80BE\u3001\u5927\u80A0\u7ECF",
    "\u5757\u6839",
    "\u6CFB\u6C34\u9010\u996E\u3001\u6D88\u80BF\u6563\u7ED3"
  ),
  row(
    "da-ji",
    "\u5927\u621F",
    "D\xE0 J\u01D0",
    "\u7EA2\u82BD\u5927\u621F\u3001\u4EAC\u5927\u621F",
    "\u6CFB\u4E0B\u836F",
    "\u5BD2",
    "\u82E6",
    "\u80BA\u3001\u80BE\u3001\u5927\u80A0\u7ECF",
    "\u6839",
    "\u6CFB\u6C34\u9010\u996E\u3001\u6D88\u80BF\u6563\u7ED3"
  ),
  row(
    "qian-niu-zi",
    "\u7275\u725B\u5B50",
    "Qi\u0101n Ni\xFA Z\u01D0",
    "\u9ED1\u4E11\u3001\u767D\u4E11",
    "\u6CFB\u4E0B\u836F",
    "\u5BD2",
    "\u82E6\u3001\u8F9B",
    "\u80BA\u3001\u80BE\u3001\u5927\u80A0\u7ECF",
    "\u79CD\u5B50",
    "\u6CFB\u4E0B\u9010\u6C34\u3001\u53BB\u79EF\u6740\u866B"
  ),
  row(
    "wei-ling-xian",
    "\u5A01\u7075\u4ED9",
    "W\u0113i L\xEDng Xi\u0101n",
    "\u94C1\u811A\u5A01\u7075\u4ED9\u3001\u7075\u4ED9",
    "\u795B\u98CE\u6E7F\u836F",
    "\u6E29",
    "\u8F9B\u3001\u54B8",
    "\u8180\u80F1\u7ECF",
    "\u6839\u53CA\u6839\u830E",
    "\u795B\u98CE\u6E7F\u3001\u901A\u7ECF\u7EDC\u3001\u6B62\u75F9\u75DB\u3001\u6D88\u9AA8\u9CA0"
  ),
  row(
    "du-huo",
    "\u72EC\u6D3B",
    "D\xFA Hu\xF3",
    "\u957F\u751F\u8349\u3001\u72EC\u6447\u8349",
    "\u795B\u98CE\u6E7F\u836F",
    "\u5FAE\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u80BE\u3001\u8180\u80F1\u7ECF",
    "\u6839",
    "\u795B\u98CE\u6E7F\u3001\u6B62\u75F9\u75DB\u3001\u89E3\u8868"
  ),
  row(
    "mu-gua",
    "\u6728\u74DC",
    "M\xF9 Gu\u0101",
    "\u5BA3\u6728\u74DC\u3001\u76B1\u76AE\u6728\u74DC",
    "\u795B\u98CE\u6E7F\u836F",
    "\u6E29",
    "\u9178",
    "\u809D\u3001\u813E\u7ECF",
    "\u679C\u5B9E",
    "\u8212\u7B4B\u6D3B\u7EDC\u3001\u548C\u80C3\u5316\u6E7F"
  ),
  row(
    "qin-jiao",
    "\u79E6\u827D",
    "Q\xEDn Ji\u0101o",
    "\u5927\u53F6\u9F99\u80C6\u3001\u9EBB\u82B1\u827D",
    "\u795B\u98CE\u6E7F\u836F",
    "\u5E73",
    "\u8F9B\u3001\u82E6",
    "\u80C3\u3001\u809D\u3001\u80C6\u7ECF",
    "\u6839",
    "\u795B\u98CE\u6E7F\u3001\u8212\u7B4B\u7EDC\u3001\u6E05\u865A\u70ED\u3001\u9664\u6E7F\u70ED"
  ),
  row(
    "fang-ji",
    "\u9632\u5DF1",
    "F\xE1ng J\u01D0",
    "\u7C89\u9632\u5DF1\u3001\u6C49\u9632\u5DF1",
    "\u795B\u98CE\u6E7F\u836F",
    "\u5BD2",
    "\u82E6\u3001\u8F9B",
    "\u8180\u80F1\u3001\u80BA\u7ECF",
    "\u6839",
    "\u795B\u98CE\u6E7F\u3001\u6B62\u75DB\u3001\u5229\u6C34\u6D88\u80BF"
  ),
  row(
    "wu-jia-pi",
    "\u4E94\u52A0\u76AE",
    "W\u01D4 Ji\u0101 P\xED",
    "\u5357\u4E94\u52A0\u76AE\u3001\u523A\u4E94\u52A0\u76AE",
    "\u795B\u98CE\u6E7F\u836F",
    "\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u809D\u3001\u80BE\u7ECF",
    "\u6839\u76AE",
    "\u795B\u98CE\u6E7F\u3001\u8865\u809D\u80BE\u3001\u5F3A\u7B4B\u9AA8\u3001\u5229\u6C34"
  ),
  row(
    "sang-ji-sheng",
    "\u6851\u5BC4\u751F",
    "S\u0101ng J\xEC Sh\u0113ng",
    "\u5BC4\u751F\u3001\u5E7F\u5BC4\u751F",
    "\u795B\u98CE\u6E7F\u836F",
    "\u5E73",
    "\u82E6\u3001\u7518",
    "\u809D\u3001\u80BE\u7ECF",
    "\u5E26\u53F6\u830E\u679D",
    "\u795B\u98CE\u6E7F\u3001\u8865\u809D\u80BE\u3001\u5F3A\u7B4B\u9AA8\u3001\u5B89\u80CE"
  ),
  row(
    "cang-zhu",
    "\u82CD\u672F",
    "C\u0101ng Zh\xFA",
    "\u8305\u672F\u3001\u5357\u82CD\u672F",
    "\u5316\u6E7F\u836F",
    "\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u813E\u3001\u80C3\u3001\u809D\u7ECF",
    "\u6839\u830E",
    "\u71E5\u6E7F\u5065\u813E\u3001\u795B\u98CE\u6E7F\u3001\u53D1\u6C57\u3001\u660E\u76EE"
  ),
  row(
    "hou-po",
    "\u539A\u6734",
    "H\xF2u P\xF2",
    "\u5DDD\u539A\u6734\u3001\u7D2B\u6CB9\u539A\u6734",
    "\u5316\u6E7F\u836F",
    "\u6E29",
    "\u82E6\u3001\u8F9B",
    "\u813E\u3001\u80C3\u3001\u80BA\u3001\u5927\u80A0\u7ECF",
    "\u5E72\u76AE\u3001\u6839\u76AE\u53CA\u679D\u76AE",
    "\u71E5\u6E7F\u6D88\u75F0\u3001\u4E0B\u6C14\u9664\u6EE1"
  ),
  row(
    "huo-xiang",
    "\u85FF\u9999",
    "Hu\xF2 Xi\u0101ng",
    "\u5E7F\u85FF\u9999\u3001\u6392\u9999\u8349",
    "\u5316\u6E7F\u836F",
    "\u5FAE\u6E29",
    "\u8F9B",
    "\u813E\u3001\u80C3\u3001\u80BA\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u5316\u6E7F\u9192\u813E\u3001\u6B62\u5455\u3001\u89E3\u6691"
  ),
  row(
    "sha-ren",
    "\u7802\u4EC1",
    "Sh\u0101 R\xE9n",
    "\u9633\u6625\u7802\u3001\u6625\u7802\u4EC1",
    "\u5316\u6E7F\u836F",
    "\u6E29",
    "\u8F9B",
    "\u813E\u3001\u80C3\u3001\u80BE\u7ECF",
    "\u679C\u5B9E",
    "\u5316\u6E7F\u5F00\u80C3\u3001\u6E29\u813E\u6B62\u6CFB\u3001\u7406\u6C14\u5B89\u80CE"
  ),
  row(
    "bai-dou-kou",
    "\u767D\u8C46\u853B",
    "B\xE1i D\xF2u K\xF2u",
    "\u767D\u853B\u3001\u5706\u8C46\u853B",
    "\u5316\u6E7F\u836F",
    "\u6E29",
    "\u8F9B",
    "\u80BA\u3001\u813E\u3001\u80C3\u7ECF",
    "\u679C\u5B9E",
    "\u5316\u6E7F\u884C\u6C14\u3001\u6E29\u4E2D\u6B62\u5455"
  ),
  row(
    "cao-dou-kou",
    "\u8349\u8C46\u853B",
    "C\u01CEo D\xF2u K\xF2u",
    "\u8349\u853B\u3001\u5076\u5B50",
    "\u5316\u6E7F\u836F",
    "\u6E29",
    "\u8F9B",
    "\u813E\u3001\u80C3\u7ECF",
    "\u679C\u5B9E",
    "\u71E5\u6E7F\u884C\u6C14\u3001\u6E29\u4E2D\u6B62\u5455"
  ),
  row(
    "cao-guo",
    "\u8349\u679C",
    "C\u01CEo Gu\u01D2",
    "\u8349\u679C\u4EC1\u3001\u8349\u679C\u5B50",
    "\u5316\u6E7F\u836F",
    "\u6E29",
    "\u8F9B",
    "\u813E\u3001\u80C3\u7ECF",
    "\u679C\u5B9E",
    "\u71E5\u6E7F\u6E29\u4E2D\u3001\u9664\u75F0\u622A\u759F"
  ),
  // 利水渗湿、温里、理气
  row(
    "fu-ling",
    "\u832F\u82D3",
    "F\xFA L\xEDng",
    "\u4E91\u82D3\u3001\u832F\u795E",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5E73",
    "\u7518\u3001\u6DE1",
    "\u5FC3\u3001\u80BA\u3001\u813E\u3001\u80BE\u7ECF",
    "\u83CC\u6838",
    "\u5229\u6C34\u6E17\u6E7F\u3001\u5065\u813E\u3001\u5B81\u5FC3"
  ),
  row(
    "zhu-ling",
    "\u732A\u82D3",
    "Zh\u016B L\xEDng",
    "\u8C55\u96F6\u3001\u5730\u4E4C\u6843",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5E73",
    "\u7518\u3001\u6DE1",
    "\u80BE\u3001\u8180\u80F1\u7ECF",
    "\u83CC\u6838",
    "\u5229\u6C34\u6E17\u6E7F"
  ),
  row(
    "ze-xie",
    "\u6CFD\u6CFB",
    "Z\xE9 Xi\xE8",
    "\u5EFA\u6CFD\u6CFB",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5BD2",
    "\u7518\u3001\u6DE1",
    "\u80BE\u3001\u8180\u80F1\u7ECF",
    "\u5757\u830E",
    "\u5229\u6C34\u6E17\u6E7F\u3001\u6CC4\u70ED"
  ),
  row(
    "yi-yi-ren",
    "\u858F\u82E1\u4EC1",
    "Y\xEC Y\u01D0 R\xE9n",
    "\u858F\u4EC1\u3001\u82E1\u7C73",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5FAE\u5BD2",
    "\u7518\u3001\u6DE1",
    "\u813E\u3001\u80C3\u3001\u80BA\u7ECF",
    "\u79CD\u4EC1",
    "\u5229\u6C34\u6E17\u6E7F\u3001\u5065\u813E\u6B62\u6CFB\u3001\u9664\u75F9\u3001\u6392\u8113\u3001\u89E3\u6BD2\u6563\u7ED3"
  ),
  row(
    "che-qian-zi",
    "\u8F66\u524D\u5B50",
    "Ch\u0113 Qi\xE1n Z\u01D0",
    "\u8F66\u524D\u5B9E\u3001\u867E\u87C6\u8863\u5B50",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5FAE\u5BD2",
    "\u7518",
    "\u809D\u3001\u80BE\u3001\u80BA\u3001\u5C0F\u80A0\u7ECF",
    "\u79CD\u5B50",
    "\u6E05\u70ED\u5229\u5C3F\u901A\u6DCB\u3001\u6E17\u6E7F\u6B62\u6CFB\u3001\u660E\u76EE\u3001\u795B\u75F0"
  ),
  row(
    "hua-shi",
    "\u6ED1\u77F3",
    "Hu\xE1 Sh\xED",
    "\u753B\u77F3\u3001\u6DB2\u77F3",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5BD2",
    "\u7518\u3001\u6DE1",
    "\u8180\u80F1\u3001\u80BA\u3001\u80C3\u7ECF",
    "\u77FF\u7269",
    "\u5229\u5C3F\u901A\u6DCB\u3001\u6E05\u70ED\u89E3\u6691\u3001\u795B\u6E7F\u655B\u75AE"
  ),
  row(
    "mu-tong",
    "\u6728\u901A",
    "M\xF9 T\u014Dng",
    "\u901A\u8349\u3001\u9644\u652F",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5BD2",
    "\u82E6",
    "\u5FC3\u3001\u5C0F\u80A0\u3001\u8180\u80F1\u7ECF",
    "\u85E4\u830E",
    "\u5229\u5C3F\u901A\u6DCB\u3001\u6E05\u5FC3\u9664\u70E6\u3001\u901A\u7ECF\u4E0B\u4E73"
  ),
  row(
    "tong-cao",
    "\u901A\u8349",
    "T\u014Dng C\u01CEo",
    "\u5BC7\u8131\u3001\u767D\u901A\u8349",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5FAE\u5BD2",
    "\u7518\u3001\u6DE1",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u830E\u9AD3",
    "\u6E05\u70ED\u5229\u5C3F\u3001\u901A\u6C14\u4E0B\u4E73"
  ),
  row(
    "yin-chen-hao",
    "\u8335\u9648\u84BF",
    "Y\u012Bn Ch\xE9n H\u0101o",
    "\u8335\u9648\u3001\u7EF5\u8335\u9648",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5FAE\u5BD2",
    "\u82E6\u3001\u8F9B",
    "\u813E\u3001\u80C3\u3001\u809D\u3001\u80C6\u7ECF",
    "\u5E7C\u82D7\u6216\u5730\u4E0A\u90E8\u5206",
    "\u6E05\u5229\u6E7F\u70ED\u3001\u5229\u80C6\u9000\u9EC4"
  ),
  row(
    "jin-qian-cao",
    "\u91D1\u94B1\u8349",
    "J\u012Bn Qi\xE1n C\u01CEo",
    "\u5E7F\u91D1\u94B1\u8349\u3001\u843D\u5730\u91D1\u94B1",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5FAE\u5BD2",
    "\u7518\u3001\u6DE1",
    "\u809D\u3001\u80C6\u3001\u80BE\u3001\u8180\u80F1\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u5229\u6E7F\u9000\u9EC4\u3001\u5229\u5C3F\u901A\u6DCB\u3001\u89E3\u6BD2\u6D88\u80BF"
  ),
  row(
    "fu-zi",
    "\u9644\u5B50",
    "F\xF9 Z\u01D0",
    "\u9ED1\u987A\u7247\u3001\u767D\u9644\u7247",
    "\u6E29\u91CC\u836F",
    "\u5927\u70ED",
    "\u8F9B\u3001\u7518",
    "\u5FC3\u3001\u80BE\u3001\u813E\u7ECF",
    "\u5B50\u6839\u52A0\u5DE5\u54C1",
    "\u56DE\u9633\u6551\u9006\u3001\u8865\u706B\u52A9\u9633\u3001\u6563\u5BD2\u6B62\u75DB"
  ),
  row(
    "gan-jiang",
    "\u5E72\u59DC",
    "G\u0101n Ji\u0101ng",
    "\u767D\u59DC\u3001\u5747\u59DC",
    "\u6E29\u91CC\u836F",
    "\u70ED",
    "\u8F9B",
    "\u813E\u3001\u80C3\u3001\u80BE\u3001\u5FC3\u3001\u80BA\u7ECF",
    "\u6839\u830E",
    "\u6E29\u4E2D\u6563\u5BD2\u3001\u56DE\u9633\u901A\u8109\u3001\u6E29\u80BA\u5316\u996E"
  ),
  row(
    "rou-gui",
    "\u8089\u6842",
    "R\xF2u Gu\xEC",
    "\u6842\u76AE\u3001\u7389\u6842",
    "\u6E29\u91CC\u836F",
    "\u5927\u70ED",
    "\u8F9B\u3001\u7518",
    "\u80BE\u3001\u813E\u3001\u5FC3\u3001\u809D\u7ECF",
    "\u6811\u76AE",
    "\u8865\u706B\u52A9\u9633\u3001\u6563\u5BD2\u6B62\u75DB\u3001\u6E29\u901A\u7ECF\u8109\u3001\u5F15\u706B\u5F52\u5143"
  ),
  row(
    "wu-zhu-yu",
    "\u5434\u8331\u8438",
    "W\xFA Zh\u016B Y\xFA",
    "\u5434\u8438\u3001\u8336\u8FA3",
    "\u6E29\u91CC\u836F",
    "\u70ED",
    "\u8F9B\u3001\u82E6",
    "\u809D\u3001\u813E\u3001\u80C3\u3001\u80BE\u7ECF",
    "\u8FD1\u6210\u719F\u679C\u5B9E",
    "\u6563\u5BD2\u6B62\u75DB\u3001\u964D\u9006\u6B62\u5455\u3001\u52A9\u9633\u6B62\u6CFB"
  ),
  row(
    "hua-jiao",
    "\u82B1\u6912",
    "Hu\u0101 Ji\u0101o",
    "\u8700\u6912\u3001\u5DDD\u6912",
    "\u6E29\u91CC\u836F",
    "\u6E29",
    "\u8F9B",
    "\u813E\u3001\u80C3\u3001\u80BE\u7ECF",
    "\u6210\u719F\u679C\u76AE",
    "\u6E29\u4E2D\u6B62\u75DB\u3001\u6740\u866B\u6B62\u75D2"
  ),
  row(
    "ding-xiang",
    "\u4E01\u9999",
    "D\u012Bng Xi\u0101ng",
    "\u516C\u4E01\u9999\u3001\u9E21\u820C\u9999",
    "\u6E29\u91CC\u836F",
    "\u6E29",
    "\u8F9B",
    "\u813E\u3001\u80C3\u3001\u80BE\u7ECF",
    "\u82B1\u857E",
    "\u6E29\u4E2D\u964D\u9006\u3001\u6563\u5BD2\u6B62\u75DB\u3001\u6E29\u80BE\u52A9\u9633"
  ),
  row(
    "xiao-hui-xiang",
    "\u5C0F\u8334\u9999",
    "Xi\u01CEo Hu\xED Xi\u0101ng",
    "\u8334\u9999\u3001\u8C37\u8334\u9999",
    "\u6E29\u91CC\u836F",
    "\u6E29",
    "\u8F9B",
    "\u809D\u3001\u80BE\u3001\u813E\u3001\u80C3\u7ECF",
    "\u679C\u5B9E",
    "\u6563\u5BD2\u6B62\u75DB\u3001\u7406\u6C14\u548C\u80C3"
  ),
  row(
    "chen-pi",
    "\u9648\u76AE",
    "Ch\xE9n P\xED",
    "\u6A58\u76AE\u3001\u5E7F\u9648\u76AE",
    "\u7406\u6C14\u836F",
    "\u6E29",
    "\u82E6\u3001\u8F9B",
    "\u80BA\u3001\u813E\u7ECF",
    "\u6210\u719F\u679C\u76AE",
    "\u7406\u6C14\u5065\u813E\u3001\u71E5\u6E7F\u5316\u75F0"
  ),
  row(
    "qing-pi",
    "\u9752\u76AE",
    "Q\u012Bng P\xED",
    "\u56DB\u82B1\u9752\u76AE\u3001\u4E2A\u9752\u76AE",
    "\u7406\u6C14\u836F",
    "\u6E29",
    "\u82E6\u3001\u8F9B",
    "\u809D\u3001\u80C6\u3001\u80C3\u7ECF",
    "\u5E7C\u679C\u6216\u672A\u6210\u719F\u679C\u76AE",
    "\u758F\u809D\u7834\u6C14\u3001\u6D88\u79EF\u5316\u6EDE"
  ),
  row(
    "zhi-shi",
    "\u67B3\u5B9E",
    "Zh\u01D0 Sh\xED",
    "\u6C5F\u67B3\u5B9E\u3001\u9E45\u773C\u67B3\u5B9E",
    "\u7406\u6C14\u836F",
    "\u5FAE\u5BD2",
    "\u82E6\u3001\u8F9B\u3001\u9178",
    "\u813E\u3001\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u5E7C\u679C",
    "\u7834\u6C14\u6D88\u79EF\u3001\u5316\u75F0\u9664\u75DE"
  ),
  row(
    "zhi-ke",
    "\u67B3\u58F3",
    "Zh\u01D0 K\xE9",
    "\u6C5F\u67B3\u58F3\u3001\u9999\u5706\u67B3\u58F3",
    "\u7406\u6C14\u836F",
    "\u5FAE\u5BD2",
    "\u82E6\u3001\u8F9B\u3001\u9178",
    "\u813E\u3001\u80C3\u7ECF",
    "\u672A\u6210\u719F\u679C\u5B9E",
    "\u7406\u6C14\u5BBD\u4E2D\u3001\u884C\u6EDE\u6D88\u80C0"
  ),
  row(
    "mu-xiang",
    "\u6728\u9999",
    "M\xF9 Xi\u0101ng",
    "\u5E7F\u6728\u9999\u3001\u4E91\u6728\u9999",
    "\u7406\u6C14\u836F",
    "\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u813E\u3001\u80C3\u3001\u5927\u80A0\u3001\u80C6\u7ECF",
    "\u6839",
    "\u884C\u6C14\u6B62\u75DB\u3001\u5065\u813E\u6D88\u98DF"
  ),
  row(
    "xiang-fu",
    "\u9999\u9644",
    "Xi\u0101ng F\xF9",
    "\u838E\u8349\u6839\u3001\u96F7\u516C\u5934",
    "\u7406\u6C14\u836F",
    "\u5E73",
    "\u8F9B\u3001\u5FAE\u82E6\u3001\u5FAE\u7518",
    "\u809D\u3001\u813E\u3001\u4E09\u7126\u7ECF",
    "\u6839\u830E",
    "\u758F\u809D\u89E3\u90C1\u3001\u7406\u6C14\u5BBD\u4E2D\u3001\u8C03\u7ECF\u6B62\u75DB"
  ),
  row(
    "wu-yao",
    "\u4E4C\u836F",
    "W\u016B Y\xE0o",
    "\u53F0\u4E4C\u836F\u3001\u5929\u53F0\u4E4C\u836F",
    "\u7406\u6C14\u836F",
    "\u6E29",
    "\u8F9B",
    "\u80BA\u3001\u813E\u3001\u80BE\u3001\u8180\u80F1\u7ECF",
    "\u6839",
    "\u884C\u6C14\u6B62\u75DB\u3001\u6E29\u80BE\u6563\u5BD2"
  ),
  row(
    "chen-xiang",
    "\u6C89\u9999",
    "Ch\xE9n Xi\u0101ng",
    "\u871C\u9999\u3001\u4F3D\u5357\u9999",
    "\u7406\u6C14\u836F",
    "\u5FAE\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u813E\u3001\u80C3\u3001\u80BE\u7ECF",
    "\u542B\u6811\u8102\u6728\u6750",
    "\u884C\u6C14\u6B62\u75DB\u3001\u6E29\u4E2D\u6B62\u5455\u3001\u7EB3\u6C14\u5E73\u5598"
  ),
  row(
    "chuan-lian-zi",
    "\u5DDD\u695D\u5B50",
    "Chu\u0101n Li\xE0n Z\u01D0",
    "\u91D1\u94C3\u5B50\u3001\u695D\u5B9E",
    "\u7406\u6C14\u836F",
    "\u5BD2",
    "\u82E6",
    "\u809D\u3001\u5C0F\u80A0\u3001\u8180\u80F1\u7ECF",
    "\u6210\u719F\u679C\u5B9E",
    "\u758F\u809D\u6CC4\u70ED\u3001\u884C\u6C14\u6B62\u75DB\u3001\u6740\u866B"
  ),
  row(
    "mei-gui-hua",
    "\u73AB\u7470\u82B1",
    "M\xE9i Gu\u012B Hu\u0101",
    "\u5F98\u5F8A\u82B1\u3001\u523A\u73AB\u82B1",
    "\u7406\u6C14\u836F",
    "\u6E29",
    "\u7518\u3001\u5FAE\u82E6",
    "\u809D\u3001\u813E\u7ECF",
    "\u82B1\u857E",
    "\u884C\u6C14\u89E3\u90C1\u3001\u548C\u8840\u6B62\u75DB"
  ),
  // 消食、驱虫、止血、活血
  row(
    "shan-zha",
    "\u5C71\u6942",
    "Sh\u0101n Zh\u0101",
    "\u5C71\u91CC\u7EA2\u3001\u7EA2\u679C",
    "\u6D88\u98DF\u836F",
    "\u5FAE\u6E29",
    "\u9178\u3001\u7518",
    "\u813E\u3001\u80C3\u3001\u809D\u7ECF",
    "\u6210\u719F\u679C\u5B9E",
    "\u6D88\u98DF\u5316\u79EF\u3001\u884C\u6C14\u6563\u7600\u3001\u5316\u6D4A\u964D\u8102"
  ),
  row(
    "shen-qu",
    "\u795E\u66F2",
    "Sh\xE9n Q\u016B",
    "\u516D\u795E\u66F2\u3001\u516D\u66F2",
    "\u6D88\u98DF\u836F",
    "\u6E29",
    "\u7518\u3001\u8F9B",
    "\u813E\u3001\u80C3\u7ECF",
    "\u53D1\u9175\u52A0\u5DE5\u54C1",
    "\u6D88\u98DF\u548C\u80C3"
  ),
  row(
    "mai-ya",
    "\u9EA6\u82BD",
    "M\xE0i Y\xE1",
    "\u5927\u9EA6\u82BD\u3001\u9EA6\u8616",
    "\u6D88\u98DF\u836F",
    "\u5E73",
    "\u7518",
    "\u813E\u3001\u80C3\u7ECF",
    "\u53D1\u82BD\u9896\u679C",
    "\u884C\u6C14\u6D88\u98DF\u3001\u5065\u813E\u5F00\u80C3\u3001\u56DE\u4E73\u6D88\u80C0"
  ),
  row(
    "ji-nei-jin",
    "\u9E21\u5185\u91D1",
    "J\u012B N\xE8i J\u012Bn",
    "\u9E21\u80AB\u76AE\u3001\u9E21\u9EC4\u76AE",
    "\u6D88\u98DF\u836F",
    "\u5E73",
    "\u7518",
    "\u813E\u3001\u80C3\u3001\u5C0F\u80A0\u3001\u8180\u80F1\u7ECF",
    "\u7802\u56CA\u5185\u58C1",
    "\u5065\u80C3\u6D88\u98DF\u3001\u6DA9\u7CBE\u6B62\u9057\u3001\u901A\u6DCB\u5316\u77F3"
  ),
  row(
    "bin-lang",
    "\u69DF\u6994",
    "B\u012Bng L\xE1ng",
    "\u5927\u8179\u5B50\u3001\u4EC1\u9891",
    "\u9A71\u866B\u836F",
    "\u6E29",
    "\u82E6\u3001\u8F9B",
    "\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u79CD\u5B50",
    "\u6740\u866B\u6D88\u79EF\u3001\u884C\u6C14\u3001\u5229\u6C34\u3001\u622A\u759F"
  ),
  row(
    "shi-jun-zi",
    "\u4F7F\u541B\u5B50",
    "Sh\u01D0 J\u016Bn Z\u01D0",
    "\u7559\u6C42\u5B50\u3001\u75C5\u67D1\u5B50",
    "\u9A71\u866B\u836F",
    "\u6E29",
    "\u7518",
    "\u813E\u3001\u80C3\u7ECF",
    "\u679C\u5B9E",
    "\u6740\u866B\u6D88\u79EF"
  ),
  row(
    "ku-lian-pi",
    "\u82E6\u695D\u76AE",
    "K\u01D4 Li\xE0n P\xED",
    "\u695D\u6839\u76AE\u3001\u82E6\u695D\u6839",
    "\u9A71\u866B\u836F",
    "\u5BD2",
    "\u82E6",
    "\u809D\u3001\u813E\u3001\u80C3\u7ECF",
    "\u6811\u76AE\u53CA\u6839\u76AE",
    "\u6740\u866B\u3001\u7597\u7663"
  ),
  row(
    "he-ye",
    "\u8377\u53F6",
    "H\xE9 Y\xE8",
    "\u83B2\u53F6\u3001\u85D5\u53F6",
    "\u6B62\u8840\u836F",
    "\u5E73",
    "\u82E6\u3001\u6DA9",
    "\u809D\u3001\u813E\u3001\u80C3\u7ECF",
    "\u53F6",
    "\u6E05\u6691\u5316\u6E7F\u3001\u5347\u53D1\u6E05\u9633\u3001\u51C9\u8840\u6B62\u8840"
  ),
  row(
    "bai-ji",
    "\u767D\u53CA",
    "B\xE1i J\xED",
    "\u767D\u6839\u3001\u8FDE\u53CA\u8349",
    "\u6B62\u8840\u836F",
    "\u5FAE\u5BD2",
    "\u82E6\u3001\u7518\u3001\u6DA9",
    "\u80BA\u3001\u80C3\u3001\u809D\u7ECF",
    "\u5757\u830E",
    "\u6536\u655B\u6B62\u8840\u3001\u6D88\u80BF\u751F\u808C"
  ),
  row(
    "xian-he-cao",
    "\u4ED9\u9E64\u8349",
    "Xi\u0101n H\xE8 C\u01CEo",
    "\u9F99\u82BD\u8349\u3001\u8131\u529B\u8349",
    "\u6B62\u8840\u836F",
    "\u5E73",
    "\u82E6\u3001\u6DA9",
    "\u80BA\u3001\u809D\u3001\u813E\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u6536\u655B\u6B62\u8840\u3001\u6B62\u75E2\u3001\u622A\u759F\u3001\u8865\u865A"
  ),
  row(
    "san-qi",
    "\u4E09\u4E03",
    "S\u0101n Q\u012B",
    "\u7530\u4E03\u3001\u91D1\u4E0D\u6362",
    "\u6B62\u8840\u836F",
    "\u6E29",
    "\u7518\u3001\u5FAE\u82E6",
    "\u809D\u3001\u80C3\u7ECF",
    "\u6839",
    "\u6563\u7600\u6B62\u8840\u3001\u6D88\u80BF\u5B9A\u75DB"
  ),
  row(
    "qian-cao",
    "\u831C\u8349",
    "Qi\xE0n C\u01CEo",
    "\u8840\u89C1\u6101\u3001\u7EA2\u6839\u8349",
    "\u6B62\u8840\u836F",
    "\u5BD2",
    "\u82E6",
    "\u809D\u7ECF",
    "\u6839\u53CA\u6839\u830E",
    "\u51C9\u8840\u5316\u7600\u6B62\u8840\u3001\u901A\u7ECF"
  ),
  row(
    "pu-huang",
    "\u84B2\u9EC4",
    "P\xFA Hu\xE1ng",
    "\u9999\u84B2\u3001\u84B2\u8349\u9EC4",
    "\u6B62\u8840\u836F",
    "\u5E73",
    "\u7518",
    "\u809D\u3001\u5FC3\u5305\u7ECF",
    "\u82B1\u7C89",
    "\u6B62\u8840\u3001\u5316\u7600\u3001\u5229\u5C3F"
  ),
  row(
    "chuan-xiong",
    "\u5DDD\u828E",
    "Chu\u0101n Xi\u014Dng",
    "\u828E\u85ED\u3001\u629A\u828E",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u6E29",
    "\u8F9B",
    "\u809D\u3001\u80C6\u3001\u5FC3\u5305\u7ECF",
    "\u6839\u830E",
    "\u6D3B\u8840\u884C\u6C14\u3001\u795B\u98CE\u6B62\u75DB"
  ),
  row(
    "yan-hu-suo",
    "\u5EF6\u80E1\u7D22",
    "Y\xE1n H\xFA Su\u01D2",
    "\u7384\u80E1\u7D22\u3001\u5143\u80E1",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u809D\u3001\u813E\u3001\u5FC3\u3001\u80BA\u7ECF",
    "\u5757\u830E",
    "\u6D3B\u8840\u3001\u884C\u6C14\u3001\u6B62\u75DB"
  ),
  row(
    "yu-jin",
    "\u90C1\u91D1",
    "Y\xF9 J\u012Bn",
    "\u9EC4\u90C1\u91D1\u3001\u9ED1\u90C1\u91D1",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u5BD2",
    "\u8F9B\u3001\u82E6",
    "\u809D\u3001\u5FC3\u3001\u80BA\u7ECF",
    "\u5757\u6839",
    "\u6D3B\u8840\u6B62\u75DB\u3001\u884C\u6C14\u89E3\u90C1\u3001\u6E05\u5FC3\u51C9\u8840\u3001\u5229\u80C6\u9000\u9EC4"
  ),
  row(
    "jiang-huang",
    "\u59DC\u9EC4",
    "Ji\u0101ng Hu\xE1ng",
    "\u5B9D\u9F0E\u9999\u3001\u9EC4\u59DC",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u813E\u3001\u809D\u7ECF",
    "\u6839\u830E",
    "\u7834\u8840\u884C\u6C14\u3001\u901A\u7ECF\u6B62\u75DB"
  ),
  row(
    "e-zhu",
    "\u83AA\u672F",
    "\xC9 Zh\xFA",
    "\u84EC\u83AA\u672F\u3001\u9ED1\u5FC3\u59DC",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u809D\u3001\u813E\u7ECF",
    "\u6839\u830E",
    "\u7834\u8840\u884C\u6C14\u3001\u6D88\u79EF\u6B62\u75DB"
  ),
  row(
    "ru-xiang",
    "\u4E73\u9999",
    "R\u01D4 Xi\u0101ng",
    "\u9A6C\u601D\u7B54\u5409\u3001\u718F\u9646\u9999",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u5FC3\u3001\u809D\u3001\u813E\u7ECF",
    "\u6811\u8102",
    "\u6D3B\u8840\u5B9A\u75DB\u3001\u6D88\u80BF\u751F\u808C"
  ),
  row(
    "mo-yao",
    "\u6CA1\u836F",
    "M\xF2 Y\xE0o",
    "\u672B\u836F\u3001\u660E\u6CA1\u836F",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u5E73",
    "\u82E6",
    "\u5FC3\u3001\u809D\u3001\u813E\u7ECF",
    "\u6811\u8102",
    "\u6563\u7600\u5B9A\u75DB\u3001\u6D88\u80BF\u751F\u808C"
  ),
  row(
    "dan-shen",
    "\u4E39\u53C2",
    "D\u0101n Sh\u0113n",
    "\u8D64\u53C2\u3001\u7D2B\u4E39\u53C2",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u5FAE\u5BD2",
    "\u82E6",
    "\u5FC3\u3001\u5FC3\u5305\u3001\u809D\u7ECF",
    "\u6839\u53CA\u6839\u830E",
    "\u6D3B\u8840\u795B\u7600\u3001\u901A\u7ECF\u6B62\u75DB\u3001\u6E05\u5FC3\u9664\u70E6\u3001\u51C9\u8840\u6D88\u75C8"
  ),
  row(
    "yi-mu-cao",
    "\u76CA\u6BCD\u8349",
    "Y\xEC M\u01D4 C\u01CEo",
    "\u5764\u8349\u3001\u833A\u851A",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u5FAE\u5BD2",
    "\u82E6\u3001\u8F9B",
    "\u809D\u3001\u5FC3\u5305\u3001\u8180\u80F1\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u6D3B\u8840\u8C03\u7ECF\u3001\u5229\u5C3F\u6D88\u80BF\u3001\u6E05\u70ED\u89E3\u6BD2"
  ),
  row(
    "tao-ren",
    "\u6843\u4EC1",
    "T\xE1o R\xE9n",
    "\u6843\u6838\u4EC1\u3001\u6BDB\u6843\u4EC1",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u5E73",
    "\u82E6\u3001\u7518",
    "\u5FC3\u3001\u809D\u3001\u5927\u80A0\u7ECF",
    "\u79CD\u5B50",
    "\u6D3B\u8840\u795B\u7600\u3001\u6DA6\u80A0\u901A\u4FBF\u3001\u6B62\u54B3\u5E73\u5598"
  ),
  row(
    "hong-hua",
    "\u7EA2\u82B1",
    "H\xF3ng Hu\u0101",
    "\u8349\u7EA2\u82B1\u3001\u7EA2\u84DD\u82B1",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u6E29",
    "\u8F9B",
    "\u5FC3\u3001\u809D\u7ECF",
    "\u82B1",
    "\u6D3B\u8840\u901A\u7ECF\u3001\u6563\u7600\u6B62\u75DB"
  ),
  row(
    "wu-ling-zhi",
    "\u4E94\u7075\u8102",
    "W\u01D4 L\xEDng Zh\u012B",
    "\u7075\u8102\u3001\u5BD2\u53F7\u866B\u7CAA",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u6E29",
    "\u82E6\u3001\u7518",
    "\u809D\u7ECF",
    "\u7CAA\u4FBF",
    "\u6D3B\u8840\u6B62\u75DB\u3001\u5316\u7600\u6B62\u8840"
  ),
  row(
    "shui-zhi",
    "\u6C34\u86ED",
    "Shu\u01D0 Zh\xEC",
    "\u8682\u87E5\u3001\u9A6C\u9CD6",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u5E73",
    "\u54B8\u3001\u82E6",
    "\u809D\u7ECF",
    "\u5E72\u71E5\u5168\u4F53",
    "\u7834\u8840\u9010\u7600\u3001\u901A\u7ECF"
  ),
  row(
    "meng-chong",
    "\u867B\u866B",
    "M\xE9ng Ch\xF3ng",
    "\u725B\u867B\u3001\u778E\u867B",
    "\u6D3B\u8840\u5316\u7600\u836F",
    "\u5FAE\u5BD2",
    "\u82E6",
    "\u809D\u7ECF",
    "\u96CC\u866B\u5E72\u71E5\u4F53",
    "\u7834\u8840\u9010\u7600\u3001\u6563\u7ED3\u6D88\u7665"
  ),
  // 化痰、止咳、安神、平肝
  row(
    "ban-xia",
    "\u534A\u590F",
    "B\xE0n Xi\xE0",
    "\u5236\u534A\u590F\u3001\u6CD5\u534A\u590F",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u6E29",
    "\u8F9B",
    "\u813E\u3001\u80C3\u3001\u80BA\u7ECF",
    "\u5757\u830E",
    "\u71E5\u6E7F\u5316\u75F0\u3001\u964D\u9006\u6B62\u5455\u3001\u6D88\u75DE\u6563\u7ED3"
  ),
  row(
    "tian-nan-xing",
    "\u5929\u5357\u661F",
    "Ti\u0101n N\xE1n X\u012Bng",
    "\u5357\u661F\u3001\u80C6\u5357\u661F",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u6E29",
    "\u82E6\u3001\u8F9B",
    "\u80BA\u3001\u809D\u3001\u813E\u7ECF",
    "\u5757\u830E",
    "\u71E5\u6E7F\u5316\u75F0\u3001\u795B\u98CE\u6B62\u75C9\u3001\u6563\u7ED3\u6D88\u80BF"
  ),
  row(
    "bai-jie-zi",
    "\u767D\u82A5\u5B50",
    "B\xE1i Ji\xE8 Z\u01D0",
    "\u8FA3\u83DC\u5B50\u3001\u9EC4\u82A5\u5B50",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u6E29",
    "\u8F9B",
    "\u80BA\u7ECF",
    "\u6210\u719F\u79CD\u5B50",
    "\u6E29\u80BA\u5316\u75F0\u3001\u5229\u6C14\u6563\u7ED3\u3001\u901A\u7EDC\u6B62\u75DB"
  ),
  row(
    "chuan-bei-mu",
    "\u5DDD\u8D1D\u6BCD",
    "Chu\u0101n B\xE8i M\u01D4",
    "\u677E\u8D1D\u3001\u9752\u8D1D",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5FAE\u5BD2",
    "\u7518\u3001\u82E6",
    "\u80BA\u3001\u5FC3\u7ECF",
    "\u9CDE\u830E",
    "\u6E05\u70ED\u6DA6\u80BA\u3001\u5316\u75F0\u6B62\u54B3\u3001\u6563\u7ED3\u6D88\u75C8"
  ),
  row(
    "zhe-bei-mu",
    "\u6D59\u8D1D\u6BCD",
    "Zh\xE8 B\xE8i M\u01D4",
    "\u5927\u8D1D\u3001\u8C61\u8D1D",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5BD2",
    "\u82E6",
    "\u80BA\u3001\u5FC3\u7ECF",
    "\u9CDE\u830E",
    "\u6E05\u70ED\u5316\u75F0\u3001\u6563\u7ED3\u6D88\u75C8"
  ),
  row(
    "gua-lou",
    "\u74DC\u848C",
    "Gu\u0101 L\xF3u",
    "\u5168\u74DC\u848C\u3001\u836F\u74DC",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5BD2",
    "\u7518\u3001\u5FAE\u82E6",
    "\u80BA\u3001\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u679C\u5B9E",
    "\u6E05\u70ED\u6DA4\u75F0\u3001\u5BBD\u80F8\u6563\u7ED3\u3001\u6DA6\u71E5\u6ED1\u80A0"
  ),
  row(
    "zhu-ru",
    "\u7AF9\u8339",
    "Zh\xFA R\xFA",
    "\u7AF9\u76AE\u3001\u6DE1\u7AF9\u8339",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5FAE\u5BD2",
    "\u7518",
    "\u80BA\u3001\u80C3\u3001\u80C6\u7ECF",
    "\u830E\u7684\u4E2D\u95F4\u5C42",
    "\u6E05\u70ED\u5316\u75F0\u3001\u9664\u70E6\u6B62\u5455"
  ),
  row(
    "qian-hu",
    "\u524D\u80E1",
    "Qi\xE1n H\xFA",
    "\u767D\u82B1\u524D\u80E1\u3001\u5CA9\u98CE",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5FAE\u5BD2",
    "\u82E6\u3001\u8F9B",
    "\u80BA\u7ECF",
    "\u6839",
    "\u964D\u6C14\u5316\u75F0\u3001\u6563\u98CE\u6E05\u70ED"
  ),
  row(
    "jie-geng",
    "\u6854\u6897",
    "Ji\xE9 G\u011Bng",
    "\u82E6\u6854\u6897\u3001\u94C3\u94DB\u82B1",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5E73",
    "\u82E6\u3001\u8F9B",
    "\u80BA\u7ECF",
    "\u6839",
    "\u5BA3\u80BA\u3001\u5229\u54BD\u3001\u795B\u75F0\u3001\u6392\u8113"
  ),
  row(
    "xing-ren",
    "\u674F\u4EC1",
    "X\xECng R\xE9n",
    "\u82E6\u674F\u4EC1\u3001\u674F\u6838\u4EC1",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5FAE\u6E29",
    "\u82E6",
    "\u80BA\u3001\u5927\u80A0\u7ECF",
    "\u79CD\u5B50",
    "\u964D\u6C14\u6B62\u54B3\u5E73\u5598\u3001\u6DA6\u80A0\u901A\u4FBF"
  ),
  row(
    "su-zi",
    "\u82CF\u5B50",
    "S\u016B Z\u01D0",
    "\u7D2B\u82CF\u5B50\u3001\u9ED1\u82CF\u5B50",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u6E29",
    "\u8F9B",
    "\u80BA\u3001\u5927\u80A0\u7ECF",
    "\u6210\u719F\u679C\u5B9E",
    "\u964D\u6C14\u5316\u75F0\u3001\u6B62\u54B3\u5E73\u5598\u3001\u6DA6\u80A0\u901A\u4FBF"
  ),
  row(
    "bai-bu",
    "\u767E\u90E8",
    "B\u01CEi B\xF9",
    "\u767E\u6761\u6839\u3001\u91CE\u5929\u95E8\u51AC",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5FAE\u6E29",
    "\u7518\u3001\u82E6",
    "\u80BA\u7ECF",
    "\u5757\u6839",
    "\u6DA6\u80BA\u4E0B\u6C14\u6B62\u54B3\u3001\u6740\u866B\u706D\u8671"
  ),
  row(
    "zi-wan",
    "\u7D2B\u83C0",
    "Z\u01D0 W\u01CEn",
    "\u9752\u83C0\u3001\u5C0F\u8FAB",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5FAE\u6E29",
    "\u8F9B\u3001\u82E6",
    "\u80BA\u7ECF",
    "\u6839\u53CA\u6839\u830E",
    "\u6DA6\u80BA\u4E0B\u6C14\u3001\u5316\u75F0\u6B62\u54B3"
  ),
  row(
    "kuan-dong-hua",
    "\u6B3E\u51AC\u82B1",
    "Ku\u01CEn D\u014Dng Hu\u0101",
    "\u51AC\u82B1\u3001\u6B3E\u82B1",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u6E29",
    "\u8F9B\u3001\u5FAE\u82E6",
    "\u80BA\u7ECF",
    "\u82B1\u857E",
    "\u6DA6\u80BA\u4E0B\u6C14\u3001\u6B62\u54B3\u5316\u75F0"
  ),
  row(
    "ma-huang-gen",
    "\u9EBB\u9EC4\u6839",
    "M\xE1 Hu\xE1ng G\u0113n",
    "\u9EBB\u9EC4\u6839\u830E",
    "\u6536\u6DA9\u836F",
    "\u5E73",
    "\u7518\u3001\u5FAE\u82E6",
    "\u5FC3\u3001\u80BA\u7ECF",
    "\u6839\u53CA\u6839\u830E",
    "\u56FA\u8868\u6B62\u6C57"
  ),
  row(
    "yuan-zhi",
    "\u8FDC\u5FD7",
    "Yu\u01CEn Zh\xEC",
    "\u5C0F\u8349\u3001\u7EC6\u8349",
    "\u5B89\u795E\u836F",
    "\u6E29",
    "\u82E6\u3001\u8F9B",
    "\u5FC3\u3001\u80BE\u3001\u80BA\u7ECF",
    "\u6839",
    "\u5B89\u795E\u76CA\u667A\u3001\u4EA4\u901A\u5FC3\u80BE\u3001\u795B\u75F0\u3001\u6D88\u80BF"
  ),
  row(
    "suan-zao-ren",
    "\u9178\u67A3\u4EC1",
    "Su\u0101n Z\u01CEo R\xE9n",
    "\u5C71\u67A3\u4EC1\u3001\u9178\u67A3\u6838",
    "\u5B89\u795E\u836F",
    "\u5E73",
    "\u7518\u3001\u9178",
    "\u5FC3\u3001\u809D\u3001\u80C6\u7ECF",
    "\u79CD\u5B50",
    "\u517B\u5FC3\u8865\u809D\u3001\u5B81\u5FC3\u5B89\u795E\u3001\u655B\u6C57\u3001\u751F\u6D25"
  ),
  row(
    "bai-zi-ren",
    "\u67CF\u5B50\u4EC1",
    "B\u01CEi Z\u01D0 R\xE9n",
    "\u67CF\u4EC1\u3001\u4FA7\u67CF\u5B50",
    "\u5B89\u795E\u836F",
    "\u5E73",
    "\u7518",
    "\u5FC3\u3001\u80BE\u3001\u5927\u80A0\u7ECF",
    "\u79CD\u4EC1",
    "\u517B\u5FC3\u5B89\u795E\u3001\u6DA6\u80A0\u901A\u4FBF"
  ),
  row(
    "he-huan-pi",
    "\u5408\u6B22\u76AE",
    "H\xE9 Hu\u0101n P\xED",
    "\u591C\u5408\u76AE\u3001\u5408\u660F\u76AE",
    "\u5B89\u795E\u836F",
    "\u5E73",
    "\u7518",
    "\u5FC3\u3001\u809D\u3001\u80BA\u7ECF",
    "\u6811\u76AE",
    "\u89E3\u90C1\u5B89\u795E\u3001\u6D3B\u8840\u6D88\u80BF"
  ),
  row(
    "long-gu",
    "\u9F99\u9AA8",
    "L\xF3ng G\u01D4",
    "\u4E94\u82B1\u9F99\u9AA8\u3001\u571F\u9F99\u9AA8",
    "\u5B89\u795E\u836F",
    "\u5E73",
    "\u7518\u3001\u6DA9",
    "\u5FC3\u3001\u809D\u3001\u80BE\u7ECF",
    "\u53E4\u4EE3\u5927\u578B\u54FA\u4E73\u52A8\u7269\u5316\u77F3",
    "\u9547\u60CA\u5B89\u795E\u3001\u5E73\u809D\u6F5C\u9633\u3001\u6536\u655B\u56FA\u6DA9"
  ),
  row(
    "mu-li",
    "\u7261\u86CE",
    "M\u01D4 L\xEC",
    "\u5DE6\u7261\u86CE\u3001\u6D77\u86CE\u5B50\u58F3",
    "\u5B89\u795E\u836F",
    "\u5FAE\u5BD2",
    "\u54B8",
    "\u809D\u3001\u80C6\u3001\u80BE\u7ECF",
    "\u8D1D\u58F3",
    "\u91CD\u9547\u5B89\u795E\u3001\u6F5C\u9633\u8865\u9634\u3001\u8F6F\u575A\u6563\u7ED3\u3001\u6536\u655B\u56FA\u6DA9"
  ),
  row(
    "shi-jue-ming",
    "\u77F3\u51B3\u660E",
    "Sh\xED Ju\xE9 M\xEDng",
    "\u9C8D\u9C7C\u58F3\u3001\u5343\u91CC\u5149",
    "\u5E73\u809D\u606F\u98CE\u836F",
    "\u5BD2",
    "\u54B8",
    "\u809D\u7ECF",
    "\u8D1D\u58F3",
    "\u5E73\u809D\u6F5C\u9633\u3001\u6E05\u809D\u660E\u76EE"
  ),
  row(
    "zhen-zhu-mu",
    "\u73CD\u73E0\u6BCD",
    "Zh\u0113n Zh\u016B M\u01D4",
    "\u73E0\u6BCD\u3001\u771F\u73E0\u6BCD",
    "\u5E73\u809D\u606F\u98CE\u836F",
    "\u5BD2",
    "\u54B8",
    "\u809D\u3001\u5FC3\u7ECF",
    "\u8D1D\u58F3",
    "\u5E73\u809D\u6F5C\u9633\u3001\u5B89\u795E\u5B9A\u60CA\u3001\u660E\u76EE\u9000\u7FF3"
  ),
  row(
    "dai-zhe-shi",
    "\u4EE3\u8D6D\u77F3",
    "D\xE0i Zh\u011B Sh\xED",
    "\u8D6D\u77F3\u3001\u9489\u5934\u8D6D\u77F3",
    "\u5E73\u809D\u606F\u98CE\u836F",
    "\u5BD2",
    "\u82E6",
    "\u809D\u3001\u5FC3\u3001\u80C3\u7ECF",
    "\u77FF\u7269",
    "\u5E73\u809D\u6F5C\u9633\u3001\u91CD\u9547\u964D\u9006\u3001\u51C9\u8840\u6B62\u8840"
  ),
  row(
    "gou-teng",
    "\u94A9\u85E4",
    "G\u014Du T\xE9ng",
    "\u53CC\u94A9\u85E4\u3001\u5012\u6302\u523A",
    "\u5E73\u809D\u606F\u98CE\u836F",
    "\u5FAE\u5BD2",
    "\u7518",
    "\u809D\u3001\u5FC3\u5305\u7ECF",
    "\u5E26\u94A9\u830E\u679D",
    "\u6E05\u70ED\u5E73\u809D\u3001\u606F\u98CE\u5B9A\u60CA"
  ),
  row(
    "tian-ma",
    "\u5929\u9EBB",
    "Ti\u0101n M\xE1",
    "\u660E\u5929\u9EBB\u3001\u8D64\u7BAD",
    "\u5E73\u809D\u606F\u98CE\u836F",
    "\u5E73",
    "\u7518",
    "\u809D\u7ECF",
    "\u5757\u830E",
    "\u606F\u98CE\u6B62\u75C9\u3001\u5E73\u6291\u809D\u9633\u3001\u795B\u98CE\u901A\u7EDC"
  ),
  row(
    "quan-xie",
    "\u5168\u874E",
    "Qu\xE1n Xi\u0113",
    "\u5168\u866B\u3001\u874E\u5B50",
    "\u5E73\u809D\u606F\u98CE\u836F",
    "\u5E73",
    "\u8F9B",
    "\u809D\u7ECF",
    "\u5E72\u71E5\u4F53",
    "\u606F\u98CE\u9547\u75C9\u3001\u653B\u6BD2\u6563\u7ED3\u3001\u901A\u7EDC\u6B62\u75DB"
  ),
  row(
    "wu-gong",
    "\u8708\u86A3",
    "W\xFA G\u014Dng",
    "\u5929\u9F99\u3001\u767E\u8DB3\u866B",
    "\u5E73\u809D\u606F\u98CE\u836F",
    "\u6E29",
    "\u8F9B",
    "\u809D\u7ECF",
    "\u5E72\u71E5\u4F53",
    "\u606F\u98CE\u9547\u75C9\u3001\u653B\u6BD2\u6563\u7ED3\u3001\u901A\u7EDC\u6B62\u75DB"
  ),
  // 补虚、收涩、外用与经方常用辅料
  row(
    "ren-shen",
    "\u4EBA\u53C2",
    "R\xE9n Sh\u0113n",
    "\u91CE\u5C71\u53C2\u3001\u56ED\u53C2",
    "\u8865\u865A\u836F",
    "\u5FAE\u6E29",
    "\u7518\u3001\u5FAE\u82E6",
    "\u813E\u3001\u80BA\u3001\u5FC3\u3001\u80BE\u7ECF",
    "\u6839\u53CA\u6839\u830E",
    "\u5927\u8865\u5143\u6C14\u3001\u8865\u813E\u76CA\u80BA\u3001\u751F\u6D25\u517B\u8840\u3001\u5B89\u795E\u76CA\u667A"
  ),
  row(
    "dang-shen",
    "\u515A\u53C2",
    "D\u01CEng Sh\u0113n",
    "\u6F5E\u515A\u53C2\u3001\u53F0\u515A\u53C2",
    "\u8865\u865A\u836F",
    "\u5E73",
    "\u7518",
    "\u813E\u3001\u80BA\u7ECF",
    "\u6839",
    "\u8865\u4E2D\u76CA\u6C14\u3001\u751F\u6D25\u517B\u8840"
  ),
  row(
    "huang-qi",
    "\u9EC4\u82AA",
    "Hu\xE1ng Q\xED",
    "\u5317\u82AA\u3001\u7EF5\u9EC4\u82AA",
    "\u8865\u865A\u836F",
    "\u5FAE\u6E29",
    "\u7518",
    "\u813E\u3001\u80BA\u7ECF",
    "\u6839",
    "\u8865\u6C14\u3001\u56FA\u8868\u3001\u5229\u6C34\u3001\u6258\u6BD2\u3001\u751F\u808C"
  ),
  row(
    "bai-zhu",
    "\u767D\u672F",
    "B\xE1i Zh\xFA",
    "\u51AC\u672F\u3001\u4E8E\u672F",
    "\u8865\u865A\u836F",
    "\u6E29",
    "\u82E6\u3001\u7518",
    "\u813E\u3001\u80C3\u7ECF",
    "\u6839\u830E",
    "\u5065\u813E\u76CA\u6C14\u3001\u71E5\u6E7F\u5229\u6C34\u3001\u6B62\u6C57\u3001\u5B89\u80CE"
  ),
  row(
    "shan-yao",
    "\u5C71\u836F",
    "Sh\u0101n Y\xE0o",
    "\u85AF\u84E3\u3001\u6000\u5C71\u836F",
    "\u8865\u865A\u836F",
    "\u5E73",
    "\u7518",
    "\u813E\u3001\u80BA\u3001\u80BE\u7ECF",
    "\u5757\u830E",
    "\u8865\u813E\u517B\u80C3\u3001\u751F\u6D25\u76CA\u80BA\u3001\u8865\u80BE\u6DA9\u7CBE"
  ),
  row(
    "bai-bian-dou",
    "\u767D\u6241\u8C46",
    "B\xE1i Bi\u01CEn D\xF2u",
    "\u6241\u8C46\u3001\u5CE8\u7709\u8C46",
    "\u8865\u865A\u836F",
    "\u5FAE\u6E29",
    "\u7518",
    "\u813E\u3001\u80C3\u7ECF",
    "\u6210\u719F\u79CD\u5B50",
    "\u5065\u813E\u5316\u6E7F\u3001\u548C\u4E2D\u6D88\u6691"
  ),
  row(
    "gan-cao",
    "\u7518\u8349",
    "G\u0101n C\u01CEo",
    "\u56FD\u8001\u3001\u7C89\u8349\u3001\u7099\u7518\u8349\u3001\u751F\u7518\u8349",
    "\u8865\u865A\u836F",
    "\u5E73",
    "\u7518",
    "\u5FC3\u3001\u80BA\u3001\u813E\u3001\u80C3\u7ECF",
    "\u6839\u53CA\u6839\u830E",
    "\u8865\u813E\u76CA\u6C14\u3001\u795B\u75F0\u6B62\u54B3\u3001\u7F13\u6025\u6B62\u75DB\u3001\u8C03\u548C\u8BF8\u836F"
  ),
  row(
    "lu-rong",
    "\u9E7F\u8338",
    "L\xF9 R\xF3ng",
    "\u6591\u9F99\u73E0\u3001\u8840\u8338",
    "\u8865\u865A\u836F",
    "\u6E29",
    "\u7518\u3001\u54B8",
    "\u80BE\u3001\u809D\u7ECF",
    "\u672A\u9AA8\u5316\u5E7C\u89D2",
    "\u8865\u80BE\u9633\u3001\u76CA\u7CBE\u8840\u3001\u5F3A\u7B4B\u9AA8\u3001\u8C03\u51B2\u4EFB\u3001\u6258\u75AE\u6BD2"
  ),
  row(
    "du-zhong",
    "\u675C\u4EF2",
    "D\xF9 Zh\xF2ng",
    "\u601D\u4ED9\u3001\u626F\u4E1D\u76AE",
    "\u8865\u865A\u836F",
    "\u6E29",
    "\u7518",
    "\u809D\u3001\u80BE\u7ECF",
    "\u6811\u76AE",
    "\u8865\u809D\u80BE\u3001\u5F3A\u7B4B\u9AA8\u3001\u5B89\u80CE"
  ),
  row(
    "xu-duan",
    "\u7EED\u65AD",
    "X\xF9 Du\xE0n",
    "\u63A5\u9AA8\u8349\u3001\u5DDD\u7EED\u65AD",
    "\u8865\u865A\u836F",
    "\u5FAE\u6E29",
    "\u82E6\u3001\u7518\u3001\u8F9B",
    "\u809D\u3001\u80BE\u7ECF",
    "\u6839",
    "\u8865\u809D\u80BE\u3001\u5F3A\u7B4B\u9AA8\u3001\u7EED\u6298\u4F24\u3001\u6B62\u5D29\u6F0F"
  ),
  row(
    "bu-gu-zhi",
    "\u8865\u9AA8\u8102",
    "B\u01D4 G\u01D4 Zh\u012B",
    "\u7834\u6545\u7EB8\u3001\u80E1\u97ED\u5B50",
    "\u8865\u865A\u836F",
    "\u6E29",
    "\u82E6\u3001\u8F9B",
    "\u80BE\u3001\u813E\u7ECF",
    "\u679C\u5B9E",
    "\u8865\u80BE\u58EE\u9633\u3001\u6E29\u813E\u6B62\u6CFB"
  ),
  row(
    "rou-cong-rong",
    "\u8089\u82C1\u84C9",
    "R\xF2u C\u014Dng R\xF3ng",
    "\u82C1\u84C9\u3001\u5927\u82B8",
    "\u8865\u865A\u836F",
    "\u6E29",
    "\u7518\u3001\u54B8",
    "\u80BE\u3001\u5927\u80A0\u7ECF",
    "\u8089\u8D28\u830E",
    "\u8865\u80BE\u9633\u3001\u76CA\u7CBE\u8840\u3001\u6DA6\u80A0\u901A\u4FBF"
  ),
  row(
    "tu-si-zi",
    "\u83DF\u4E1D\u5B50",
    "T\xF9 S\u012B Z\u01D0",
    "\u8C46\u5BC4\u751F\u3001\u65E0\u6839\u8349",
    "\u8865\u865A\u836F",
    "\u5E73",
    "\u8F9B\u3001\u7518",
    "\u809D\u3001\u80BE\u3001\u813E\u7ECF",
    "\u79CD\u5B50",
    "\u8865\u80BE\u76CA\u7CBE\u3001\u517B\u809D\u660E\u76EE\u3001\u6B62\u6CFB\u3001\u5B89\u80CE"
  ),
  row(
    "dang-gui",
    "\u5F53\u5F52",
    "D\u0101ng Gu\u012B",
    "\u79E6\u5F52\u3001\u4E91\u5F52",
    "\u8865\u865A\u836F",
    "\u6E29",
    "\u7518\u3001\u8F9B",
    "\u809D\u3001\u5FC3\u3001\u813E\u7ECF",
    "\u6839",
    "\u8865\u8840\u6D3B\u8840\u3001\u8C03\u7ECF\u6B62\u75DB\u3001\u6DA6\u80A0\u901A\u4FBF"
  ),
  row(
    "shu-di-huang",
    "\u719F\u5730\u9EC4",
    "Sh\xFA D\xEC Hu\xE1ng",
    "\u719F\u5730\u3001\u4F0F\u5730",
    "\u8865\u865A\u836F",
    "\u5FAE\u6E29",
    "\u7518",
    "\u809D\u3001\u80BE\u7ECF",
    "\u52A0\u5DE5\u5757\u6839",
    "\u8865\u8840\u6ECB\u9634\u3001\u76CA\u7CBE\u586B\u9AD3"
  ),
  row(
    "bai-shao",
    "\u767D\u828D",
    "B\xE1i Sh\xE1o",
    "\u828D\u836F\u3001\u767D\u828D\u836F",
    "\u8865\u865A\u836F",
    "\u5FAE\u5BD2",
    "\u82E6\u3001\u9178",
    "\u809D\u3001\u813E\u7ECF",
    "\u6839",
    "\u517B\u8840\u8C03\u7ECF\u3001\u655B\u9634\u6B62\u6C57\u3001\u67D4\u809D\u6B62\u75DB\u3001\u5E73\u6291\u809D\u9633"
  ),
  row(
    "e-jiao",
    "\u963F\u80F6",
    "\u0100 Ji\u0101o",
    "\u5085\u81F4\u80F6\u3001\u9A74\u76AE\u80F6",
    "\u8865\u865A\u836F",
    "\u5E73",
    "\u7518",
    "\u80BA\u3001\u809D\u3001\u80BE\u7ECF",
    "\u9A74\u76AE\u71AC\u5236\u80F6\u5757",
    "\u8865\u8840\u6ECB\u9634\u3001\u6DA6\u71E5\u3001\u6B62\u8840"
  ),
  row(
    "he-shou-wu",
    "\u4F55\u9996\u4E4C",
    "H\xE9 Sh\u01D2u W\u016B",
    "\u9996\u4E4C\u3001\u8D64\u9996\u4E4C",
    "\u8865\u865A\u836F",
    "\u6E29",
    "\u82E6\u3001\u7518\u3001\u6DA9",
    "\u809D\u3001\u80BE\u7ECF",
    "\u5757\u6839",
    "\u8865\u76CA\u7CBE\u8840\u3001\u89E3\u6BD2\u3001\u622A\u759F\u3001\u6DA6\u80A0\u901A\u4FBF"
  ),
  row(
    "gou-qi-zi",
    "\u67B8\u675E\u5B50",
    "G\u01D2u Q\u01D0 Z\u01D0",
    "\u67B8\u675E\u3001\u751C\u83DC\u5B50",
    "\u8865\u865A\u836F",
    "\u5E73",
    "\u7518",
    "\u809D\u3001\u80BE\u7ECF",
    "\u6210\u719F\u679C\u5B9E",
    "\u6ECB\u8865\u809D\u80BE\u3001\u76CA\u7CBE\u660E\u76EE"
  ),
  row(
    "mai-men-dong",
    "\u9EA6\u51AC",
    "M\xE0i M\xE9n D\u014Dng",
    "\u9EA6\u95E8\u51AC\u3001\u5BF8\u51AC",
    "\u8865\u865A\u836F",
    "\u5FAE\u5BD2",
    "\u7518\u3001\u5FAE\u82E6",
    "\u5FC3\u3001\u80BA\u3001\u80C3\u7ECF",
    "\u5757\u6839",
    "\u517B\u9634\u751F\u6D25\u3001\u6DA6\u80BA\u6E05\u5FC3"
  ),
  row(
    "tian-men-dong",
    "\u5929\u51AC",
    "Ti\u0101n M\xE9n D\u014Dng",
    "\u5929\u95E8\u51AC\u3001\u98A0\u68D8",
    "\u8865\u865A\u836F",
    "\u5927\u5BD2",
    "\u7518\u3001\u82E6",
    "\u80BA\u3001\u80BE\u7ECF",
    "\u5757\u6839",
    "\u517B\u9634\u6DA6\u71E5\u3001\u6E05\u80BA\u751F\u6D25"
  ),
  row(
    "shi-hu",
    "\u77F3\u659B",
    "Sh\xED H\xFA",
    "\u91D1\u9497\u77F3\u659B\u3001\u67AB\u6597",
    "\u8865\u865A\u836F",
    "\u5FAE\u5BD2",
    "\u7518",
    "\u80C3\u3001\u80BE\u7ECF",
    "\u830E",
    "\u76CA\u80C3\u751F\u6D25\u3001\u6ECB\u9634\u6E05\u70ED"
  ),
  row(
    "yu-zhu",
    "\u7389\u7AF9",
    "Y\xF9 Zh\xFA",
    "\u840E\u8564\u3001\u94C3\u94DB\u83DC",
    "\u8865\u865A\u836F",
    "\u5FAE\u5BD2",
    "\u7518",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u6839\u830E",
    "\u517B\u9634\u6DA6\u71E5\u3001\u751F\u6D25\u6B62\u6E34"
  ),
  row(
    "nu-zhen-zi",
    "\u5973\u8D1E\u5B50",
    "N\u01DA Zh\u0113n Z\u01D0",
    "\u5973\u8D1E\u5B9E\u3001\u51AC\u9752\u5B50",
    "\u8865\u865A\u836F",
    "\u51C9",
    "\u7518\u3001\u82E6",
    "\u809D\u3001\u80BE\u7ECF",
    "\u6210\u719F\u679C\u5B9E",
    "\u6ECB\u8865\u809D\u80BE\u3001\u660E\u76EE\u4E4C\u53D1"
  ),
  row(
    "han-lian-cao",
    "\u58A8\u65F1\u83B2",
    "M\xF2 H\xE0n Li\xE1n",
    "\u65F1\u83B2\u8349\u3001\u9CE2\u80A0",
    "\u8865\u865A\u836F",
    "\u5BD2",
    "\u7518\u3001\u9178",
    "\u809D\u3001\u80BE\u7ECF",
    "\u5730\u4E0A\u90E8\u5206",
    "\u6ECB\u8865\u809D\u80BE\u3001\u51C9\u8840\u6B62\u8840"
  ),
  row(
    "wu-wei-zi",
    "\u4E94\u5473\u5B50",
    "W\u01D4 W\xE8i Z\u01D0",
    "\u5317\u4E94\u5473\u5B50\u3001\u8FBD\u4E94\u5473\u5B50",
    "\u6536\u6DA9\u836F",
    "\u6E29",
    "\u9178\u3001\u7518",
    "\u80BA\u3001\u5FC3\u3001\u80BE\u7ECF",
    "\u6210\u719F\u679C\u5B9E",
    "\u6536\u655B\u56FA\u6DA9\u3001\u76CA\u6C14\u751F\u6D25\u3001\u8865\u80BE\u5B81\u5FC3"
  ),
  row(
    "wu-mei",
    "\u4E4C\u6885",
    "W\u016B M\xE9i",
    "\u9178\u6885\u3001\u6885\u5B9E",
    "\u6536\u6DA9\u836F",
    "\u5E73",
    "\u9178\u3001\u6DA9",
    "\u809D\u3001\u813E\u3001\u80BA\u3001\u5927\u80A0\u7ECF",
    "\u8FD1\u6210\u719F\u679C\u5B9E\u52A0\u5DE5\u54C1",
    "\u655B\u80BA\u6B62\u54B3\u3001\u6DA9\u80A0\u6B62\u6CFB\u3001\u751F\u6D25\u6B62\u6E34\u3001\u5B89\u86D4"
  ),
  row(
    "shan-zhu-yu",
    "\u5C71\u8331\u8438",
    "Sh\u0101n Zh\u016B Y\xFA",
    "\u5C71\u8438\u8089\u3001\u67A3\u76AE",
    "\u6536\u6DA9\u836F",
    "\u5FAE\u6E29",
    "\u9178\u3001\u6DA9",
    "\u809D\u3001\u80BE\u7ECF",
    "\u679C\u8089",
    "\u8865\u76CA\u809D\u80BE\u3001\u6536\u6DA9\u56FA\u8131"
  ),
  row(
    "lian-zi",
    "\u83B2\u5B50",
    "Li\xE1n Z\u01D0",
    "\u83B2\u8089\u3001\u83B2\u5B9E",
    "\u6536\u6DA9\u836F",
    "\u5E73",
    "\u7518\u3001\u6DA9",
    "\u813E\u3001\u80BE\u3001\u5FC3\u7ECF",
    "\u6210\u719F\u79CD\u5B50",
    "\u8865\u813E\u6B62\u6CFB\u3001\u76CA\u80BE\u6DA9\u7CBE\u3001\u517B\u5FC3\u5B89\u795E"
  ),
  row(
    "qian-shi",
    "\u82A1\u5B9E",
    "Qi\xE0n Sh\xED",
    "\u9E21\u5934\u7C73\u3001\u96C1\u5934",
    "\u6536\u6DA9\u836F",
    "\u5E73",
    "\u7518\u3001\u6DA9",
    "\u813E\u3001\u80BE\u7ECF",
    "\u6210\u719F\u79CD\u4EC1",
    "\u76CA\u80BE\u56FA\u7CBE\u3001\u8865\u813E\u6B62\u6CFB\u3001\u9664\u6E7F\u6B62\u5E26"
  ),
  row(
    "chi-shi-zhi",
    "\u8D64\u77F3\u8102",
    "Ch\xEC Sh\xED Zh\u012B",
    "\u8D64\u7B26\u3001\u7EA2\u9AD8\u5CAD\u571F",
    "\u6536\u6DA9\u836F",
    "\u6E29",
    "\u7518\u3001\u6DA9",
    "\u5927\u80A0\u3001\u80C3\u7ECF",
    "\u77FF\u7269",
    "\u6DA9\u80A0\u6B62\u6CFB\u3001\u6B62\u8840\u6B62\u5E26\u3001\u751F\u808C\u655B\u75AE"
  ),
  row(
    "rou-dou-kou",
    "\u8089\u8C46\u853B",
    "R\xF2u D\xF2u K\xF2u",
    "\u8089\u679C\u3001\u7389\u679C",
    "\u6536\u6DA9\u836F",
    "\u6E29",
    "\u8F9B",
    "\u813E\u3001\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u79CD\u4EC1",
    "\u6E29\u4E2D\u884C\u6C14\u3001\u6DA9\u80A0\u6B62\u6CFB"
  ),
  row(
    "ji-zi-huang",
    "\u9E21\u5B50\u9EC4",
    "J\u012B Z\u01D0 Hu\xE1ng",
    "\u9E21\u86CB\u9EC4\u3001\u9E21\u5375\u9EC4",
    "\u7ECF\u65B9\u8F85\u6599",
    "\u5E73",
    "\u7518",
    "\u5FC3\u3001\u80BA\u3001\u813E\u7ECF",
    "\u5375\u9EC4",
    "\u6ECB\u9634\u3001\u517B\u8840\u3001\u606F\u98CE"
  ),
  row(
    "geng-mi",
    "\u7CB3\u7C73",
    "J\u012Bng M\u01D0",
    "\u786C\u7C73\u3001\u5927\u7C73",
    "\u7ECF\u65B9\u8F85\u6599",
    "\u5E73",
    "\u7518",
    "\u813E\u3001\u80C3\u7ECF",
    "\u6210\u719F\u79CD\u4EC1",
    "\u8865\u4E2D\u76CA\u6C14\u3001\u5065\u813E\u548C\u80C3\u3001\u9664\u70E6\u6B62\u6E34"
  ),
  row(
    "da-zao",
    "\u5927\u67A3",
    "D\xE0 Z\u01CEo",
    "\u7EA2\u67A3\u3001\u5E72\u67A3",
    "\u7ECF\u65B9\u8F85\u6599",
    "\u6E29",
    "\u7518",
    "\u813E\u3001\u80C3\u3001\u5FC3\u7ECF",
    "\u6210\u719F\u679C\u5B9E",
    "\u8865\u4E2D\u76CA\u6C14\u3001\u517B\u8840\u5B89\u795E\u3001\u7F13\u548C\u836F\u6027"
  ),
  row(
    "cong-bai",
    "\u8471\u767D",
    "C\u014Dng B\xE1i",
    "\u8471\u830E\u767D\u3001\u51AC\u8471",
    "\u89E3\u8868\u836F",
    "\u6E29",
    "\u8F9B",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u9CDE\u830E",
    "\u53D1\u6C57\u89E3\u8868\u3001\u6563\u5BD2\u901A\u9633"
  ),
  // 《伤寒论》方中较少见药物与物料：只保留原典方名与文本研读索引。
  row(
    "shu-qi",
    "\u8700\u6F06",
    "Sh\u01D4 Q\u012B",
    "\u5E38\u5C71\u82D7\u3001\u9E2D\u86CB\u8349",
    "\u6D8C\u5410\u836F",
    "\u5BD2",
    "\u8F9B\u3001\u82E6",
    "\u80BA\u3001\u809D\u7ECF",
    "\u5AE9\u679D\u53F6",
    "\u6D8C\u5410\u75F0\u6D8E\u3001\u622A\u759F\uFF1B\u89C1\u6842\u679D\u53BB\u828D\u836F\u52A0\u8700\u6F06\u9F99\u9AA8\u7261\u86CE\u6551\u9006\u6C64\u7B49\u539F\u5178\u65B9\u540D"
  ),
  row(
    "yuan-hua",
    "\u82AB\u82B1",
    "Yu\xE1n Hu\u0101",
    "\u675C\u82AB\u3001\u95F9\u9C7C\u82B1",
    "\u6CFB\u4E0B\u836F",
    "\u6E29",
    "\u82E6\u3001\u8F9B",
    "\u80BA\u3001\u813E\u3001\u80BE\u7ECF",
    "\u82B1\u857E",
    "\u6CFB\u6C34\u9010\u996E\u3001\u795B\u75F0\u6B62\u54B3\uFF1B\u53EF\u4F5C\u4E3A\u5C0F\u9752\u9F99\u6C64\u52A0\u51CF\u4E0E\u5341\u67A3\u6C64\u7684\u6587\u672C\u68C0\u7D22\u7EBF\u7D22"
  ),
  row(
    "gua-di",
    "\u74DC\u8482",
    "Gu\u0101 D\xEC",
    "\u751C\u74DC\u8482\u3001\u82E6\u4E01\u9999",
    "\u6D8C\u5410\u836F",
    "\u5BD2",
    "\u82E6",
    "\u80C3\u7ECF",
    "\u679C\u6897",
    "\u6D8C\u5410\u75F0\u98DF\u3001\u795B\u6E7F\u9000\u9EC4\uFF1B\u89C1\u74DC\u8482\u6563\u7B49\u539F\u5178\u65B9\u540D"
  ),
  row(
    "chi-xiao-dou",
    "\u8D64\u5C0F\u8C46",
    "Ch\xEC Xi\u01CEo D\xF2u",
    "\u8D64\u8C46\u3001\u7EA2\u5C0F\u8C46",
    "\u5229\u6C34\u6E17\u6E7F\u836F",
    "\u5E73",
    "\u7518\u3001\u9178",
    "\u5FC3\u3001\u5C0F\u80A0\u7ECF",
    "\u79CD\u5B50",
    "\u5229\u6C34\u6D88\u80BF\u3001\u89E3\u6BD2\u6392\u8113\uFF1B\u89C1\u74DC\u8482\u6563\u3001\u9EBB\u9EC4\u8FDE\u8F7A\u8D64\u5C0F\u8C46\u6C64\u7B49\u65B9\u540D\u7EBF\u7D22"
  ),
  row(
    "ting-li-zi",
    "\u8476\u82C8\u5B50",
    "T\xEDng L\xEC Z\u01D0",
    "\u4E01\u5386\u3001\u5927\u5BA4",
    "\u5316\u75F0\u6B62\u54B3\u5E73\u5598\u836F",
    "\u5BD2",
    "\u8F9B\u3001\u82E6",
    "\u80BA\u3001\u8180\u80F1\u7ECF",
    "\u79CD\u5B50",
    "\u6CFB\u80BA\u5E73\u5598\u3001\u5229\u6C34\u6D88\u80BF\uFF1B\u89C1\u5927\u9677\u80F8\u4E38\u7B49\u539F\u5178\u65B9\u540D"
  ),
  row(
    "wen-ge",
    "\u6587\u86E4",
    "W\xE9n G\xE9",
    "\u82B1\u86E4\u3001\u6D77\u86E4",
    "\u7ECF\u65B9\u77FF\u7269\u4E0E\u8D1D\u58F3",
    "\u5E73",
    "\u54B8",
    "\u80BA\u3001\u80C3\u7ECF",
    "\u8D1D\u58F3",
    "\u6E05\u70ED\u5229\u6E7F\u3001\u5316\u75F0\u8F6F\u575A\uFF1B\u89C1\u6587\u86E4\u6563\u3001\u6587\u86E4\u6C64\u7B49\u539F\u5178\u65B9\u540D"
  ),
  row(
    "ba-dou",
    "\u5DF4\u8C46",
    "B\u0101 D\xF2u",
    "\u5DF4\u4EC1\u3001\u521A\u5B50",
    "\u6CFB\u4E0B\u836F",
    "\u70ED",
    "\u8F9B",
    "\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u79CD\u5B50",
    "\u5CFB\u4E0B\u51B7\u79EF\u3001\u9010\u6C34\u9000\u80BF\u3001\u795B\u75F0\u5229\u54BD\uFF1B\u89C1\u4E09\u7269\u767D\u6563\u7B49\u65B9\u540D\uFF0C\u4EC5\u4F5C\u9AD8\u98CE\u9669\u836F\u7269\u53F2\u6599\u7D22\u5F15"
  ),
  row(
    "bai-mi",
    "\u767D\u871C",
    "B\xE1i M\xEC",
    "\u8702\u871C\u3001\u70BC\u871C",
    "\u7ECF\u65B9\u8F85\u6599",
    "\u5E73",
    "\u7518",
    "\u80BA\u3001\u813E\u3001\u5927\u80A0\u7ECF",
    "\u871C\u8702\u917F\u5236\u7269",
    "\u8865\u4E2D\u6DA6\u71E5\u3001\u7F13\u6025\u6B62\u75DB\uFF1B\u89C1\u5927\u9677\u80F8\u4E38\u7B49\u539F\u5178\u714E\u670D\u4E0E\u5236\u4E38\u7EBF\u7D22"
  ),
  row(
    "qian-dan",
    "\u94C5\u4E39",
    "Qi\u0101n D\u0101n",
    "\u9EC4\u4E39\u3001\u4E39\u7C89",
    "\u7ECF\u65B9\u77FF\u7269",
    "\u5FAE\u5BD2",
    "\u8F9B\u3001\u5FAE\u54B8",
    "\u5FC3\u3001\u809D\u7ECF",
    "\u77FF\u7269\u52A0\u5DE5\u54C1",
    "\u5916\u7528\u4E0E\u53E4\u65B9\u7269\u6599\u7D22\u5F15\uFF1B\u89C1\u67F4\u80E1\u52A0\u9F99\u9AA8\u7261\u86CE\u6C64\u7B49\u539F\u5178\u65B9\u540D\uFF0C\u4E0D\u4F5C\u73B0\u4EE3\u7528\u836F\u5EFA\u8BAE"
  ),
  row(
    "yu-yu-liang",
    "\u79B9\u4F59\u7CAE",
    "Y\u01D4 Y\xFA Li\xE1ng",
    "\u592A\u4E00\u4F59\u7CAE\u3001\u77F3\u4E2D\u9EC4",
    "\u6536\u6DA9\u836F",
    "\u5E73",
    "\u7518\u3001\u6DA9",
    "\u813E\u3001\u80C3\u3001\u5927\u80A0\u7ECF",
    "\u77FF\u7269",
    "\u6DA9\u80A0\u6B62\u6CFB\u3001\u6B62\u8840\u6B62\u5E26\uFF1B\u89C1\u8D64\u77F3\u8102\u79B9\u4F59\u7CAE\u6C64\u7B49\u7ECF\u65B9\u6587\u732E\u7EBF\u7D22"
  ),
  row(
    "zao-xin-tu",
    "\u7076\u5FC3\u571F",
    "Z\xE0o X\u012Bn T\u01D4",
    "\u4F0F\u9F99\u809D\u3001\u91DC\u4E0B\u571F",
    "\u7ECF\u65B9\u77FF\u7269",
    "\u6E29",
    "\u8F9B",
    "\u813E\u3001\u80C3\u7ECF",
    "\u7076\u5E95\u7126\u571F",
    "\u6E29\u4E2D\u6B62\u8840\u3001\u6B62\u5455\u6B62\u6CFB\uFF1B\u4F5C\u4E3A\u9EC4\u571F\u6C64\u7B49\u53E4\u65B9\u7269\u6599\u7684\u6587\u672C\u7D22\u5F15"
  ),
  row(
    "fan-shi",
    "\u77FE\u77F3",
    "F\xE1n Sh\xED",
    "\u660E\u77FE\u3001\u767D\u77FE",
    "\u7ECF\u65B9\u77FF\u7269",
    "\u5BD2",
    "\u9178\u3001\u6DA9",
    "\u80BA\u3001\u813E\u3001\u809D\u3001\u5927\u80A0\u7ECF",
    "\u77FF\u7269",
    "\u5916\u7528\u3001\u71E5\u6E7F\u4E0E\u5316\u75F0\u7684\u672C\u8349\u7D22\u5F15\uFF1B\u89C1\u300A\u4F24\u5BD2\u8BBA\u300B\u76F8\u5173\u65B9\u540D\u4E0E\u6587\u732E\u6750\u6599"
  ),
  row(
    "xiao-shi",
    "\u785D\u77F3",
    "Xi\u0101o Sh\xED",
    "\u706B\u785D\u3001\u7130\u785D",
    "\u7ECF\u65B9\u77FF\u7269",
    "\u5BD2",
    "\u82E6\u3001\u8F9B",
    "\u5FC3\u3001\u813E\u3001\u80BE\u7ECF",
    "\u77FF\u7269",
    "\u7834\u79EF\u6563\u7ED3\u3001\u6E05\u70ED\u6D88\u80BF\u7684\u53E4\u65B9\u7269\u6599\u7D22\u5F15\uFF1B\u89C1\u785D\u77F3\u77FE\u77F3\u6563\u7B49\u6587\u732E\u65B9\u540D"
  ),
  row(
    "zi-bai-pi",
    "\u6893\u767D\u76AE",
    "Z\u01D0 B\xE1i P\xED",
    "\u6893\u6811\u767D\u76AE\u3001\u6978\u6811\u76AE",
    "\u7ECF\u65B9\u7269\u6599",
    "\u5E73",
    "\u82E6",
    "\u80BA\u3001\u8180\u80F1\u7ECF",
    "\u6811\u76AE",
    "\u5229\u6C34\u6D88\u80BF\u7684\u53E4\u65B9\u7269\u6599\u7D22\u5F15\uFF1B\u89C1\u9EBB\u9EC4\u8FDE\u8F7A\u8D64\u5C0F\u8C46\u6C64\u7B49\u6587\u732E\u65B9\u540D"
  ),
  row(
    "zhu-dan-zhi",
    "\u732A\u80C6\u6C41",
    "Zh\u016B D\u01CEn Zh\u012B",
    "\u732A\u80C6\u3001\u80C6\u6C41",
    "\u7ECF\u65B9\u8F85\u6599",
    "\u5BD2",
    "\u82E6",
    "\u809D\u3001\u80C6\u3001\u80BA\u3001\u5927\u80A0\u7ECF",
    "\u80C6\u6C41",
    "\u6E05\u70ED\u6DA6\u71E5\u7684\u53E4\u65B9\u7269\u6599\u7D22\u5F15\uFF1B\u89C1\u901A\u8109\u56DB\u9006\u52A0\u732A\u80C6\u6C41\u6C64\u7B49\u714E\u670D\u7EBF\u7D22"
  ),
  row(
    "ji-zi-qing",
    "\u9E21\u5B50\u6E05",
    "J\u012B Z\u01D0 Q\u012Bng",
    "\u9E21\u86CB\u6E05\u3001\u9E21\u5375\u6E05",
    "\u7ECF\u65B9\u8F85\u6599",
    "\u51C9",
    "\u7518",
    "\u5FC3\u3001\u80BA\u7ECF",
    "\u5375\u6E05",
    "\u6E05\u70ED\u89E3\u6BD2\u3001\u6DA6\u71E5\u7684\u672C\u8349\u7D22\u5F15\uFF1B\u89C1\u82E6\u9152\u6C64\u7B49\u53E4\u65B9\u7269\u6599\u7EBF\u7D22"
  )
];
var coreHerbCount = coreHerbSeed.length;

// server/catalogSeed.ts
var sourceSeed = [
  {
    slug: "chinese-pharmacopoeia",
    name: "\u4E2D\u534E\u4EBA\u6C11\u5171\u548C\u56FD\u836F\u5178\u5728\u7EBF",
    publisher: "\u56FD\u5BB6\u836F\u5178\u59D4\u5458\u4F1A",
    baseUrl: "https://ydz.chp.org.cn/",
    accessType: "catalog",
    licenseNote: "\u7528\u4E8E\u63D0\u4F9B\u836F\u5178\u76EE\u5F55\u4E0E\u5B98\u65B9\u6807\u51C6\u68C0\u7D22\u5165\u53E3\uFF1B\u7AD9\u5185\u4E0D\u590D\u5236\u53D7\u9650\u6807\u51C6\u5168\u6587\u3002"
  },
  {
    slug: "zh-wikisource",
    name: "\u7EF4\u57FA\u6587\u5E93\u4E2D\u6587",
    publisher: "\u7EF4\u57FA\u5A92\u4F53\u57FA\u91D1\u4F1A",
    baseUrl: "https://zh.wikisource.org/",
    accessType: "api",
    licenseNote: "\u53E4\u7C4D\u6807\u9898\u3001\u7AE0\u8282\u7D22\u5F15\u4E0E\u539F\u6587\u68C0\u7D22\u6765\u81EA\u516C\u5F00\u9875\u9762\u548C Action API\uFF1B\u987B\u4EE5\u539F\u7AD9\u7248\u672C\u4E0E\u8BB8\u53EF\u8BF4\u660E\u4E3A\u51C6\u3002"
  },
  {
    slug: "chinese-text-project",
    name: "\u4E2D\u56FD\u54F2\u5B66\u4E66\u7535\u5B50\u5316\u8BA1\u5212",
    publisher: "Chinese Text Project",
    baseUrl: "https://ctext.org/",
    accessType: "catalog",
    licenseNote: "\u7528\u4E8E\u63D0\u4F9B\u300A\u592A\u5E73\u60E0\u6C11\u548C\u5242\u5C40\u65B9\u300B\u7B49\u516C\u5F00\u53E4\u7C4D\u7684\u539F\u6587\u8DF3\u8F6C\u5165\u53E3\uFF1B\u4EE5\u539F\u7AD9\u7248\u672C\u4E0E\u4F7F\u7528\u6761\u6B3E\u4E3A\u51C6\u3002"
  }
];
var herbSeed = coreHerbSeed;
var formulaSeed = [
  ["gui-zhi-tang", "\u6842\u679D\u6C64", "\u6842\u679D\u6C64\u8BC1", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u4E2D\u98CE\uFF0C\u9633\u6D6E\u800C\u9634\u5F31\u2026\u2026\u6842\u679D\u6C64\u4E3B\u4E4B\u3002", ["\u6842\u679D", "\u828D\u836F", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3"], "\u4EE5\u6842\u679D\u3001\u828D\u836F\u4E3A\u4E3B\u8F74\uFF0C\u4F50\u4EE5\u751F\u59DC\u3001\u5927\u67A3\u3001\u7099\u7518\u8349\uFF0C\u662F\u89C2\u5BDF\u8425\u536B\u5173\u7CFB\u7684\u5E38\u7528\u5B66\u4E60\u6761\u76EE\u3002", "\u8425\u536B \xB7 \u6C57\u51FA \xB7 \u6076\u98CE \xB7 \u8109\u6D6E\u7F13", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["ma-huang-tang", "\u9EBB\u9EC4\u6C64", "\u9EBB\u9EC4\u6C64\u8BC1", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\uFF0C\u5934\u75DB\u53D1\u70ED\uFF0C\u8EAB\u75BC\u8170\u75DB\uFF0C\u9AA8\u8282\u75BC\u75DB\uFF0C\u6076\u98CE\uFF0C\u65E0\u6C57\u800C\u5598\u8005\uFF0C\u9EBB\u9EC4\u6C64\u4E3B\u4E4B\u3002", ["\u9EBB\u9EC4", "\u6842\u679D", "\u7099\u7518\u8349", "\u674F\u4EC1"], "\u56DB\u5473\u7EC4\u5408\u7B80\u660E\uFF0C\u9002\u5408\u4E0E\u6842\u679D\u6C64\u5E76\u8BFB\uFF0C\u6BD4\u8F83\u6761\u6587\u8868\u8FBE\u548C\u836F\u5473\u5DEE\u5F02\u3002", "\u592A\u9633 \xB7 \u65E0\u6C57 \xB7 \u5598 \xB7 \u65B9\u8BC1\u5BF9\u8BFB", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["xiao-chai-hu-tang", "\u5C0F\u67F4\u80E1\u6C64", "\u67F4\u80E1\u6C64", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u4F24\u5BD2\u4E94\u516D\u65E5\uFF0C\u4E2D\u98CE\uFF0C\u5F80\u6765\u5BD2\u70ED\u2026\u2026\u5C0F\u67F4\u80E1\u6C64\u4E3B\u4E4B\u3002", ["\u67F4\u80E1", "\u9EC4\u82A9", "\u4EBA\u53C2", "\u7099\u7518\u8349", "\u534A\u590F", "\u751F\u59DC", "\u5927\u67A3"], "\u4EE5\u67F4\u80E1\u3001\u9EC4\u82A9\u4E3A\u4E3B\uFF0C\u914D\u5408\u6276\u6B63\u3001\u548C\u80C3\u836F\u5473\uFF0C\u662F\u7406\u89E3\u5C11\u9633\u76F8\u5173\u6761\u6587\u7684\u5B66\u4E60\u7D22\u5F15\u3002", "\u5C11\u9633 \xB7 \u5F80\u6765\u5BD2\u70ED \xB7 \u80F8\u80C1\u82E6\u6EE1", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["wu-ling-san", "\u4E94\u82D3\u6563", "\u4E94\u82D3\u6563\u65B9", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\uFF0C\u53D1\u6C57\u540E\uFF0C\u5927\u6C57\u51FA\uFF0C\u80C3\u4E2D\u5E72\uFF0C\u70E6\u8E81\u4E0D\u5F97\u7720\uFF0C\u6B32\u5F97\u996E\u6C34\u8005\uFF0C\u5C11\u5C11\u4E0E\u996E\u4E4B\uFF0C\u4EE4\u80C3\u6C14\u548C\u5219\u6108\u3002\u82E5\u8109\u6D6E\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u5FAE\u70ED\u6D88\u6E34\u8005\uFF0C\u4E94\u82D3\u6563\u4E3B\u4E4B\u3002", ["\u6CFD\u6CFB", "\u732A\u82D3", "\u832F\u82D3", "\u767D\u672F", "\u6842\u679D"], "\u4EE5\u6CFD\u6CFB\u4E3A\u4E3B\uFF0C\u914D\u732A\u82D3\u3001\u832F\u82D3\u3001\u767D\u672F\u4E0E\u6842\u679D\uFF0C\u53EF\u4F5C\u4E3A\u6C34\u6DB2\u4EE3\u8C22\u76F8\u5173\u65B9\u4E49\u7684\u6587\u732E\u7814\u8BFB\u6848\u4F8B\u3002", "\u84C4\u6C34 \xB7 \u5C0F\u4FBF\u4E0D\u5229 \xB7 \u6C34\u9006", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["li-zhong-wan", "\u7406\u4E2D\u4E38", "\u4EBA\u53C2\u6C64", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u970D\u4E71\uFF0C\u5934\u75DB\u53D1\u70ED\uFF0C\u8EAB\u75BC\u75DB\uFF0C\u70ED\u591A\u6B32\u996E\u6C34\u8005\uFF0C\u4E94\u82D3\u6563\u4E3B\u4E4B\u2026\u2026\u5BD2\u591A\u4E0D\u7528\u6C34\u8005\uFF0C\u7406\u4E2D\u4E38\u4E3B\u4E4B\u3002", ["\u4EBA\u53C2", "\u5E72\u59DC", "\u767D\u672F", "\u7099\u7518\u8349"], "\u4E0E\u56DB\u541B\u5B50\u6C64\u540C\u8BFB\u65F6\uFF0C\u53EF\u4ECE\u836F\u5473\u589E\u51CF\u5EFA\u7ACB\u65B9\u4E49\u5BF9\u7167\u7B14\u8BB0\u3002", "\u4E2D\u7126 \xB7 \u865A\u5BD2 \xB7 \u7ED3\u6784\u5BF9\u8BFB", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["si-jun-zi-tang", "\u56DB\u541B\u5B50\u6C64", "\u56DB\u541B\u5B50", "\u300A\u592A\u5E73\u60E0\u6C11\u548C\u5242\u5C40\u65B9\u300B", "\u4EBA\u53C2\u3001\u767D\u672F\u3001\u832F\u82D3\u3001\u7099\u7518\u8349\u56DB\u5473\uFF0C\u5E38\u4F5C\u4E3A\u8865\u76CA\u7C7B\u65B9\u5242\u7ED3\u6784\u7684\u5B66\u4E60\u7D22\u5F15\u3002", ["\u4EBA\u53C2", "\u767D\u672F", "\u832F\u82D3", "\u7099\u7518\u8349"], "\u56DB\u5473\u836F\u7ED3\u6784\u6E05\u6670\uFF0C\u9002\u5408\u89C2\u5BDF\u8865\u76CA\u836F\u3001\u5065\u813E\u836F\u4E0E\u8C03\u548C\u836F\u7684\u7EC4\u5408\u5C42\u6B21\u3002", "\u8865\u6C14 \xB7 \u5065\u813E \xB7 \u57FA\u7840\u65B9\u7ED3\u6784", "https://ctext.org/wiki.pl?if=gb&chapter=85192"],
  ["da-cheng-qi-tang", "\u5927\u627F\u6C14\u6C64", "\u627F\u6C14\u6C64", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u9633\u660E\u75C5\uFF0C\u8109\u8FDF\uFF0C\u867D\u6C57\u51FA\u4E0D\u6076\u5BD2\u8005\uFF0C\u5176\u8EAB\u5FC5\u91CD\uFF0C\u77ED\u6C14\uFF0C\u8179\u6EE1\u800C\u5598\uFF0C\u6709\u6F6E\u70ED\u8005\uFF0C\u6B64\u5916\u6B32\u89E3\uFF0C\u53EF\u653B\u91CC\u4E5F\u3002\u624B\u8DB3\u6FC8\u7136\u6C57\u51FA\u8005\uFF0C\u6B64\u5927\u4FBF\u5DF2\u786C\u4E5F\uFF0C\u5927\u627F\u6C14\u6C64\u4E3B\u4E4B\u3002", ["\u5927\u9EC4", "\u539A\u6734", "\u67B3\u5B9E", "\u8292\u785D"], "\u4F5C\u4E3A\u653B\u4E0B\u7C7B\u65B9\u5242\u7684\u6587\u732E\u7D22\u5F15\uFF0C\u5EFA\u8BAE\u5C06\u539F\u6587\u8BC1\u5019\u3001\u65B9\u540D\u4E0E\u836F\u5473\u5206\u522B\u8BB0\u5F55\uFF0C\u4E0D\u4F5C\u81EA\u884C\u5E94\u7528\u4F9D\u636E\u3002", "\u9633\u660E \xB7 \u6F6E\u70ED \xB7 \u8179\u6EE1 \xB7 \u539F\u5178\u8FA8\u8BFB", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["dang-gui-shao-yao-san", "\u5F53\u5F52\u828D\u836F\u6563", "\u5F53\u5F52\u828D\u836F\u65B9", "\u300A\u91D1\u532E\u8981\u7565\u300B", "\u5987\u4EBA\u6000\u598A\uFF0C\u8179\u4E2D\u3F72\u75DB\uFF0C\u5F53\u5F52\u828D\u836F\u6563\u4E3B\u4E4B\u3002", ["\u5F53\u5F52", "\u828D\u836F", "\u832F\u82D3", "\u767D\u672F", "\u6CFD\u6CFB", "\u5DDD\u828E"], "\u53EF\u7528\u4E8E\u7EC3\u4E60\u300A\u91D1\u532E\u8981\u7565\u300B\u4E2D\u5987\u4EBA\u75C5\u7BC7\u7684\u539F\u6587\u5B9A\u4F4D\u4E0E\u836F\u5473\u7ED3\u6784\u62C6\u89E3\u3002", "\u91D1\u532E \xB7 \u5987\u4EBA\u7BC7 \xB7 \u836F\u5473\u7EC4\u5408", "https://zh.wikisource.org/wiki/%E9%87%91%E5%8C%B1%E8%A6%81%E7%95%A5"],
  ["ge-gen-tang", "\u845B\u6839\u6C64", "\u845B\u6839\u6C64\u65B9", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\uFF0C\u9879\u80CC\u5F3A\u51E0\u51E0\uFF0C\u65E0\u6C57\u6076\u98CE\u8005\uFF0C\u845B\u6839\u6C64\u4E3B\u4E4B\u3002", ["\u845B\u6839", "\u9EBB\u9EC4", "\u6842\u679D", "\u828D\u836F", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3"], "\u53EF\u4E0E\u6842\u679D\u6C64\u3001\u9EBB\u9EC4\u6C64\u5E76\u8BFB\uFF0C\u89C2\u5BDF\u592A\u9633\u75C5\u76F8\u5173\u6761\u6587\u4E2D\u7684\u836F\u5473\u589E\u51CF\u4E0E\u6587\u672C\u7EBF\u7D22\u3002", "\u592A\u9633 \xB7 \u9879\u80CC\u5F3A \xB7 \u65E0\u6C57 \xB7 \u5408\u75C5", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["ban-xia-xie-xin-tang", "\u534A\u590F\u6CFB\u5FC3\u6C64", "\u534A\u590F\u6CFB\u5FC3", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u82E5\u5FC3\u4E0B\u6EE1\u800C\u4E0D\u75DB\u8005\uFF0C\u6B64\u4E3A\u75DE\uFF0C\u67F4\u80E1\u4E0D\u4E2D\u4E0E\u4E5F\uFF0C\u5B9C\u534A\u590F\u6CFB\u5FC3\u6C64\u3002", ["\u534A\u590F", "\u9EC4\u82A9", "\u9EC4\u8FDE", "\u5E72\u59DC", "\u4EBA\u53C2", "\u7099\u7518\u8349", "\u5927\u67A3"], "\u672C\u6761\u7528\u4E8E\u5B9A\u4F4D\u300A\u4F24\u5BD2\u8BBA\u300B\u5410\u4E0B\u540E\u76F8\u5173\u6BB5\u843D\uFF0C\u5E76\u7EC3\u4E60\u89C2\u5BDF\u5BD2\u70ED\u836F\u5473\u5E76\u89C1\u7684\u6587\u732E\u7ED3\u6784\u3002", "\u5410\u4E0B\u540E \xB7 \u5FC3\u4E0B\u75DE \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["si-ni-tang", "\u56DB\u9006\u6C64", "\u56DB\u9006\u6C64\u65B9", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5C11\u9634\u75C5\uFF0C\u8109\u6C89\u8005\uFF0C\u6025\u6E29\u4E4B\uFF0C\u5B9C\u56DB\u9006\u6C64\u3002", ["\u9644\u5B50", "\u5E72\u59DC", "\u7099\u7518\u8349"], "\u53EF\u4F5C\u4E3A\u5C11\u9634\u75C5\u7BC7\u7684\u539F\u5178\u5B9A\u4F4D\u7D22\u5F15\uFF1B\u5B66\u4E60\u65F6\u5E94\u5206\u5F00\u8BB0\u5F55\u6761\u6587\u3001\u836F\u5473\u548C\u540E\u4E16\u6CE8\u91CA\u3002", "\u5C11\u9634 \xB7 \u8109\u6C89 \xB7 \u7AE0\u8282\u5B9A\u4F4D", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["ling-gui-zhu-gan-tang", "\u82D3\u6842\u672F\u7518\u6C64", "\u832F\u82D3\u6842\u679D\u767D\u672F\u7518\u8349\u6C64", "\u300A\u91D1\u532E\u8981\u7565\u300B", "\u5FC3\u4E0B\u6709\u75F0\u996E\uFF0C\u80F8\u80C1\u652F\u6EE1\uFF0C\u76EE\u7729\uFF0C\u82D3\u6842\u672F\u7518\u6C64\u4E3B\u4E4B\u3002", ["\u832F\u82D3", "\u6842\u679D", "\u767D\u672F", "\u7099\u7518\u8349"], "\u53EF\u4E0E\u4E94\u82D3\u6563\u3001\u56DB\u541B\u5B50\u6C64\u5E76\u8BFB\uFF0C\u6309\u539F\u5178\u7BC7\u7AE0\u6BD4\u8F83\u832F\u82D3\u3001\u6842\u679D\u3001\u767D\u672F\u7684\u7EC4\u5408\u7EBF\u7D22\u3002", "\u91D1\u532E \xB7 \u75F0\u996E \xB7 \u836F\u5473\u7EC4\u5408", "https://zh.wikisource.org/wiki/%E9%87%91%E5%8C%B1%E8%A6%81%E7%95%A5"],
  ["da-qing-long-tang", "\u5927\u9752\u9F99\u6C64", "\u5927\u9752\u9F99", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u4E2D\u98CE\uFF0C\u8109\u6D6E\u7D27\uFF0C\u53D1\u70ED\u6076\u5BD2\uFF0C\u8EAB\u75BC\u75DB\uFF0C\u4E0D\u6C57\u51FA\u800C\u70E6\u8E81\u8005\uFF0C\u5927\u9752\u9F99\u6C64\u4E3B\u4E4B\u3002", ["\u9EBB\u9EC4", "\u6842\u679D", "\u7099\u7518\u8349", "\u674F\u4EC1", "\u77F3\u818F", "\u751F\u59DC", "\u5927\u67A3"], "\u7528\u4E8E\u592A\u9633\u75C5\u7BC7\u7684\u6587\u672C\u5B9A\u4F4D\u5B66\u4E60\uFF1B\u53EA\u5BF9\u8BFB\u6761\u6587\u4E0E\u836F\u5473\u540D\u79F0\uFF0C\u4E0D\u4F5C\u4E3A\u81EA\u884C\u7528\u836F\u4F9D\u636E\u3002", "\u592A\u9633 \xB7 \u4E0D\u6C57\u51FA \xB7 \u70E6\u8E81 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["xiao-qing-long-tang", "\u5C0F\u9752\u9F99\u6C64", "\u5C0F\u9752\u9F99", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u4F24\u5BD2\u8868\u4E0D\u89E3\uFF0C\u5FC3\u4E0B\u6709\u6C34\u6C14\uFF0C\u5E72\u5455\uFF0C\u53D1\u70ED\u800C\u54B3\uFF0C\u6216\u6E34\uFF0C\u6216\u5229\uFF0C\u6216\u564E\uFF0C\u6216\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u5C11\u8179\u6EE1\uFF0C\u6216\u5598\u8005\uFF0C\u5C0F\u9752\u9F99\u6C64\u4E3B\u4E4B\u3002", ["\u9EBB\u9EC4", "\u6842\u679D", "\u5E72\u59DC", "\u7EC6\u8F9B", "\u4E94\u5473\u5B50", "\u828D\u836F", "\u534A\u590F", "\u7099\u7518\u8349"], "\u9002\u5408\u4E0E\u592A\u9633\u75C5\u76F8\u5173\u6761\u6587\u5E76\u8BFB\uFF0C\u8BB0\u5F55\u539F\u6587\u4E2D\u5E76\u5217\u6761\u4EF6\u7684\u8868\u8FBE\u65B9\u5F0F\u3002", "\u592A\u9633 \xB7 \u6C34\u6C14 \xB7 \u54B3 \xB7 \u6761\u6587\u7ED3\u6784", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["gui-zhi-jia-ge-gen-tang", "\u6842\u679D\u52A0\u845B\u6839\u6C64", "\u6842\u679D\u52A0\u845B\u6839", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\uFF0C\u9879\u80CC\u5F3A\u51E0\u51E0\uFF0C\u53CD\u6C57\u51FA\u6076\u98CE\u8005\uFF0C\u6842\u679D\u52A0\u845B\u6839\u6C64\u4E3B\u4E4B\u3002", ["\u6842\u679D", "\u828D\u836F", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3", "\u845B\u6839"], "\u53EF\u4E0E\u6842\u679D\u6C64\u3001\u845B\u6839\u6C64\u8FDB\u884C\u6761\u6587\u4E0E\u836F\u5473\u589E\u51CF\u7684\u6A2A\u5411\u5B66\u4E60\u3002", "\u592A\u9633 \xB7 \u9879\u80CC\u5F3A \xB7 \u6C57\u51FA\u6076\u98CE", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["gui-zhi-jia-fu-zi-tang", "\u6842\u679D\u52A0\u9644\u5B50\u6C64", "\u6842\u679D\u52A0\u9644\u5B50", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\uFF0C\u53D1\u6C57\uFF0C\u9042\u6F0F\u4E0D\u6B62\uFF0C\u5176\u4EBA\u6076\u98CE\uFF0C\u5C0F\u4FBF\u96BE\uFF0C\u56DB\u80A2\u5FAE\u6025\uFF0C\u96BE\u4EE5\u5C48\u4F38\u8005\uFF0C\u6842\u679D\u52A0\u9644\u5B50\u6C64\u4E3B\u4E4B\u3002", ["\u6842\u679D", "\u828D\u836F", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3", "\u9644\u5B50"], "\u7528\u4E8E\u89C2\u5BDF\u592A\u9633\u75C5\u7BC7\u4E2D\u540C\u4E00\u65B9\u540D\u7ED3\u6784\u7684\u589E\u51CF\u8BB0\u5F55\uFF0C\u907F\u514D\u4ECE\u6761\u6587\u63A8\u5BFC\u4E2A\u4EBA\u8BCA\u7597\u7ED3\u8BBA\u3002", "\u592A\u9633 \xB7 \u53D1\u6C57\u540E \xB7 \u6761\u6587\u589E\u51CF", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["gui-zhi-ma-huang-ge-ban-tang", "\u6842\u679D\u9EBB\u9EC4\u5404\u534A\u6C64", "\u6842\u679D\u9EBB\u9EC4\u5404\u534A", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\uFF0C\u5F97\u4E4B\u516B\u4E5D\u65E5\uFF0C\u5982\u759F\u72B6\uFF0C\u53D1\u70ED\u6076\u5BD2\uFF0C\u70ED\u591A\u5BD2\u5C11\u2026\u2026\u5B9C\u6842\u679D\u9EBB\u9EC4\u5404\u534A\u6C64\u3002", ["\u6842\u679D", "\u9EBB\u9EC4", "\u828D\u836F", "\u674F\u4EC1", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3"], "\u4F5C\u4E3A\u592A\u9633\u7BC7\u7B2C 23 \u6761\u7684\u65B9\u540D\u68C0\u7D22\u5165\u53E3\uFF1B\u4EC5\u4FDD\u5B58\u516C\u5F00\u6761\u6587\u5B66\u4E60\u6458\u5F55\uFF0C\u4E0D\u4F5C\u4E2A\u4EBA\u7528\u836F\u4F9D\u636E\u3002", "\u592A\u9633 \xB7 \u5982\u759F\u72B6 \xB7 \u70ED\u591A\u5BD2\u5C11 \xB7 \u65B9\u8BC1\u7D22\u5F15", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["gui-zhi-jia-hou-po-xing-zi-tang", "\u6842\u679D\u52A0\u539A\u6734\u674F\u5B50\u6C64", "\u6842\u679D\u52A0\u539A\u6734\u674F\u5B50", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\uFF0C\u4E0B\u4E4B\u5FAE\u5598\u8005\uFF0C\u8868\u672A\u89E3\u6545\u4E5F\uFF0C\u6842\u679D\u52A0\u539A\u6734\u674F\u5B50\u6C64\u4E3B\u4E4B\u3002", ["\u6842\u679D", "\u828D\u836F", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3", "\u539A\u6734", "\u674F\u4EC1"], "\u4F5C\u4E3A\u592A\u9633\u75C5\u7BC7\u4E2D\u6CBB\u540E\u6761\u6587\u7684\u6587\u732E\u7D22\u5F15\uFF0C\u4FBF\u4E8E\u4ECE\u65B9\u540D\u8BC6\u522B\u9644\u52A0\u836F\u5473\u3002", "\u592A\u9633 \xB7 \u4E0B\u540E \xB7 \u5FAE\u5598 \xB7 \u65B9\u540D\u7ED3\u6784", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["ma-huang-xing-ren-gan-cao-shi-gao-tang", "\u9EBB\u9EC4\u674F\u4EC1\u7518\u8349\u77F3\u818F\u6C64", "\u9EBB\u674F\u7518\u77F3\u6C64", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u53D1\u6C57\u540E\uFF0C\u4E0D\u53EF\u66F4\u884C\u6842\u679D\u6C64\uFF0C\u6C57\u51FA\u800C\u5598\uFF0C\u65E0\u5927\u70ED\u8005\uFF0C\u53EF\u4E0E\u9EBB\u9EC4\u674F\u4EC1\u7518\u8349\u77F3\u818F\u6C64\u3002", ["\u9EBB\u9EC4", "\u674F\u4EC1", "\u7099\u7518\u8349", "\u77F3\u818F"], "\u7528\u4E8E\u5B66\u4E60\u539F\u5178\u4E2D\u6CBB\u540E\u6761\u6587\u7684\u65B9\u540D\u5B9A\u4F4D\uFF1B\u4E0D\u63D0\u4F9B\u5242\u91CF\u6216\u7528\u836F\u5EFA\u8BAE\u3002", "\u592A\u9633 \xB7 \u53D1\u6C57\u540E \xB7 \u5598 \xB7 \u539F\u5178\u5B9A\u4F4D", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["tao-he-cheng-qi-tang", "\u6843\u6838\u627F\u6C14\u6C64", "\u6843\u6838\u627F\u6C14", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\u4E0D\u89E3\uFF0C\u70ED\u7ED3\u8180\u80F1\uFF0C\u5176\u4EBA\u5982\u72C2\uFF0C\u8840\u81EA\u4E0B\uFF0C\u4E0B\u8005\u6108\u3002\u5176\u5916\u4E0D\u89E3\u8005\uFF0C\u5C1A\u672A\u53EF\u653B\uFF0C\u5F53\u5148\u89E3\u5176\u5916\u3002\u5916\u89E3\u5DF2\uFF0C\u4F46\u5C11\u8179\u6025\u7ED3\u8005\uFF0C\u4E43\u53EF\u653B\u4E4B\uFF0C\u5B9C\u6843\u6838\u627F\u6C14\u6C64\u3002", ["\u6843\u4EC1", "\u6842\u679D", "\u5927\u9EC4", "\u8292\u785D", "\u7099\u7518\u8349"], "\u4EC5\u4F5C\u4E3A\u592A\u9633\u75C5\u7BC7\u6761\u6587\u548C\u65B9\u540D\u7684\u5B66\u4E60\u7D22\u5F15\uFF0C\u5B9C\u7ED3\u5408\u539F\u5178\u9605\u8BFB\u3002", "\u592A\u9633 \xB7 \u70ED\u7ED3\u8180\u80F1 \xB7 \u6761\u6587\u5B9A\u4F4D", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["tiao-wei-cheng-qi-tang", "\u8C03\u80C3\u627F\u6C14\u6C64", "\u8C03\u80C3\u627F\u6C14", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\u4E09\u65E5\uFF0C\u53D1\u6C57\u4E0D\u89E3\uFF0C\u84B8\u84B8\u53D1\u70ED\u8005\uFF0C\u5C5E\u80C3\u4E5F\uFF0C\u8C03\u80C3\u627F\u6C14\u6C64\u4E3B\u4E4B\u3002", ["\u5927\u9EC4", "\u8292\u785D", "\u7099\u7518\u8349"], "\u53EF\u4ECE\u592A\u9633\u8F6C\u5C5E\u9633\u660E\u7684\u6587\u5B57\u7EBF\u7D22\uFF0C\u7EC3\u4E60\u65B9\u5242\u4E0E\u7BC7\u7AE0\u4E4B\u95F4\u7684\u5BF9\u8BFB\u3002", "\u9633\u660E \xB7 \u84B8\u84B8\u53D1\u70ED \xB7 \u8F6C\u5C5E", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["xiao-cheng-qi-tang", "\u5C0F\u627F\u6C14\u6C64", "\u5C0F\u627F\u6C14", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u9633\u660E\u75C5\uFF0C\u8109\u8FDF\uFF0C\u867D\u6C57\u51FA\u4E0D\u6076\u5BD2\u8005\uFF0C\u5176\u8EAB\u5FC5\u91CD\uFF0C\u77ED\u6C14\uFF0C\u8179\u6EE1\u800C\u5598\uFF0C\u6709\u6F6E\u70ED\u8005\uFF0C\u6B64\u5916\u6B32\u89E3\uFF0C\u53EF\u653B\u91CC\u4E5F\u3002\u82E5\u8179\u5927\u6EE1\u4E0D\u901A\u8005\uFF0C\u53EF\u4E0E\u5C0F\u627F\u6C14\u6C64\uFF0C\u5FAE\u548C\u80C3\u6C14\u3002", ["\u5927\u9EC4", "\u539A\u6734", "\u67B3\u5B9E"], "\u9002\u5408\u4E0E\u5927\u627F\u6C14\u6C64\u5E76\u8BFB\uFF0C\u89C2\u5BDF\u540C\u7BC7\u4E2D\u65B9\u540D\u548C\u6761\u6587\u6761\u4EF6\u7684\u5DEE\u5F02\u3002", "\u9633\u660E \xB7 \u8179\u6EE1 \xB7 \u627F\u6C14\u6C64\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["bai-hu-tang", "\u767D\u864E\u6C64", "\u767D\u864E", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u4F24\u5BD2\uFF0C\u8109\u6D6E\u6ED1\uFF0C\u6B64\u4EE5\u8868\u6709\u70ED\uFF0C\u91CC\u6709\u5BD2\uFF0C\u767D\u864E\u6C64\u4E3B\u4E4B\u3002", ["\u77F3\u818F", "\u77E5\u6BCD", "\u7518\u8349", "\u7CB3\u7C73"], "\u4F5C\u4E3A\u9633\u660E\u75C5\u76F8\u5173\u6761\u6587\u7684\u65B9\u540D\u7D22\u5F15\uFF0C\u4FA7\u91CD\u539F\u6587\u68C0\u7D22\u548C\u51FA\u5904\u5BF9\u8BFB\u3002", "\u9633\u660E \xB7 \u8109\u6D6E\u6ED1 \xB7 \u539F\u5178\u7D22\u5F15", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["bai-hu-jia-ren-shen-tang", "\u767D\u864E\u52A0\u4EBA\u53C2\u6C64", "\u767D\u864E\u52A0\u4EBA\u53C2", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u82E5\u6E34\u6B32\u996E\u6C34\uFF0C\u53E3\u5E72\u820C\u71E5\u8005\uFF0C\u767D\u864E\u52A0\u4EBA\u53C2\u6C64\u4E3B\u4E4B\u3002", ["\u77F3\u818F", "\u77E5\u6BCD", "\u7518\u8349", "\u7CB3\u7C73", "\u4EBA\u53C2"], "\u53EF\u4E0E\u767D\u864E\u6C64\u5E76\u5217\u9605\u8BFB\uFF0C\u8BC6\u522B\u65B9\u540D\u4E2D\u65B0\u589E\u836F\u5473\u7684\u6587\u672C\u63D0\u793A\u3002", "\u9633\u660E \xB7 \u53E3\u5E72\u820C\u71E5 \xB7 \u65B9\u540D\u589E\u51CF", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["zhi-zi-chi-tang", "\u6800\u5B50\u8C49\u6C64", "\u6800\u5B50\u8C49", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u9633\u660E\u75C5\uFF0C\u8109\u6D6E\u800C\u7D27\uFF0C\u54BD\u71E5\u53E3\u82E6\uFF0C\u8179\u6EE1\u800C\u5598\uFF0C\u53D1\u70ED\u6C57\u51FA\uFF0C\u4E0D\u6076\u5BD2\u53CD\u6076\u70ED\uFF0C\u8EAB\u91CD\u3002\u82E5\u4E0B\u4E4B\uFF0C\u5219\u80C3\u4E2D\u7A7A\u865A\uFF0C\u5BA2\u6C14\u52A8\u8188\uFF0C\u5FC3\u4E2D\u61CA\u61B9\uFF0C\u820C\u4E0A\u80CE\u8005\uFF0C\u6800\u5B50\u8C49\u6C64\u4E3B\u4E4B\u3002", ["\u6800\u5B50", "\u6DE1\u8C46\u8C49"], "\u7528\u4E8E\u9633\u660E\u75C5\u7BC7\u7684\u6761\u6587\u5B9A\u4F4D\u4E0E\u6587\u53E5\u7ED3\u6784\u7814\u8BFB\u3002", "\u9633\u660E \xB7 \u5FC3\u4E2D\u61CA\u61B9 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["zhu-ling-tang", "\u732A\u82D3\u6C64", "\u732A\u82D3", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u82E5\u8109\u6D6E\uFF0C\u53D1\u70ED\uFF0C\u6E34\u6B32\u996E\u6C34\uFF0C\u5C0F\u4FBF\u4E0D\u5229\u8005\uFF0C\u732A\u82D3\u6C64\u4E3B\u4E4B\u3002", ["\u732A\u82D3", "\u832F\u82D3", "\u6CFD\u6CFB", "\u963F\u80F6", "\u6ED1\u77F3"], "\u53EF\u5728\u9633\u660E\u548C\u5C11\u9634\u76F8\u5173\u6761\u6587\u95F4\u4F5C\u51FA\u5904\u5BF9\u8BFB\uFF0C\u4E0D\u4F5C\u4E2A\u4EBA\u7528\u836F\u4F9D\u636E\u3002", "\u9633\u660E \xB7 \u5C0F\u4FBF\u4E0D\u5229 \xB7 \u6761\u6587\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["yin-chen-hao-tang", "\u8335\u9648\u84BF\u6C64", "\u8335\u9648\u84BF", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u9633\u660E\u75C5\uFF0C\u53D1\u70ED\u6C57\u51FA\u8005\uFF0C\u6B64\u4E3A\u70ED\u8D8A\uFF0C\u4E0D\u80FD\u53D1\u9EC4\u4E5F\uFF1B\u4F46\u5934\u6C57\u51FA\uFF0C\u8EAB\u65E0\u6C57\uFF0C\u5242\u9888\u800C\u8FD8\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u6E34\u5F15\u6C34\u6D46\u8005\uFF0C\u6B64\u4E3A\u7600\u70ED\u5728\u91CC\uFF0C\u8EAB\u5FC5\u53D1\u9EC4\uFF0C\u8335\u9648\u84BF\u6C64\u4E3B\u4E4B\u3002", ["\u8335\u9648\u84BF", "\u6800\u5B50", "\u5927\u9EC4"], "\u4F5C\u4E3A\u9633\u660E\u75C5\u7BC7\u7684\u516C\u5F00\u539F\u5178\u7D22\u5F15\uFF0C\u7528\u4E8E\u8FA8\u8BC6\u6761\u6587\u4E2D\u7684\u6761\u4EF6\u8868\u8FBE\u3002", "\u9633\u660E \xB7 \u5934\u6C57 \xB7 \u5C0F\u4FBF\u4E0D\u5229 \xB7 \u539F\u5178\u7D22\u5F15", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["di-dang-tang", "\u62B5\u5F53\u6C64", "\u62B5\u5F53", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u9633\u660E\u8BC1\uFF0C\u5176\u4EBA\u559C\u5FD8\u8005\uFF0C\u5FC5\u6709\u755C\u8840\u3002\u6240\u4EE5\u7136\u8005\uFF0C\u672C\u6709\u4E45\u7600\u8840\uFF0C\u6545\u4EE4\u559C\u5FD8\uFF0C\u5C4E\u867D\u9795\uFF0C\u5927\u4FBF\u53CD\u6613\uFF0C\u5176\u8272\u5FC5\u9ED1\u8005\uFF0C\u5B9C\u62B5\u5F53\u6C64\u4E0B\u4E4B\u3002", ["\u6C34\u86ED", "\u867B\u866B", "\u6843\u4EC1", "\u5927\u9EC4"], "\u4F5C\u4E3A\u9633\u660E\u7BC7\u65B9\u540D\u7D22\u5F15\uFF0C\u5EFA\u8BAE\u5C06\u539F\u6587\u3001\u51FA\u5904\u548C\u4E2A\u4EBA\u7B14\u8BB0\u5206\u5F00\u4FDD\u5B58\u3002", "\u9633\u660E \xB7 \u559C\u5FD8 \xB7 \u6761\u6587\u5B9A\u4F4D", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["ma-zi-ren-wan", "\u9EBB\u5B50\u4EC1\u4E38", "\u9EBB\u4EC1\u4E38\u3001\u813E\u7EA6\u4E38", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u8DBA\u9633\u8109\u6D6E\u800C\u6DA9\uFF0C\u6D6E\u5219\u80C3\u6C14\u5F3A\uFF0C\u6DA9\u5219\u5C0F\u4FBF\u6570\uFF0C\u6D6E\u6DA9\u76F8\u640F\uFF0C\u5927\u4FBF\u5219\u9795\uFF0C\u5176\u813E\u4E3A\u7EA6\uFF0C\u9EBB\u5B50\u4EC1\u4E38\u4E3B\u4E4B\u3002", ["\u9EBB\u5B50\u4EC1", "\u828D\u836F", "\u67B3\u5B9E", "\u5927\u9EC4", "\u539A\u6734", "\u674F\u4EC1"], "\u53EF\u4F5C\u4E3A\u9633\u660E\u7BC7\u813E\u7EA6\u6761\u6587\u7684\u5B66\u4E60\u5165\u53E3\uFF0C\u4EC5\u7528\u4E8E\u6587\u732E\u68C0\u7D22\u3002", "\u9633\u660E \xB7 \u813E\u7EA6 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["zhen-wu-tang", "\u771F\u6B66\u6C64", "\u771F\u6B66", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5C11\u9634\u75C5\uFF0C\u4E8C\u4E09\u65E5\u4E0D\u5DF2\uFF0C\u81F3\u56DB\u4E94\u65E5\uFF0C\u8179\u75DB\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u56DB\u80A2\u6C89\u91CD\u75BC\u75DB\uFF0C\u81EA\u4E0B\u5229\u8005\uFF0C\u6B64\u4E3A\u6709\u6C34\u6C14\u3002\u5176\u4EBA\u6216\u54B3\uFF0C\u6216\u5C0F\u4FBF\u5229\uFF0C\u6216\u4E0B\u5229\uFF0C\u6216\u5455\u8005\uFF0C\u771F\u6B66\u6C64\u4E3B\u4E4B\u3002", ["\u832F\u82D3", "\u828D\u836F", "\u767D\u672F", "\u751F\u59DC", "\u9644\u5B50"], "\u4F5C\u4E3A\u5C11\u9634\u75C5\u7BC7\u6761\u6587\u7684\u516C\u5F00\u539F\u5178\u5B9A\u4F4D\uFF0C\u4E0D\u4F5C\u8BCA\u7597\u63A8\u8350\u3002", "\u5C11\u9634 \xB7 \u6C34\u6C14 \xB7 \u539F\u5178\u7D22\u5F15", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["huang-lian-e-jiao-tang", "\u9EC4\u8FDE\u963F\u80F6\u6C64", "\u9EC4\u8FDE\u963F\u80F6", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5C11\u9634\u75C5\uFF0C\u5F97\u4E4B\u4E8C\u4E09\u65E5\u4EE5\u4E0A\uFF0C\u5FC3\u4E2D\u70E6\uFF0C\u4E0D\u5F97\u5367\uFF0C\u9EC4\u8FDE\u963F\u80F6\u6C64\u4E3B\u4E4B\u3002", ["\u9EC4\u8FDE", "\u9EC4\u82A9", "\u828D\u836F", "\u963F\u80F6", "\u9E21\u5B50\u9EC4"], "\u7528\u4E8E\u5C11\u9634\u75C5\u7BC7\u7684\u65B9\u540D\u4E0E\u6761\u6587\u5B9A\u4F4D\u5B66\u4E60\u3002", "\u5C11\u9634 \xB7 \u5FC3\u4E2D\u70E6 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["si-ni-san", "\u56DB\u9006\u6563", "\u56DB\u9006\u6563\u65B9", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5C11\u9634\u75C5\uFF0C\u56DB\u9006\uFF0C\u5176\u4EBA\u6216\u54B3\uFF0C\u6216\u60B8\uFF0C\u6216\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u6216\u8179\u4E2D\u75DB\uFF0C\u6216\u6CC4\u5229\u4E0B\u91CD\u8005\uFF0C\u56DB\u9006\u6563\u4E3B\u4E4B\u3002", ["\u67F4\u80E1", "\u828D\u836F", "\u67B3\u5B9E", "\u7099\u7518\u8349"], "\u4F5C\u4E3A\u5C11\u9634\u75C5\u7BC7\u7684\u5B66\u4E60\u6761\u76EE\uFF0C\u4E0E\u56DB\u9006\u6C64\u53EF\u4F5C\u65B9\u540D\u548C\u6761\u6587\u51FA\u5904\u7684\u5BF9\u8BFB\u3002", "\u5C11\u9634 \xB7 \u56DB\u9006 \xB7 \u65B9\u8BC1\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["wu-mei-wan", "\u4E4C\u6885\u4E38", "\u4E4C\u6885\u4E38\u65B9", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u86D4\u53A5\u8005\uFF0C\u4E4C\u6885\u4E38\u4E3B\u4E4B\u3002\u53C8\u4E3B\u4E45\u5229\u3002", ["\u4E4C\u6885", "\u7EC6\u8F9B", "\u5E72\u59DC", "\u9EC4\u8FDE", "\u9644\u5B50", "\u5F53\u5F52", "\u8700\u6912", "\u6842\u679D", "\u4EBA\u53C2", "\u9EC4\u67CF"], "\u4F5C\u4E3A\u53A5\u9634\u75C5\u7BC7\u7684\u539F\u5178\u5B9A\u4F4D\u7D22\u5F15\uFF0C\u5EFA\u8BAE\u8FD4\u56DE\u516C\u5F00\u539F\u6587\u6838\u5BF9\u4E0A\u4E0B\u6587\u3002", "\u53A5\u9634 \xB7 \u86D4\u53A5 \xB7 \u539F\u5178\u5B9A\u4F4D", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["zhi-shi-zhi-zi-chi-tang", "\u67B3\u5B9E\u6800\u5B50\u8C49\u6C64", "\u67B3\u5B9E\u6800\u5B50\u8C49", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5927\u75C5\u5DEE\u540E\uFF0C\u52B3\u590D\u8005\uFF0C\u67B3\u5B9E\u6800\u5B50\u8C49\u6C64\u4E3B\u4E4B\u3002", ["\u67B3\u5B9E", "\u6800\u5B50", "\u6DE1\u8C46\u8C49"], "\u7528\u4E8E\u9634\u9633\u6613\u5DEE\u540E\u52B3\u590D\u7BC7\u7684\u6761\u6587\u5B9A\u4F4D\uFF0C\u4E0E\u5C0F\u67F4\u80E1\u6C64\u5DEE\u540E\u6761\u6587\u5BF9\u8BFB\u3002", "\u5DEE\u540E\u52B3\u590D \xB7 \u539F\u5178\u7D22\u5F15", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["da-chai-hu-tang", "\u5927\u67F4\u80E1\u6C64", "\u5927\u67F4\u80E1", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u4F24\u5BD2\u5341\u4F59\u65E5\uFF0C\u70ED\u7ED3\u5728\u91CC\uFF0C\u590D\u5F80\u6765\u5BD2\u70ED\u8005\uFF0C\u4E0E\u5927\u67F4\u80E1\u6C64\u3002", ["\u67F4\u80E1", "\u9EC4\u82A9", "\u828D\u836F", "\u534A\u590F", "\u751F\u59DC", "\u67B3\u5B9E", "\u5927\u67A3", "\u5927\u9EC4"], "\u7528\u4E8E\u5C11\u9633\u4E0E\u91CC\u8BC1\u5E76\u89C1\u6761\u6587\u7684\u539F\u5178\u5B9A\u4F4D\u5B66\u4E60\uFF0C\u4E0D\u4F5C\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u5C11\u9633 \xB7 \u5F80\u6765\u5BD2\u70ED \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["gui-zhi-jia-shao-yao-tang", "\u6842\u679D\u52A0\u828D\u836F\u6C64", "\u6842\u679D\u52A0\u828D\u836F", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u672C\u592A\u9633\u75C5\uFF0C\u533B\u53CD\u4E0B\u4E4B\uFF0C\u56E0\u5C14\u8179\u6EE1\u65F6\u75DB\u8005\uFF0C\u5C5E\u592A\u9634\u4E5F\uFF0C\u6842\u679D\u52A0\u828D\u836F\u6C64\u4E3B\u4E4B\u3002", ["\u6842\u679D", "\u828D\u836F", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3"], "\u4F5C\u4E3A\u592A\u9634\u76F8\u5173\u7BC7\u7684\u6761\u6587\u4E0E\u65B9\u540D\u7ED3\u6784\u5B66\u4E60\u5165\u53E3\u3002", "\u592A\u9634 \xB7 \u8179\u6EE1\u65F6\u75DB \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["gui-zhi-jia-da-huang-tang", "\u6842\u679D\u52A0\u5927\u9EC4\u6C64", "\u6842\u679D\u52A0\u5927\u9EC4", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u672C\u592A\u9633\u75C5\uFF0C\u533B\u53CD\u4E0B\u4E4B\uFF0C\u56E0\u5C14\u8179\u6EE1\u65F6\u75DB\u8005\uFF0C\u5C5E\u592A\u9634\u4E5F\uFF1B\u5927\u5B9E\u75DB\u8005\uFF0C\u6842\u679D\u52A0\u5927\u9EC4\u6C64\u4E3B\u4E4B\u3002", ["\u6842\u679D", "\u828D\u836F", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3", "\u5927\u9EC4"], "\u7528\u4E8E\u592A\u9634\u76F8\u5173\u6761\u6587\u7684\u516C\u5F00\u539F\u5178\u5B9A\u4F4D\uFF0C\u4E0D\u4F5C\u6CBB\u7597\u5EFA\u8BAE\u3002", "\u592A\u9634 \xB7 \u5927\u5B9E\u75DB \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["chai-hu-gui-zhi-tang", "\u67F4\u80E1\u6842\u679D\u6C64", "\u67F4\u80E1\u6842\u679D", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u4F24\u5BD2\u516D\u4E03\u65E5\uFF0C\u53D1\u70ED\u5FAE\u6076\u5BD2\uFF0C\u652F\u8282\u70E6\u75BC\uFF0C\u5FAE\u5455\uFF0C\u5FC3\u4E0B\u652F\u7ED3\uFF0C\u5916\u8BC1\u672A\u53BB\u8005\uFF0C\u67F4\u80E1\u6842\u679D\u6C64\u4E3B\u4E4B\u3002", ["\u67F4\u80E1", "\u9EC4\u82A9", "\u4EBA\u53C2", "\u534A\u590F", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3", "\u6842\u679D", "\u828D\u836F"], "\u7528\u4E8E\u5C11\u9633\u517C\u8868\u6761\u6587\u7684\u65B9\u540D\u3001\u75C7\u72B6\u7ED3\u6784\u4E0E\u539F\u5178\u51FA\u5904\u5BF9\u8BFB\u3002", "\u5C11\u9633 \xB7 \u5FAE\u5455 \xB7 \u5FC3\u4E0B\u652F\u7ED3 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["chai-hu-gui-zhi-gan-jiang-tang", "\u67F4\u80E1\u6842\u679D\u5E72\u59DC\u6C64", "\u67F4\u80E1\u6842\u679D\u5E72\u59DC", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u4F24\u5BD2\u4E94\u516D\u65E5\uFF0C\u5DF2\u53D1\u6C57\u800C\u590D\u4E0B\u4E4B\uFF0C\u80F8\u80C1\u6EE1\u5FAE\u7ED3\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u6E34\u800C\u4E0D\u5455\uFF0C\u4F46\u5934\u6C57\u51FA\uFF0C\u5F80\u6765\u5BD2\u70ED\uFF0C\u5FC3\u70E6\u8005\uFF0C\u6B64\u4E3A\u672A\u89E3\u4E5F\uFF0C\u67F4\u80E1\u6842\u679D\u5E72\u59DC\u6C64\u4E3B\u4E4B\u3002", ["\u67F4\u80E1", "\u6842\u679D", "\u5E72\u59DC", "\u9EC4\u82A9", "\u681D\u848C\u6839", "\u7261\u86CE", "\u7099\u7518\u8349"], "\u7528\u4E8E\u5C11\u9633\u4E0E\u592A\u9634\u76F8\u5173\u7EBF\u7D22\u7684\u539F\u5178\u6761\u6587\u5BF9\u8BFB\uFF0C\u4E0D\u63D0\u4F9B\u6CBB\u7597\u6216\u7528\u836F\u5EFA\u8BAE\u3002", "\u5C11\u9633 \xB7 \u592A\u9634 \xB7 \u5F80\u6765\u5BD2\u70ED \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["dang-gui-si-ni-tang", "\u5F53\u5F52\u56DB\u9006\u6C64", "\u5F53\u5F52\u56DB\u9006", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u624B\u8DB3\u53A5\u5BD2\uFF0C\u8109\u7EC6\u6B32\u7EDD\u8005\uFF0C\u5F53\u5F52\u56DB\u9006\u6C64\u4E3B\u4E4B\u3002", ["\u5F53\u5F52", "\u6842\u679D", "\u828D\u836F", "\u7EC6\u8F9B", "\u7099\u7518\u8349", "\u901A\u8349", "\u5927\u67A3"], "\u7528\u4E8E\u53A5\u9634\u7BC7\u65B9\u540D\u4E0E\u539F\u5178\u8BED\u53E5\u7684\u5BF9\u8BFB\u7D22\u5F15\uFF0C\u4E0D\u6784\u6210\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u53A5\u9634 \xB7 \u624B\u8DB3\u53A5\u5BD2 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["tao-hua-tang", "\u6843\u82B1\u6C64", "\u6843\u82B1", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5C11\u9634\u75C5\uFF0C\u4E8C\u4E09\u65E5\u81F3\u56DB\u4E94\u65E5\uFF0C\u8179\u75DB\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u4E0B\u5229\u4E0D\u6B62\uFF0C\u4FBF\u8113\u8840\u8005\uFF0C\u6843\u82B1\u6C64\u4E3B\u4E4B\u3002", ["\u8D64\u77F3\u8102", "\u5E72\u59DC", "\u7CB3\u7C73"], "\u7528\u4E8E\u5C11\u9634\u7BC7\u65B9\u540D\u3001\u6761\u6587\u7ED3\u6784\u4E0E\u539F\u5178\u51FA\u5904\u7684\u5B66\u4E60\u7D22\u5F15\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u5C11\u9634 \xB7 \u4E0B\u5229 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["fu-zi-tang", "\u9644\u5B50\u6C64", "\u9644\u5B50", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5C11\u9634\u75C5\uFF0C\u8EAB\u4F53\u75DB\uFF0C\u624B\u8DB3\u5BD2\uFF0C\u9AA8\u8282\u75DB\uFF0C\u8109\u6C89\u8005\uFF0C\u9644\u5B50\u6C64\u4E3B\u4E4B\u3002", ["\u9644\u5B50", "\u832F\u82D3", "\u4EBA\u53C2", "\u767D\u672F", "\u828D\u836F"], "\u7528\u4E8E\u5C11\u9634\u7BC7\u65B9\u540D\u4E0E\u539F\u5178\u6761\u6587\u7ED3\u6784\u7684\u5B66\u4E60\u7D22\u5F15\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u5C11\u9634 \xB7 \u9AA8\u8282\u75DB \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["bai-tong-tang", "\u767D\u901A\u6C64", "\u767D\u901A", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5C11\u9634\u75C5\uFF0C\u4E0B\u5229\uFF0C\u767D\u901A\u6C64\u4E3B\u4E4B\u3002", ["\u8471\u767D", "\u5E72\u59DC", "\u9644\u5B50"], "\u7528\u4E8E\u5C11\u9634\u7BC7\u65B9\u540D\u4E0E\u539F\u5178\u6761\u6587\u7684\u5BF9\u8BFB\u7D22\u5F15\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u5C11\u9634 \xB7 \u4E0B\u5229 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["tong-mai-si-ni-tang", "\u901A\u8109\u56DB\u9006\u6C64", "\u901A\u8109\u56DB\u9006", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5C11\u9634\u75C5\uFF0C\u4E0B\u5229\u6E05\u8C37\uFF0C\u91CC\u5BD2\u5916\u70ED\uFF0C\u624B\u8DB3\u53A5\u9006\uFF0C\u8109\u5FAE\u6B32\u7EDD\uFF0C\u8EAB\u53CD\u4E0D\u6076\u5BD2\uFF0C\u5176\u4EBA\u9762\u8272\u8D64\uFF1B\u6216\u8179\u75DB\uFF0C\u6216\u5E72\u5455\uFF0C\u6216\u54BD\u75DB\uFF0C\u6216\u5229\u6B62\u8109\u4E0D\u51FA\u8005\uFF0C\u901A\u8109\u56DB\u9006\u6C64\u4E3B\u4E4B\u3002", ["\u7099\u7518\u8349", "\u5E72\u59DC", "\u9644\u5B50"], "\u7528\u4E8E\u5C11\u9634\u7BC7\u516C\u5F00\u539F\u5178\u5B9A\u4F4D\u5B66\u4E60\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u5C11\u9634 \xB7 \u4E0B\u5229\u6E05\u8C37 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["ma-huang-fu-zi-xi-xin-tang", "\u9EBB\u9EC4\u9644\u5B50\u7EC6\u8F9B\u6C64", "\u9EBB\u9EC4\u9644\u5B50\u7EC6\u8F9B", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u5C11\u9634\u75C5\uFF0C\u59CB\u5F97\u4E4B\uFF0C\u53CD\u53D1\u70ED\uFF0C\u8109\u6C89\u8005\uFF0C\u9EBB\u9EC4\u9644\u5B50\u7EC6\u8F9B\u6C64\u4E3B\u4E4B\u3002", ["\u9EBB\u9EC4", "\u9644\u5B50", "\u7EC6\u8F9B"], "\u7528\u4E8E\u5C11\u9634\u7BC7\u65B9\u540D\u4E0E\u539F\u5178\u6761\u6587\u7684\u5B66\u4E60\u7D22\u5F15\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u5C11\u9634 \xB7 \u53CD\u53D1\u70ED \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["gui-zhi-qu-shao-yao-tang", "\u6842\u679D\u53BB\u828D\u836F\u6C64", "\u6842\u679D\u53BB\u828D\u836F", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\uFF0C\u4E0B\u4E4B\u540E\uFF0C\u8109\u4FC3\u80F8\u6EE1\u8005\uFF0C\u6842\u679D\u53BB\u828D\u836F\u6C64\u4E3B\u4E4B\u3002", ["\u6842\u679D", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3"], "\u7528\u4E8E\u592A\u9633\u7BC7\u6CBB\u540E\u6761\u6587\u7684\u65B9\u540D\u7ED3\u6784\u5B66\u4E60\u7D22\u5F15\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u592A\u9633 \xB7 \u4E0B\u540E \xB7 \u8109\u4FC3\u80F8\u6EE1 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["ge-gen-jia-ban-xia-tang", "\u845B\u6839\u52A0\u534A\u590F\u6C64", "\u845B\u6839\u52A0\u534A\u590F", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u4E0E\u9633\u660E\u5408\u75C5\uFF0C\u4E0D\u4E0B\u5229\uFF0C\u4F46\u5455\u8005\uFF0C\u845B\u6839\u52A0\u534A\u590F\u6C64\u4E3B\u4E4B\u3002", ["\u845B\u6839", "\u9EBB\u9EC4", "\u6842\u679D", "\u828D\u836F", "\u7099\u7518\u8349", "\u751F\u59DC", "\u5927\u67A3", "\u534A\u590F"], "\u7528\u4E8E\u592A\u9633\u4E0E\u9633\u660E\u5408\u75C5\u6761\u6587\u7684\u8DE8\u7BC7\u5BF9\u8BFB\u5B66\u4E60\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u592A\u9633\u9633\u660E \xB7 \u5408\u75C5 \xB7 \u4F46\u5455 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["ge-gen-huang-qin-huang-lian-tang", "\u845B\u6839\u9EC4\u82A9\u9EC4\u8FDE\u6C64", "\u845B\u6839\u82A9\u8FDE\u6C64", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u592A\u9633\u75C5\uFF0C\u6842\u679D\u8BC1\uFF0C\u533B\u53CD\u4E0B\u4E4B\uFF0C\u5229\u9042\u4E0D\u6B62\uFF0C\u8109\u4FC3\u8005\uFF0C\u8868\u672A\u89E3\u4E5F\uFF1B\u5598\u800C\u6C57\u51FA\u8005\uFF0C\u845B\u6839\u9EC4\u82A9\u9EC4\u8FDE\u6C64\u4E3B\u4E4B\u3002", ["\u845B\u6839", "\u7099\u7518\u8349", "\u9EC4\u82A9", "\u9EC4\u8FDE"], "\u7528\u4E8E\u592A\u9633\u7BC7\u8BEF\u4E0B\u540E\u6761\u6587\u4E0E\u592A\u9633\u9633\u660E\u7EBF\u7D22\u7684\u5BF9\u8BFB\u5B66\u4E60\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u592A\u9633\u9633\u660E \xB7 \u8BEF\u4E0B\u540E \xB7 \u4E0B\u5229 \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["bai-tou-weng-tang", "\u767D\u5934\u7FC1\u6C64", "\u767D\u5934\u7FC1", "\u300A\u4F24\u5BD2\u8BBA\u300B", "\u70ED\u5229\u4E0B\u91CD\u8005\uFF0C\u767D\u5934\u7FC1\u6C64\u4E3B\u4E4B\u3002", ["\u767D\u5934\u7FC1", "\u9EC4\u67CF", "\u9EC4\u8FDE", "\u79E6\u76AE"], "\u7528\u4E8E\u53A5\u9634\u7BC7\u65B9\u540D\u4E0E\u516C\u5F00\u539F\u5178\u6761\u6587\u7684\u5B66\u4E60\u7D22\u5F15\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u7597\u5EFA\u8BAE\u3002", "\u53A5\u9634 \xB7 \u70ED\u5229\u4E0B\u91CD \xB7 \u539F\u5178\u5BF9\u8BFB", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"]
];
var classicSeed = [
  ["shang-han-lun", "\u4F24\u5BD2\u8BBA", "\u4E1C\u6C49", "\u5F20\u4EF2\u666F", "\u5916\u611F\u4E0E\u65B9\u8BC1", "\u4EE5\u516D\u7ECF\u8FA8\u8BC1\u6761\u6587\u548C\u65B9\u5242\u6761\u6587\u6784\u6210\u5B66\u4E60\u4E3B\u7EBF\uFF0C\u662F\u7ECF\u65B9\u7814\u8BFB\u7684\u91CD\u8981\u5178\u7C4D\u4E4B\u4E00\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["jin-gui-yao-lue", "\u91D1\u532E\u8981\u7565", "\u4E1C\u6C49", "\u5F20\u4EF2\u666F", "\u6742\u75C5\u4E0E\u65B9\u8BBA", "\u805A\u7126\u6742\u75C5\u8109\u8BC1\u3001\u6CBB\u6CD5\u4E0E\u65B9\u836F\uFF0C\u4E3A\u7ECF\u65B9\u4E2D\u7684\u6742\u75C5\u7814\u8BFB\u63D0\u4F9B\u6587\u672C\u7EBF\u7D22\u3002", "https://zh.wikisource.org/wiki/%E9%87%91%E5%8C%B1%E8%A6%81%E7%95%A5"],
  ["shen-nong-ben-cao", "\u795E\u519C\u672C\u8349\u7ECF", "\u6C49\u4EE3\u4F20\u672C", "\u6258\u540D\u795E\u519C\uFF0C\u5386\u4EE3\u8F91\u4F5A", "\u672C\u8349\u5B66", "\u4EE5\u836F\u7269\u54C1\u7C7B\u4E0E\u4F20\u7EDF\u836F\u6027\u8BA4\u8BC6\u4E3A\u9605\u8BFB\u7EBF\u7D22\uFF0C\u662F\u7406\u89E3\u672C\u8349\u5206\u7C7B\u4E0E\u5386\u53F2\u6587\u732E\u8868\u8FBE\u7684\u5165\u53E3\u3002", "https://zh.wikisource.org/wiki/%E7%A5%9E%E8%BE%B2%E6%9C%AC%E8%8D%89%E7%B6%93"],
  ["ben-cao-gang-mu", "\u672C\u8349\u7EB2\u76EE", "\u660E\u4EE3", "\u674E\u65F6\u73CD", "\u672C\u8349\u4E0E\u535A\u7269", "\u4EE5\u5E7F\u6CDB\u7684\u7269\u7C7B\u7F16\u6392\u3001\u91CA\u540D\u4E0E\u5F15\u6587\u5448\u73B0\u672C\u8349\u77E5\u8BC6\u7684\u5386\u53F2\u79EF\u7D2F\uFF0C\u9002\u5408\u4E0E\u836F\u5178\u76EE\u5F55\u5BF9\u7167\u5B66\u4E60\u3002", "https://zh.wikisource.org/wiki/%E6%9C%AC%E8%8D%89%E7%B6%B1%E7%9B%AE"],
  ["wen-bing-tiao-bian", "\u6E29\u75C5\u6761\u8FA8", "\u6E05\u4EE3", "\u5434\u97A0\u901A", "\u6E29\u75C5\u5B66", "\u4EE5\u6E29\u75C5\u8FA8\u6CBB\u4F53\u7CFB\u4E0E\u6761\u6587\u7ED3\u6784\u8457\u79F0\uFF0C\u53EF\u4F5C\u4E3A\u540E\u4E16\u533B\u7C4D\u7814\u8BFB\u7684\u8865\u5145\u5165\u53E3\u3002", "https://zh.wikisource.org/wiki/%E6%BA%AB%E7%97%85%E6%A2%9D%E8%BE%A8"]
];
var chapterSeed = [
  ["shang-han-lun", 1, "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", "\u592A\u9633\u4E2D\u98CE\uFF0C\u9633\u6D6E\u800C\u9634\u5F31\uFF0C\u9633\u6D6E\u8005\uFF0C\u70ED\u81EA\u53D1\uFF1B\u9634\u5F31\u8005\uFF0C\u6C57\u81EA\u51FA\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["shang-han-lun", 2, "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", "\u9633\u660E\u4E4B\u4E3A\u75C5\uFF0C\u80C3\u5BB6\u5B9E\u662F\u4E5F\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["shang-han-lun", 3, "\u8FA8\u5C11\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", "\u5C11\u9633\u4E4B\u4E3A\u75C5\uFF0C\u53E3\u82E6\uFF0C\u54BD\u5E72\uFF0C\u76EE\u7729\u4E5F\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["shang-han-lun", 4, "\u8FA8\u53D1\u6C57\u5410\u4E0B\u540E\u8109\u8BC1\u5E76\u6CBB", "\u53D1\u6C57\u540E\uFF0C\u6C34\u836F\u4E0D\u5F97\u5165\u53E3\u4E3A\u9006\uFF0C\u82E5\u66F4\u53D1\u6C57\uFF0C\u5FC5\u5410\u4E0B\u4E0D\u6B62\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["shang-han-lun", 5, "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", "\u5C11\u9634\u4E4B\u4E3A\u75C5\uFF0C\u8109\u5FAE\u7EC6\uFF0C\u4F46\u6B32\u5BD0\u4E5F\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["shang-han-lun", 6, "\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", "\u53A5\u9634\u4E4B\u4E3A\u75C5\uFF0C\u6D88\u6E34\uFF0C\u6C14\u4E0A\u649E\u5FC3\uFF0C\u5FC3\u4E2D\u75BC\u70ED\uFF0C\u9965\u800C\u4E0D\u6B32\u98DF\uFF0C\u98DF\u5219\u5410\u86D4\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["shang-han-lun", 7, "\u8FA8\u970D\u4E71\u75C5\u8109\u8BC1\u5E76\u6CBB", "\u970D\u4E71\uFF0C\u5934\u75DB\uFF0C\u53D1\u70ED\uFF0C\u8EAB\u75BC\u75DB\uFF0C\u70ED\u591A\u6B32\u996E\u6C34\u8005\uFF0C\u4E94\u82D3\u6563\u4E3B\u4E4B\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["shang-han-lun", 8, "\u8FA8\u9634\u9633\u6613\u5DEE\u540E\u52B3\u590D\u75C5\u8109\u8BC1\u5E76\u6CBB", "\u4F24\u5BD2\u5DEE\u4EE5\u540E\uFF0C\u66F4\u53D1\u70ED\u8005\uFF0C\u5C0F\u67F4\u80E1\u6C64\u4E3B\u4E4B\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["shang-han-lun", 9, "\u8FA8\u592A\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", "\u592A\u9634\u4E4B\u4E3A\u75C5\uFF0C\u8179\u6EE1\u800C\u5410\uFF0C\u98DF\u4E0D\u4E0B\uFF0C\u81EA\u5229\u76CA\u751A\uFF0C\u65F6\u8179\u81EA\u75DB\u3002", "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["jin-gui-yao-lue", 1, "\u810F\u8151\u7ECF\u7EDC\u5148\u540E\u75C5\u8109\u8BC1\u7B2C\u4E00", "\u4E0A\u5DE5\u6CBB\u672A\u75C5\uFF0C\u4F55\u4E5F\uFF1F\u5E08\u66F0\uFF1A\u592B\u6CBB\u672A\u75C5\u8005\uFF0C\u89C1\u809D\u4E4B\u75C5\uFF0C\u77E5\u809D\u4F20\u813E\uFF0C\u5F53\u5148\u5B9E\u813E\u3002", "https://zh.wikisource.org/wiki/%E9%87%91%E5%8C%B1%E8%A6%81%E7%95%A5"],
  ["jin-gui-yao-lue", 2, "\u8840\u75F9\u865A\u52B3\u75C5\u8109\u8BC1\u5E76\u6CBB\u7B2C\u516D", "\u8840\u75F9\u9634\u9633\u4FF1\u5FAE\uFF0C\u5BF8\u53E3\u5173\u4E0A\u5FAE\uFF0C\u5C3A\u4E2D\u5C0F\u7D27\uFF0C\u5916\u8BC1\u8EAB\u4F53\u4E0D\u4EC1\uFF0C\u5982\u98CE\u75F9\u72B6\u3002", "https://zh.wikisource.org/wiki/%E9%87%91%E5%8C%B1%E8%A6%81%E7%95%A5"],
  ["jin-gui-yao-lue", 3, "\u75F0\u996E\u54B3\u55FD\u75C5\u8109\u8BC1\u5E76\u6CBB\u7B2C\u5341\u4E8C", "\u592B\u996E\u6709\u56DB\uFF0C\u4F55\u8C13\u4E5F\uFF1F\u6709\u75F0\u996E\uFF0C\u6709\u60AC\u996E\uFF0C\u6709\u6EA2\u996E\uFF0C\u6709\u652F\u996E\u3002", "https://zh.wikisource.org/wiki/%E9%87%91%E5%8C%B1%E8%A6%81%E7%95%A5"],
  ["shen-nong-ben-cao", 1, "\u4E0A\u54C1", "\u4E0A\u836F\u4E00\u767E\u4E8C\u5341\u79CD\u4E3A\u541B\uFF0C\u4E3B\u517B\u547D\u4EE5\u5E94\u5929\uFF0C\u65E0\u6BD2\uFF0C\u591A\u670D\u4E45\u670D\u4E0D\u4F24\u4EBA\u3002", "https://zh.wikisource.org/wiki/%E7%A5%9E%E8%BE%B2%E6%9C%AC%E8%8D%89%E7%B6%93"],
  ["shen-nong-ben-cao", 2, "\u4E2D\u54C1", "\u4E2D\u836F\u4E00\u767E\u4E8C\u5341\u79CD\u4E3A\u81E3\uFF0C\u4E3B\u517B\u6027\u4EE5\u5E94\u4EBA\uFF0C\u65E0\u6BD2\u6709\u6BD2\uFF0C\u659F\u914C\u5176\u5B9C\u3002", "https://zh.wikisource.org/wiki/%E7%A5%9E%E8%BE%B2%E6%9C%AC%E8%8D%89%E7%B6%93"],
  ["ben-cao-gang-mu", 1, "\u8349\u90E8", "\u672C\u8349\u4E4B\u540D\uFF0C\u59CB\u89C1\u4E8E\u300A\u6C49\u4E66\xB7\u5E73\u5E1D\u7EAA\u300B\uFF1B\u5176\u4E66\uFF0C\u540E\u4E16\u4F20\u8FF0\uFF0C\u65E5\u4EE5\u7E41\u5E7F\u3002", "https://zh.wikisource.org/wiki/%E6%9C%AC%E8%8D%89%E7%B6%B1%E7%9B%AE"],
  ["ben-cao-gang-mu", 2, "\u6728\u90E8", "\u6728\u4E4B\u4E3A\u7269\uFF0C\u7C7B\u591A\u800C\u540D\u7E41\uFF0C\u56E0\u5176\u6027\u5473\u5F62\u8272\u4EE5\u8FA8\u4E4B\u3002", "https://zh.wikisource.org/wiki/%E6%9C%AC%E8%8D%89%E7%B6%B1%E7%9B%AE"],
  ["wen-bing-tiao-bian", 1, "\u4E0A\u7126\u7BC7", "\u6E29\u75C5\u8005\uFF0C\u6709\u98CE\u6E29\u3001\u6709\u6E29\u70ED\u3001\u6709\u6E29\u75AB\u3001\u6709\u6E29\u6BD2\u3001\u6709\u6691\u6E29\u3001\u6709\u6E7F\u6E29\u3001\u6709\u79CB\u71E5\u3001\u6709\u51AC\u6E29\u3002", "https://zh.wikisource.org/wiki/%E6%BA%AB%E7%97%85%E6%A2%9D%E8%BE%A8"]
];
var shangHanPassageSeed = [
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u6842\u679D\u6C64 \xB7 \u592A\u9633\u4E2D\u98CE", "\u592A\u9633\u4E2D\u98CE\uFF0C\u9633\u6D6E\u800C\u9634\u5F31\uFF0C\u9633\u6D6E\u8005\uFF0C\u70ED\u81EA\u53D1\uFF0C\u9634\u5F31\u8005\uFF0C\u6C57\u81EA\u51FA\u3002\u556C\u556C\u6076\u5BD2\uFF0C\u6DC5\u6DC5\u6076\u98CE\uFF0C\u7FD5\u7FD5\u53D1\u70ED\uFF0C\u9F3B\u9E23\u5E72\u5455\u8005\uFF0C\u6842\u679D\u6C64\u4E3B\u4E4B\u3002", "\u6842\u679D\u6C64\u3001\u592A\u9633\u4E2D\u98CE\u3001\u6C57\u51FA\u6076\u98CE", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "\u845B\u6839\u6C64 \xB7 \u9879\u80CC\u5F3A", "\u592A\u9633\u75C5\uFF0C\u9879\u80CC\u5F3A\u51E0\u51E0\uFF0C\u65E0\u6C57\u6076\u98CE\uFF0C\u845B\u6839\u6C64\u4E3B\u4E4B\u3002", "\u845B\u6839\u6C64\u3001\u9879\u80CC\u5F3A\u3001\u65E0\u6C57\u6076\u98CE", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "\u9EBB\u9EC4\u6C64 \xB7 \u65E0\u6C57\u800C\u5598", "\u592A\u9633\u75C5\uFF0C\u5934\u75DB\uFF0C\u53D1\u70ED\uFF0C\u8EAB\u75BC\uFF0C\u8170\u75DB\uFF0C\u9AA8\u8282\u75BC\u75DB\uFF0C\u6076\u98CE\uFF0C\u65E0\u6C57\u800C\u5598\u8005\uFF0C\u9EBB\u9EC4\u6C64\u4E3B\u4E4B\u3002", "\u9EBB\u9EC4\u6C64\u3001\u65E0\u6C57\u800C\u5598\u3001\u592A\u9633\u75C5", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "\u4E94\u82D3\u6563 \xB7 \u8109\u6D6E\u5C0F\u4FBF\u4E0D\u5229", "\u592A\u9633\u75C5\uFF0C\u53D1\u6C57\u540E\uFF0C\u5927\u6C57\u51FA\uFF0C\u80C3\u4E2D\u5E72\uFF0C\u70E6\u8E81\u4E0D\u5F97\u7720\uFF0C\u6B32\u5F97\u996E\u6C34\u8005\uFF0C\u5C11\u5C11\u4E0E\u996E\u4E4B\uFF0C\u4EE4\u80C3\u6C14\u548C\u5219\u6108\u3002\u82E5\u8109\u6D6E\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u5FAE\u70ED\u6D88\u6E34\u8005\uFF0C\u4E94\u82D3\u6563\u4E3B\u4E4B\u3002", "\u4E94\u82D3\u6563\u3001\u8109\u6D6E\u3001\u5C0F\u4FBF\u4E0D\u5229", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u5C0F\u67F4\u80E1\u6C64 \xB7 \u5F80\u6765\u5BD2\u70ED", "\u4F24\u5BD2\u4E94\u516D\u65E5\uFF0C\u4E2D\u98CE\uFF0C\u5F80\u6765\u5BD2\u70ED\uFF0C\u80F8\u80C1\u82E6\u6EE1\uFF0C\u563F\u563F\u4E0D\u6B32\u996E\u98DF\uFF0C\u5FC3\u70E6\u559C\u5455\u3002\u6216\u80F8\u4E2D\u70E6\u800C\u4E0D\u5455\uFF0C\u6216\u6E34\uFF0C\u6216\u8179\u4E2D\u75DB\uFF0C\u6216\u80C1\u4E0B\u75DE\u9795\uFF0C\u6216\u5FC3\u4E0B\u60B8\u3001\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u6216\u4E0D\u6E34\u3001\u8EAB\u6709\u5FAE\u70ED\uFF0C\u6216\u54B3\u8005\uFF0C\u5C0F\u67F4\u80E1\u6C64\u4E3B\u4E4B\u3002", "\u5C0F\u67F4\u80E1\u6C64\u3001\u5F80\u6765\u5BD2\u70ED\u3001\u80F8\u80C1\u82E6\u6EE1", "\u5C11\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u53D1\u6C57\u5410\u4E0B\u540E\u8109\u8BC1\u5E76\u6CBB", 1, "\u534A\u590F\u6CFB\u5FC3\u6C64 \xB7 \u5FC3\u4E0B\u75DE", "\u4F24\u5BD2\u4E94\u516D\u65E5\uFF0C\u5455\u800C\u53D1\u70ED\u8005\uFF0C\u67F4\u80E1\u6C64\u8BC1\u5177\uFF0C\u800C\u4EE5\u4ED6\u836F\u4E0B\u4E4B\uFF0C\u67F4\u80E1\u8BC1\u4ECD\u5728\u8005\uFF0C\u590D\u4E0E\u67F4\u80E1\u6C64\u3002\u6B64\u867D\u5DF2\u4E0B\u4E4B\uFF0C\u4E0D\u4E3A\u9006\uFF0C\u5FC5\u84B8\u84B8\u800C\u632F\uFF0C\u5374\u53D1\u70ED\u6C57\u51FA\u800C\u89E3\u3002\u82E5\u5FC3\u4E0B\u6EE1\u800C\u9795\u75DB\u8005\uFF0C\u6B64\u4E3A\u7ED3\u80F8\u4E5F\uFF0C\u5927\u9677\u80F8\u6C64\u4E3B\u4E4B\u3002\u4F46\u6EE1\u800C\u4E0D\u75DB\u8005\uFF0C\u6B64\u4E3A\u75DE\uFF0C\u67F4\u80E1\u4E0D\u4E2D\u4E0E\u4E4B\uFF0C\u5B9C\u534A\u590F\u6CFB\u5FC3\u6C64\u3002", "\u534A\u590F\u6CFB\u5FC3\u6C64\u3001\u5FC3\u4E0B\u75DE\u3001\u5410\u4E0B\u540E", "\u6C57\u5410\u4E0B\u540E\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u5927\u627F\u6C14\u6C64 \xB7 \u6F6E\u70ED\u8179\u6EE1", "\u9633\u660E\u75C5\uFF0C\u8109\u8FDF\uFF0C\u867D\u6C57\u51FA\u4E0D\u6076\u5BD2\u8005\uFF0C\u5176\u8EAB\u5FC5\u91CD\uFF0C\u77ED\u6C14\uFF0C\u8179\u6EE1\u800C\u5598\uFF0C\u6709\u6F6E\u70ED\u8005\uFF0C\u6B64\u5916\u6B32\u89E3\uFF0C\u53EF\u653B\u91CC\u4E5F\u3002\u624B\u8DB3\u6FC8\u7136\u6C57\u51FA\u8005\uFF0C\u6B64\u5927\u4FBF\u5DF2\u9795\u4E5F\uFF0C\u5927\u627F\u6C14\u6C64\u4E3B\u4E4B\u3002", "\u5927\u627F\u6C14\u6C64\u3001\u6F6E\u70ED\u3001\u8179\u6EE1", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u56DB\u9006\u6C64 \xB7 \u5C11\u9634\u8109\u6C89", "\u5C11\u9634\u75C5\uFF0C\u8109\u6C89\u8005\uFF0C\u6025\u6E29\u4E4B\uFF0C\u5B9C\u56DB\u9006\u6C64\u3002", "\u56DB\u9006\u6C64\u3001\u5C11\u9634\u75C5\u3001\u8109\u6C89", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u970D\u4E71\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u4E94\u82D3\u6563\u4E0E\u7406\u4E2D\u4E38 \xB7 \u970D\u4E71\u6761\u6587", "\u970D\u4E71\uFF0C\u5934\u75DB\uFF0C\u53D1\u70ED\uFF0C\u8EAB\u75BC\u75DB\uFF0C\u70ED\u591A\u6B32\u996E\u6C34\u8005\uFF0C\u4E94\u82D3\u6563\u4E3B\u4E4B\u3002\u5BD2\u591A\u4E0D\u7528\u6C34\u8005\uFF0C\u7406\u4E2D\u4E38\u4E3B\u4E4B\u3002", "\u4E94\u82D3\u6563\u3001\u7406\u4E2D\u4E38\u3001\u970D\u4E71", "\u970D\u4E71\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9634\u9633\u6613\u5DEE\u540E\u52B3\u590D\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u5C0F\u67F4\u80E1\u6C64 \xB7 \u5DEE\u540E\u66F4\u53D1\u70ED", "\u4F24\u5BD2\u5DEE\u4EE5\u540E\uFF0C\u66F4\u53D1\u70ED\uFF0C\u5C0F\u67F4\u80E1\u6C64\u4E3B\u4E4B\u3002\u8109\u6D6E\u8005\uFF0C\u4EE5\u6C57\u89E3\u4E4B\uFF1B\u8109\u6C89\u5B9E\u8005\uFF0C\u4EE5\u4E0B\u89E3\u4E4B\u3002", "\u5C0F\u67F4\u80E1\u6C64\u3001\u5DEE\u540E\u3001\u66F4\u53D1\u70ED", "\u5DEE\u540E\u52B3\u590D\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 5, "\u6842\u679D\u52A0\u845B\u6839\u6C64 \xB7 \u6C57\u51FA\u6076\u98CE", "\u592A\u9633\u75C5\uFF0C\u9879\u80CC\u5F3A\u51E0\u51E0\uFF0C\u53CD\u6C57\u51FA\u6076\u98CE\u8005\uFF0C\u6842\u679D\u52A0\u845B\u6839\u6C64\u4E3B\u4E4B\u3002", "\u6842\u679D\u52A0\u845B\u6839\u6C64\u3001\u9879\u80CC\u5F3A\u3001\u6C57\u51FA\u6076\u98CE", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 6, "\u6842\u679D\u52A0\u9644\u5B50\u6C64 \xB7 \u53D1\u6C57\u540E", "\u592A\u9633\u75C5\uFF0C\u53D1\u6C57\uFF0C\u9042\u6F0F\u4E0D\u6B62\uFF0C\u5176\u4EBA\u6076\u98CE\uFF0C\u5C0F\u4FBF\u96BE\uFF0C\u56DB\u80A2\u5FAE\u6025\uFF0C\u96BE\u4EE5\u5C48\u4F38\u8005\uFF0C\u6842\u679D\u52A0\u9644\u5B50\u6C64\u4E3B\u4E4B\u3002", "\u6842\u679D\u52A0\u9644\u5B50\u6C64\u3001\u53D1\u6C57\u540E\u3001\u6076\u98CE", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 7, "\u5927\u9752\u9F99\u6C64 \xB7 \u4E0D\u6C57\u51FA\u70E6\u8E81", "\u592A\u9633\u4E2D\u98CE\uFF0C\u8109\u6D6E\u7D27\uFF0C\u53D1\u70ED\u6076\u5BD2\uFF0C\u8EAB\u75BC\u75DB\uFF0C\u4E0D\u6C57\u51FA\u800C\u70E6\u8E81\u8005\uFF0C\u5927\u9752\u9F99\u6C64\u4E3B\u4E4B\u3002", "\u5927\u9752\u9F99\u6C64\u3001\u4E0D\u6C57\u51FA\u3001\u70E6\u8E81", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 8, "\u5C0F\u9752\u9F99\u6C64 \xB7 \u5FC3\u4E0B\u6709\u6C34\u6C14", "\u4F24\u5BD2\u8868\u4E0D\u89E3\uFF0C\u5FC3\u4E0B\u6709\u6C34\u6C14\uFF0C\u5E72\u5455\uFF0C\u53D1\u70ED\u800C\u54B3\uFF0C\u6216\u6E34\uFF0C\u6216\u5229\uFF0C\u6216\u564E\uFF0C\u6216\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u5C11\u8179\u6EE1\uFF0C\u6216\u5598\u8005\uFF0C\u5C0F\u9752\u9F99\u6C64\u4E3B\u4E4B\u3002", "\u5C0F\u9752\u9F99\u6C64\u3001\u5FC3\u4E0B\u6709\u6C34\u6C14\u3001\u54B3", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 9, "\u6842\u679D\u52A0\u539A\u6734\u674F\u5B50\u6C64 \xB7 \u4E0B\u540E\u5FAE\u5598", "\u592A\u9633\u75C5\uFF0C\u4E0B\u4E4B\u5FAE\u5598\u8005\uFF0C\u8868\u672A\u89E3\u6545\u4E5F\uFF0C\u6842\u679D\u52A0\u539A\u6734\u674F\u5B50\u6C64\u4E3B\u4E4B\u3002", "\u6842\u679D\u52A0\u539A\u6734\u674F\u5B50\u6C64\u3001\u4E0B\u540E\u3001\u5FAE\u5598", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 10, "\u9EBB\u9EC4\u674F\u4EC1\u7518\u8349\u77F3\u818F\u6C64 \xB7 \u53D1\u6C57\u540E\u5598", "\u53D1\u6C57\u540E\uFF0C\u4E0D\u53EF\u66F4\u884C\u6842\u679D\u6C64\uFF0C\u6C57\u51FA\u800C\u5598\uFF0C\u65E0\u5927\u70ED\u8005\uFF0C\u53EF\u4E0E\u9EBB\u9EC4\u674F\u4EC1\u7518\u8349\u77F3\u818F\u6C64\u3002", "\u9EBB\u9EC4\u674F\u4EC1\u7518\u8349\u77F3\u818F\u6C64\u3001\u53D1\u6C57\u540E\u3001\u5598", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 11, "\u6843\u6838\u627F\u6C14\u6C64 \xB7 \u5C11\u8179\u6025\u7ED3", "\u592A\u9633\u75C5\u4E0D\u89E3\uFF0C\u70ED\u7ED3\u8180\u80F1\uFF0C\u5176\u4EBA\u5982\u72C2\uFF0C\u8840\u81EA\u4E0B\uFF0C\u4E0B\u8005\u6108\u3002\u5176\u5916\u4E0D\u89E3\u8005\uFF0C\u5C1A\u672A\u53EF\u653B\uFF0C\u5F53\u5148\u89E3\u5176\u5916\u3002\u5916\u89E3\u5DF2\uFF0C\u4F46\u5C11\u8179\u6025\u7ED3\u8005\uFF0C\u4E43\u53EF\u653B\u4E4B\uFF0C\u5B9C\u6843\u6838\u627F\u6C14\u6C64\u3002", "\u6843\u6838\u627F\u6C14\u6C64\u3001\u5C11\u8179\u6025\u7ED3\u3001\u592A\u9633\u75C5", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "\u8C03\u80C3\u627F\u6C14\u6C64 \xB7 \u84B8\u84B8\u53D1\u70ED", "\u592A\u9633\u75C5\u4E09\u65E5\uFF0C\u53D1\u6C57\u4E0D\u89E3\uFF0C\u84B8\u84B8\u53D1\u70ED\u8005\uFF0C\u5C5E\u80C3\u4E5F\uFF0C\u8C03\u80C3\u627F\u6C14\u6C64\u4E3B\u4E4B\u3002", "\u8C03\u80C3\u627F\u6C14\u6C64\u3001\u84B8\u84B8\u53D1\u70ED\u3001\u5C5E\u80C3", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "\u5C0F\u627F\u6C14\u6C64 \xB7 \u8179\u5927\u6EE1\u4E0D\u901A", "\u9633\u660E\u75C5\uFF0C\u8109\u8FDF\uFF0C\u867D\u6C57\u51FA\u4E0D\u6076\u5BD2\u8005\uFF0C\u5176\u8EAB\u5FC5\u91CD\uFF0C\u77ED\u6C14\uFF0C\u8179\u6EE1\u800C\u5598\uFF0C\u6709\u6F6E\u70ED\u8005\uFF0C\u6B64\u5916\u6B32\u89E3\uFF0C\u53EF\u653B\u91CC\u4E5F\u3002\u82E5\u8179\u5927\u6EE1\u4E0D\u901A\u8005\uFF0C\u53EF\u4E0E\u5C0F\u627F\u6C14\u6C64\uFF0C\u5FAE\u548C\u80C3\u6C14\u3002", "\u5C0F\u627F\u6C14\u6C64\u3001\u8179\u5927\u6EE1\u3001\u9633\u660E\u75C5", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "\u767D\u864E\u6C64 \xB7 \u8109\u6D6E\u6ED1", "\u4F24\u5BD2\uFF0C\u8109\u6D6E\u6ED1\uFF0C\u6B64\u4EE5\u8868\u6709\u70ED\uFF0C\u91CC\u6709\u5BD2\uFF0C\u767D\u864E\u6C64\u4E3B\u4E4B\u3002", "\u767D\u864E\u6C64\u3001\u8109\u6D6E\u6ED1\u3001\u9633\u660E", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 5, "\u6800\u5B50\u8C49\u6C64 \xB7 \u5FC3\u4E2D\u61CA\u61B9", "\u9633\u660E\u75C5\uFF0C\u8109\u6D6E\u800C\u7D27\uFF0C\u54BD\u71E5\u53E3\u82E6\uFF0C\u8179\u6EE1\u800C\u5598\uFF0C\u53D1\u70ED\u6C57\u51FA\uFF0C\u4E0D\u6076\u5BD2\u53CD\u6076\u70ED\uFF0C\u8EAB\u91CD\u3002\u82E5\u4E0B\u4E4B\uFF0C\u5219\u80C3\u4E2D\u7A7A\u865A\uFF0C\u5BA2\u6C14\u52A8\u8188\uFF0C\u5FC3\u4E2D\u61CA\u61B9\uFF0C\u820C\u4E0A\u80CE\u8005\uFF0C\u6800\u5B50\u8C49\u6C64\u4E3B\u4E4B\u3002", "\u6800\u5B50\u8C49\u6C64\u3001\u5FC3\u4E2D\u61CA\u61B9\u3001\u9633\u660E", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 6, "\u767D\u864E\u52A0\u4EBA\u53C2\u6C64 \xB7 \u53E3\u5E72\u820C\u71E5", "\u82E5\u6E34\u6B32\u996E\u6C34\uFF0C\u53E3\u5E72\u820C\u71E5\u8005\uFF0C\u767D\u864E\u52A0\u4EBA\u53C2\u6C64\u4E3B\u4E4B\u3002", "\u767D\u864E\u52A0\u4EBA\u53C2\u6C64\u3001\u53E3\u5E72\u820C\u71E5\u3001\u9633\u660E", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 7, "\u732A\u82D3\u6C64 \xB7 \u5C0F\u4FBF\u4E0D\u5229", "\u82E5\u8109\u6D6E\uFF0C\u53D1\u70ED\uFF0C\u6E34\u6B32\u996E\u6C34\uFF0C\u5C0F\u4FBF\u4E0D\u5229\u8005\uFF0C\u732A\u82D3\u6C64\u4E3B\u4E4B\u3002", "\u732A\u82D3\u6C64\u3001\u5C0F\u4FBF\u4E0D\u5229\u3001\u9633\u660E", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 8, "\u8335\u9648\u84BF\u6C64 \xB7 \u7600\u70ED\u5728\u91CC", "\u9633\u660E\u75C5\uFF0C\u53D1\u70ED\u6C57\u51FA\u8005\uFF0C\u6B64\u4E3A\u70ED\u8D8A\uFF0C\u4E0D\u80FD\u53D1\u9EC4\u4E5F\uFF1B\u4F46\u5934\u6C57\u51FA\uFF0C\u8EAB\u65E0\u6C57\uFF0C\u5242\u9888\u800C\u8FD8\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u6E34\u5F15\u6C34\u6D46\u8005\uFF0C\u6B64\u4E3A\u7600\u70ED\u5728\u91CC\uFF0C\u8EAB\u5FC5\u53D1\u9EC4\uFF0C\u8335\u9648\u84BF\u6C64\u4E3B\u4E4B\u3002", "\u8335\u9648\u84BF\u6C64\u3001\u5934\u6C57\u3001\u5C0F\u4FBF\u4E0D\u5229", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 9, "\u62B5\u5F53\u6C64 \xB7 \u559C\u5FD8", "\u9633\u660E\u8BC1\uFF0C\u5176\u4EBA\u559C\u5FD8\u8005\uFF0C\u5FC5\u6709\u755C\u8840\u3002\u6240\u4EE5\u7136\u8005\uFF0C\u672C\u6709\u4E45\u7600\u8840\uFF0C\u6545\u4EE4\u559C\u5FD8\uFF0C\u5C4E\u867D\u9795\uFF0C\u5927\u4FBF\u53CD\u6613\uFF0C\u5176\u8272\u5FC5\u9ED1\u8005\uFF0C\u5B9C\u62B5\u5F53\u6C64\u4E0B\u4E4B\u3002", "\u62B5\u5F53\u6C64\u3001\u559C\u5FD8\u3001\u9633\u660E", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 10, "\u9EBB\u5B50\u4EC1\u4E38 \xB7 \u813E\u7EA6", "\u8DBA\u9633\u8109\u6D6E\u800C\u6DA9\uFF0C\u6D6E\u5219\u80C3\u6C14\u5F3A\uFF0C\u6DA9\u5219\u5C0F\u4FBF\u6570\uFF0C\u6D6E\u6DA9\u76F8\u640F\uFF0C\u5927\u4FBF\u5219\u9795\uFF0C\u5176\u813E\u4E3A\u7EA6\uFF0C\u9EBB\u5B50\u4EC1\u4E38\u4E3B\u4E4B\u3002", "\u9EBB\u5B50\u4EC1\u4E38\u3001\u813E\u7EA6\u3001\u9633\u660E", "\u9633\u660E\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "\u9EC4\u8FDE\u963F\u80F6\u6C64 \xB7 \u5FC3\u4E2D\u70E6", "\u5C11\u9634\u75C5\uFF0C\u5F97\u4E4B\u4E8C\u4E09\u65E5\u4EE5\u4E0A\uFF0C\u5FC3\u4E2D\u70E6\uFF0C\u4E0D\u5F97\u5367\uFF0C\u9EC4\u8FDE\u963F\u80F6\u6C64\u4E3B\u4E4B\u3002", "\u9EC4\u8FDE\u963F\u80F6\u6C64\u3001\u5FC3\u4E2D\u70E6\u3001\u5C11\u9634", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "\u771F\u6B66\u6C64 \xB7 \u6709\u6C34\u6C14", "\u5C11\u9634\u75C5\uFF0C\u4E8C\u4E09\u65E5\u4E0D\u5DF2\uFF0C\u81F3\u56DB\u4E94\u65E5\uFF0C\u8179\u75DB\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u56DB\u80A2\u6C89\u91CD\u75BC\u75DB\uFF0C\u81EA\u4E0B\u5229\u8005\uFF0C\u6B64\u4E3A\u6709\u6C34\u6C14\u3002\u5176\u4EBA\u6216\u54B3\uFF0C\u6216\u5C0F\u4FBF\u5229\uFF0C\u6216\u4E0B\u5229\uFF0C\u6216\u5455\u8005\uFF0C\u771F\u6B66\u6C64\u4E3B\u4E4B\u3002", "\u771F\u6B66\u6C64\u3001\u6709\u6C34\u6C14\u3001\u5C11\u9634", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "\u56DB\u9006\u6563 \xB7 \u56DB\u9006", "\u5C11\u9634\u75C5\uFF0C\u56DB\u9006\uFF0C\u5176\u4EBA\u6216\u54B3\uFF0C\u6216\u60B8\uFF0C\u6216\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u6216\u8179\u4E2D\u75DB\uFF0C\u6216\u6CC4\u5229\u4E0B\u91CD\u8005\uFF0C\u56DB\u9006\u6563\u4E3B\u4E4B\u3002", "\u56DB\u9006\u6563\u3001\u56DB\u9006\u3001\u5C11\u9634", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 5, "\u732A\u82D3\u6C64 \xB7 \u4E0B\u5229\u54B3\u5455\u6E34", "\u5C11\u9634\u75C5\uFF0C\u4E0B\u5229\uFF0C\u516D\u4E03\u65E5\uFF0C\u54B3\u800C\u5455\u6E34\uFF0C\u5FC3\u70E6\u4E0D\u5F97\u7720\u8005\uFF0C\u732A\u82D3\u6C64\u4E3B\u4E4B\u3002", "\u732A\u82D3\u6C64\u3001\u4E0B\u5229\u3001\u54B3\u5455\u6E34\u3001\u5C11\u9634", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u4E4C\u6885\u4E38 \xB7 \u86D4\u53A5", "\u86D4\u53A5\u8005\uFF0C\u4E4C\u6885\u4E38\u4E3B\u4E4B\u3002\u53C8\u4E3B\u4E45\u5229\u3002", "\u4E4C\u6885\u4E38\u3001\u86D4\u53A5\u3001\u53A5\u9634", "\u53A5\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9634\u9633\u6613\u5DEE\u540E\u52B3\u590D\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "\u67B3\u5B9E\u6800\u5B50\u8C49\u6C64 \xB7 \u52B3\u590D", "\u5927\u75C5\u5DEE\u540E\uFF0C\u52B3\u590D\u8005\uFF0C\u67B3\u5B9E\u6800\u5B50\u8C49\u6C64\u4E3B\u4E4B\u3002", "\u67B3\u5B9E\u6800\u5B50\u8C49\u6C64\u3001\u52B3\u590D\u3001\u5DEE\u540E", "\u5DEE\u540E\u52B3\u590D\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "\u5927\u67F4\u80E1\u6C64 \xB7 \u70ED\u7ED3\u5728\u91CC", "\u4F24\u5BD2\u5341\u4F59\u65E5\uFF0C\u70ED\u7ED3\u5728\u91CC\uFF0C\u590D\u5F80\u6765\u5BD2\u70ED\u8005\uFF0C\u4E0E\u5927\u67F4\u80E1\u6C64\u3002", "\u5927\u67F4\u80E1\u6C64\u3001\u70ED\u7ED3\u5728\u91CC\u3001\u5F80\u6765\u5BD2\u70ED", "\u5C11\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u6842\u679D\u52A0\u828D\u836F\u6C64 \xB7 \u8179\u6EE1\u65F6\u75DB", "\u672C\u592A\u9633\u75C5\uFF0C\u533B\u53CD\u4E0B\u4E4B\uFF0C\u56E0\u5C14\u8179\u6EE1\u65F6\u75DB\u8005\uFF0C\u5C5E\u592A\u9634\u4E5F\uFF0C\u6842\u679D\u52A0\u828D\u836F\u6C64\u4E3B\u4E4B\u3002", "\u6842\u679D\u52A0\u828D\u836F\u6C64\u3001\u8179\u6EE1\u65F6\u75DB\u3001\u592A\u9634", "\u592A\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "\u6842\u679D\u52A0\u5927\u9EC4\u6C64 \xB7 \u5927\u5B9E\u75DB", "\u672C\u592A\u9633\u75C5\uFF0C\u533B\u53CD\u4E0B\u4E4B\uFF0C\u56E0\u5C14\u8179\u6EE1\u65F6\u75DB\u8005\uFF0C\u5C5E\u592A\u9634\u4E5F\uFF1B\u5927\u5B9E\u75DB\u8005\uFF0C\u6842\u679D\u52A0\u5927\u9EC4\u6C64\u4E3B\u4E4B\u3002", "\u6842\u679D\u52A0\u5927\u9EC4\u6C64\u3001\u5927\u5B9E\u75DB\u3001\u592A\u9634", "\u592A\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "\u6842\u679D\u6C64 \xB7 \u8109\u6D6E", "\u592A\u9634\u75C5\uFF0C\u8109\u6D6E\u8005\uFF0C\u53EF\u53D1\u6C57\uFF0C\u5B9C\u6842\u679D\u6C64\u3002", "\u6842\u679D\u6C64\u3001\u8109\u6D6E\u3001\u592A\u9634", "\u592A\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "\u67F4\u80E1\u6842\u679D\u6C64 \xB7 \u5916\u8BC1\u672A\u53BB", "\u4F24\u5BD2\u516D\u4E03\u65E5\uFF0C\u53D1\u70ED\u5FAE\u6076\u5BD2\uFF0C\u652F\u8282\u70E6\u75BC\uFF0C\u5FAE\u5455\uFF0C\u5FC3\u4E0B\u652F\u7ED3\uFF0C\u5916\u8BC1\u672A\u53BB\u8005\uFF0C\u67F4\u80E1\u6842\u679D\u6C64\u4E3B\u4E4B\u3002", "\u67F4\u80E1\u6842\u679D\u6C64\u3001\u5FAE\u5455\u3001\u5FC3\u4E0B\u652F\u7ED3", "\u5C11\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "\u67F4\u80E1\u6842\u679D\u5E72\u59DC\u6C64 \xB7 \u80F8\u80C1\u6EE1\u5FAE\u7ED3", "\u4F24\u5BD2\u4E94\u516D\u65E5\uFF0C\u5DF2\u53D1\u6C57\u800C\u590D\u4E0B\u4E4B\uFF0C\u80F8\u80C1\u6EE1\u5FAE\u7ED3\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u6E34\u800C\u4E0D\u5455\uFF0C\u4F46\u5934\u6C57\u51FA\uFF0C\u5F80\u6765\u5BD2\u70ED\uFF0C\u5FC3\u70E6\u8005\uFF0C\u6B64\u4E3A\u672A\u89E3\u4E5F\uFF0C\u67F4\u80E1\u6842\u679D\u5E72\u59DC\u6C64\u4E3B\u4E4B\u3002", "\u67F4\u80E1\u6842\u679D\u5E72\u59DC\u6C64\u3001\u80F8\u80C1\u6EE1\u5FAE\u7ED3\u3001\u5C11\u9633\u592A\u9634", "\u5C11\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "\u5F53\u5F52\u56DB\u9006\u6C64 \xB7 \u624B\u8DB3\u53A5\u5BD2", "\u624B\u8DB3\u53A5\u5BD2\uFF0C\u8109\u7EC6\u6B32\u7EDD\u8005\uFF0C\u5F53\u5F52\u56DB\u9006\u6C64\u4E3B\u4E4B\u3002", "\u5F53\u5F52\u56DB\u9006\u6C64\u3001\u624B\u8DB3\u53A5\u5BD2\u3001\u8109\u7EC6\u6B32\u7EDD", "\u53A5\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 18, "\u6843\u82B1\u6C64 \xB7 \u4E0B\u5229\u4FBF\u8113\u8840", "\u5C11\u9634\u75C5\uFF0C\u4E8C\u4E09\u65E5\u81F3\u56DB\u4E94\u65E5\uFF0C\u8179\u75DB\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u4E0B\u5229\u4E0D\u6B62\uFF0C\u4FBF\u8113\u8840\u8005\uFF0C\u6843\u82B1\u6C64\u4E3B\u4E4B\u3002", "\u6843\u82B1\u6C64\u3001\u4E0B\u5229\u3001\u4FBF\u8113\u8840\u3001\u5C11\u9634", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 19, "\u9644\u5B50\u6C64 \xB7 \u9AA8\u8282\u75DB", "\u5C11\u9634\u75C5\uFF0C\u8EAB\u4F53\u75DB\uFF0C\u624B\u8DB3\u5BD2\uFF0C\u9AA8\u8282\u75DB\uFF0C\u8109\u6C89\u8005\uFF0C\u9644\u5B50\u6C64\u4E3B\u4E4B\u3002", "\u9644\u5B50\u6C64\u3001\u9AA8\u8282\u75DB\u3001\u8109\u6C89\u3001\u5C11\u9634", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 20, "\u767D\u901A\u6C64 \xB7 \u4E0B\u5229", "\u5C11\u9634\u75C5\uFF0C\u4E0B\u5229\uFF0C\u767D\u901A\u6C64\u4E3B\u4E4B\u3002", "\u767D\u901A\u6C64\u3001\u4E0B\u5229\u3001\u5C11\u9634", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 21, "\u901A\u8109\u56DB\u9006\u6C64 \xB7 \u4E0B\u5229\u6E05\u8C37", "\u5C11\u9634\u75C5\uFF0C\u4E0B\u5229\u6E05\u8C37\uFF0C\u91CC\u5BD2\u5916\u70ED\uFF0C\u624B\u8DB3\u53A5\u9006\uFF0C\u8109\u5FAE\u6B32\u7EDD\uFF0C\u8EAB\u53CD\u4E0D\u6076\u5BD2\uFF0C\u5176\u4EBA\u9762\u8272\u8D64\uFF1B\u6216\u8179\u75DB\uFF0C\u6216\u5E72\u5455\uFF0C\u6216\u54BD\u75DB\uFF0C\u6216\u5229\u6B62\u8109\u4E0D\u51FA\u8005\uFF0C\u901A\u8109\u56DB\u9006\u6C64\u4E3B\u4E4B\u3002", "\u901A\u8109\u56DB\u9006\u6C64\u3001\u4E0B\u5229\u6E05\u8C37\u3001\u624B\u8DB3\u53A5\u9006\u3001\u5C11\u9634", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 22, "\u9EBB\u9EC4\u9644\u5B50\u7EC6\u8F9B\u6C64 \xB7 \u59CB\u5F97\u53CD\u53D1\u70ED", "\u5C11\u9634\u75C5\uFF0C\u59CB\u5F97\u4E4B\uFF0C\u53CD\u53D1\u70ED\uFF0C\u8109\u6C89\u8005\uFF0C\u9EBB\u9EC4\u9644\u5B50\u7EC6\u8F9B\u6C64\u4E3B\u4E4B\u3002", "\u9EBB\u9EC4\u9644\u5B50\u7EC6\u8F9B\u6C64\u3001\u53CD\u53D1\u70ED\u3001\u8109\u6C89\u3001\u5C11\u9634", "\u5C11\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 12, "\u6842\u679D\u53BB\u828D\u836F\u6C64 \xB7 \u4E0B\u540E\u8109\u4FC3\u80F8\u6EE1", "\u592A\u9633\u75C5\uFF0C\u4E0B\u4E4B\u540E\uFF0C\u8109\u4FC3\u80F8\u6EE1\u8005\uFF0C\u6842\u679D\u53BB\u828D\u836F\u6C64\u4E3B\u4E4B\u3002", "\u6842\u679D\u53BB\u828D\u836F\u6C64\u3001\u4E0B\u4E4B\u540E\u3001\u8109\u4FC3\u80F8\u6EE1\u3001\u592A\u9633", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 13, "\u845B\u6839\u52A0\u534A\u590F\u6C64 \xB7 \u592A\u9633\u9633\u660E\u5408\u75C5", "\u592A\u9633\u4E0E\u9633\u660E\u5408\u75C5\uFF0C\u4E0D\u4E0B\u5229\uFF0C\u4F46\u5455\u8005\uFF0C\u845B\u6839\u52A0\u534A\u590F\u6C64\u4E3B\u4E4B\u3002", "\u845B\u6839\u52A0\u534A\u590F\u6C64\u3001\u592A\u9633\u9633\u660E\u5408\u75C5\u3001\u4F46\u5455", "\u592A\u9633\u9633\u660E\u5408\u75C5 \xB7 \u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 14, "\u845B\u6839\u9EC4\u82A9\u9EC4\u8FDE\u6C64 \xB7 \u8BEF\u4E0B\u540E\u4E0B\u5229", "\u592A\u9633\u75C5\uFF0C\u6842\u679D\u8BC1\uFF0C\u533B\u53CD\u4E0B\u4E4B\uFF0C\u5229\u9042\u4E0D\u6B62\uFF0C\u8109\u4FC3\u8005\uFF0C\u8868\u672A\u89E3\u4E5F\uFF1B\u5598\u800C\u6C57\u51FA\u8005\uFF0C\u845B\u6839\u9EC4\u82A9\u9EC4\u8FDE\u6C64\u4E3B\u4E4B\u3002", "\u845B\u6839\u9EC4\u82A9\u9EC4\u8FDE\u6C64\u3001\u8BEF\u4E0B\u540E\u3001\u4E0B\u5229\u3001\u592A\u9633", "\u592A\u9633\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "\u767D\u5934\u7FC1\u6C64 \xB7 \u70ED\u5229\u4E0B\u91CD", "\u70ED\u5229\u4E0B\u91CD\u8005\uFF0C\u767D\u5934\u7FC1\u6C64\u4E3B\u4E4B\u3002", "\u767D\u5934\u7FC1\u6C64\u3001\u70ED\u5229\u4E0B\u91CD\u3001\u53A5\u9634", "\u53A5\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "\u767D\u864E\u6C64 \xB7 \u8109\u6ED1\u800C\u53A5", "\u4F24\u5BD2\u8109\u6ED1\u800C\u53A5\u8005\uFF0C\u91CC\u6709\u70ED\u4E5F\uFF0C\u767D\u864E\u6C64\u4E3B\u4E4B\u3002", "\u767D\u864E\u6C64\u3001\u8109\u6ED1\u800C\u53A5\u3001\u53A5\u9634", "\u53A5\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 5, "\u56DB\u9006\u6C64 \xB7 \u6C57\u51FA\u53A5\u9006", "\u5927\u6C57\u51FA\uFF0C\u70ED\u4E0D\u53BB\uFF0C\u5185\u62D8\u6025\uFF0C\u56DB\u80A2\u75BC\uFF0C\u53C8\u4E0B\u5229\uFF0C\u53A5\u9006\u800C\u6076\u5BD2\u8005\uFF0C\u56DB\u9006\u6C64\u4E3B\u4E4B\u3002", "\u56DB\u9006\u6C64\u3001\u6C57\u51FA\u3001\u53A5\u9006\u3001\u53A5\u9634", "\u53A5\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 6, "\u5C0F\u627F\u6C14\u6C64 \xB7 \u4E0B\u5229\u8C35\u8BED", "\u4E0B\u5229\u8C35\u8BED\u8005\uFF0C\u6709\u71E5\u5C4E\u4E5F\uFF0C\u5B9C\u5C0F\u627F\u6C14\u6C64\u3002", "\u5C0F\u627F\u6C14\u6C64\u3001\u4E0B\u5229\u8C35\u8BED\u3001\u53A5\u9634", "\u53A5\u9634\u75C5\u7BC7", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 15, "\u592A\u9633\u4F24\u5BD2 \xB7 \u6216\u5DF2\u53D1\u70ED", "\u592A\u9633\u75C5\uFF0C\u6216\u5DF2\u53D1\u70ED\uFF0C\u6216\u672A\u53D1\u70ED\uFF0C\u5FC5\u6076\u5BD2\uFF0C\u4F53\u75DB\uFF0C\u5455\u9006\uFF0C\u8109\u9634\u9633\u4FF1\u7D27\u8005\uFF0C\u540D\u66F0\u4F24\u5BD2\u3002", "\u592A\u9633\u4F24\u5BD2\u3001\u6076\u5BD2\u3001\u4F53\u75DB\u3001\u5455\u9006", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u592A\u9633\u7BC7\u7B2C3\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 16, "\u4F24\u5BD2\u4E00\u65E5 \xB7 \u8109\u6570\u6025", "\u4F24\u5BD2\u4E00\u65E5\uFF0C\u592A\u9633\u53D7\u4E4B\uFF0C\u8109\u82E5\u9759\u8005\u4E3A\u4E0D\u4F20\uFF1B\u9887\u6B32\u5410\uFF0C\u82E5\u71E5\u70E6\uFF0C\u8109\u6570\u6025\u8005\uFF0C\u4E3A\u4F20\u4E5F\u3002", "\u4F24\u5BD2\u4E00\u65E5\u3001\u592A\u9633\u53D7\u4E4B\u3001\u8109\u6570\u6025", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u592A\u9633\u7BC7\u7B2C4\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 17, "\u4F24\u5BD2\u4E8C\u4E09\u65E5 \xB7 \u9633\u660E\u5C11\u9633\u8BC1", "\u4F24\u5BD2\u4E8C\u4E09\u65E5\uFF0C\u9633\u660E\u5C11\u9633\u8BC1\u4E0D\u89C1\u8005\uFF0C\u4E3A\u4E0D\u4F20\u4E5F\u3002", "\u4F24\u5BD2\u4E8C\u4E09\u65E5\u3001\u9633\u660E\u3001\u5C11\u9633\u3001\u4E0D\u4F20", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u592A\u9633\u7BC7\u7B2C5\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 18, "\u6E29\u75C5 \xB7 \u53D1\u70ED\u800C\u6E34", "\u592A\u9633\u75C5\uFF0C\u53D1\u70ED\u800C\u6E34\uFF0C\u4E0D\u6076\u5BD2\u8005\uFF0C\u4E3A\u6E29\u75C5\u3002\u82E5\u53D1\u6C57\u5DF2\uFF0C\u8EAB\u707C\u70ED\u8005\uFF0C\u540D\u66F0\u98CE\u6E29\u3002", "\u6E29\u75C5\u3001\u53D1\u70ED\u800C\u6E34\u3001\u98CE\u6E29", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u592A\u9633\u7BC7\u7B2C6\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 19, "\u53D1\u4E8E\u9633 \xB7 \u4E03\u65E5\u6108", "\u75C5\u6709\u53D1\u70ED\u6076\u5BD2\u8005\uFF0C\u53D1\u4E8E\u9633\u4E5F\uFF1B\u65E0\u70ED\u6076\u5BD2\u8005\uFF0C\u53D1\u4E8E\u9634\u4E5F\u3002\u53D1\u4E8E\u9633\u8005\u4E03\u65E5\u6108\uFF0C\u53D1\u4E8E\u9634\u8005\u516D\u65E5\u6108\u3002", "\u53D1\u4E8E\u9633\u3001\u53D1\u4E8E\u9634\u3001\u4E03\u65E5\u3001\u516D\u65E5", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u592A\u9633\u7BC7\u7B2C7\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 20, "\u592A\u9633\u75C5\u5934\u75DB \xB7 \u884C\u5176\u7ECF\u5C3D", "\u592A\u9633\u75C5\uFF0C\u5934\u75DB\u81F3\u4E03\u65E5\u4EE5\u4E0A\u81EA\u6108\u8005\uFF0C\u4EE5\u884C\u5176\u7ECF\u5C3D\u6545\u4E5F\uFF1B\u82E5\u6B32\u518D\u4F5C\u7ECF\u8005\uFF0C\u9488\u8DB3\u9633\u660E\uFF0C\u4F7F\u7ECF\u4E0D\u4F20\u5219\u6108\u3002", "\u592A\u9633\u75C5\u3001\u5934\u75DB\u3001\u4E03\u65E5\u3001\u81EA\u6108", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u592A\u9633\u7BC7\u7B2C8\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 21, "\u592A\u9633\u6B32\u89E3\u65F6 \xB7 \u4ECE\u5DF3\u81F3\u672A", "\u592A\u9633\u75C5\u6B32\u89E3\u65F6\uFF0C\u4ECE\u5DF3\u81F3\u672A\u4E0A\u3002", "\u592A\u9633\u75C5\u3001\u6B32\u89E3\u65F6\u3001\u5DF3\u81F3\u672A", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u592A\u9633\u7BC7\u7B2C9\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 11, "\u9633\u660E\u4E2D\u98CE \xB7 \u53E3\u82E6\u54BD\u5E72", "\u9633\u660E\u4E2D\u98CE\uFF0C\u53E3\u82E6\u54BD\u5E72\uFF0C\u8179\u6EE1\u5FAE\u5598\uFF0C\u53D1\u70ED\u6076\u5BD2\uFF0C\u8109\u6D6E\u800C\u7D27\uFF1B\u82E5\u4E0B\u4E4B\uFF0C\u5219\u8179\u6EE1\uFF0C\u5C0F\u4FBF\u96BE\u4E5F\u3002", "\u9633\u660E\u4E2D\u98CE\u3001\u53E3\u82E6\u54BD\u5E72\u3001\u8179\u6EE1", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u9633\u660E\u7BC7\u7B2C11\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 12, "\u9633\u660E\u75C5 \xB7 \u80FD\u98DF\u4E0E\u4E0D\u80FD\u98DF", "\u9633\u660E\u75C5\uFF0C\u82E5\u80FD\u98DF\uFF0C\u540D\u4E2D\u98CE\uFF1B\u4E0D\u80FD\u98DF\uFF0C\u540D\u4E2D\u5BD2\u3002", "\u9633\u660E\u75C5\u3001\u80FD\u98DF\u3001\u4E2D\u98CE\u3001\u4E2D\u5BD2", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u9633\u660E\u7BC7\u7B2C12\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 13, "\u9633\u660E\u4E2D\u5BD2 \xB7 \u521D\u786C\u540E\u6E8F", "\u9633\u660E\u75C5\uFF0C\u82E5\u4E2D\u5BD2\uFF0C\u4E0D\u80FD\u98DF\uFF0C\u5C0F\u4FBF\u4E0D\u5229\uFF0C\u624B\u8DB3\u6FC8\u7136\u6C57\u51FA\uFF0C\u6B64\u6B32\u4F5C\u56FA\u7615\uFF0C\u5FC5\u5927\u4FBF\u521D\u786C\u540E\u6E8F\u3002", "\u9633\u660E\u4E2D\u5BD2\u3001\u4E0D\u80FD\u98DF\u3001\u521D\u786C\u540E\u6E8F", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u9633\u660E\u7BC7\u7B2C13\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 14, "\u9633\u660E\u75C5 \xB7 \u6B32\u98DF\u800C\u5C0F\u4FBF\u4E0D\u5229", "\u9633\u660E\u75C5\uFF0C\u6B32\u98DF\uFF0C\u5C0F\u4FBF\u53CD\u4E0D\u5229\uFF0C\u5927\u4FBF\u81EA\u8C03\uFF0C\u5176\u4EBA\u9AA8\u8282\u75BC\uFF0C\u7FD5\u7FD5\u5982\u6709\u70ED\u72B6\uFF0C\u5944\u7136\u53D1\u72C2\uFF0C\u6FC8\u7136\u6C57\u51FA\u800C\u89E3\u8005\uFF0C\u6B64\u6C34\u4E0D\u80DC\u8C37\u6C14\uFF0C\u4E0E\u6C57\u5171\u5E76\uFF0C\u8109\u7D27\u5219\u6108\u3002", "\u9633\u660E\u75C5\u3001\u6B32\u98DF\u3001\u5C0F\u4FBF\u4E0D\u5229\u3001\u8109\u7D27", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u9633\u660E\u7BC7\u7B2C14\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 15, "\u9633\u660E\u6B32\u89E3\u65F6 \xB7 \u4ECE\u7533\u81F3\u620C", "\u9633\u660E\u75C5\u6B32\u89E3\u65F6\uFF0C\u4ECE\u7533\u81F3\u620C\u4E0A\u3002", "\u9633\u660E\u75C5\u3001\u6B32\u89E3\u65F6\u3001\u7533\u81F3\u620C", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u9633\u660E\u7BC7\u7B2C15\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 16, "\u9633\u660E\u75C5 \xB7 \u4E0D\u80FD\u98DF", "\u9633\u660E\u75C5\uFF0C\u4E0D\u80FD\u98DF\uFF0C\u653B\u5176\u70ED\u5FC5\u54D5\uFF1B\u6240\u4EE5\u7136\u8005\uFF0C\u80C3\u4E2D\u865A\u51B7\u6545\u4E5F\u3002", "\u9633\u660E\u75C5\u3001\u4E0D\u80FD\u98DF\u3001\u80C3\u4E2D\u865A\u51B7", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u9633\u660E\u7BC7\u7B2C16\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 9, "\u5C11\u9634\u75C5 \xB7 \u4E0B\u5229\u81EA\u6B62", "\u5C11\u9634\u75C5\uFF0C\u4E0B\u5229\uFF0C\u82E5\u5229\u81EA\u6B62\uFF0C\u6076\u5BD2\u800C\u8737\u5367\uFF0C\u624B\u8DB3\u6E29\u8005\uFF0C\u53EF\u6CBB\u3002", "\u5C11\u9634\u75C5\u3001\u4E0B\u5229\u81EA\u6B62\u3001\u624B\u8DB3\u6E29", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u5C11\u9634\u7BC7\u7B2C8\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 10, "\u5C11\u9634\u4E2D\u98CE \xB7 \u8109\u9633\u5FAE\u9634\u6D6E", "\u5C11\u9634\u4E2D\u98CE\uFF0C\u8109\u9633\u5FAE\u9634\u6D6E\u8005\uFF0C\u4E3A\u6B32\u6108\u3002", "\u5C11\u9634\u4E2D\u98CE\u3001\u8109\u9633\u5FAE\u3001\u8109\u9634\u6D6E", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u5C11\u9634\u7BC7\u7B2C10\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 11, "\u5C11\u9634\u6B32\u89E3\u65F6 \xB7 \u4ECE\u5B50\u81F3\u5BC5", "\u5C11\u9634\u75C5\u6B32\u89E3\u65F6\uFF0C\u4ECE\u5B50\u81F3\u5BC5\u4E0A\u3002", "\u5C11\u9634\u75C5\u3001\u6B32\u89E3\u65F6\u3001\u5B50\u81F3\u5BC5", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u5C11\u9634\u7BC7\u7B2C11\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 12, "\u5C11\u9634\u75C5 \xB7 \u5410\u5229\u800C\u53D1\u70ED", "\u5C11\u9634\u75C5\uFF0C\u5410\u5229\uFF0C\u624B\u8DB3\u4E0D\u9006\u51B7\uFF0C\u53CD\u53D1\u70ED\u8005\uFF0C\u4E0D\u6B7B\uFF1B\u8109\u4E0D\u81F3\u8005\uFF0C\u7078\u5C11\u9634\u4E03\u58EE\u3002", "\u5C11\u9634\u75C5\u3001\u5410\u5229\u3001\u53CD\u53D1\u70ED", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u5C11\u9634\u7BC7\u7B2C12\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 13, "\u5C11\u9634\u75C5 \xB7 \u4E00\u8EAB\u624B\u8DB3\u5C3D\u70ED", "\u5C11\u9634\u75C5\uFF0C\u516B\u4E5D\u65E5\uFF0C\u4E00\u8EAB\u624B\u8DB3\u5C3D\u70ED\u8005\uFF0C\u4EE5\u70ED\u5728\u8180\u80F1\uFF0C\u5FC5\u4FBF\u8840\u4E5F\u3002", "\u5C11\u9634\u75C5\u3001\u516B\u4E5D\u65E5\u3001\u624B\u8DB3\u5C3D\u70ED", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u5C11\u9634\u7BC7\u7B2C13\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 14, "\u5C11\u9634\u75C5 \xB7 \u5F3A\u53D1\u6C57\u52A8\u8840", "\u5C11\u9634\u75C5\uFF0C\u4F46\u53A5\u65E0\u6C57\uFF0C\u800C\u5F3A\u53D1\u4E4B\uFF0C\u5FC5\u52A8\u5176\u8840\uFF1B\u672A\u77E5\u4ECE\u4F55\u9053\u51FA\uFF0C\u6216\u4ECE\u53E3\u9F3B\uFF0C\u6216\u4ECE\u76EE\u51FA\uFF0C\u662F\u540D\u4E0B\u53A5\u4E0A\u7AED\uFF0C\u4E3A\u96BE\u6CBB\u3002", "\u5C11\u9634\u75C5\u3001\u65E0\u6C57\u3001\u52A8\u8840\u3001\u4E0B\u53A5\u4E0A\u7AED", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u5C11\u9634\u7BC7\u7B2C14\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 15, "\u5C11\u9634\u75C5 \xB7 \u6076\u5BD2\u8EAB\u8737", "\u5C11\u9634\u75C5\uFF0C\u6076\u5BD2\uFF0C\u8EAB\u8737\u800C\u5229\uFF0C\u624B\u8DB3\u9006\u51B7\u8005\uFF0C\u4E0D\u6CBB\u3002", "\u5C11\u9634\u75C5\u3001\u6076\u5BD2\u3001\u8EAB\u8737\u3001\u624B\u8DB3\u9006\u51B7", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u5C11\u9634\u7BC7\u7B2C15\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 16, "\u5C11\u9634\u75C5 \xB7 \u5410\u5229\u71E5\u70E6", "\u5C11\u9634\u75C5\uFF0C\u5410\u5229\uFF0C\u71E5\u70E6\uFF0C\u56DB\u9006\u8005\u6B7B\u3002", "\u5C11\u9634\u75C5\u3001\u5410\u5229\u3001\u71E5\u70E6\u3001\u56DB\u9006", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u5C11\u9634\u7BC7\u7B2C16\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 17, "\u5C11\u9634\u75C5 \xB7 \u4E0B\u5229\u6B62\u800C\u5934\u7729", "\u5C11\u9634\u75C5\uFF0C\u4E0B\u5229\u6B62\u800C\u5934\u7729\uFF0C\u65F6\u65F6\u81EA\u5192\u8005\u6B7B\u3002", "\u5C11\u9634\u75C5\u3001\u4E0B\u5229\u6B62\u3001\u5934\u7729", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u5C11\u9634\u7BC7\u7B2C17\u6761", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 23, "\u6842\u679D\u9EBB\u9EC4\u5404\u534A\u6C64 \xB7 \u5982\u759F\u72B6", "\u592A\u9633\u75C5\uFF0C\u5F97\u4E4B\u516B\u4E5D\u65E5\uFF0C\u5982\u759F\u72B6\uFF0C\u53D1\u70ED\u6076\u5BD2\uFF0C\u70ED\u591A\u5BD2\u5C11\uFF0C\u5176\u4EBA\u4E0D\u5455\uFF0C\u6E05\u4FBF\u6B32\u81EA\u53EF\uFF0C\u4E00\u65E5\u4E8C\u4E09\u5EA6\u53D1\uFF1B\u8109\u5FAE\u7F13\u8005\uFF0C\u4E3A\u6B32\u6108\u4E5F\u3002\u8109\u5FAE\u800C\u6076\u5BD2\u8005\uFF0C\u6B64\u9634\u9633\u4FF1\u865A\uFF0C\u4E0D\u53EF\u66F4\u53D1\u6C57\u3001\u66F4\u4E0B\u3001\u66F4\u5410\u4E5F\u3002\u9762\u8272\u53CD\u6709\u70ED\u8272\u8005\uFF0C\u672A\u6B32\u89E3\u4E5F\uFF0C\u4EE5\u5176\u4E0D\u80FD\u5F97\u5C0F\u6C57\u51FA\uFF0C\u8EAB\u5FC5\u75D2\uFF0C\u5B9C\u6842\u679D\u9EBB\u9EC4\u5404\u534A\u6C64\u3002", "\u6842\u679D\u9EBB\u9EC4\u5404\u534A\u6C64\u3001\u5982\u759F\u72B6\u3001\u70ED\u591A\u5BD2\u5C11\u3001\u592A\u9633", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u592A\u9633\u7BC7\u7B2C23\u6761\uFF1B\u5B66\u4E60\u6458\u5F55\uFF0C\u975E\u8BCA\u7597\u5EFA\u8BAE", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 24, "\u6842\u679D\u6C64 \xB7 \u521D\u670D\u70E6\u4E0D\u89E3", "\u592A\u9633\u75C5\uFF0C\u521D\u670D\u6842\u679D\u6C64\uFF0C\u53CD\u70E6\u4E0D\u89E3\u8005\uFF0C\u5148\u523A\u98CE\u6C60\u3001\u98CE\u5E9C\uFF0C\u5374\u4E0E\u6842\u679D\u6C64\u5219\u6108\u3002", "\u6842\u679D\u6C64\u3001\u521D\u670D\u3001\u70E6\u4E0D\u89E3\u3001\u592A\u9633", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u592A\u9633\u7BC7\u7B2C24\u6761\uFF1B\u5B66\u4E60\u6458\u5F55\uFF0C\u975E\u8BCA\u7597\u5EFA\u8BAE", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 17, "\u9633\u660E\u75C5 \xB7 \u8109\u8FDF\u98DF\u96BE\u9971", "\u9633\u660E\u75C5\uFF0C\u8109\u8FDF\uFF0C\u98DF\u96BE\u7528\u9971\uFF0C\u9971\u5219\u5FAE\u70E6\uFF0C\u5934\u7729\uFF0C\u5FC5\u5C0F\u4FBF\u96BE\uFF0C\u6B64\u6B32\u4F5C\u8C37\u75B8\u3002\u867D\u4E0B\u4E4B\uFF0C\u8179\u6EE1\u5982\u6545\u3002\u6240\u4EE5\u7136\u8005\uFF0C\u8109\u8FDF\u6545\u4E5F\u3002", "\u9633\u660E\u75C5\u3001\u8109\u8FDF\u3001\u98DF\u96BE\u9971\u3001\u8C37\u75B8", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u9633\u660E\u7BC7\u7B2C17\u6761\uFF1B\u5B66\u4E60\u6458\u5F55\uFF0C\u975E\u8BCA\u7597\u5EFA\u8BAE", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 18, "\u9633\u660E\u75C5 \xB7 \u6CD5\u591A\u6C57\u53CD\u65E0\u6C57", "\u9633\u660E\u75C5\u6CD5\u591A\u6C57\uFF0C\u53CD\u65E0\u6C57\uFF0C\u5176\u8EAB\u5982\u866B\u884C\u76AE\u4E2D\u72B6\u8005\uFF0C\u6B64\u4EE5\u4E45\u865A\u6545\u4E5F\u3002", "\u9633\u660E\u75C5\u3001\u591A\u6C57\u3001\u65E0\u6C57\u3001\u4E45\u865A", "\u300A\u4F24\u5BD2\u8BBA\u300B\xB7\u9633\u660E\u7BC7\u7B2C18\u6761\uFF1B\u5B66\u4E60\u6458\u5F55\uFF0C\u975E\u8BCA\u7597\u5EFA\u8BAE", "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96"]
];
var passageVersionSeed = [
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u5B8B\u672C\uFF08\u8D75\u5F00\u7F8E\u590D\u523B\uFF09", "\u592A\u9633\u4E2D\u98CE\uFF0C\u9633\u6D6E\u800C\u9634\u5F31\uFF0C\u9633\u6D6E\u8005\uFF0C\u70ED\u81EA\u53D1\uFF0C\u9634\u5F31\u8005\uFF0C\u6C57\u81EA\u51FA\u3002\u556C\u556C\u6076\u5BD2\uFF0C\u6DC5\u6DC5\u6076\u98CE\uFF0C\u7FD5\u7FD5\u53D1\u70ED\uFF0C\u9F3B\u9E23\u5E72\u5455\u8005\uFF0C\u6842\u679D\u6C64\u4E3B\u4E4B\u3002", "\u7AD9\u5185\u4E3B\u6587\u672C\u6309\u7EF4\u57FA\u6587\u5E93\u516C\u5F00\u9875\u9762\u4FDD\u5B58\uFF1B\u672C\u6761\u4EC5\u4F5C\u5B8B\u672C\u5C42\u7EA7\u53C2\u7167\uFF0C\u672A\u9010\u5B57\u6838\u5BF9\u5F71\u5370\u672C\u5F02\u6587\u3002", "reference_only", "\u300A\u4F24\u5BD2\u8BBA\u300B\u7248\u672C\u6982\u51B5\u4E0E\u5B8B\u672C\u8BF4\u660E", "https://zjcxzx.hactcm.edu.cn/info/1003/2048.htm"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u300A\u4F24\u5BD2\u8BBA\u6761\u8FA8\u300B\uFF08\u56DB\u5E93\u5168\u4E66\u672C\uFF09", "\u592A\u9633\u4E2D\u98CE\uFF0C\u9633\u6D6E\u800C\u9634\u5F31\uFF0C\u9633\u6D6E\u8005\uFF0C\u70ED\u81EA\u53D1\uFF0C\u9634\u5F31\u8005\uFF0C\u6C57\u81EA\u51FA\u3002\u556C\u556C\u6076\u5BD2\uFF0C\u6DC5\u6DC5\u6076\u98CE\uFF0C\u7FD5\u7FD5\u53D1\u70ED\uFF0C\u9F3B\u9E23\u5E72\u5455\u8005\uFF0C\u6842\u679D\u6C64\u4E3B\u4E4B\u3002", "\u300A\u4F24\u5BD2\u8BBA\u6761\u8FA8\u300B\u9875\u9762\u6807\u793A\u56FA\u5B9A\u5E95\u672C\u5E76\u63D0\u4F9B\u7248\u672C\u5165\u53E3\uFF1B\u5F53\u524D\u53EA\u4F5C\u53C2\u7167\uFF0C\u6B63\u6587\u5DEE\u5F02\u5F85\u9010\u5B57\u56FE\u6587\u6838\u9A8C\u3002", "reference_only", "\u300A\u4F24\u5BD2\u8BBA\u6761\u8FA8\u300B\u7248\u672C\u9875", "https://ctext.org/wiki.pl?if=gb&res=552746&remap=gb"],
  ["\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 11, "\u5B8B\u672C\uFF08\u8D75\u5F00\u7F8E\u590D\u523B\uFF09", "\u9633\u660E\u4E2D\u98CE\uFF0C\u53E3\u82E6\u54BD\u5E72\uFF0C\u8179\u6EE1\u5FAE\u5598\uFF0C\u53D1\u70ED\u6076\u5BD2\uFF0C\u8109\u6D6E\u800C\u7D27\uFF1B\u82E5\u4E0B\u4E4B\uFF0C\u5219\u8179\u6EE1\uFF0C\u5C0F\u4FBF\u96BE\u4E5F\u3002", "\u672C\u6761\u4FDD\u7559\u516C\u5F00\u6458\u5F55\u4F5C\u4E3A\u7248\u672C\u53C2\u7167\uFF1B\u672A\u9010\u5B57\u6838\u9A8C\u4E0D\u540C\u4F20\u672C\uFF0C\u4E0D\u751F\u6210\u63A8\u5B9A\u5F02\u6587\u3002", "reference_only", "\u300A\u4F24\u5BD2\u8BBA\u300B\u7248\u672C\u6982\u51B5\u4E0E\u5B8B\u672C\u8BF4\u660E", "https://zjcxzx.hactcm.edu.cn/info/1003/2048.htm"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 9, "\u5B8B\u672C\uFF08\u8D75\u5F00\u7F8E\u590D\u523B\uFF09", "\u5C11\u9634\u75C5\uFF0C\u4E0B\u5229\uFF0C\u82E5\u5229\u81EA\u6B62\uFF0C\u6076\u5BD2\u800C\u8737\u5367\uFF0C\u624B\u8DB3\u6E29\u8005\uFF0C\u53EF\u6CBB\u3002", "\u5C11\u9634\u7BC7\u5185\u90E8\u7F16\u53F7\u4EC5\u4F5C\u7AD9\u5185\u7D22\u5F15\uFF1B\u7248\u672C\u5DEE\u5F02\u5F85\u9010\u5B57\u6838\u9A8C\uFF0C\u4E0D\u80FD\u76F4\u63A5\u6362\u7B97\u4E3A\u5168\u4E66\u603B\u6761\u6587\u53F7\u3002", "reference_only", "\u300A\u4F24\u5BD2\u8BBA\u300B\u7248\u672C\u6982\u51B5\u4E0E\u5B8B\u672C\u8BF4\u660E", "https://zjcxzx.hactcm.edu.cn/info/1003/2048.htm"],
  ["\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 9, "\u300A\u4F24\u5BD2\u8BBA\u8F91\u4E49\u300B\uFF08\u5B8B\u672C\u5E95\u672C\u8BF4\u660E\uFF09", "\u5C11\u9634\u75C5\uFF0C\u4E0B\u5229\uFF0C\u82E5\u5229\u81EA\u6B62\uFF0C\u6076\u5BD2\u800C\u8737\u5367\uFF0C\u624B\u8DB3\u6E29\u8005\uFF0C\u53EF\u6CBB\u3002", "\u516C\u5F00\u4E66\u76EE\u8BF4\u660E\u5176\u4EE5\u5B8B\u6797\u4EBF\u3001\u9AD8\u4FDD\u8861\u6821\u52D8\u672C\u53CA\u8D75\u5F00\u7F8E\u590D\u523B\u5B8B\u672C\u4E3A\u5E95\u672C\u5E76\u9644\u4F20\u672C\u6587\u5B57\u5F02\u540C\uFF1B\u672C\u7AD9\u6682\u4FDD\u7559\u6765\u6E90\u5C42\u7EA7\uFF0C\u4E0D\u590D\u5236\u6CE8\u91CA\u5168\u6587\u3002", "reference_only", "\u300A\u4F24\u5BD2\u8BBA\u8F91\u4E49\u300B\u7248\u672C\u8BF4\u660E", "https://pdf.diancang.xyz/22062/"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u5EB7\u5E73\u672C\uFF08\u65E5\u672C\u6284\u672C\uFF09", "\u592A\u9633\u4E2D\u98CE\uFF0C\u9633\u6D6E\u800C\u9634\u5F31\uFF0C\u9633\u6D6E\u8005\uFF0C\u70ED\u81EA\u53D1\uFF0C\u9634\u5F31\u8005\uFF0C\u6C57\u81EA\u51FA\u3002\u556C\u556C\u6076\u5BD2\uFF0C\u6DC5\u6DC5\u6076\u98CE\uFF0C\u7FD5\u7FD5\u53D1\u70ED\uFF0C\u9F3B\u9E23\u5E72\u5455\u8005\uFF0C\u6842\u679D\u6C64\u4E3B\u4E4B\u3002", "\u5EB7\u5E73\u672C\u4E3A\u65E5\u672C\u5EB7\u5E73\u4E09\u5E74\u6284\u672C\uFF1B\u672C\u7AD9\u6682\u4EE5\u540C\u6761\u516C\u5F00\u6458\u5F55\u4F5C\u7248\u672C\u5C42\u7EA7\u53C2\u7167\uFF0C\u672A\u9010\u5B57\u6821\u52D8\u5176\u5F02\u6587\u3002", "reference_only", "\u6CB3\u5357\u4E2D\u533B\u836F\u5927\u5B66\u300A\u4F24\u5BD2\u8BBA\u300B\u7248\u672C\u6982\u51B5", "https://zjcxzx.hactcm.edu.cn/info/1003/2048.htm"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u8D75\u5F00\u7F8E\u672C\uFF08\u660E\u4E07\u5386\u7FFB\u523B\uFF09", "\u592A\u9633\u4E2D\u98CE\uFF0C\u9633\u6D6E\u800C\u9634\u5F31\uFF0C\u9633\u6D6E\u8005\uFF0C\u70ED\u81EA\u53D1\uFF0C\u9634\u5F31\u8005\uFF0C\u6C57\u81EA\u51FA\u3002\u556C\u556C\u6076\u5BD2\uFF0C\u6DC5\u6DC5\u6076\u98CE\uFF0C\u7FD5\u7FD5\u53D1\u70ED\uFF0C\u9F3B\u9E23\u5E72\u5455\u8005\uFF0C\u6842\u679D\u6C64\u4E3B\u4E4B\u3002", "\u8D75\u5F00\u7F8E\u672C\u636E\u5317\u5B8B\u56FD\u5B50\u76D1\u5C0F\u5B57\u672C\u7FFB\u523B\uFF1B\u672C\u7AD9\u4FDD\u5B58\u7248\u672C\u53C2\u7167\u4E0E\u51FA\u5904\u5165\u53E3\uFF0C\u4E0D\u5C06\u672A\u6838\u5BF9\u5904\u6807\u793A\u4E3A\u786E\u5B9A\u5F02\u6587\u3002", "reference_only", "\u6CB3\u5357\u4E2D\u533B\u836F\u5927\u5B66\u300A\u4F24\u5BD2\u8BBA\u300B\u7248\u672C\u6982\u51B5", "https://zjcxzx.hactcm.edu.cn/info/1003/2048.htm"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "\u6210\u65E0\u5DF1\u300A\u6CE8\u89E3\u4F24\u5BD2\u8BBA\u300B\u672C", "\u592A\u9633\u4E2D\u98CE\uFF0C\u9633\u6D6E\u800C\u9634\u5F31\uFF0C\u9633\u6D6E\u8005\uFF0C\u70ED\u81EA\u53D1\uFF0C\u9634\u5F31\u8005\uFF0C\u6C57\u81EA\u51FA\u3002\u556C\u556C\u6076\u5BD2\uFF0C\u6DC5\u6DC5\u6076\u98CE\uFF0C\u7FD5\u7FD5\u53D1\u70ED\uFF0C\u9F3B\u9E23\u5E72\u5455\u8005\uFF0C\u6842\u679D\u6C64\u4E3B\u4E4B\u3002", "\u6210\u672C\u4EE5\u738B\u53D4\u548C\u64B0\u6B21\u672C\u4E3A\u84DD\u672C\u7684\u6CE8\u91CA\u4F20\u672C\uFF1B\u5F53\u524D\u4EC5\u4FDD\u7559\u7248\u672C\u5C42\u7EA7\u4E0E\u6838\u9A8C\u5165\u53E3\u3002", "reference_only", "\u6CB3\u5357\u4E2D\u533B\u836F\u5927\u5B66\u300A\u4F24\u5BD2\u8BBA\u300B\u7248\u672C\u6982\u51B5", "https://zjcxzx.hactcm.edu.cn/info/1003/2048.htm"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 11, "\u5EB7\u5E73\u672C\uFF08\u65E5\u672C\u6284\u672C\uFF09", "\u592A\u9633\u4E2D\u98CE\uFF0C\u53E3\u82E6\u54BD\u5E72\uFF0C\u8179\u6EE1\u5FAE\u5598\uFF0C\u53D1\u70ED\u6076\u5BD2\uFF0C\u8109\u6D6E\u800C\u7D27\uFF1B\u82E5\u4E0B\u4E4B\uFF0C\u5219\u8179\u6EE1\uFF0C\u5C0F\u4FBF\u96BE\u4E5F\u3002", "\u5EB7\u5E73\u672C\u7248\u672C\u5C42\u7EA7\u53C2\u7167\uFF1B\u6B63\u6587\u5C1A\u5F85\u9010\u5B57\u56FE\u6587\u6838\u9A8C\uFF0C\u672C\u7AD9\u4E0D\u636E\u6B64\u63A8\u5B9A\u5F02\u6587\u3002", "reference_only", "\u6CB3\u5357\u4E2D\u533B\u836F\u5927\u5B66\u300A\u4F24\u5BD2\u8BBA\u300B\u7248\u672C\u6982\u51B5", "https://zjcxzx.hactcm.edu.cn/info/1003/2048.htm"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 11, "\u8D75\u5F00\u7F8E\u672C\uFF08\u660E\u4E07\u5386\u7FFB\u523B\uFF09", "\u592A\u9633\u4E2D\u98CE\uFF0C\u53E3\u82E6\u54BD\u5E72\uFF0C\u8179\u6EE1\u5FAE\u5598\uFF0C\u53D1\u70ED\u6076\u5BD2\uFF0C\u8109\u6D6E\u800C\u7D27\uFF1B\u82E5\u4E0B\u4E4B\uFF0C\u5219\u8179\u6EE1\uFF0C\u5C0F\u4FBF\u96BE\u4E5F\u3002", "\u8D75\u5F00\u7F8E\u672C\u7248\u672C\u5C42\u7EA7\u53C2\u7167\uFF1B\u6B63\u6587\u5C1A\u5F85\u9010\u5B57\u56FE\u6587\u6838\u9A8C\uFF0C\u672C\u7AD9\u4E0D\u636E\u6B64\u63A8\u5B9A\u5F02\u6587\u3002", "reference_only", "\u6CB3\u5357\u4E2D\u533B\u836F\u5927\u5B66\u300A\u4F24\u5BD2\u8BBA\u300B\u7248\u672C\u6982\u51B5", "https://zjcxzx.hactcm.edu.cn/info/1003/2048.htm"],
  ["\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 11, "\u6210\u65E0\u5DF1\u300A\u6CE8\u89E3\u4F24\u5BD2\u8BBA\u300B\u672C", "\u592A\u9633\u4E2D\u98CE\uFF0C\u53E3\u82E6\u54BD\u5E72\uFF0C\u8179\u6EE1\u5FAE\u5598\uFF0C\u53D1\u70ED\u6076\u5BD2\uFF0C\u8109\u6D6E\u800C\u7D27\uFF1B\u82E5\u4E0B\u4E4B\uFF0C\u5219\u8179\u6EE1\uFF0C\u5C0F\u4FBF\u96BE\u4E5F\u3002", "\u6210\u672C\u4EE5\u738B\u53D4\u548C\u64B0\u6B21\u672C\u4E3A\u84DD\u672C\u7684\u6CE8\u91CA\u4F20\u672C\uFF1B\u5F53\u524D\u4EC5\u4F5C\u6765\u6E90\u53C2\u7167\uFF0C\u5F85\u9010\u5B57\u6821\u52D8\u540E\u518D\u6807\u8BB0\u5F02\u6587\u3002", "reference_only", "\u6CB3\u5357\u4E2D\u533B\u836F\u5927\u5B66\u300A\u4F24\u5BD2\u8BBA\u300B\u7248\u672C\u6982\u51B5", "https://zjcxzx.hactcm.edu.cn/info/1003/2048.htm"]
];
var formulaPassageSeed = [
  ["gui-zhi-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "primary", "\u4EE5\u592A\u9633\u4E2D\u98CE\u6761\u6587\u5BF9\u8BFB\u6842\u679D\u6C64\u7684\u539F\u5178\u7EBF\u7D22\u3002"],
  ["ma-huang-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "primary", "\u4EE5\u65E0\u6C57\u800C\u5598\u6761\u6587\u5EFA\u7ACB\u9EBB\u9EC4\u6C64\u7684\u539F\u5178\u5B9A\u4F4D\u3002"],
  ["xiao-chai-hu-tang", "\u8FA8\u5C11\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "primary", "\u4EE5\u5F80\u6765\u5BD2\u70ED\u6761\u6587\u4F5C\u4E3A\u5C0F\u67F4\u80E1\u6C64\u7684\u539F\u5178\u5B66\u4E60\u5165\u53E3\u3002"],
  ["xiao-chai-hu-tang", "\u8FA8\u9634\u9633\u6613\u5DEE\u540E\u52B3\u590D\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "related", "\u4FDD\u7559\u5DEE\u540E\u66F4\u53D1\u70ED\u7684\u8865\u5145\u5BF9\u8BFB\u5165\u53E3\u3002"],
  ["wu-ling-san", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "primary", "\u4EE5\u592A\u9633\u75C5\u53D1\u6C57\u540E\u6761\u6587\u5BF9\u8BFB\u4E94\u82D3\u6563\u3002"],
  ["wu-ling-san", "\u8FA8\u970D\u4E71\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "related", "\u4FDD\u7559\u970D\u4E71\u7BC7\u4E2D\u7684\u76F8\u5173\u5B66\u4E60\u5165\u53E3\u3002"],
  ["li-zhong-wan", "\u8FA8\u970D\u4E71\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "primary", "\u4EE5\u970D\u4E71\u7BC7\u6761\u6587\u5B9A\u4F4D\u7406\u4E2D\u4E38\u3002"],
  ["da-cheng-qi-tang", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "primary", "\u4EE5\u9633\u660E\u6F6E\u70ED\u8179\u6EE1\u6761\u6587\u5BF9\u8BFB\u5927\u627F\u6C14\u6C64\u3002"],
  ["ge-gen-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "primary", "\u4EE5\u9879\u80CC\u5F3A\u51E0\u51E0\u6761\u6587\u5B9A\u4F4D\u845B\u6839\u6C64\u3002"],
  ["ban-xia-xie-xin-tang", "\u8FA8\u53D1\u6C57\u5410\u4E0B\u540E\u8109\u8BC1\u5E76\u6CBB", 1, "primary", "\u4EE5\u5FC3\u4E0B\u75DE\u6761\u6587\u5BF9\u8BFB\u534A\u590F\u6CFB\u5FC3\u6C64\u3002"],
  ["si-ni-tang", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "primary", "\u4EE5\u5C11\u9634\u8109\u6C89\u6761\u6587\u5B9A\u4F4D\u56DB\u9006\u6C64\u3002"],
  ["gui-zhi-jia-ge-gen-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 5, "primary", "\u4EE5\u6C57\u51FA\u6076\u98CE\u6761\u6587\u5BF9\u8BFB\u6842\u679D\u52A0\u845B\u6839\u6C64\u3002"],
  ["gui-zhi-jia-fu-zi-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 6, "primary", "\u4EE5\u53D1\u6C57\u540E\u6761\u6587\u5B9A\u4F4D\u6842\u679D\u52A0\u9644\u5B50\u6C64\u3002"],
  ["gui-zhi-ma-huang-ge-ban-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 23, "primary", "\u4EE5\u5982\u759F\u72B6\u3001\u70ED\u591A\u5BD2\u5C11\u6761\u6587\u5EFA\u7ACB\u6842\u679D\u9EBB\u9EC4\u5404\u534A\u6C64\u7684\u539F\u5178\u5B9A\u4F4D\u3002"],
  ["gui-zhi-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 24, "related", "\u4EE5\u521D\u670D\u6842\u679D\u6C64\u70E6\u4E0D\u89E3\u6761\u6587\u4FDD\u7559\u540C\u65B9\u8DE8\u6761\u6587\u5BF9\u8BFB\u5165\u53E3\u3002"],
  ["da-qing-long-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 7, "primary", "\u4EE5\u4E0D\u6C57\u51FA\u70E6\u8E81\u6761\u6587\u5B9A\u4F4D\u5927\u9752\u9F99\u6C64\u3002"],
  ["xiao-qing-long-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 8, "primary", "\u4EE5\u5FC3\u4E0B\u6709\u6C34\u6C14\u6761\u6587\u5B9A\u4F4D\u5C0F\u9752\u9F99\u6C64\u3002"],
  ["gui-zhi-jia-hou-po-xing-zi-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 9, "primary", "\u4EE5\u592A\u9633\u4E0B\u540E\u5FAE\u5598\u6761\u6587\u5B9A\u4F4D\u6842\u679D\u52A0\u539A\u6734\u674F\u5B50\u6C64\u3002"],
  ["ma-huang-xing-ren-gan-cao-shi-gao-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 10, "primary", "\u4EE5\u53D1\u6C57\u540E\u5598\u6761\u6587\u5B9A\u4F4D\u9EBB\u9EC4\u674F\u4EC1\u7518\u8349\u77F3\u818F\u6C64\u3002"],
  ["tao-he-cheng-qi-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 11, "primary", "\u4EE5\u5C11\u8179\u6025\u7ED3\u6761\u6587\u5B9A\u4F4D\u6843\u6838\u627F\u6C14\u6C64\u3002"],
  ["tiao-wei-cheng-qi-tang", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "primary", "\u4EE5\u84B8\u84B8\u53D1\u70ED\u3001\u5C5E\u80C3\u6761\u6587\u5BF9\u8BFB\u8C03\u80C3\u627F\u6C14\u6C64\u3002"],
  ["xiao-cheng-qi-tang", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "primary", "\u4EE5\u8179\u5927\u6EE1\u4E0D\u901A\u6761\u6587\u5B9A\u4F4D\u5C0F\u627F\u6C14\u6C64\u3002"],
  ["bai-hu-tang", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "primary", "\u4EE5\u8109\u6D6E\u6ED1\u6761\u6587\u5BF9\u8BFB\u767D\u864E\u6C64\u3002"],
  ["zhi-zi-chi-tang", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 5, "primary", "\u4EE5\u5FC3\u4E2D\u61CA\u61B9\u6761\u6587\u5B9A\u4F4D\u6800\u5B50\u8C49\u6C64\u3002"],
  ["bai-hu-jia-ren-shen-tang", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 6, "primary", "\u4EE5\u53E3\u5E72\u820C\u71E5\u6761\u6587\u5BF9\u8BFB\u767D\u864E\u52A0\u4EBA\u53C2\u6C64\u3002"],
  ["zhu-ling-tang", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 7, "primary", "\u4EE5\u5C0F\u4FBF\u4E0D\u5229\u6761\u6587\u5B9A\u4F4D\u732A\u82D3\u6C64\u3002"],
  ["zhu-ling-tang", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 5, "related", "\u4FDD\u7559\u5C11\u9634\u75C5\u7BC7\u4E2D\u4E0B\u5229\u3001\u54B3\u5455\u6E34\u7684\u8865\u5145\u5BF9\u8BFB\u5165\u53E3\u3002"],
  ["yin-chen-hao-tang", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 8, "primary", "\u4EE5\u7600\u70ED\u5728\u91CC\u6761\u6587\u5BF9\u8BFB\u8335\u9648\u84BF\u6C64\u3002"],
  ["di-dang-tang", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 9, "primary", "\u4EE5\u559C\u5FD8\u6761\u6587\u5B9A\u4F4D\u62B5\u5F53\u6C64\u3002"],
  ["ma-zi-ren-wan", "\u8FA8\u9633\u660E\u75C5\u8109\u8BC1\u5E76\u6CBB", 10, "primary", "\u4EE5\u813E\u7EA6\u6761\u6587\u5B9A\u4F4D\u9EBB\u5B50\u4EC1\u4E38\u3002"],
  ["huang-lian-e-jiao-tang", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "primary", "\u4EE5\u5FC3\u4E2D\u70E6\u3001\u4E0D\u5F97\u5367\u6761\u6587\u5B9A\u4F4D\u9EC4\u8FDE\u963F\u80F6\u6C64\u3002"],
  ["zhen-wu-tang", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "primary", "\u4EE5\u6709\u6C34\u6C14\u6761\u6587\u5BF9\u8BFB\u771F\u6B66\u6C64\u3002"],
  ["si-ni-san", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "primary", "\u4EE5\u5C11\u9634\u56DB\u9006\u6761\u6587\u5B9A\u4F4D\u56DB\u9006\u6563\u3002"],
  ["wu-mei-wan", "\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "primary", "\u4EE5\u86D4\u53A5\u6761\u6587\u5B9A\u4F4D\u4E4C\u6885\u4E38\u3002"],
  ["zhi-shi-zhi-zi-chi-tang", "\u8FA8\u9634\u9633\u6613\u5DEE\u540E\u52B3\u590D\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "primary", "\u4EE5\u52B3\u590D\u6761\u6587\u5B9A\u4F4D\u67B3\u5B9E\u6800\u5B50\u8C49\u6C64\u3002"],
  ["da-chai-hu-tang", "\u8FA8\u5C11\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "primary", "\u4EE5\u70ED\u7ED3\u5728\u91CC\u3001\u5F80\u6765\u5BD2\u70ED\u6761\u6587\u5BF9\u8BFB\u5927\u67F4\u80E1\u6C64\u3002"],
  ["gui-zhi-jia-shao-yao-tang", "\u8FA8\u592A\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 1, "primary", "\u4EE5\u8179\u6EE1\u65F6\u75DB\u6761\u6587\u5B9A\u4F4D\u6842\u679D\u52A0\u828D\u836F\u6C64\u3002"],
  ["gui-zhi-jia-da-huang-tang", "\u8FA8\u592A\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "primary", "\u4EE5\u5927\u5B9E\u75DB\u6761\u6587\u5B9A\u4F4D\u6842\u679D\u52A0\u5927\u9EC4\u6C64\u3002"],
  ["gui-zhi-tang", "\u8FA8\u592A\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "related", "\u4EE5\u592A\u9634\u75C5\u8109\u6D6E\u6761\u6587\u8865\u5145\u6842\u679D\u6C64\u7684\u8DE8\u7BC7\u5BF9\u8BFB\u5165\u53E3\u3002"],
  ["chai-hu-gui-zhi-tang", "\u8FA8\u5C11\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "primary", "\u4EE5\u5916\u8BC1\u672A\u53BB\u3001\u5FAE\u5455\u6761\u6587\u5BF9\u8BFB\u67F4\u80E1\u6842\u679D\u6C64\u3002"],
  ["chai-hu-gui-zhi-gan-jiang-tang", "\u8FA8\u5C11\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "primary", "\u4EE5\u80F8\u80C1\u6EE1\u5FAE\u7ED3\u6761\u6587\u5BF9\u8BFB\u67F4\u80E1\u6842\u679D\u5E72\u59DC\u6C64\u3002"],
  ["dang-gui-si-ni-tang", "\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 2, "primary", "\u4EE5\u624B\u8DB3\u53A5\u5BD2\u3001\u8109\u7EC6\u6B32\u7EDD\u6761\u6587\u5BF9\u8BFB\u5F53\u5F52\u56DB\u9006\u6C64\u3002"],
  ["tao-hua-tang", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 18, "primary", "\u4EE5\u4E0B\u5229\u4FBF\u8113\u8840\u6761\u6587\u5BF9\u8BFB\u6843\u82B1\u6C64\u3002"],
  ["fu-zi-tang", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 19, "primary", "\u4EE5\u8EAB\u4F53\u75DB\u3001\u9AA8\u8282\u75DB\u6761\u6587\u5BF9\u8BFB\u9644\u5B50\u6C64\u3002"],
  ["bai-tong-tang", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 20, "primary", "\u4EE5\u4E0B\u5229\u6761\u6587\u5BF9\u8BFB\u767D\u901A\u6C64\u3002"],
  ["tong-mai-si-ni-tang", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 21, "primary", "\u4EE5\u4E0B\u5229\u6E05\u8C37\u6761\u6587\u5BF9\u8BFB\u901A\u8109\u56DB\u9006\u6C64\u3002"],
  ["ma-huang-fu-zi-xi-xin-tang", "\u8FA8\u5C11\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 22, "primary", "\u4EE5\u59CB\u5F97\u53CD\u53D1\u70ED\u3001\u8109\u6C89\u6761\u6587\u5BF9\u8BFB\u9EBB\u9EC4\u9644\u5B50\u7EC6\u8F9B\u6C64\u3002"],
  ["gui-zhi-qu-shao-yao-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 12, "primary", "\u4EE5\u4E0B\u540E\u8109\u4FC3\u80F8\u6EE1\u6761\u6587\u5BF9\u8BFB\u6842\u679D\u53BB\u828D\u836F\u6C64\u3002"],
  ["ge-gen-jia-ban-xia-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 13, "primary", "\u4EE5\u592A\u9633\u9633\u660E\u5408\u75C5\u3001\u4F46\u5455\u6761\u6587\u5BF9\u8BFB\u845B\u6839\u52A0\u534A\u590F\u6C64\u3002"],
  ["ge-gen-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 13, "related", "\u4FDD\u7559\u592A\u9633\u9633\u660E\u5408\u75C5\u7684\u8DE8\u7BC7\u5BF9\u8BFB\u5165\u53E3\u3002"],
  ["ge-gen-huang-qin-huang-lian-tang", "\u8FA8\u592A\u9633\u75C5\u8109\u8BC1\u5E76\u6CBB", 14, "primary", "\u4EE5\u8BEF\u4E0B\u540E\u4E0B\u5229\u6761\u6587\u5BF9\u8BFB\u845B\u6839\u9EC4\u82A9\u9EC4\u8FDE\u6C64\u3002"],
  ["bai-tou-weng-tang", "\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 3, "primary", "\u4EE5\u70ED\u5229\u4E0B\u91CD\u6761\u6587\u5BF9\u8BFB\u767D\u5934\u7FC1\u6C64\u3002"],
  ["bai-hu-tang", "\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 4, "related", "\u4FDD\u7559\u53A5\u9634\u7BC7\u8109\u6ED1\u800C\u53A5\u7684\u8DE8\u7BC7\u5BF9\u8BFB\u5165\u53E3\u3002"],
  ["si-ni-tang", "\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 5, "related", "\u4FDD\u7559\u53A5\u9634\u7BC7\u6C57\u51FA\u53A5\u9006\u7684\u8DE8\u7BC7\u5BF9\u8BFB\u5165\u53E3\u3002"],
  ["xiao-cheng-qi-tang", "\u8FA8\u53A5\u9634\u75C5\u8109\u8BC1\u5E76\u6CBB", 6, "related", "\u4FDD\u7559\u53A5\u9634\u7BC7\u4E0B\u5229\u8C35\u8BED\u7684\u8DE8\u7BC7\u5BF9\u8BFB\u5165\u53E3\u3002"]
];

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  localLlmBaseUrl: process.env.LOCAL_LLM_BASE_URL ?? "",
  localLlmModel: process.env.LOCAL_LLM_MODEL ?? "",
  localLlmApiKey: process.env.LOCAL_LLM_API_KEY ?? "",
  networkLlmBaseUrl: process.env.NETWORK_LLM_BASE_URL ?? "",
  networkLlmModel: process.env.NETWORK_LLM_MODEL ?? "",
  networkLlmApiKey: process.env.NETWORK_LLM_API_KEY ?? ""
};

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}
async function storageGetSignedUrl(relKey) {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = await resp.json();
  return url;
}

// server/db.ts
import { extractText } from "unpdf";

// server/formulaStudySearch.ts
function parseFormulaStudyTerms(input) {
  if (!input) return [];
  return Array.from(
    new Set(
      input.split(/[\s,，、;；/\n]+/).map((term) => term.trim()).filter(Boolean)
    )
  ).slice(0, 8);
}
function normalized(value) {
  return value?.toLocaleLowerCase("zh-CN") ?? "";
}
function scoreTerm(record, term) {
  const keyword = term.toLocaleLowerCase("zh-CN");
  const fields = [
    [record.name, 8],
    [record.aliases, 6],
    [record.ingredients, 5],
    [record.sourceExcerpt, 4],
    [record.studyIndex, 3],
    [record.structuralNote, 2],
    [record.sourceTitle, 1]
  ];
  return fields.reduce(
    (score, [value, weight]) => normalized(value).includes(keyword) ? score + weight : score,
    0
  );
}
function searchFormulaStudyRecords(records, input) {
  const terms = parseFormulaStudyTerms(input.query);
  const mode = input.matchMode ?? "all";
  return records.filter((record) => !input.sourceTitle || record.sourceTitle === input.sourceTitle).map((record) => {
    const matchedTerms = terms.filter((term) => scoreTerm(record, term) > 0);
    const matchScore = matchedTerms.reduce(
      (score, term) => score + scoreTerm(record, term),
      0
    );
    return { ...record, matchedTerms, matchScore };
  }).filter((result) => {
    if (!terms.length) return true;
    return mode === "all" ? result.matchedTerms.length === terms.length : result.matchedTerms.length > 0;
  }).sort(
    (left, right) => right.matchScore - left.matchScore || left.name.localeCompare(right.name, "zh-CN")
  );
}

// server/db.ts
var KNOWLEDGE_ALLOWED_TYPES = /* @__PURE__ */ new Set(["text/plain", "text/markdown", "application/pdf"]);
var KNOWLEDGE_MAX_BYTES = 5 * 1024 * 1024;
var KNOWLEDGE_MAX_TEXT_BYTES = 12 * 1024 * 1024;
var _db = null;
var seedPromise = null;
var catalogFiltersCache = null;
var wikisourceSearchCache = /* @__PURE__ */ new Map();
var CATALOG_SCHEMA_RECOVERY_STATEMENTS = [
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
    \`storageKey\` varchar(1024) NOT NULL,
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
  "CREATE INDEX IF NOT EXISTS `classic_passage_versions_status_idx` ON `classic_passage_versions` (`verificationStatus`)"
];
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const connectionString = process.env.DATABASE_URL;
      const hostname = new URL(connectionString).hostname;
      if (hostname.endsWith(".tidbcloud.com")) {
        _db = drizzle({
          connection: {
            uri: connectionString,
            ssl: { rejectUnauthorized: true }
          }
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
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date() };
  const updateSet = { lastSignedIn: values.lastSignedIn };
  ["name", "email", "loginMethod"].forEach((field) => {
    if (user[field] !== void 0) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function ensureCatalogSeed() {
  if (!seedPromise) seedPromise = seedCatalog();
  await seedPromise;
}
async function seedCatalog() {
  const db = await getDb();
  if (!db) return;
  for (const statement of CATALOG_SCHEMA_RECOVERY_STATEMENTS) {
    await db.execute(sql.raw(statement));
  }
  await db.insert(contentSources).values(sourceSeed).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
  const allSources = await db.select().from(contentSources);
  const sourceIds = new Map(allSources.map((source) => [source.slug, source.id]));
  const pharmacopoeiaId = sourceIds.get("chinese-pharmacopoeia");
  const wikisourceId = sourceIds.get("zh-wikisource");
  const chineseTextProjectId = sourceIds.get("chinese-text-project");
  await db.insert(herbs).values(herbSeed.map(([slug, name, pinyin, aliases, category, nature, taste, meridians, medicinalPart, traditionalIndex, learningNote]) => ({ slug, name, pinyin, aliases, category, nature, taste, meridians, medicinalPart, traditionalIndex, learningNote, sourceId: pharmacopoeiaId, sourceUrl: "https://ydz.chp.org.cn/" }))).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
  await db.insert(formulas).values(formulaSeed.map(([slug, name, aliases, sourceTitle, sourceExcerpt, ingredients, structuralNote, studyIndex, sourceUrl]) => ({ slug, name, aliases, sourceTitle, sourceExcerpt, ingredients: JSON.stringify(ingredients), structuralNote, studyIndex, sourceId: sourceUrl.includes("ctext.org") ? chineseTextProjectId : wikisourceId, sourceUrl }))).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
  await db.insert(classics).values(classicSeed.map(([slug, title, era, author, category, summary, sourceUrl]) => ({ slug, title, era, author, category, summary, sourceId: wikisourceId, sourceUrl }))).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
  const allClassics = await db.select().from(classics);
  const classicIds = new Map(allClassics.map((classic) => [classic.slug, classic.id]));
  const chapterRows = chapterSeed.flatMap(([classicSlug, sequence, title, excerpt, sourceUrl]) => {
    const classicId = classicIds.get(classicSlug);
    return classicId ? [{ classicId, sequence, title, excerpt, sourceUrl }] : [];
  });
  if (chapterRows.length) await db.insert(classicChapters).values(chapterRows).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
  const allChapters = await db.select().from(classicChapters);
  const shangHanId = classicIds.get("shang-han-lun");
  const shangHanChapterIds = new Map(allChapters.filter((chapter) => chapter.classicId === shangHanId).map((chapter) => [chapter.title, chapter.id]));
  const passageRows = shangHanPassageSeed.flatMap(([chapterTitle, passageNumber, title, excerpt, keywords, sourceReference, sourceUrl]) => {
    const chapterId = shangHanChapterIds.get(chapterTitle);
    return shangHanId && chapterId ? [{ classicId: shangHanId, chapterId, passageNumber, title, excerpt, keywords, sourceReference: `\u300A\u4F24\u5BD2\u8BBA\u300B\xB7${chapterTitle}\xB7\u7B2C${passageNumber}\u6761`, sourceUrl }] : [];
  });
  if (passageRows.length) await db.insert(classicPassages).values(passageRows).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
  const [allPassages, allFormulas] = await Promise.all([db.select().from(classicPassages), db.select().from(formulas)]);
  const formulaIds = new Map(allFormulas.map((formula) => [formula.slug, formula.id]));
  const passageIds = new Map(allPassages.map((passage) => [`${passage.chapterId}:${passage.passageNumber}`, passage.id]));
  const mappingRows = formulaPassageSeed.flatMap(([formulaSlug, chapterTitle, passageNumber, relationType, studyNote2]) => {
    const formulaId = formulaIds.get(formulaSlug);
    const chapterId = shangHanChapterIds.get(chapterTitle);
    const passageId = chapterId ? passageIds.get(`${chapterId}:${passageNumber}`) : void 0;
    return formulaId && passageId ? [{ formulaId, passageId, relationType, studyNote: studyNote2 }] : [];
  });
  if (mappingRows.length) await db.insert(formulaPassageMappings).values(mappingRows).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
  const versionRows = passageVersionSeed.flatMap(([chapterTitle, passageNumber, editionLabel, text2, variantNote, verificationStatus, sourceReference, sourceUrl]) => {
    const chapterId = shangHanChapterIds.get(chapterTitle);
    const passageId = chapterId ? passageIds.get(`${chapterId}:${passageNumber}`) : void 0;
    return passageId ? [{ passageId, editionLabel, text: text2, variantNote, verificationStatus, sourceReference, sourceUrl }] : [];
  });
  if (versionRows.length) await db.insert(classicPassageVersions).values(versionRows).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
}
function includesQuery(query, columns) {
  const pattern = `%${query}%`;
  return or(...columns.map((column) => like(column, pattern)));
}
async function getCatalogFilters() {
  await ensureCatalogSeed();
  if (catalogFiltersCache && catalogFiltersCache.expiresAt > Date.now()) return catalogFiltersCache.value;
  const value = await buildCatalogFilters();
  catalogFiltersCache = { value, expiresAt: Date.now() + 5 * 60 * 1e3 };
  return value;
}
async function buildCatalogFilters() {
  const db = await getDb();
  if (!db) return { herbCategories: [], natures: [], meridians: [], formulaSources: [], classicCategories: [] };
  const [herbRows, formulaRows, classicRows] = await Promise.all([db.select({ category: herbs.category, nature: herbs.nature, meridians: herbs.meridians }).from(herbs), db.select({ sourceTitle: formulas.sourceTitle }).from(formulas), db.select({ category: classics.category }).from(classics)]);
  return {
    herbCategories: Array.from(new Set(herbRows.map((row2) => row2.category).filter(Boolean))),
    natures: Array.from(new Set(herbRows.map((row2) => row2.nature).filter(Boolean))),
    meridians: Array.from(new Set(herbRows.flatMap((row2) => row2.meridians?.split("\u3001") ?? []))),
    formulaSources: Array.from(new Set(formulaRows.map((row2) => row2.sourceTitle))),
    classicCategories: Array.from(new Set(classicRows.map((row2) => row2.category).filter(Boolean)))
  };
}
async function getHerbs(input) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (input.query) conditions.push(includesQuery(input.query, [herbs.name, herbs.pinyin, herbs.aliases, herbs.traditionalIndex, herbs.meridians]));
  if (input.category) conditions.push(eq(herbs.category, input.category));
  if (input.nature) conditions.push(eq(herbs.nature, input.nature));
  if (input.meridian) conditions.push(like(herbs.meridians, `%${input.meridian}%`));
  return db.select().from(herbs).where(conditions.length ? and(...conditions) : void 0).orderBy(herbs.name);
}
async function getFormulas(input) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (input.query) conditions.push(includesQuery(input.query, [formulas.name, formulas.aliases, formulas.sourceTitle, formulas.studyIndex, formulas.ingredients]));
  if (input.sourceTitle) conditions.push(eq(formulas.sourceTitle, input.sourceTitle));
  return db.select().from(formulas).where(conditions.length ? and(...conditions) : void 0).orderBy(formulas.name);
}
async function getFormulaStudySearch(input) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const records = await db.select().from(formulas).orderBy(formulas.name);
  return searchFormulaStudyRecords(records, input);
}
async function getClassics(input) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (input.query) conditions.push(includesQuery(input.query, [classics.title, classics.author, classics.category, classics.summary]));
  if (input.category) conditions.push(eq(classics.category, input.category));
  return db.select().from(classics).where(conditions.length ? and(...conditions) : void 0).orderBy(classics.title);
}
async function getClassicChapters(classicId) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classicChapters).where(eq(classicChapters.classicId, classicId)).orderBy(classicChapters.sequence);
}
async function getClassicPassages(chapterId) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classicPassages).where(eq(classicPassages.chapterId, chapterId)).orderBy(classicPassages.passageNumber);
}
async function getShangHanPassageLearningIndex() {
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
    sourceUrl: classicPassages.sourceUrl
  }).from(classicPassages).innerJoin(classicChapters, eq(classicPassages.chapterId, classicChapters.id)).innerJoin(classics, eq(classicPassages.classicId, classics.id)).where(eq(classics.slug, "shang-han-lun")).orderBy(classicChapters.sequence, classicPassages.passageNumber);
}
async function getShangHanPassageMatrixRecords(passageIds) {
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
    sourceUrl: classicPassages.sourceUrl
  }).from(classicPassages).innerJoin(classicChapters, eq(classicPassages.chapterId, classicChapters.id)).innerJoin(classics, eq(classicPassages.classicId, classics.id)).where(and(eq(classics.slug, "shang-han-lun"), inArray(classicPassages.id, uniqueIds)));
  if (!records.length) return [];
  const validIds = records.map((record) => record.id);
  const [formulaRows, versionRows] = await Promise.all([
    db.select({
      passageId: formulaPassageMappings.passageId,
      id: formulas.id,
      name: formulas.name,
      slug: formulas.slug,
      relationType: formulaPassageMappings.relationType,
      studyNote: formulaPassageMappings.studyNote
    }).from(formulaPassageMappings).innerJoin(formulas, eq(formulaPassageMappings.formulaId, formulas.id)).where(inArray(formulaPassageMappings.passageId, validIds)),
    db.select({
      passageId: classicPassageVersions.passageId,
      editionLabel: classicPassageVersions.editionLabel,
      sourceReference: classicPassageVersions.sourceReference,
      sourceUrl: classicPassageVersions.sourceUrl
    }).from(classicPassageVersions).where(inArray(classicPassageVersions.passageId, validIds)).orderBy(classicPassageVersions.editionLabel)
  ]);
  const formulaByPassage = /* @__PURE__ */ new Map();
  formulaRows.forEach((row2) => formulaByPassage.set(row2.passageId, [...formulaByPassage.get(row2.passageId) ?? [], { id: row2.id, name: row2.name, slug: row2.slug, relationType: row2.relationType, studyNote: row2.studyNote }]));
  const versionByPassage = /* @__PURE__ */ new Map();
  versionRows.forEach((row2) => versionByPassage.set(row2.passageId, [...versionByPassage.get(row2.passageId) ?? [], { editionLabel: row2.editionLabel, sourceReference: row2.sourceReference, sourceUrl: row2.sourceUrl }]));
  const byId = new Map(records.map((record) => [record.id, record]));
  return uniqueIds.flatMap((id) => {
    const record = byId.get(id);
    return record ? [{ ...record, formulas: formulaByPassage.get(id) ?? [], versions: versionByPassage.get(id) ?? [] }] : [];
  });
}
async function getPassageVersions(passageId) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classicPassageVersions).where(eq(classicPassageVersions.passageId, passageId)).orderBy(classicPassageVersions.editionLabel);
}
async function getFormulaPassages(formulaId) {
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
    chapterTitle: classicChapters.title
  }).from(formulaPassageMappings).innerJoin(classicPassages, eq(formulaPassageMappings.passageId, classicPassages.id)).innerJoin(classicChapters, eq(classicPassages.chapterId, classicChapters.id)).where(eq(formulaPassageMappings.formulaId, formulaId)).orderBy(formulaPassageMappings.relationType, classicPassages.passageNumber);
}
async function getPassageFormulas(passageId) {
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
    sourceExcerpt: formulas.sourceExcerpt
  }).from(formulaPassageMappings).innerJoin(formulas, eq(formulaPassageMappings.formulaId, formulas.id)).where(eq(formulaPassageMappings.passageId, passageId)).orderBy(formulaPassageMappings.relationType, formulas.name);
}
async function getLocalSearch(query) {
  const [herbResults, formulaResults, classicResults] = await Promise.all([getHerbs({ query }), getFormulas({ query }), getClassics({ query })]);
  return { herbs: herbResults.slice(0, 8), formulas: formulaResults.slice(0, 8), classics: classicResults.slice(0, 8) };
}
async function searchWikisource(query) {
  const normalizedQuery = query.trim();
  const cached = wikisourceSearchCache.get(normalizedQuery);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  const endpoint = new URL("https://zh.wikisource.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("list", "search");
  endpoint.searchParams.set("srsearch", normalizedQuery);
  endpoint.searchParams.set("srlimit", "8");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const response = await fetch(endpoint, { headers: { "User-Agent": "TCMClassicsLearningIndex/1.0 (public learning search)" }, signal: controller.signal });
    if (!response.ok) throw new Error("\u53E4\u7C4D\u516C\u5F00\u68C0\u7D22\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
    const payload = await response.json();
    const results = (payload.query?.search ?? []).map((item) => ({ pageId: item.pageid, title: item.title, timestamp: item.timestamp, snippet: item.snippet.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&"), sourceUrl: `https://zh.wikisource.org/wiki/${encodeURIComponent(item.title)}` }));
    wikisourceSearchCache.set(normalizedQuery, { results, expiresAt: Date.now() + 10 * 60 * 1e3 });
    return results;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("\u516C\u5F00\u539F\u6587\u68C0\u7D22\u54CD\u5E94\u8F83\u6162\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
async function listSavedItems(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedItems).where(eq(savedItems.userId, userId)).orderBy(desc(savedItems.createdAt));
}
async function toggleSavedItem(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const found = await db.select().from(savedItems).where(and(eq(savedItems.userId, userId), eq(savedItems.resourceType, input.resourceType), eq(savedItems.resourceId, input.resourceId))).limit(1);
  if (found[0]) {
    await db.delete(savedItems).where(eq(savedItems.id, found[0].id));
    return { saved: false };
  }
  await db.insert(savedItems).values({ userId, resourceType: input.resourceType, resourceId: input.resourceId });
  return { saved: true };
}
async function listStudyNotes(userId, resource) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(studyNotes.userId, userId)];
  if (resource?.resourceType) conditions.push(eq(studyNotes.resourceType, resource.resourceType));
  if (resource?.resourceId) conditions.push(eq(studyNotes.resourceId, resource.resourceId));
  return db.select().from(studyNotes).where(and(...conditions)).orderBy(desc(studyNotes.updatedAt));
}
async function createStudyNote(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const result = await db.insert(studyNotes).values({ userId, ...input });
  return { id: Number(result[0].insertId) };
}
async function updateStudyNote(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.update(studyNotes).set({ title: input.title, body: input.body }).where(and(eq(studyNotes.id, input.id), eq(studyNotes.userId, userId)));
  return { success: true };
}
async function deleteStudyNote(userId, id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.delete(studyNotes).where(and(eq(studyNotes.id, id), eq(studyNotes.userId, userId)));
  return { success: true };
}
async function setReadingProgress(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const now = /* @__PURE__ */ new Date();
  await db.insert(readingProgress).values({ userId, classicId: input.classicId, chapterId: input.chapterId ?? null, progressPercent: input.progressPercent, lastReadAt: now }).onDuplicateKeyUpdate({ set: { chapterId: input.chapterId ?? null, progressPercent: input.progressPercent, lastReadAt: now } });
  return { success: true };
}
async function getLearningOverview(userId) {
  const db = await getDb();
  if (!db) return { savedCount: 0, noteCount: 0, readingCount: 0, averageReadingProgress: 0, completedPathCount: 0, paths: [] };
  const [savedRows, noteRows, progressRows, pathRows] = await Promise.all([
    db.select({ id: savedItems.id }).from(savedItems).where(eq(savedItems.userId, userId)),
    db.select({ id: studyNotes.id }).from(studyNotes).where(eq(studyNotes.userId, userId)),
    db.select({ progressPercent: readingProgress.progressPercent }).from(readingProgress).where(eq(readingProgress.userId, userId)),
    db.select({ pathSlug: learningPathProgress.pathSlug, completedSteps: learningPathProgress.completedSteps }).from(learningPathProgress).where(eq(learningPathProgress.userId, userId))
  ]);
  const paths = pathRows.map((row2) => ({ pathSlug: row2.pathSlug, completedSteps: parseCompletedSteps(row2.completedSteps) }));
  return {
    savedCount: savedRows.length,
    noteCount: noteRows.length,
    readingCount: progressRows.length,
    averageReadingProgress: progressRows.length ? Math.round(progressRows.reduce((sum, item) => sum + item.progressPercent, 0) / progressRows.length) : 0,
    completedPathCount: paths.filter((path) => path.completedSteps.length >= 3).length,
    paths
  };
}
async function toggleLearningPathStep(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const found = await db.select().from(learningPathProgress).where(and(eq(learningPathProgress.userId, userId), eq(learningPathProgress.pathSlug, input.pathSlug))).limit(1);
  const completedSteps = parseCompletedSteps(found[0]?.completedSteps).filter((step) => step >= 1 && step <= 3);
  const next = completedSteps.includes(input.step) ? completedSteps.filter((step) => step !== input.step) : [...completedSteps, input.step].sort((a, b) => a - b);
  await db.insert(learningPathProgress).values({ userId, pathSlug: input.pathSlug, completedSteps: JSON.stringify(next) }).onDuplicateKeyUpdate({ set: { completedSteps: JSON.stringify(next), updatedAt: /* @__PURE__ */ new Date() } });
  return { completedSteps: next };
}
function parseCompletedSteps(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => Number.isInteger(item)) : [];
  } catch {
    return [];
  }
}
async function getGoalMetricCount(userId, metric) {
  const db = await getDb();
  if (!db) return 0;
  if (metric === "path_steps") {
    const rows2 = await db.select({ completedSteps: learningPathProgress.completedSteps }).from(learningPathProgress).where(eq(learningPathProgress.userId, userId));
    return rows2.reduce((total, row2) => total + parseCompletedSteps(row2.completedSteps).length, 0);
  }
  if (metric === "reading_entries") {
    const rows2 = await db.select({ id: readingProgress.id }).from(readingProgress).where(eq(readingProgress.userId, userId));
    return rows2.length;
  }
  const rows = await db.select({ id: studyNotes.id }).from(studyNotes).where(eq(studyNotes.userId, userId));
  return rows.length;
}
async function listLearningGoals(userId) {
  const db = await getDb();
  if (!db) return [];
  const goals = await db.select().from(learningGoals).where(eq(learningGoals.userId, userId)).orderBy(desc(learningGoals.updatedAt));
  const counts = /* @__PURE__ */ new Map();
  await Promise.all(["path_steps", "reading_entries", "study_notes"].map(async (metric) => counts.set(metric, await getGoalMetricCount(userId, metric))));
  return goals.map((goal) => {
    const currentCount = counts.get(goal.metric) ?? 0;
    return { ...goal, currentCount, completed: currentCount >= goal.targetCount };
  });
}
async function createLearningGoal(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const result = await db.insert(learningGoals).values({ userId, ...input, deadlineAt: input.deadlineAt ?? null });
  return { id: Number(result[0].insertId) };
}
async function archiveLearningGoal(userId, id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.update(learningGoals).set({ status: "archived" }).where(and(eq(learningGoals.id, id), eq(learningGoals.userId, userId)));
  return { success: true };
}
async function updateLearningGoal(userId, id, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.update(learningGoals).set({ title: input.title, metric: input.metric, targetCount: input.targetCount, deadlineAt: input.deadlineAt ?? null, status: "active" }).where(and(eq(learningGoals.id, id), eq(learningGoals.userId, userId)));
  return { success: true };
}
function calculateNextReviewAt(intervalDays, hourUtc, from = /* @__PURE__ */ new Date()) {
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(hourUtc);
  if (next <= from) next.setUTCDate(next.getUTCDate() + intervalDays);
  return next;
}
async function createReviewReminder(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  if (input.goalId) {
    const goal = await db.select({ id: learningGoals.id }).from(learningGoals).where(and(eq(learningGoals.id, input.goalId), eq(learningGoals.userId, userId))).limit(1);
    if (!goal[0]) throw new Error("\u6240\u9009\u5B66\u4E60\u76EE\u6807\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
  }
  const result = await db.insert(reviewReminders).values({ userId, goalId: input.goalId ?? null, title: input.title, intervalDays: input.intervalDays, hourUtc: input.hourUtc, nextReviewAt: calculateNextReviewAt(input.intervalDays, input.hourUtc) });
  return { id: Number(result[0].insertId) };
}
async function attachReviewReminderSchedule(userId, reminderId, taskUid) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.update(reviewReminders).set({ scheduleCronTaskUid: taskUid }).where(and(eq(reviewReminders.id, reminderId), eq(reviewReminders.userId, userId)));
}
async function getReviewReminder(userId, id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(reviewReminders).where(and(eq(reviewReminders.id, id), eq(reviewReminders.userId, userId))).limit(1);
  return rows[0];
}
async function listReviewReminders(userId) {
  const db = await getDb();
  if (!db) return { reminders: [], pending: [] };
  const [reminders, pending] = await Promise.all([
    db.select({ id: reviewReminders.id, userId: reviewReminders.userId, goalId: reviewReminders.goalId, title: reviewReminders.title, intervalDays: reviewReminders.intervalDays, hourUtc: reviewReminders.hourUtc, enabled: reviewReminders.enabled, scheduleCronTaskUid: reviewReminders.scheduleCronTaskUid, nextReviewAt: reviewReminders.nextReviewAt, lastTriggeredAt: reviewReminders.lastTriggeredAt, createdAt: reviewReminders.createdAt, updatedAt: reviewReminders.updatedAt, goalTitle: learningGoals.title }).from(reviewReminders).leftJoin(learningGoals, eq(reviewReminders.goalId, learningGoals.id)).where(eq(reviewReminders.userId, userId)).orderBy(desc(reviewReminders.updatedAt)),
    db.select({ id: reviewReminderEvents.id, reminderId: reviewReminderEvents.reminderId, dueAt: reviewReminderEvents.dueAt, title: reviewReminders.title, goalTitle: learningGoals.title }).from(reviewReminderEvents).innerJoin(reviewReminders, eq(reviewReminderEvents.reminderId, reviewReminders.id)).leftJoin(learningGoals, eq(reviewReminders.goalId, learningGoals.id)).where(and(eq(reviewReminderEvents.userId, userId), isNull(reviewReminderEvents.seenAt))).orderBy(desc(reviewReminderEvents.dueAt))
  ]);
  return { reminders, pending };
}
async function listReviewNotifications(userId, input) {
  const db = await getDb();
  if (!db) return [];
  const events = await db.select({
    id: reviewReminderEvents.id,
    reminderId: reviewReminderEvents.reminderId,
    dueAt: reviewReminderEvents.dueAt,
    seenAt: reviewReminderEvents.seenAt,
    createdAt: reviewReminderEvents.createdAt,
    title: reviewReminders.title,
    goalTitle: learningGoals.title
  }).from(reviewReminderEvents).innerJoin(reviewReminders, eq(reviewReminderEvents.reminderId, reviewReminders.id)).leftJoin(learningGoals, eq(reviewReminders.goalId, learningGoals.id)).where(eq(reviewReminderEvents.userId, userId)).orderBy(desc(reviewReminderEvents.dueAt));
  return events.filter((event) => {
    if (input.status === "unread" && event.seenAt) return false;
    if (input.status === "read" && !event.seenAt) return false;
    if (input.from && event.dueAt < input.from) return false;
    if (input.to && event.dueAt > input.to) return false;
    return true;
  });
}
async function updateReviewReminder(userId, id, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const existing = await getReviewReminder(userId, id);
  if (!existing) throw new Error("\u590D\u4E60\u63D0\u9192\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
  const nextReviewAt = input.enabled ? calculateNextReviewAt(input.intervalDays, input.hourUtc) : existing.nextReviewAt;
  await db.update(reviewReminders).set({ title: input.title, intervalDays: input.intervalDays, hourUtc: input.hourUtc, enabled: input.enabled ? 1 : 0, nextReviewAt }).where(eq(reviewReminders.id, id));
  return { ...existing, ...input, enabled: input.enabled ? 1 : 0, nextReviewAt };
}
async function deleteReviewReminder(userId, id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.delete(reviewReminderEvents).where(and(eq(reviewReminderEvents.reminderId, id), eq(reviewReminderEvents.userId, userId)));
  await db.delete(reviewReminders).where(and(eq(reviewReminders.id, id), eq(reviewReminders.userId, userId)));
  return { success: true };
}
async function markReviewReminderSeen(userId, eventId) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.update(reviewReminderEvents).set({ seenAt: /* @__PURE__ */ new Date() }).where(and(eq(reviewReminderEvents.id, eventId), eq(reviewReminderEvents.userId, userId)));
  return { success: true };
}
async function markAllReviewRemindersSeen(userId) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.update(reviewReminderEvents).set({ seenAt: /* @__PURE__ */ new Date() }).where(and(eq(reviewReminderEvents.userId, userId), isNull(reviewReminderEvents.seenAt)));
  return { success: true };
}
async function deleteReviewNotifications(userId, eventIds) {
  const uniqueIds = Array.from(new Set(eventIds));
  if (!uniqueIds.length) return { success: true, deleted: 0 };
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.delete(reviewReminderEvents).where(and(eq(reviewReminderEvents.userId, userId), inArray(reviewReminderEvents.id, uniqueIds)));
  return { success: true, deleted: uniqueIds.length };
}
async function triggerReviewReminderByTaskUid(taskUid) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const rows = await db.select().from(reviewReminders).where(eq(reviewReminders.scheduleCronTaskUid, taskUid)).limit(1);
  const reminder = rows[0];
  if (!reminder) return { ok: true, skipped: "orphan" };
  if (!reminder.enabled) return { ok: true, skipped: "paused" };
  const now = /* @__PURE__ */ new Date();
  if (reminder.nextReviewAt > now) return { ok: true, skipped: "not-due" };
  await db.insert(reviewReminderEvents).values({ reminderId: reminder.id, userId: reminder.userId, dueAt: reminder.nextReviewAt }).onDuplicateKeyUpdate({ set: { reminderId: reminder.id } });
  let nextReviewAt = new Date(reminder.nextReviewAt);
  do {
    nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + reminder.intervalDays);
  } while (nextReviewAt <= now);
  await db.update(reviewReminders).set({ lastTriggeredAt: now, nextReviewAt }).where(eq(reviewReminders.id, reminder.id));
  return { ok: true, reminderId: reminder.id, nextReviewAt };
}
async function listAiStudyConversations(userId, context) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(aiStudyConversations.userId, userId)];
  if (context) {
    conditions.push(eq(aiStudyConversations.contextKind, context.kind), eq(aiStudyConversations.contextTitle, context.title));
  }
  return db.select().from(aiStudyConversations).where(and(...conditions)).orderBy(desc(aiStudyConversations.updatedAt)).limit(20);
}
async function getAiStudyConversation(userId, id) {
  const db = await getDb();
  if (!db) return void 0;
  const conversation = (await db.select().from(aiStudyConversations).where(and(eq(aiStudyConversations.id, id), eq(aiStudyConversations.userId, userId))).limit(1))[0];
  if (!conversation) return void 0;
  const [messages, summary] = await Promise.all([
    db.select().from(aiStudyMessages).where(eq(aiStudyMessages.conversationId, id)).orderBy(aiStudyMessages.createdAt),
    db.select().from(aiStudySummaries).where(and(eq(aiStudySummaries.conversationId, id), eq(aiStudySummaries.userId, userId))).limit(1)
  ]);
  return { conversation, messages, summary: summary[0] ?? null };
}
async function createAiStudyConversation(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const result = await db.insert(aiStudyConversations).values({ userId, ...input });
  return { id: Number(result[0].insertId) };
}
async function appendAiStudyMessage(conversationId, role, content) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.insert(aiStudyMessages).values({ conversationId, role, content });
  await db.update(aiStudyConversations).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(aiStudyConversations.id, conversationId));
}
async function getRecentAiStudyMessages(userId, conversationId, limit = 8) {
  const conversation = await getAiStudyConversation(userId, conversationId);
  if (!conversation) return void 0;
  return { conversation: conversation.conversation, messages: conversation.messages.slice(-limit), summary: conversation.summary };
}
async function saveAiStudySummary(userId, conversationId, content, sourceMessageCount) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const conversation = await getAiStudyConversation(userId, conversationId);
  if (!conversation) throw new Error("\u5BF9\u8BDD\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
  await db.insert(aiStudySummaries).values({ conversationId, userId, content, sourceMessageCount }).onDuplicateKeyUpdate({ set: { content, sourceMessageCount, updatedAt: /* @__PURE__ */ new Date() } });
  return { conversationId, content, sourceMessageCount };
}
async function searchAiStudyConversations(userId, query) {
  const normalized2 = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalized2) return [];
  const db = await getDb();
  if (!db) return [];
  const conversations = await db.select().from(aiStudyConversations).where(eq(aiStudyConversations.userId, userId)).orderBy(desc(aiStudyConversations.updatedAt));
  const details = await Promise.all(conversations.map((conversation) => getAiStudyConversation(userId, conversation.id)));
  return details.flatMap((detail) => {
    if (!detail) return [];
    const candidates = [detail.conversation.title, detail.conversation.contextTitle, detail.summary?.content ?? "", ...detail.messages.map((message) => message.content)];
    const matched = candidates.find((text2) => text2.toLocaleLowerCase("zh-CN").includes(normalized2));
    return matched ? [{ id: detail.conversation.id, title: detail.conversation.title, contextKind: detail.conversation.contextKind, contextTitle: detail.conversation.contextTitle, updatedAt: detail.conversation.updatedAt, matchedSnippet: matched.slice(0, 220), hasSummary: Boolean(detail.summary) }] : [];
  });
}
async function deleteAiStudyConversation(userId, id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const conversation = await getAiStudyConversation(userId, id);
  if (!conversation) throw new Error("\u5BF9\u8BDD\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
  await db.delete(aiStudyMessages).where(eq(aiStudyMessages.conversationId, id));
  await db.delete(aiStudySummaries).where(and(eq(aiStudySummaries.conversationId, id), eq(aiStudySummaries.userId, userId)));
  await db.delete(aiStudyConversations).where(and(eq(aiStudyConversations.id, id), eq(aiStudyConversations.userId, userId)));
  return { success: true };
}
function normalizeKnowledgeFileName(fileName) {
  const normalized2 = fileName.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ");
  return normalized2.slice(0, 180) || "knowledge-document";
}
async function uploadKnowledgeDocument(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  if (!KNOWLEDGE_ALLOWED_TYPES.has(input.mimeType)) throw new Error("\u4EC5\u652F\u6301 TXT\u3001Markdown \u6216 PDF \u6587\u4EF6");
  const buffer = Buffer.from(input.base64, "base64");
  if (!buffer.length || buffer.length > KNOWLEDGE_MAX_BYTES) throw new Error("\u6587\u4EF6\u5FC5\u987B\u5C0F\u4E8E\u6216\u7B49\u4E8E 5MB");
  const title = normalizeKnowledgeFileName(input.fileName);
  let textContent = null;
  if (input.mimeType === "text/plain" || input.mimeType === "text/markdown") textContent = buffer.toString("utf8");
  if (input.mimeType === "application/pdf") {
    try {
      const extracted = await extractText(new Uint8Array(buffer), { mergePages: true });
      textContent = extracted.text.replace(/\s+/g, " ").trim() || null;
    } catch {
      textContent = null;
    }
  }
  if (textContent && Buffer.byteLength(textContent, "utf8") > KNOWLEDGE_MAX_TEXT_BYTES) throw new Error("\u6587\u6863\u53EF\u68C0\u7D22\u6B63\u6587\u8FC7\u957F\uFF0C\u8BF7\u62C6\u5206\u540E\u4E0A\u4F20");
  const { key, url } = await storagePut(`knowledge/${userId}/${Date.now()}-${title}`, buffer, input.mimeType);
  const textPreview = textContent?.slice(0, 6e3) || null;
  const result = await db.insert(knowledgeDocuments).values({ userId, title, mimeType: input.mimeType, sizeBytes: buffer.length, storageKey: key, storageUrl: url, textPreview, textContent });
  return { id: Number(result[0].insertId), title, mimeType: input.mimeType, sizeBytes: buffer.length };
}
async function listKnowledgeDocuments(userId, query) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title, mimeType: knowledgeDocuments.mimeType, sizeBytes: knowledgeDocuments.sizeBytes, textPreview: knowledgeDocuments.textPreview, createdAt: knowledgeDocuments.createdAt, updatedAt: knowledgeDocuments.updatedAt }).from(knowledgeDocuments).where(eq(knowledgeDocuments.userId, userId)).orderBy(desc(knowledgeDocuments.updatedAt));
  const normalized2 = query?.trim().toLocaleLowerCase("zh-CN");
  return normalized2 ? rows.filter((row2) => `${row2.title}
${row2.textPreview ?? ""}`.toLocaleLowerCase("zh-CN").includes(normalized2)) : rows;
}
function buildKnowledgeSearchHit(text2, normalizedQuery) {
  const matchIndex = text2.toLocaleLowerCase("zh-CN").indexOf(normalizedQuery);
  if (matchIndex < 0) return null;
  const excerptStart = Math.max(0, matchIndex - 96);
  const excerptEnd = Math.min(text2.length, matchIndex + normalizedQuery.length + 220);
  const prefix = excerptStart > 0 ? "\u2026" : "";
  const suffix = excerptEnd < text2.length ? "\u2026" : "";
  return { matchIndex, excerpt: `${prefix}${text2.slice(excerptStart, excerptEnd)}${suffix}`, matchOffset: matchIndex - excerptStart + prefix.length, matchLength: normalizedQuery.length };
}
async function searchKnowledgeDocuments(userId, query) {
  const normalized2 = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalized2) return [];
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title, mimeType: knowledgeDocuments.mimeType, textPreview: knowledgeDocuments.textPreview, textContent: knowledgeDocuments.textContent, updatedAt: knowledgeDocuments.updatedAt }).from(knowledgeDocuments).where(eq(knowledgeDocuments.userId, userId)).orderBy(desc(knowledgeDocuments.updatedAt));
  return rows.flatMap((row2) => {
    const contentHit = buildKnowledgeSearchHit(row2.textContent ?? row2.textPreview ?? "", normalized2);
    const titleHit = buildKnowledgeSearchHit(row2.title, normalized2);
    const hit = contentHit ?? titleHit;
    if (!hit) return [];
    return [{ id: row2.id, title: row2.title, mimeType: row2.mimeType, updatedAt: row2.updatedAt, excerpt: contentHit ? hit.excerpt : row2.textPreview?.slice(0, 320) || row2.title, matchOffset: contentHit ? hit.matchOffset : 0, matchLength: contentHit ? hit.matchLength : 0, matchIndex: contentHit ? hit.matchIndex : 0, matchIn: contentHit ? "content" : "title", isLegacyPreview: row2.textContent === null }];
  });
}
async function getKnowledgeDocumentCitations(userId, documentIds) {
  const db = await getDb();
  if (!db || !documentIds.length) return [];
  const rows = await db.select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title, textPreview: knowledgeDocuments.textPreview }).from(knowledgeDocuments).where(eq(knowledgeDocuments.userId, userId));
  return rows.filter((row2) => documentIds.includes(row2.id) && row2.textPreview).slice(0, 3).map((row2) => ({ id: row2.id, title: row2.title, excerpt: row2.textPreview.slice(0, 2400) }));
}
async function getKnowledgeDocumentDownload(userId, id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  const row2 = (await db.select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title, storageKey: knowledgeDocuments.storageKey }).from(knowledgeDocuments).where(and(eq(knowledgeDocuments.id, id), eq(knowledgeDocuments.userId, userId))).limit(1))[0];
  if (!row2) throw new Error("\u6587\u6863\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
  return { id: row2.id, title: row2.title, storageUrl: await storageGetSignedUrl(row2.storageKey) };
}
async function deleteKnowledgeDocument(userId, id) {
  const db = await getDb();
  if (!db) throw new Error("\u6570\u636E\u5E93\u6682\u4E0D\u53EF\u7528");
  await db.delete(knowledgeDocuments).where(and(eq(knowledgeDocuments.id, id), eq(knowledgeDocuments.userId, userId)));
  return { success: true };
}
async function getStudyDesk(userId) {
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
      chapterTitle: classicChapters.title
    }).from(readingProgress).leftJoin(classics, eq(readingProgress.classicId, classics.id)).leftJoin(classicChapters, eq(readingProgress.chapterId, classicChapters.id)).where(eq(readingProgress.userId, userId)).orderBy(desc(readingProgress.lastReadAt))
  ]);
  const saved = await Promise.all(savedRows.map(async (savedItem) => ({ ...savedItem, resource: await getStudyResource(db, savedItem.resourceType, savedItem.resourceId) })));
  return { saved, notes, progress };
}
async function getStudyResource(db, resourceType, resourceId) {
  if (resourceType === "herb") {
    const row3 = await db.select({ title: herbs.name, subtitle: herbs.category }).from(herbs).where(eq(herbs.id, resourceId)).limit(1);
    return row3[0] ? { ...row3[0], kind: "\u672C\u8349", href: `/bencao?q=${encodeURIComponent(row3[0].title)}` } : null;
  }
  if (resourceType === "formula") {
    const row3 = await db.select({ title: formulas.name, subtitle: formulas.sourceTitle }).from(formulas).where(eq(formulas.id, resourceId)).limit(1);
    return row3[0] ? { ...row3[0], kind: "\u7ECF\u65B9", href: `/jingfang?q=${encodeURIComponent(row3[0].title)}` } : null;
  }
  if (resourceType === "classic") {
    const row3 = await db.select({ title: classics.title, subtitle: classics.category }).from(classics).where(eq(classics.id, resourceId)).limit(1);
    return row3[0] ? { ...row3[0], kind: "\u53E4\u7C4D", href: `/guji?q=${encodeURIComponent(row3[0].title)}` } : null;
  }
  const row2 = await db.select({ title: classicChapters.title, subtitle: classics.title }).from(classicChapters).leftJoin(classics, eq(classicChapters.classicId, classics.id)).where(eq(classicChapters.id, resourceId)).limit(1);
  return row2[0] ? { ...row2[0], kind: "\u7AE0\u8282", href: "/guji" } : null;
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/catalog.ts
import { z as z2 } from "zod";

// shared/passageLearningLexicon.ts
var passageSymptomLexicon = [
  { canonical: "\u6076\u5BD2", aliases: ["\u6015\u51B7", "\u754F\u5BD2", "\u53D1\u51B7", "\u5BD2\u6218"], group: "\u5BD2\u70ED\u611F\u53D7" },
  { canonical: "\u6076\u98CE", aliases: ["\u6015\u98CE", "\u6015\u5439\u98CE", "\u98CE\u5439\u4E0D\u9002"], group: "\u5BD2\u70ED\u611F\u53D7" },
  { canonical: "\u53D1\u70ED", aliases: ["\u53D1\u70E7", "\u8EAB\u70ED", "\u70ED\u611F"], group: "\u5BD2\u70ED\u611F\u53D7" },
  { canonical: "\u6F6E\u70ED", aliases: ["\u5348\u540E\u53D1\u70ED", "\u5B9A\u65F6\u53D1\u70ED"], group: "\u5BD2\u70ED\u611F\u53D7" },
  { canonical: "\u6C57\u51FA", aliases: ["\u51FA\u6C57", "\u81EA\u6C57", "\u5BB9\u6613\u51FA\u6C57"], group: "\u6C57\u51FA\u4E0E\u6D25\u6DB2" },
  { canonical: "\u65E0\u6C57", aliases: ["\u4E0D\u51FA\u6C57", "\u6C57\u5C11"], group: "\u6C57\u51FA\u4E0E\u6D25\u6DB2" },
  { canonical: "\u53E3\u6E34", aliases: ["\u53E3\u5E72", "\u53E3\u71E5", "\u60F3\u559D\u6C34"], group: "\u6C57\u51FA\u4E0E\u6D25\u6DB2" },
  { canonical: "\u5C0F\u4FBF\u4E0D\u5229", aliases: ["\u5C3F\u5C11", "\u5C0F\u4FBF\u5C11", "\u6392\u5C3F\u4E0D\u7545"], group: "\u6C57\u51FA\u4E0E\u6D25\u6DB2" },
  { canonical: "\u5934\u75DB", aliases: ["\u5934\u75BC", "\u5934\u90E8\u75BC\u75DB"], group: "\u5934\u8EAB\u4E0E\u8868\u8BC1" },
  { canonical: "\u9879\u5F3A", aliases: ["\u9888\u9879\u5F3A", "\u8116\u5B50\u50F5", "\u9888\u90E8\u50F5\u786C"], group: "\u5934\u8EAB\u4E0E\u8868\u8BC1" },
  { canonical: "\u8EAB\u75BC\u75DB", aliases: ["\u5168\u8EAB\u75DB", "\u808C\u8089\u9178\u75DB", "\u5173\u8282\u75DB"], group: "\u5934\u8EAB\u4E0E\u8868\u8BC1" },
  { canonical: "\u5598", aliases: ["\u6C14\u5598", "\u5598\u4FC3", "\u547C\u5438\u6025"], group: "\u547C\u5438\u4E0E\u80F8\u80C1" },
  { canonical: "\u54B3", aliases: ["\u54B3\u55FD"], group: "\u547C\u5438\u4E0E\u80F8\u80C1" },
  { canonical: "\u80F8\u80C1\u6EE1", aliases: ["\u80F8\u80C1\u80C0", "\u80C1\u4E0B\u80C0", "\u80F8\u95F7"], group: "\u547C\u5438\u4E0E\u80F8\u80C1" },
  { canonical: "\u5FC3\u4E0B\u75DE", aliases: ["\u5FC3\u4E0B\u6EE1", "\u80C3\u8118\u5835", "\u80C3\u8118\u75DE\u6EE1"], group: "\u996E\u98DF\u4E0E\u8179\u90E8" },
  { canonical: "\u8179\u6EE1", aliases: ["\u8179\u80C0", "\u809A\u5B50\u80C0"], group: "\u996E\u98DF\u4E0E\u8179\u90E8" },
  { canonical: "\u8179\u75DB", aliases: ["\u809A\u5B50\u75DB", "\u8179\u90E8\u75BC\u75DB"], group: "\u996E\u98DF\u4E0E\u8179\u90E8" },
  { canonical: "\u4E0D\u80FD\u98DF", aliases: ["\u5403\u4E0D\u4E0B", "\u98DF\u6B32\u5DEE"], group: "\u996E\u98DF\u4E0E\u8179\u90E8" },
  { canonical: "\u4E0D\u6B32\u98DF", aliases: ["\u4E0D\u60F3\u5403", "\u6CA1\u80C3\u53E3", "\u4E0D\u601D\u996E\u98DF"], group: "\u996E\u98DF\u4E0E\u8179\u90E8" },
  { canonical: "\u5455", aliases: ["\u6076\u5FC3", "\u5E72\u5455", "\u5455\u5410"], group: "\u996E\u98DF\u4E0E\u8179\u90E8" },
  { canonical: "\u4E0B\u5229", aliases: ["\u8179\u6CFB", "\u6CC4\u6CFB", "\u5927\u4FBF\u7A00"], group: "\u996E\u98DF\u4E0E\u8179\u90E8" },
  { canonical: "\u5927\u4FBF\u786C", aliases: ["\u4FBF\u79D8", "\u5927\u4FBF\u5E72", "\u6392\u4FBF\u56F0\u96BE"], group: "\u996E\u98DF\u4E0E\u8179\u90E8" },
  { canonical: "\u53E3\u82E6", aliases: ["\u5634\u82E6", "\u53E3\u4E2D\u53D1\u82E6"], group: "\u53E3\u54BD\u4E0E\u611F\u5B98" },
  { canonical: "\u54BD\u5E72", aliases: ["\u55D3\u5B50\u5E72", "\u54BD\u5589\u5E72"], group: "\u53E3\u54BD\u4E0E\u611F\u5B98" },
  { canonical: "\u76EE\u7729", aliases: ["\u5934\u6655", "\u7729\u6655"], group: "\u53E3\u54BD\u4E0E\u611F\u5B98" },
  { canonical: "\u5FC3\u70E6", aliases: ["\u70E6\u8E81", "\u5FC3\u91CC\u70E6"], group: "\u7761\u7720\u4E0E\u60C5\u5FD7" },
  { canonical: "\u4E0D\u5F97\u7720", aliases: ["\u5931\u7720", "\u7761\u4E0D\u7740", "\u96BE\u5165\u7761"], group: "\u7761\u7720\u4E0E\u60C5\u5FD7" },
  { canonical: "\u60CA\u60B8", aliases: ["\u5FC3\u614C", "\u5FC3\u60B8", "\u5FC3\u8DF3\u4E0D\u5B89"], group: "\u7761\u7720\u4E0E\u60C5\u5FD7" },
  { canonical: "\u56DB\u9006", aliases: ["\u624B\u8DB3\u51B7", "\u56DB\u80A2\u51B7", "\u624B\u811A\u51B0\u51C9"], group: "\u56DB\u80A2\u4E0E\u5BD2\u70ED" },
  { canonical: "\u8EAB\u91CD", aliases: ["\u8EAB\u4F53\u6C89\u91CD", "\u8EAB\u5B50\u53D1\u6C89"], group: "\u56DB\u80A2\u4E0E\u5BD2\u70ED" }
];
function expandPassageLearningTerms(terms) {
  const expanded = [];
  for (const term of terms) {
    const normalized2 = term.trim();
    if (!normalized2) continue;
    const entry = passageSymptomLexicon.find((item) => item.canonical === normalized2 || item.aliases.includes(normalized2));
    expanded.push({ input: normalized2, canonical: entry?.canonical ?? normalized2 });
  }
  return Array.from(new Map(expanded.map((item) => [`${item.input}:${item.canonical}`, item])).values());
}

// server/passageLearningMatch.ts
var passageLearningPerspectives = [
  { id: "all", label: "\u4E0D\u9884\u8BBE\u89D2\u5EA6", helper: "\u4EC5\u6309\u8F93\u5165\u7684\u6761\u6587\u5173\u952E\u8BCD\u68C0\u7D22\u3002", terms: [] },
  { id: "cold-heat", label: "\u5BD2\u70ED\u611F\u53D7\u89C2\u5BDF", helper: "\u6269\u5C55\u201C\u6076\u5BD2\u3001\u53D1\u70ED\u3001\u6F6E\u70ED\u201D\u7B49\u6761\u6587\u7D22\u5F15\u8BCD\u3002", terms: ["\u6076\u5BD2", "\u53D1\u70ED", "\u6F6E\u70ED"] },
  { id: "sweat-fluid", label: "\u6C57\u51FA\u4E0E\u6D25\u6DB2\u89C2\u5BDF", helper: "\u6269\u5C55\u201C\u6C57\u51FA\u3001\u65E0\u6C57\u3001\u53E3\u6E34\u3001\u5C0F\u4FBF\u4E0D\u5229\u201D\u7B49\u6761\u6587\u7D22\u5F15\u8BCD\u3002", terms: ["\u6C57\u51FA", "\u65E0\u6C57", "\u53E3\u6E34", "\u5C0F\u4FBF\u4E0D\u5229"] },
  { id: "digestive", label: "\u996E\u98DF\u4E0E\u8179\u90E8\u89C2\u5BDF", helper: "\u6269\u5C55\u201C\u8179\u6EE1\u3001\u4E0D\u80FD\u98DF\u3001\u5455\u3001\u4E0B\u5229\u3001\u5927\u4FBF\u786C\u201D\u7B49\u6761\u6587\u7D22\u5F15\u8BCD\u3002", terms: ["\u8179\u6EE1", "\u4E0D\u80FD\u98DF", "\u4E0D\u6B32\u98DF", "\u5455", "\u4E0B\u5229", "\u5927\u4FBF\u786C"] },
  { id: "sleep-emotion", label: "\u7761\u7720\u4E0E\u60C5\u5FD7\u89C2\u5BDF", helper: "\u6269\u5C55\u201C\u5FC3\u70E6\u3001\u4E0D\u5F97\u7720\u3001\u60CA\u60B8\u201D\u7B49\u6761\u6587\u7D22\u5F15\u8BCD\u3002", terms: ["\u5FC3\u70E6", "\u4E0D\u5F97\u7720", "\u60CA\u60B8"] },
  { id: "head-body", label: "\u5934\u8EAB\u4E0E\u8868\u8BC1\u89C2\u5BDF", helper: "\u6269\u5C55\u201C\u5934\u75DB\u3001\u9879\u5F3A\u3001\u8EAB\u75BC\u75DB\u201D\u7B49\u6761\u6587\u7D22\u5F15\u8BCD\u3002", terms: ["\u5934\u75DB", "\u9879\u5F3A", "\u8EAB\u75BC\u75DB"] },
  { id: "chest-breathing", label: "\u80F8\u80C1\u4E0E\u547C\u5438\u89C2\u5BDF", helper: "\u6269\u5C55\u201C\u80F8\u80C1\u6EE1\u3001\u5598\u3001\u54B3\u201D\u7B49\u6761\u6587\u7D22\u5F15\u8BCD\u3002", terms: ["\u80F8\u80C1\u6EE1", "\u5598", "\u54B3"] },
  { id: "limbs", label: "\u56DB\u80A2\u4E0E\u5BD2\u70ED\u89C2\u5BDF", helper: "\u6269\u5C55\u201C\u56DB\u9006\u3001\u8EAB\u91CD\u201D\u7B49\u6761\u6587\u7D22\u5F15\u8BCD\u3002", terms: ["\u56DB\u9006", "\u8EAB\u91CD"] }
];
function parsePassageLearningTerms(value) {
  return Array.from(
    new Set(
      value.split(/[\s,，、;；/\n]+/).map((term) => term.trim()).filter(Boolean)
    )
  ).slice(0, 12);
}
function getPerspectiveTerms(perspective) {
  return passageLearningPerspectives.find((item) => item.id === perspective)?.terms ?? [];
}
function matchPassageLearningRecords(records, input) {
  const queryTerms = parsePassageLearningTerms(input.query ?? "");
  const perspectiveTerms = getPerspectiveTerms(input.perspective ?? "all");
  const termMappings = expandPassageLearningTerms(queryTerms.concat(perspectiveTerms));
  const terms = Array.from(new Set(termMappings.map((item) => item.canonical)));
  if (!terms.length) return [];
  const matchMode = input.matchMode ?? "any";
  return records.map((record) => {
    const titleText = `${record.title} ${record.chapterTitle}`;
    const keywordText = record.keywords ?? "";
    const excerptText = record.excerpt;
    const matchedCanonicalTerms = terms.filter(
      (term) => titleText.includes(term) || keywordText.includes(term) || excerptText.includes(term)
    );
    const eligible = matchMode === "all" ? matchedCanonicalTerms.length === terms.length : matchedCanonicalTerms.length > 0;
    if (!eligible) return null;
    const matchedTerms = termMappings.filter((item) => matchedCanonicalTerms.includes(item.canonical)).map((item) => item.input === item.canonical ? item.canonical : `${item.input}\uFF08\u68C0\u7D22\u4E3A${item.canonical}\uFF09`);
    const score = matchedCanonicalTerms.reduce((total, term) => {
      if (keywordText.includes(term)) return total + 5;
      if (titleText.includes(term)) return total + 3;
      return total + 1;
    }, 0);
    return { ...record, matchedTerms, score };
  }).filter((record) => Boolean(record)).sort((a, b) => b.score - a.score || a.chapterTitle.localeCompare(b.chapterTitle, "zh-CN") || a.passageNumber - b.passageNumber);
}

// server/routers/catalog.ts
var textQuery = z2.string().trim().max(100).optional();
var catalogRouter = router({
  filters: publicProcedure.query(() => getCatalogFilters()),
  herbs: publicProcedure.input(z2.object({ query: textQuery, category: z2.string().max(128).optional(), nature: z2.string().max(64).optional(), meridian: z2.string().max(128).optional() })).query(({ input }) => getHerbs(input)),
  formulas: publicProcedure.input(z2.object({ query: textQuery, sourceTitle: z2.string().max(255).optional() })).query(({ input }) => getFormulas(input)),
  formulaStudySearch: publicProcedure.input(z2.object({ query: textQuery, sourceTitle: z2.string().max(255).optional(), matchMode: z2.enum(["all", "any"]).optional() })).query(({ input }) => getFormulaStudySearch(input)),
  classics: publicProcedure.input(z2.object({ query: textQuery, category: z2.string().max(128).optional() })).query(({ input }) => getClassics(input)),
  chapters: publicProcedure.input(z2.object({ classicId: z2.number().int().positive() })).query(({ input }) => getClassicChapters(input.classicId)),
  passages: publicProcedure.input(z2.object({ chapterId: z2.number().int().positive() })).query(({ input }) => getClassicPassages(input.chapterId)),
  passageVersions: publicProcedure.input(z2.object({ passageId: z2.number().int().positive() })).query(({ input }) => getPassageVersions(input.passageId)),
  shangHanPassageLearning: publicProcedure.input(z2.object({ query: z2.string().trim().max(100).optional(), perspective: z2.enum(["all", "cold-heat", "sweat-fluid", "digestive", "sleep-emotion", "head-body", "chest-breathing", "limbs"]).optional(), matchMode: z2.enum(["all", "any"]).optional() })).query(async ({ input }) => matchPassageLearningRecords(await getShangHanPassageLearningIndex(), input)),
  shangHanPassageIndex: publicProcedure.query(() => getShangHanPassageLearningIndex()),
  shangHanPassageMatrix: publicProcedure.input(z2.object({ passageIds: z2.array(z2.number().int().positive()).min(1).max(4) })).query(({ input }) => getShangHanPassageMatrixRecords(input.passageIds)),
  formulaPassages: publicProcedure.input(z2.object({ formulaId: z2.number().int().positive() })).query(({ input }) => getFormulaPassages(input.formulaId)),
  passageFormulas: publicProcedure.input(z2.object({ passageId: z2.number().int().positive() })).query(({ input }) => getPassageFormulas(input.passageId)),
  search: publicProcedure.input(z2.object({ query: z2.string().trim().min(1).max(100) })).query(({ input }) => getLocalSearch(input.query)),
  wikisourceSearch: publicProcedure.input(z2.object({ query: z2.string().trim().min(1).max(100) })).query(({ input }) => searchWikisource(input.query))
});

// server/routers/aiStudy.ts
import { z as z3 } from "zod";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}
async function listLLMModels() {
  assertApiKey();
  const url = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/models` : "https://forge.manus.im/v1/models";
  const response = await fetchWithBackoff(url, {
    headers: { authorization: `Bearer ${ENV.forgeApiKey}` }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/routers/aiStudy.ts
var contextSchema = z3.object({
  kind: z3.enum(["\u672C\u8349", "\u7ECF\u65B9", "\u53E4\u7C4D\u7AE0\u8282"]),
  title: z3.string().trim().min(1).max(255),
  sourceTitle: z3.string().trim().max(255).optional(),
  excerpt: z3.string().trim().max(3e3).optional(),
  studyNote: z3.string().trim().max(1600).optional()
});
var providerSchema = z3.enum(["auto", "builtin", "local", "network"]);
var assistantGuardrail = "\u4F60\u662F\u4E2D\u533B\u53E4\u7C4D\u5B66\u4E60\u52A9\u624B\u3002\u4EC5\u4F9D\u636E\u7528\u6237\u63D0\u4F9B\u7684\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF0C\u5E2E\u52A9\u68B3\u7406\u672F\u8BED\u3001\u6587\u672C\u7ED3\u6784\u3001\u51FA\u5904\u7EBF\u7D22\u4E0E\u53EF\u7EE7\u7EED\u67E5\u9605\u7684\u95EE\u9898\u3002\u4E0D\u5F97\u505A\u4E2A\u4F53\u8BCA\u65AD\u3001\u75C5\u60C5\u5224\u65AD\u3001\u6CBB\u7597\u5EFA\u8BAE\u3001\u5904\u65B9\u3001\u5242\u91CF\u6216\u7528\u836F\u65B9\u6848\uFF1B\u9047\u5230\u6B64\u7C7B\u8BF7\u6C42\uFF0C\u7B80\u77ED\u8BF4\u660E\u672C\u7AD9\u53EA\u63D0\u4F9B\u5B66\u4E60\u8D44\u6599\u5E76\u5EFA\u8BAE\u54A8\u8BE2\u5408\u683C\u533B\u7597\u4E13\u4E1A\u4EBA\u5458\u3002\u672A\u77E5\u5185\u5BB9\u5FC5\u987B\u660E\u786E\u8BF4\u660E\u65E0\u6CD5\u4ECE\u7ED9\u5B9A\u8D44\u6599\u786E\u8BA4\u3002\u8BF7\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u3001\u77ED\u6BB5\u843D\u548C\u5FC5\u8981\u7684\u9879\u76EE\u7B26\u53F7\uFF0C\u4FDD\u6301\u514B\u5236\u3001\u53EF\u6838\u67E5\u7684\u8BED\u6C14\u3002";
var toConversationKind = (kind) => kind === "\u672C\u8349" ? "herb" : kind === "\u7ECF\u65B9" ? "formula" : "chapter";
function normalizeCompatibleBaseUrl(baseUrl) {
  return baseUrl.trim().replace(/\/+$/, "");
}
function getCompatibleConfig(provider) {
  const raw = provider === "local" ? { baseUrl: ENV.localLlmBaseUrl, model: ENV.localLlmModel, apiKey: ENV.localLlmApiKey, label: "local" } : { baseUrl: ENV.networkLlmBaseUrl, model: ENV.networkLlmModel, apiKey: ENV.networkLlmApiKey, label: "network" };
  const baseUrl = normalizeCompatibleBaseUrl(raw.baseUrl);
  if (!baseUrl || !raw.model) return null;
  return { ...raw, baseUrl };
}
function listConfiguredProviders() {
  return { builtin: true, local: Boolean(getCompatibleConfig("local")), network: Boolean(getCompatibleConfig("network")) };
}
async function callCompatibleApi(config, messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15e3);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", ...config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {} }, body: JSON.stringify({ model: config.model, messages, max_tokens: 900, temperature: 0.2 }), signal: controller.signal });
    if (!response.ok) throw new Error(`${config.label} AI \u670D\u52A1\u8FD4\u56DE ${response.status}`);
    const payload = await response.json();
    const answer = payload.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error(`${config.label} AI \u670D\u52A1\u672A\u8FD4\u56DE\u5B66\u4E60\u5185\u5BB9`);
    return { answer, model: config.model, provider: config.label };
  } finally {
    clearTimeout(timeout);
  }
}
async function callBuiltin(messages) {
  const { data } = await listLLMModels();
  const model = data.find((candidate) => candidate.id === "gpt-5-mini")?.id ?? data[0]?.id;
  if (!model) throw new Error("\u5F53\u524D\u6CA1\u6709\u53EF\u7528\u7684\u5B66\u4E60\u52A9\u624B\u6A21\u578B\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002");
  const response = await invokeLLM({ model, maxTokens: 900, messages });
  const rawAnswer = response.choices[0]?.message.content;
  const answer = typeof rawAnswer === "string" ? rawAnswer.trim() : "";
  if (!answer) throw new Error("\u5B66\u4E60\u52A9\u624B\u6682\u672A\u8FD4\u56DE\u5185\u5BB9\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
  return { answer, model, provider: "builtin" };
}
async function explainWithProvider(provider, messages) {
  const requested = provider === "auto" ? ["local", "network", "builtin"] : [provider];
  let lastError;
  for (const candidate of requested) {
    try {
      if (candidate === "builtin") return await callBuiltin(messages);
      const config = getCompatibleConfig(candidate);
      if (!config) continue;
      return await callCompatibleApi(config, messages);
    } catch (error) {
      lastError = error;
      if (provider !== "auto") throw error;
    }
  }
  throw lastError ?? new Error("\u5F53\u524D\u6CA1\u6709\u53EF\u7528\u7684 AI \u5B66\u4E60\u52A9\u624B\u63D0\u4F9B\u65B9\u3002");
}
var aiStudyRouter = router({
  providers: protectedProcedure.query(() => listConfiguredProviders()),
  conversations: router({
    list: protectedProcedure.input(z3.object({ context: contextSchema.pick({ kind: true, title: true }).optional() }).optional()).query(({ ctx, input }) => input?.context ? listAiStudyConversations(ctx.user.id, { kind: toConversationKind(input.context.kind), title: input.context.title }) : listAiStudyConversations(ctx.user.id)),
    get: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).query(async ({ ctx, input }) => {
      const result = await getAiStudyConversation(ctx.user.id, input.id);
      if (!result) throw new Error("\u5BF9\u8BDD\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
      return result;
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ ctx, input }) => deleteAiStudyConversation(ctx.user.id, input.id)),
    search: protectedProcedure.input(z3.object({ query: z3.string().trim().min(1).max(80) })).query(({ ctx, input }) => searchAiStudyConversations(ctx.user.id, input.query))
  }),
  summaries: router({
    generate: protectedProcedure.input(z3.object({ conversationId: z3.number().int().positive(), provider: providerSchema.default("auto") })).mutation(async ({ ctx, input }) => {
      const detail = await getAiStudyConversation(ctx.user.id, input.conversationId);
      if (!detail) throw new Error("\u5BF9\u8BDD\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
      if (!detail.messages.length) throw new Error("\u5F53\u524D\u5BF9\u8BDD\u5C1A\u65E0\u53EF\u6458\u8981\u5185\u5BB9");
      const recentTranscript = detail.messages.slice(-40).map((message) => `${message.role === "user" ? "\u5B66\u4E60\u8005" : "\u52A9\u624B"}\uFF1A${message.content.slice(0, 1500)}`).join("\n");
      const previousSummary = detail.summary?.content ? `
\u65E2\u6709\u6458\u8981\uFF08\u8BF7\u4FEE\u8BA2\u3001\u5408\u5E76\u800C\u975E\u673A\u68B0\u91CD\u590D\uFF09\uFF1A
${detail.summary.content.slice(0, 3500)}` : "";
      const result = await explainWithProvider(input.provider, [
        { role: "system", content: `${assistantGuardrail}

\u4F60\u73B0\u5728\u53EA\u8D1F\u8D23\u751F\u6210\u4E2A\u4EBA\u5B66\u4E60\u5BF9\u8BDD\u6458\u8981\u3002\u8BF7\u7528\u201C\u5DF2\u786E\u8BA4\u7684\u539F\u5178\u7EBF\u7D22\u201D\u201C\u5B66\u4E60\u8005\u7684\u95EE\u9898\u4E0E\u5DF2\u83B7\u56DE\u7B54\u201D\u201C\u4ECD\u5F85\u6838\u5BF9\u7684\u95EE\u9898\u201D\u4E09\u4E2A\u7B80\u77ED\u5C0F\u8282\u6574\u7406\uFF1B\u4E0D\u5F97\u8865\u5145\u5BF9\u8BDD\u4E2D\u6CA1\u6709\u7684\u4E8B\u5B9E\uFF0C\u4E5F\u4E0D\u5F97\u7ED9\u51FA\u8BCA\u7597\u6216\u7528\u836F\u5EFA\u8BAE\u3002` },
        { role: "user", content: `\u8BF7\u603B\u7ED3\u300A${detail.conversation.contextTitle}\u300B\u7684\u4E0B\u5217\u5BF9\u8BDD\uFF08\u5171 ${detail.messages.length} \u6761\uFF0C\u5C55\u793A\u6700\u8FD1 ${Math.min(detail.messages.length, 40)} \u6761\uFF09\uFF1A${previousSummary}

${recentTranscript}` }
      ]);
      const summary = await saveAiStudySummary(ctx.user.id, input.conversationId, result.answer.slice(0, 6e3), detail.messages.length);
      return { ...result, summary };
    })
  }),
  explain: protectedProcedure.input(z3.object({ context: contextSchema, question: z3.string().trim().min(1).max(600), provider: providerSchema.default("auto"), conversationId: z3.number().int().positive().optional(), knowledgeDocumentIds: z3.array(z3.number().int().positive()).max(3).optional() })).mutation(async ({ ctx, input }) => {
    const kind = toConversationKind(input.context.kind);
    const existing = input.conversationId ? await getRecentAiStudyMessages(ctx.user.id, input.conversationId, 8) : void 0;
    if (input.conversationId && !existing) throw new Error("\u5BF9\u8BDD\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
    if (existing && (existing.conversation.contextKind !== kind || existing.conversation.contextTitle !== input.context.title)) throw new Error("\u8BE5\u5386\u53F2\u5BF9\u8BDD\u4E0D\u5C5E\u4E8E\u5F53\u524D\u5B66\u4E60\u6761\u76EE");
    const conversationId = existing?.conversation.id ?? (await createAiStudyConversation(ctx.user.id, { title: input.context.title, contextKind: kind, contextTitle: input.context.title })).id;
    const history = (existing?.messages ?? []).map((message) => ({ role: message.role, content: message.content.slice(0, 1800) }));
    const citations = await getKnowledgeDocumentCitations(ctx.user.id, input.knowledgeDocumentIds ?? []);
    const knowledgeContext = citations.length ? `

\u7528\u6237\u660E\u786E\u9009\u62E9\u7684\u4E2A\u4EBA\u77E5\u8BC6\u5E93\u6458\u5F55\uFF08\u4EC5\u53EF\u5F15\u7528\u5176\u4E2D\u7ED9\u51FA\u7684\u5185\u5BB9\uFF0C\u5E76\u5728\u76F8\u5173\u53E5\u540E\u4EE5\u300A\u8D44\u6599\u540D\u300B\u6807\u6CE8\uFF09\uFF1A
${citations.map((citation) => `\u300A${citation.title}\u300B\uFF1A${citation.excerpt}`).join("\n\n")}` : "";
    const messages = [
      { role: "system", content: `${assistantGuardrail}

\u5F53\u524D\u56FA\u5B9A\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF1A
- \u7C7B\u578B\uFF1A${input.context.kind}
- \u6807\u9898\uFF1A${input.context.title}
- \u6765\u6E90\uFF1A${input.context.sourceTitle ?? "\u672A\u63D0\u4F9B"}
- \u6458\u5F55\uFF1A${input.context.excerpt ?? "\u672A\u63D0\u4F9B"}
- \u7814\u8BFB\u63D0\u793A\uFF1A${input.context.studyNote ?? "\u672A\u63D0\u4F9B"}${knowledgeContext}

\u4EC5\u5C06\u4E0B\u5217\u6700\u8FD1\u5386\u53F2\u89C6\u4E3A\u4E0A\u4E0B\u6587\uFF1B\u82E5\u5386\u53F2\u672A\u8DB3\u4EE5\u786E\u8BA4\u4E8B\u5B9E\uFF0C\u8BF7\u660E\u786E\u8BF4\u660E\u3002` },
      ...existing?.summary?.content ? [{ role: "system", content: `\u672C\u4F1A\u8BDD\u7684\u65E2\u6709\u5B66\u4E60\u6458\u8981\uFF08\u4EC5\u4F5C\u8FDE\u7EED\u6027\u7EBF\u7D22\uFF0C\u539F\u5178\u4E8B\u5B9E\u4ECD\u987B\u4EE5\u5F53\u524D\u8D44\u6599\u6838\u5BF9\uFF09\uFF1A
${existing.summary.content.slice(0, 3500)}` }] : [],
      ...history,
      { role: "user", content: input.question }
    ];
    const result = await explainWithProvider(input.provider, messages);
    await appendAiStudyMessage(conversationId, "user", input.question);
    await appendAiStudyMessage(conversationId, "assistant", result.answer);
    return { ...result, conversationId };
  })
});

// server/routers/study.ts
import { z as z4 } from "zod";
import { parse as parseCookie } from "cookie";

// server/_core/heartbeat.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
var SERVICE = "webdevtoken.v1.WebDevService";
var buildEndpoint = (rpc) => {
  if (!ENV.forgeApiUrl) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service URL is not configured (BUILT_IN_FORGE_API_URL)."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service API key is not configured (BUILT_IN_FORGE_API_KEY)."
    });
  }
  const baseUrl = ENV.forgeApiUrl;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(`${SERVICE}/${rpc}`, normalizedBase).toString();
};
var callForge = async (rpc, body, userSession) => {
  const endpoint = buildEndpoint(rpc);
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${ENV.forgeApiKey}`,
    "content-type": "application/json",
    "connect-protocol-version": "1"
  };
  if (userSession) {
    headers["x-manus-user-session"] = userSession;
  }
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: `Heartbeat ${rpc} network error: ${String(error)}`
    });
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw mapForgeError(response, detail, rpc);
  }
  return await response.json();
};
var mapForgeError = (response, detail, rpc) => {
  const status = response.status;
  let code = "INTERNAL_SERVER_ERROR";
  if (status === 401) code = "UNAUTHORIZED";
  else if (status === 403) code = "FORBIDDEN";
  else if (status === 404) code = "NOT_FOUND";
  else if (status === 400 || status === 422) code = "BAD_REQUEST";
  else if (status === 409) code = "CONFLICT";
  else if (status === 429) code = "TOO_MANY_REQUESTS";
  return new TRPCError3({
    code,
    message: `Heartbeat ${rpc} failed (${status})${detail ? `: ${detail}` : ""}`
  });
};
var stringifyPayload = (payload) => {
  if (payload === void 0 || payload === null) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};
var validateCallbackPath = (path) => {
  if (!path || !path.startsWith("/api/scheduled/")) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: "callback path must start with /api/scheduled/"
    });
  }
};
async function createHeartbeatJob(job, userSession) {
  validateCallbackPath(job.path);
  return callForge(
    "CreateHeartbeatJob",
    {
      name: job.name,
      cronExpression: job.cron,
      callbackPath: job.path,
      callbackMethod: job.method ?? "POST",
      callbackPayload: stringifyPayload(job.payload),
      description: job.description ?? ""
    },
    userSession
  );
}
async function updateHeartbeatJob(taskUid, patch, userSession) {
  if (patch.path !== void 0) validateCallbackPath(patch.path);
  const body = { taskUid };
  if (patch.cron !== void 0) body.cronExpression = patch.cron;
  if (patch.path !== void 0) body.callbackPath = patch.path;
  if (patch.method !== void 0) body.callbackMethod = patch.method;
  if (patch.payload !== void 0) {
    body.callbackPayload = stringifyPayload(patch.payload);
  }
  if (patch.description !== void 0) body.description = patch.description;
  if (patch.enable !== void 0) body.enable = patch.enable;
  return callForge(
    "UpdateHeartbeatJob",
    body,
    userSession
  );
}
async function deleteHeartbeatJob(taskUid, userSession) {
  await callForge("DeleteHeartbeatJob", { taskUid }, userSession);
}

// server/routers/study.ts
var resourceInput = z4.object({ resourceType: z4.enum(["herb", "formula", "classic", "chapter"]), resourceId: z4.number().int().positive() });
var goalInput = z4.object({ title: z4.string().trim().min(1).max(255), metric: z4.enum(["path_steps", "reading_entries", "study_notes"]), targetCount: z4.number().int().min(1).max(365), deadlineAt: z4.coerce.date().nullable().optional() });
var reminderInput = z4.object({ goalId: z4.number().int().positive().nullable().optional(), title: z4.string().trim().min(1).max(255), intervalDays: z4.number().int().min(1).max(60), hourLocal: z4.number().int().min(0).max(23) });
var getSessionToken = (cookieHeader) => parseCookie(cookieHeader ?? "")[COOKIE_NAME] ?? "";
var toUtcHour = (hourLocal) => (hourLocal + 16) % 24;
var dailyCron = (hourUtc) => `0 0 ${hourUtc} * * *`;
var studyRouter = router({
  desk: protectedProcedure.query(({ ctx }) => getStudyDesk(ctx.user.id)),
  overview: protectedProcedure.query(({ ctx }) => getLearningOverview(ctx.user.id)),
  paths: router({
    toggleStep: protectedProcedure.input(z4.object({ pathSlug: z4.enum(["gui-zhi-ying-wei", "fu-ling-shui-ye", "bai-zhu-zhong-jiao"]), step: z4.number().int().min(1).max(3) })).mutation(({ ctx, input }) => toggleLearningPathStep(ctx.user.id, input))
  }),
  goals: router({
    list: protectedProcedure.query(({ ctx }) => listLearningGoals(ctx.user.id)),
    create: protectedProcedure.input(goalInput).mutation(({ ctx, input }) => createLearningGoal(ctx.user.id, input)),
    update: protectedProcedure.input(goalInput.extend({ id: z4.number().int().positive() })).mutation(({ ctx, input }) => updateLearningGoal(ctx.user.id, input.id, input)),
    archive: protectedProcedure.input(z4.object({ id: z4.number().int().positive() })).mutation(({ ctx, input }) => archiveLearningGoal(ctx.user.id, input.id))
  }),
  reminders: router({
    list: protectedProcedure.query(({ ctx }) => listReviewReminders(ctx.user.id)),
    create: protectedProcedure.input(reminderInput).mutation(async ({ ctx, input }) => {
      const hourUtc = toUtcHour(input.hourLocal);
      const sessionToken = getSessionToken(ctx.req.headers.cookie);
      const reminder = await createReviewReminder(ctx.user.id, { ...input, hourUtc });
      try {
        const job = await createHeartbeatJob({ name: `tcm-review-${ctx.user.id}-${reminder.id}`, cron: dailyCron(hourUtc), path: "/api/scheduled/review-reminders", payload: { reminderId: reminder.id }, description: `\u5B8B\u523B\u4E66\u658B\u590D\u4E60\u63D0\u9192\uFF1A${input.title}` }, sessionToken);
        await attachReviewReminderSchedule(ctx.user.id, reminder.id, job.taskUid);
        return { ...reminder, taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt ?? null };
      } catch (error) {
        await deleteReviewReminder(ctx.user.id, reminder.id);
        throw error;
      }
    }),
    update: protectedProcedure.input(reminderInput.extend({ id: z4.number().int().positive(), enabled: z4.boolean() })).mutation(async ({ ctx, input }) => {
      const current = await getReviewReminder(ctx.user.id, input.id);
      if (!current) throw new Error("\u590D\u4E60\u63D0\u9192\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
      const hourUtc = toUtcHour(input.hourLocal);
      const sessionToken = getSessionToken(ctx.req.headers.cookie);
      if (current.scheduleCronTaskUid) await updateHeartbeatJob(current.scheduleCronTaskUid, { cron: dailyCron(hourUtc), enable: input.enabled, description: `\u5B8B\u523B\u4E66\u658B\u590D\u4E60\u63D0\u9192\uFF1A${input.title}` }, sessionToken);
      return updateReviewReminder(ctx.user.id, input.id, { ...input, hourUtc });
    }),
    delete: protectedProcedure.input(z4.object({ id: z4.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const current = await getReviewReminder(ctx.user.id, input.id);
      if (!current) throw new Error("\u590D\u4E60\u63D0\u9192\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE");
      if (current.scheduleCronTaskUid) await deleteHeartbeatJob(current.scheduleCronTaskUid, getSessionToken(ctx.req.headers.cookie));
      return deleteReviewReminder(ctx.user.id, input.id);
    }),
    markSeen: protectedProcedure.input(z4.object({ eventId: z4.number().int().positive() })).mutation(({ ctx, input }) => markReviewReminderSeen(ctx.user.id, input.eventId)),
    markAllSeen: protectedProcedure.mutation(({ ctx }) => markAllReviewRemindersSeen(ctx.user.id))
  }),
  notifications: router({
    list: protectedProcedure.input(z4.object({ status: z4.enum(["all", "unread", "read"]).default("all"), from: z4.coerce.date().optional(), to: z4.coerce.date().optional() }).optional()).query(({ ctx, input }) => listReviewNotifications(ctx.user.id, input ?? { status: "all" })),
    markAllSeen: protectedProcedure.mutation(({ ctx }) => markAllReviewRemindersSeen(ctx.user.id)),
    delete: protectedProcedure.input(z4.object({ eventIds: z4.array(z4.number().int().positive()).min(1).max(200) })).mutation(({ ctx, input }) => deleteReviewNotifications(ctx.user.id, input.eventIds))
  }),
  knowledge: router({
    list: protectedProcedure.input(z4.object({ query: z4.string().trim().max(80).optional() }).optional()).query(({ ctx, input }) => listKnowledgeDocuments(ctx.user.id, input?.query)),
    search: protectedProcedure.input(z4.object({ query: z4.string().trim().min(1).max(80) })).query(({ ctx, input }) => searchKnowledgeDocuments(ctx.user.id, input.query)),
    upload: protectedProcedure.input(z4.object({ fileName: z4.string().trim().min(1).max(255), mimeType: z4.enum(["text/plain", "text/markdown", "application/pdf"]), base64: z4.string().min(4).max(72e5) })).mutation(({ ctx, input }) => uploadKnowledgeDocument(ctx.user.id, input)),
    download: protectedProcedure.input(z4.object({ id: z4.number().int().positive() })).mutation(({ ctx, input }) => getKnowledgeDocumentDownload(ctx.user.id, input.id)),
    delete: protectedProcedure.input(z4.object({ id: z4.number().int().positive() })).mutation(({ ctx, input }) => deleteKnowledgeDocument(ctx.user.id, input.id))
  }),
  saved: router({
    list: protectedProcedure.query(({ ctx }) => listSavedItems(ctx.user.id)),
    toggle: protectedProcedure.input(resourceInput).mutation(({ ctx, input }) => toggleSavedItem(ctx.user.id, input))
  }),
  notes: router({
    list: protectedProcedure.input(resourceInput.partial().optional()).query(({ ctx, input }) => listStudyNotes(ctx.user.id, input)),
    create: protectedProcedure.input(resourceInput.extend({ title: z4.string().trim().min(1).max(255), body: z4.string().trim().min(1).max(1e4) })).mutation(({ ctx, input }) => createStudyNote(ctx.user.id, input)),
    update: protectedProcedure.input(z4.object({ id: z4.number().int().positive(), title: z4.string().trim().min(1).max(255), body: z4.string().trim().min(1).max(1e4) })).mutation(({ ctx, input }) => updateStudyNote(ctx.user.id, input)),
    delete: protectedProcedure.input(z4.object({ id: z4.number().int().positive() })).mutation(({ ctx, input }) => deleteStudyNote(ctx.user.id, input.id))
  }),
  progress: router({
    set: protectedProcedure.input(z4.object({ classicId: z4.number().int().positive(), chapterId: z4.number().int().positive().nullable().optional(), progressPercent: z4.number().int().min(0).max(100) })).mutation(({ ctx, input }) => setReadingProgress(ctx.user.id, input))
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  catalog: catalogRouter,
  aiStudy: aiStudyRouter,
  study: studyRouter
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/scheduled/reviewReminders.ts
async function handleReviewReminderSchedule(req, res) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await triggerReviewReminderByTaskUid(user.taskUid);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error), timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/app.ts
function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", async (_req, res) => {
    const databaseConfigured = Boolean(process.env.DATABASE_URL);
    let databaseReachable = null;
    let schemaInitialized = null;
    let schemaTableCount = null;
    let schemaMilestones = null;
    if (databaseConfigured) {
      try {
        const db = await getDb();
        if (db) {
          await db.execute(sql2`SELECT 1`);
          databaseReachable = true;
          const result = await db.execute(
            sql2`SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('users', 'herbs', 'knowledge_documents', 'classic_passage_versions')`
          );
          const firstResult = Array.isArray(result) ? result[0] : void 0;
          const row2 = Array.isArray(firstResult) ? firstResult[0] : firstResult;
          schemaTableCount = Number(row2?.tableCount ?? 0);
          schemaInitialized = schemaTableCount === 4;
          const milestoneResult = await db.execute(
            sql2`SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('content_sources', 'herbs', 'formulas', 'classics', 'classic_chapters', 'classic_passages', 'formula_passage_mappings', 'learning_path_progress', 'learning_goals', 'review_reminders', 'knowledge_documents', 'ai_study_conversations', 'ai_study_messages', 'ai_study_summaries', 'classic_passage_versions')`
          );
          const milestoneRows = Array.isArray(milestoneResult) ? milestoneResult[0] : [];
          const availableTables = new Set(
            (Array.isArray(milestoneRows) ? milestoneRows : []).map(
              (candidate) => String(candidate.tableName)
            )
          );
          const hasAll = (tableNames) => tableNames.every((tableName) => availableTables.has(tableName));
          schemaMilestones = {
            coreCatalog: hasAll(["content_sources", "herbs", "formulas", "classics", "classic_chapters"]),
            passageGraph: hasAll(["classic_passages", "formula_passage_mappings"]),
            studyTools: hasAll(["learning_path_progress", "learning_goals", "review_reminders"]),
            knowledgeBase: hasAll(["knowledge_documents", "ai_study_conversations", "ai_study_messages", "ai_study_summaries"]),
            editionComparison: hasAll(["classic_passage_versions"])
          };
        } else {
          databaseReachable = false;
        }
      } catch {
        console.warn("[Health] Database connectivity check failed");
        databaseReachable = false;
      }
    }
    res.status(200).json({
      ok: true,
      runtime: process.env.VERCEL ? "vercel" : "node",
      databaseConfigured,
      databaseReachable,
      schemaInitialized,
      schemaTableCount,
      schemaMilestones,
      oauthConfigured: Boolean(process.env.OAUTH_SERVER_URL && process.env.VITE_APP_ID),
      storageConfigured: Boolean(process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY)
    });
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/review-reminders", handleReviewReminderSchedule);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}

// server/vercelApi.ts
var vercelApi_default = createApp();
export {
  vercelApi_default as default
};
