import { describe, expect, it } from "vitest";
import { buildPassageComparisonMatrix, type PassageMatrixRecord } from "../shared/passageComparisonMatrix";

describe("passage comparison matrix", () => {
  const records: PassageMatrixRecord[] = [
    {
      id: 11,
      chapterTitle: "辨太阳病脉证并治",
      passageNumber: 32,
      title: "太阳阳明合病 · 自下利",
      excerpt: "太阳与阳明合病者，必自下利。",
      keywords: "合病、下利、发热、恶寒",
      sourceReference: "《伤寒论》·太阳篇第32条",
      sourceUrl: "https://example.test/32",
      formulas: [{ id: 1, name: "葛根汤", slug: "ge-gen-tang", relationType: "primary", studyNote: "目录关联" }],
      versions: [{ editionLabel: "宋本", sourceReference: "宋本参照", sourceUrl: "https://example.test/song" }],
    },
    {
      id: 22,
      chapterTitle: "辨少阳病脉证并治",
      passageNumber: 7,
      title: "胸胁满而呕",
      excerpt: "往来寒热，胸胁苦满，心烦喜呕。",
      keywords: "往来寒热、胸胁满、心烦、呕",
      sourceReference: "《伤寒论》·少阳篇第7条",
      sourceUrl: "https://example.test/7",
      formulas: [],
      versions: [],
    },
  ];

  it("keeps selected records as separate columns and exposes only textual comparison evidence", () => {
    const matrix = buildPassageComparisonMatrix(records);
    expect(matrix).toHaveLength(6);
    expect(matrix[0].cells.map(item => item.passageId)).toEqual([11, 22]);
    expect(matrix[0].cells[0].cell.primary).toBe("合病");
    expect(matrix[0].cells[1].cell.primary).toBe("未见明确标签");
    expect(matrix.find(row => row.id === "formulas")?.cells[0].cell.primary).toBe("葛根汤");
    expect(matrix.find(row => row.id === "formulas")?.cells[1].cell.primary).toBe("未收录关联方剂");
  });

  it("surfaces co-occurrence prompts only when at least two source terms appear in one text", () => {
    const matrix = buildPassageComparisonMatrix(records);
    const cells = matrix.find(row => row.id === "cooccurrence")?.cells ?? [];
    expect(cells.find(item => item.passageId === 11)?.cell.primary).toContain("汗出与寒热感受并见");
    expect(cells.find(item => item.passageId === 22)?.cell.primary).toContain("往来寒热与胸胁／呕并见");
  });
});
