import { index, int, mediumtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Public and editorial sources used to make every learning record traceable. */
export const contentSources = mysqlTable("content_sources", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  publisher: varchar("publisher", { length: 255 }),
  baseUrl: varchar("baseUrl", { length: 1024 }).notNull(),
  accessType: mysqlEnum("accessType", ["catalog", "api", "manual"]).notNull(),
  licenseNote: text("licenseNote"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Structured herb records maintained by the site editorial catalog. */
export const herbs = mysqlTable("herbs", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("herbs_name_idx").on(table.name),
  index("herbs_category_idx").on(table.category),
]);

/** Classical formula metadata with source-backed composition and study context. */
export const formulas = mysqlTable("formulas", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("formulas_name_idx").on(table.name),
  index("formulas_source_title_idx").on(table.sourceTitle),
]);

/** A classical work links its editorial metadata to a public primary-text source. */
export const classics = mysqlTable("classics", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("classics_title_idx").on(table.title)]);

/** Individually searchable chapters in a classical work. */
export const classicChapters = mysqlTable("classic_chapters", {
  id: int("id").autoincrement().primaryKey(),
  classicId: int("classicId").notNull(),
  sequence: int("sequence").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("classic_chapter_sequence_unique").on(table.classicId, table.sequence),
  index("classic_chapters_title_idx").on(table.title),
]);

/** A numbered primary-text passage within a chapter, kept separate from broad chapter navigation. */
export const classicPassages = mysqlTable("classic_passages", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("classic_passage_chapter_number_unique").on(table.chapterId, table.passageNumber),
  index("classic_passage_classic_idx").on(table.classicId, table.chapterId),
  index("classic_passage_title_idx").on(table.title),
]);

/** Exact editorial links between a formula and its supporting primary-text passages. */
export const formulaPassageMappings = mysqlTable("formula_passage_mappings", {
  id: int("id").autoincrement().primaryKey(),
  formulaId: int("formulaId").notNull(),
  passageId: int("passageId").notNull(),
  relationType: mysqlEnum("relationType", ["primary", "related"]).notNull().default("primary"),
  studyNote: text("studyNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("formula_passage_mapping_unique").on(table.formulaId, table.passageId),
  index("formula_passage_formula_idx").on(table.formulaId),
  index("formula_passage_passage_idx").on(table.passageId),
]);

/** A personal bookmark that can point to an herb, formula, work, or chapter. */
export const savedItems = mysqlTable("saved_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resourceType: mysqlEnum("resourceType", ["herb", "formula", "classic", "chapter"]).notNull(),
  resourceId: int("resourceId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("saved_item_unique").on(table.userId, table.resourceType, table.resourceId),
  index("saved_items_user_idx").on(table.userId, table.createdAt),
]);

/** A learner-owned study note, scoped to a single learning resource. */
export const studyNotes = mysqlTable("study_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resourceType: mysqlEnum("resourceType", ["herb", "formula", "classic", "chapter"]).notNull(),
  resourceId: int("resourceId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("study_notes_user_idx").on(table.userId, table.updatedAt),
  index("study_notes_resource_idx").on(table.resourceType, table.resourceId),
]);

/** Reading state is stored at classic/chapter granularity, with progress normalized to 0–100. */
export const readingProgress = mysqlTable("reading_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  classicId: int("classicId").notNull(),
  chapterId: int("chapterId"),
  progressPercent: int("progressPercent").notNull().default(0),
  lastReadAt: timestamp("lastReadAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("reading_progress_unique").on(table.userId, table.classicId),
  index("reading_progress_user_idx").on(table.userId, table.lastReadAt),
]);

/** Per-user completion state for editorial learning trails; completedSteps is a JSON array of 1-based step numbers. */
export const learningPathProgress = mysqlTable("learning_path_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pathSlug: varchar("pathSlug", { length: 96 }).notNull(),
  completedSteps: text("completedSteps").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("learning_path_progress_user_path_unique").on(table.userId, table.pathSlug),
  index("learning_path_progress_user_idx").on(table.userId, table.updatedAt),
]);

