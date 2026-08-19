import type { PassageMatrixRecord } from "./passageComparisonMatrix";

export type PassageGraphNode = {
  id: string;
  kind: "passage" | "formula";
  label: string;
  meta: string;
  passageId?: number;
  formulaSlug?: string;
};

export type PassageGraphLink = {
  id: string;
  source: string;
  target: string;
  relationType: string;
  studyNote: string | null;
};

export type PassageFormulaGraph = {
  nodes: PassageGraphNode[];
  links: PassageGraphLink[];
  notice: string;
};

/**
 * 图谱边完全来自站内维护的条文—方剂映射。它不从症状词、注家评析或
 * 多条文并列关系推断新的方证、处方或临床适用关系。
 */
export function buildPassageFormulaGraph(records: PassageMatrixRecord[]): PassageFormulaGraph {
  const passages: PassageGraphNode[] = records.map(record => ({
    id: `passage-${record.id}`,
    kind: "passage" as const,
    label: record.title,
    meta: `${record.chapterTitle} · 第${record.passageNumber}条`,
    passageId: record.id,
  }));
  const formulaMap = new Map<string, PassageGraphNode>();
  const links: PassageGraphLink[] = [];
  records.forEach(record => record.formulas.forEach(formula => {
    const formulaId = `formula-${formula.id}`;
    if (!formulaMap.has(formulaId)) formulaMap.set(formulaId, { id: formulaId, kind: "formula", label: formula.name, meta: "站内条文关联方剂", formulaSlug: formula.slug });
    links.push({ id: `${record.id}-${formula.id}-${formula.relationType}`, source: `passage-${record.id}`, target: formulaId, relationType: formula.relationType, studyNote: formula.studyNote });
  }));
  return {
    nodes: passages.concat(Array.from(formulaMap.values())),
    links,
    notice: links.length
      ? "连线仅表示站内目录已维护的条文—方剂学习映射；它不是方证判定、适应证、处方或用药建议。"
      : "当前所选条文未收录站内方剂映射，图谱不会根据关键词自动生成连线。",
  };
}
