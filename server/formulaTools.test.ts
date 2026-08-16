import { describe, expect, it } from "vitest";
import {
  convertAncientMeasure,
  formatConvertedValue,
} from "../client/src/lib/ancientMeasures";
import {
  buildStudyArchiveJson,
  buildStudyArchiveMarkdown,
} from "../client/src/lib/studyArchive";
import {
  parseFormulaStudyTerms,
  searchFormulaStudyRecords,
} from "./formulaStudySearch";

describe("formula study tools", () => {
  it("splits study terms and ranks formula records by structured text matches", () => {
    const records = [
      {
        id: 1,
        name: "桂枝汤",
        aliases: null,
        sourceTitle: "《伤寒论》",
        sourceExcerpt: "太阳中风，汗自出，恶风。",
        ingredients: '["桂枝","芍药","炙甘草"]',
        structuralNote: "营卫 · 汗出 · 恶风",
        studyIndex: "太阳中风",
      },
      {
        id: 2,
        name: "麻黄汤",
        aliases: null,
        sourceTitle: "《伤寒论》",
        sourceExcerpt: "太阳病，无汗而喘。",
        ingredients: '["麻黄","桂枝","杏仁"]',
        structuralNote: "太阳 · 无汗 · 喘",
        studyIndex: "太阳伤寒",
      },
    ];

    expect(parseFormulaStudyTerms("桂枝、汗出 桂枝")).toEqual(["桂枝", "汗出"]);
    expect(
      searchFormulaStudyRecords(records, {
        query: "桂枝 汗出",
        matchMode: "all",
      }).map(item => item.name)
    ).toEqual(["桂枝汤"]);
    expect(
      searchFormulaStudyRecords(records, {
        query: "汗出 无汗",
        matchMode: "any",
      })
    ).toHaveLength(2);
  });

  it("converts selected historical weight and volume standards without creating clinical recommendations", () => {
    expect(convertAncientMeasure(1, "liang", "han-13-75").value).toBe(13.75);
    expect(convertAncientMeasure(24, "zhu", "han-16").value).toBe(16);
    expect(convertAncientMeasure(1, "jin", "mingqing-3-75").value).toBe(60);
    expect(convertAncientMeasure(1, "sheng", "han-16")).toMatchObject({
      value: 200,
      unit: "mL",
    });
    expect(formatConvertedValue(13.75)).toBe("13.75");
  });

  it("exports only supplied personal study records to portable Markdown and JSON", () => {
    const archive = {
      exportedAt: new Date("2026-08-16T00:00:00.000Z"),
      saved: [
        {
          id: 1,
          resourceType: "formula",
          resourceId: 2,
          createdAt: new Date("2026-08-15T00:00:00.000Z"),
          resource: {
            title: "桂枝汤",
            subtitle: "《伤寒论》",
            kind: "经方",
            href: "/jingfang?q=%E6%A1%82%E6%9E%9D%E6%B1%A4",
          },
        },
      ],
      notes: [
        {
          id: 3,
          resourceType: "formula",
          resourceId: 2,
          title: "营卫对读",
          body: "保留待核对问题。",
          createdAt: new Date("2026-08-15T00:00:00.000Z"),
          updatedAt: new Date("2026-08-15T00:00:00.000Z"),
        },
      ],
      progress: [],
    };
    const markdown = buildStudyArchiveMarkdown(archive);
    const json = buildStudyArchiveJson(archive);

    expect(markdown).toContain("桂枝汤");
    expect(markdown).toContain("营卫对读");
    expect(json).toContain('"version": 1');
    expect(json).toContain("仅供个人研读整理");
  });
});
