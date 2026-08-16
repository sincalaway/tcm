import { passageCooccurrenceHints, passageSymptomLexicon } from "./passageLearningLexicon";

export type PassageMatrixFormula = {
  id: number;
  name: string;
  slug: string;
  relationType: string;
  studyNote: string | null;
};

export type PassageMatrixVersion = {
  editionLabel: string;
  sourceReference: string;
  sourceUrl: string;
};

export type PassageMatrixRecord = {
  id: number;
  chapterTitle: string;
  passageNumber: number;
  title: string;
  excerpt: string;
  keywords: string | null;
  sourceReference: string;
  sourceUrl: string;
  formulas: PassageMatrixFormula[];
  versions: PassageMatrixVersion[];
};

export type PassageMatrixCell = {
  primary: string;
  details: string[];
};

export type PassageMatrixRow = {
  id: "explicit" | "symptoms" | "cooccurrence" | "formulas" | "versions" | "source";
  label: string;
  description: string;
  cells: Array<{ passageId: number; cell: PassageMatrixCell }>;
};

function textOf(record: PassageMatrixRecord) {
  return `${record.title} ${record.excerpt} ${record.keywords ?? ""}`;
}

function exactTerms(record: PassageMatrixRecord) {
  const text = textOf(record);
  return passageSymptomLexicon
    .filter(entry => text.includes(entry.canonical))
    .map(entry => ({ group: entry.group, term: entry.canonical }));
}

function formulaCell(record: PassageMatrixRecord): PassageMatrixCell {
  if (!record.formulas.length) return { primary: "未收录关联方剂", details: ["可回到条文与原典继续核对"] };
  return { primary: record.formulas.map(item => item.name).join("、"), details: record.formulas.map(item => `${item.relationType}${item.studyNote ? `：${item.studyNote}` : ""}`) };
}

function versionCell(record: PassageMatrixRecord): PassageMatrixCell {
  if (!record.versions.length) return { primary: "未收录版本参照", details: ["版本差异需回到外部定本核对"] };
  return { primary: record.versions.map(item => item.editionLabel).join("、"), details: record.versions.map(item => item.sourceReference) };
}

/**
 * 矩阵只做已收录文本的横向展示。它不会把不同条文的词语拼接为临床结论，
 * 也不会认定条文属于某个个人的合病、并病、兼证或方证。
 */
export function buildPassageComparisonMatrix(records: PassageMatrixRecord[]) {
  const rows: PassageMatrixRow[] = [
    {
      id: "explicit",
      label: "合病／并病文字线索",
      description: "仅显示条文标题、摘录或关键词中实际出现的文字；未出现不表示不存在相关讨论。",
      cells: records.map(record => {
        const text = textOf(record);
        const labels = ["合病", "并病", "兼", "夹杂"].filter(term => text.includes(term));
        return { passageId: record.id, cell: labels.length ? { primary: labels.join("、"), details: ["文本中可见的标签词"] } : { primary: "未见明确标签", details: ["请结合章节与注释阅读"] } };
      }),
    },
    {
      id: "symptoms",
      label: "原典症状词组",
      description: "按照站内症状词库归类，展示在该条文标题、摘录或关键词中实际命中的原典词。",
      cells: records.map(record => {
        const entries = exactTerms(record);
        const grouped = new Map<string, string[]>();
        entries.forEach(entry => grouped.set(entry.group, [...(grouped.get(entry.group) ?? []), entry.term]));
        const details = Array.from(grouped.entries()).map(([group, terms]) => `${group}：${terms.join("、")}`);
        return { passageId: record.id, cell: details.length ? { primary: `${entries.length} 项词条命中`, details } : { primary: "未命中站内词库", details: ["仍可阅读完整摘录与原典"] } };
      }),
    },
    {
      id: "cooccurrence",
      label: "并见线索对读",
      description: "当一条文本命中同一提示组的两项或以上词时列出，作为回到原文对读的入口，不作证候判断。",
      cells: records.map(record => {
        const text = textOf(record);
        const hints = passageCooccurrenceHints.map(hint => ({ hint, terms: hint.terms.filter(term => text.includes(term)) })).filter(item => item.terms.length >= 2);
        return { passageId: record.id, cell: hints.length ? { primary: hints.map(item => item.hint.title).join("；"), details: hints.map(item => item.terms.join("、")) } : { primary: "无两项以上同组命中", details: ["不等于排除其他文本关联"] } };
      }),
    },
    { id: "formulas", label: "站内关联方剂", description: "显示当前目录维护的条文—方剂映射及其研读备注，非方证推荐。", cells: records.map(record => ({ passageId: record.id, cell: formulaCell(record) })) },
    { id: "versions", label: "版本参照", description: "显示已维护的版本参照标签；文本校勘仍应回到外部来源。", cells: records.map(record => ({ passageId: record.id, cell: versionCell(record) })) },
    { id: "source", label: "条文出处", description: "每列保留原有出处名称与链接，便于核对。", cells: records.map(record => ({ passageId: record.id, cell: { primary: record.sourceReference, details: [record.sourceUrl] } })) },
  ];
  return rows;
}
