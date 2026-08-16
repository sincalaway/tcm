import { expandPassageLearningTerms } from "@shared/passageLearningLexicon";

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
  | "sleep-emotion"
  | "head-body"
  | "chest-breathing"
  | "limbs";

export const passageLearningPerspectives: Array<{
  id: PassageLearningPerspective;
  label: string;
  helper: string;
  terms: string[];
}> = [
  { id: "all", label: "不预设角度", helper: "仅按输入的条文关键词检索。", terms: [] },
  { id: "cold-heat", label: "寒热感受观察", helper: "扩展“恶寒、发热、潮热”等条文索引词。", terms: ["恶寒", "发热", "潮热"] },
  { id: "sweat-fluid", label: "汗出与津液观察", helper: "扩展“汗出、无汗、口渴、小便不利”等条文索引词。", terms: ["汗出", "无汗", "口渴", "小便不利"] },
  { id: "digestive", label: "饮食与腹部观察", helper: "扩展“腹满、不能食、呕、下利、大便硬”等条文索引词。", terms: ["腹满", "不能食", "不欲食", "呕", "下利", "大便硬"] },
  { id: "sleep-emotion", label: "睡眠与情志观察", helper: "扩展“心烦、不得眠、惊悸”等条文索引词。", terms: ["心烦", "不得眠", "惊悸"] },
  { id: "head-body", label: "头身与表证观察", helper: "扩展“头痛、项强、身疼痛”等条文索引词。", terms: ["头痛", "项强", "身疼痛"] },
  { id: "chest-breathing", label: "胸胁与呼吸观察", helper: "扩展“胸胁满、喘、咳”等条文索引词。", terms: ["胸胁满", "喘", "咳"] },
  { id: "limbs", label: "四肢与寒热观察", helper: "扩展“四逆、身重”等条文索引词。", terms: ["四逆", "身重"] },
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
  const termMappings = expandPassageLearningTerms(queryTerms.concat(perspectiveTerms));
  const terms = Array.from(new Set(termMappings.map(item => item.canonical)));
  if (!terms.length) return [];
  const matchMode = input.matchMode ?? "any";

  return records
    .map(record => {
      const titleText = `${record.title} ${record.chapterTitle}`;
      const keywordText = record.keywords ?? "";
      const excerptText = record.excerpt;
      const matchedCanonicalTerms = terms.filter(term =>
        titleText.includes(term) || keywordText.includes(term) || excerptText.includes(term)
      );
      const eligible = matchMode === "all" ? matchedCanonicalTerms.length === terms.length : matchedCanonicalTerms.length > 0;
      if (!eligible) return null;
      const matchedTerms = termMappings
        .filter(item => matchedCanonicalTerms.includes(item.canonical))
        .map(item => item.input === item.canonical ? item.canonical : `${item.input}（检索为${item.canonical}）`);
      const score = matchedCanonicalTerms.reduce((total, term) => {
        if (keywordText.includes(term)) return total + 5;
        if (titleText.includes(term)) return total + 3;
        return total + 1;
      }, 0);
      return { ...record, matchedTerms, score };
    })
    .filter((record): record is PassageLearningMatch => Boolean(record))
    .sort((a, b) => b.score - a.score || a.chapterTitle.localeCompare(b.chapterTitle, "zh-CN") || a.passageNumber - b.passageNumber);
}
