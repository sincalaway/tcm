import { describe, expect, it } from "vitest";
import { CATALOG_SCHEMA_RECOVERY_STATEMENTS } from "./db";

describe("catalog schema recovery", () => {
  it("uses only idempotent, non-destructive DDL for the pending TiDB schema batches", () => {
    expect(CATALOG_SCHEMA_RECOVERY_STATEMENTS).toHaveLength(9);
    expect(CATALOG_SCHEMA_RECOVERY_STATEMENTS.join("\n")).toMatch(/CREATE TABLE IF NOT EXISTS `knowledge_documents`/);
    expect(CATALOG_SCHEMA_RECOVERY_STATEMENTS.join("\n")).toMatch(/CREATE TABLE IF NOT EXISTS `classic_passage_versions`/);
    expect(CATALOG_SCHEMA_RECOVERY_STATEMENTS.join("\n")).toMatch(/ADD COLUMN IF NOT EXISTS `textContent`/);
    expect(CATALOG_SCHEMA_RECOVERY_STATEMENTS.every((statement) => !/^\s*(DROP|DELETE|TRUNCATE|UPDATE|INSERT)\b/i.test(statement))).toBe(true);
  });
});
