export type PassageLearningRecord = {
  id: number;
  chapterId: number;
  chapterTitle: string;
  passageNumber: number;
  title: string;
  excerpt: string;
  keywords: string | null;
  sourceReference: string;
  sourceUrl: string;
};

export type PassageLearningMatch = PassageLearningRecord & {
  matchedTerms: string[];
  score: number;
};

export type PassageLearningPerspective =
  | "all"
  | "cold-heat"
  | "sweat-fluid"
  | "digestive"
  | "sleep-emotion";

export const passageLearningPerspectives: Array<{
  id: PassageLearningPerspective;
  label: string;
  helper: string;
  terms: string[];
}> = [
  { id: "all", label: "不预设角度", helper: "仅按输入的条文关键词检索。", terms: [] },
  { id: "cold-heat", label: "寒热感受观察", helper: "扩展“恶寒、发热、寒热”等条文索引词。", terms: ["恶寒", "发热", "寒热"] },
  { id: "sweat-fluid", label: "汗出与津液观察", helper: "扩展“汗出、无汗、口渴、小便”等条文索引词。", terms: ["汗出", "无汗", "口渴", "小便"] },
  { id: "digestive", label: "饮食与腹部观察", helper: "扩展“腹满、不能食、呕、下利”等条文索引词。", terms: ["腹满", "不能食", "呕", "下利"] },
  { id: "sleep-emotion", label: "睡眠与情志观察", helper: "扩展“烦、不得眠、惊悸”等条文索引词。", terms: ["烦", "不得眠", "惊悸"] },
];

export function parsePassageLearningTerms(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,，、;；/\n]+/)
        .map(term => term.trim())
        .filter(Boolean)
    )
  ).slice(0, 12);
}

function getPerspectiveTerms(perspective: PassageLearningPerspective) {
  return passageLearningPerspectives.find(item => item.id === perspective)?.terms ?? [];
}

/**
 * 以站内维护的标题、摘录与关键词字段作可解释的条文学习排序。
 * 不作体质判定、疾病诊断、经方推荐或服药建议。
 */
export function matchPassageLearningRecords(
  records: PassageLearningRecord[],
  input: { query?: string; perspective?: PassageLearningPerspective; matchMode?: "all" | "any" }
): PassageLearningMatch[] {
  const queryTerms = parsePassageLearningTerms(input.query ?? "");
  const perspectiveTerms = getPerspectiveTerms(input.perspective ?? "all");
  const terms = Array.from(new Set(queryTerms.concat(perspectiveTerms)));
  if (!terms.length) return [];
  const matchMode = input.matchMode ?? "any";

  return records
    .map(record => {
      const titleText = `${record.title} ${record.chapterTitle}`;
      const keywordText = record.keywords ?? "";
      const excerptText = record.excerpt;
      const matchedTerms = terms.filter(term =>
        titleText.includes(term) || keywordText.includes(term) || excerptText.includes(term)
      );
      const eligible = matchMode === "all" ? matchedTerms.length === terms.length : matchedTerms.length > 0;
      if (!eligible) return null;
      const score = matchedTerms.reduce((total, term) => {
        if (keywordText.includes(term)) return total + 5;
        if (titleText.includes(term)) return total + 3;
        return total + 1;
      }, 0);
      return { ...record, matchedTerms, score };
    })
    .filter((record): record is PassageLearningMatch => Boolean(record))
    .sort((a, b) => b.score - a.score || a.chapterTitle.localeCompare(b.chapterTitle, "zh-CN") || a.passageNumber - b.passageNumber);
}
