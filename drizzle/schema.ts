import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

export type Herb = typeof herbs.$inferSelect;
export type Formula = typeof formulas.$inferSelect;
export type Classic = typeof classics.$inferSelect;
export type ClassicChapter = typeof classicChapters.$inferSelect;
export type SavedItem = typeof savedItems.$inferSelect;
export type StudyNote = typeof studyNotes.$inferSelect;
export type ReadingProgress = typeof readingProgress.$inferSelect;
export type LearningPathProgress = typeof learningPathProgress.$inferSelect;
