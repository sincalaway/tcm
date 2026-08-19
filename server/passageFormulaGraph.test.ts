import { describe, expect, it } from "vitest";
import { buildPassageFormulaGraph } from "../shared/passageFormulaGraph";
import type { PassageMatrixRecord } from "../shared/passageComparisonMatrix";

const baseRecord: PassageMatrixRecord = {
  id: 1,
  chapterTitle: "辨太阳病脉证并治",
  passageNumber: 13,
  title: "葛根加半夏汤 · 太阳阳明合病",
  excerpt: "太阳与阳明合病，不下利，但呕者。",
  keywords: "合病、呕",
  sourceReference: "太阳病篇",
  sourceUrl: "https://example.test/passage",
  versions: [],
  formulas: [{ id: 8, name: "葛根加半夏汤", slug: "ge-gen-jia-ban-xia-tang", relationType: "primary", studyNote: "目录映射" }],
};

describe("passage formula graph", () => {
  it("creates graph edges only from maintained passage-formula mappings", () => {
    const graph = buildPassageFormulaGraph([baseRecord, { ...baseRecord, id: 2, title: "同方关联条文", passageNumber: 14 }]);
    expect(graph.nodes.filter(node => node.kind === "passage")).toHaveLength(2);
    expect(graph.nodes.filter(node => node.kind === "formula")).toHaveLength(1);
    expect(graph.links).toHaveLength(2);
    expect(graph.links.every(link => link.relationType === "primary")).toBe(true);
  });

  it("does not infer edges when a selected passage has no maintained formula mapping", () => {
    const graph = buildPassageFormulaGraph([{ ...baseRecord, formulas: [] }]);
    expect(graph.links).toHaveLength(0);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.notice).toContain("不会根据关键词自动生成连线");
  });
});
