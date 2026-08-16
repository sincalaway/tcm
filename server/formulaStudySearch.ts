export type FormulaStudyRecord = {
  id: number;
  name: string;
  aliases: string | null;
  sourceTitle: string;
  sourceExcerpt: string | null;
  ingredients: string;
  structuralNote: string | null;
  studyIndex: string | null;
};

export type FormulaStudyMatchMode = "all" | "any";

export type FormulaStudySearchResult<T extends FormulaStudyRecord> = T & {
  matchedTerms: string[];
  matchScore: number;
};

/**
 * 将学习者输入的药名、症候词或条文关键词拆分为去重的检索词。
 * 这不是诊断或处方工具；它只在维护的方名、药味与文本索引中定位记录。
 */
export function parseFormulaStudyTerms(input?: string) {
  if (!input) return [];
  return Array.from(
    new Set(
      input
        .split(/[\s,，、;；/\n]+/)
        .map(term => term.trim())
        .filter(Boolean)
    )
  ).slice(0, 8);
}

function normalized(value: string | null | undefined) {
  return value?.toLocaleLowerCase("zh-CN") ?? "";
}

function scoreTerm(record: FormulaStudyRecord, term: string) {
  const keyword = term.toLocaleLowerCase("zh-CN");
  const fields = [
    [record.name, 8],
    [record.aliases, 6],
    [record.ingredients, 5],
    [record.sourceExcerpt, 4],
    [record.studyIndex, 3],
    [record.structuralNote, 2],
    [record.sourceTitle, 1],
  ] as const;
  return fields.reduce(
    (score, [value, weight]) => (normalized(value).includes(keyword) ? score + weight : score),
    0
  );
}

export function searchFormulaStudyRecords<T extends FormulaStudyRecord>(
  records: T[],
  input: { query?: string; sourceTitle?: string; matchMode?: FormulaStudyMatchMode }
): FormulaStudySearchResult<T>[] {
  const terms = parseFormulaStudyTerms(input.query);
  const mode = input.matchMode ?? "all";

  return records
    .filter(record => !input.sourceTitle || record.sourceTitle === input.sourceTitle)
    .map(record => {
      const matchedTerms = terms.filter(term => scoreTerm(record, term) > 0);
      const matchScore = matchedTerms.reduce(
        (score, term) => score + scoreTerm(record, term),
        0
      );
      return { ...record, matchedTerms, matchScore };
    })
    .filter(result => {
      if (!terms.length) return true;
      return mode === "all"
        ? result.matchedTerms.length === terms.length
        : result.matchedTerms.length > 0;
    })
    .sort(
      (left, right) =>
        right.matchScore - left.matchScore || left.name.localeCompare(right.name, "zh-CN")
    );
}