/** A learner-created target derived from real reading, note, or editorial-path progress. */
export const learningGoals = mysqlTable("learning_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  metric: mysqlEnum("metric", ["path_steps", "reading_entries", "study_notes"]).notNull(),
  targetCount: int("targetCount").notNull(),
  deadlineAt: timestamp("deadlineAt"),
  status: mysqlEnum("status", ["active", "completed", "archived"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("learning_goals_user_idx").on(table.userId, table.status, table.updatedAt),
]);

/** An end-user controlled in-app review reminder, driven by a platform-managed scheduled callback. */
export const reviewReminders = mysqlTable("review_reminders", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("review_reminder_schedule_uid_unique").on(table.scheduleCronTaskUid),
  index("review_reminders_user_idx").on(table.userId, table.enabled, table.nextReviewAt),
]);

/** A durable in-app reminder occurrence, allowing users to mark a scheduled review as seen. */
export const reviewReminderEvents = mysqlTable("review_reminder_events", {
  id: int("id").autoincrement().primaryKey(),
  reminderId: int("reminderId").notNull(),
  userId: int("userId").notNull(),
  dueAt: timestamp("dueAt").notNull(),
  seenAt: timestamp("seenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("review_reminder_event_due_unique").on(table.reminderId, table.dueAt),
  index("review_reminder_events_user_idx").on(table.userId, table.seenAt, table.dueAt),
]);

/** A learner-owned AI study thread; context is recorded on the messages rather than shared globally. */
export const aiStudyConversations = mysqlTable("ai_study_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  contextKind: mysqlEnum("contextKind", ["herb", "formula", "chapter"]).notNull(),
  contextTitle: varchar("contextTitle", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("ai_study_conversations_user_idx").on(table.userId, table.updatedAt),
  index("ai_study_conversations_context_idx").on(table.userId, table.contextKind, table.contextTitle),
]);

/** Persisted user/assistant turns; the server only forwards a short recent window to the model. */
export const aiStudyMessages = mysqlTable("ai_study_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("ai_study_messages_conversation_idx").on(table.conversationId, table.createdAt),
]);

/** One learner-controlled rolling study summary per conversation; source messages remain unchanged. */
export const aiStudySummaries = mysqlTable("ai_study_summaries", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  sourceMessageCount: int("sourceMessageCount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("ai_study_summary_conversation_unique").on(table.conversationId),
  index("ai_study_summaries_user_idx").on(table.userId, table.updatedAt),
]);

/** Learner-owned knowledge-base file metadata; bytes live exclusively in object storage. */
export const knowledgeDocuments = mysqlTable("knowledge_documents", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("knowledge_documents_user_idx").on(table.userId, table.updatedAt),
  index("knowledge_documents_title_idx").on(table.userId, table.title),
]);

export type Herb = typeof herbs.$inferSelect;
export type Formula = typeof formulas.$inferSelect;
export type Classic = typeof classics.$inferSelect;
export type ClassicChapter = typeof classicChapters.$inferSelect;
export type ClassicPassage = typeof classicPassages.$inferSelect;
export type FormulaPassageMapping = typeof formulaPassageMappings.$inferSelect;
export type SavedItem = typeof savedItems.$inferSelect;
export type StudyNote = typeof studyNotes.$inferSelect;
export type ReadingProgress = typeof readingProgress.$inferSelect;
export type LearningPathProgress = typeof learningPathProgress.$inferSelect;
export type LearningGoal = typeof learningGoals.$inferSelect;
export type ReviewReminder = typeof reviewReminders.$inferSelect;
export type ReviewReminderEvent = typeof reviewReminderEvents.$inferSelect;
export type AiStudyConversation = typeof aiStudyConversations.$inferSelect;
export type AiStudyMessage = typeof aiStudyMessages.$inferSelect;
export type AiStudySummary = typeof aiStudySummaries.$inferSelect;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
