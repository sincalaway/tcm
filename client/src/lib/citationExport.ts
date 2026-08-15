export type CitationPassage = {
  passageNumber: number;
  title: string;
  sourceReference: string;
  sourceUrl: string;
};

export type CitationExportInput = {
  classicTitle: string;
  classicSlug: string;
  chapterTitle: string;
  origin: string;
  passages: CitationPassage[];
};

export const PRINT_HIDDEN_SELECTORS = [
  ".site-header",
  ".site-footer",
  ".page-masthead",
  ".catalog-controls",
  ".archive-spine",
  ".source-search",
  ".progress-actions",
  ".external-source",
  ".study-margin",
  ".ai-study-assistant",
  ".citation-actions",
  ".chapter-block",
] as const;

export function buildCitationHref(origin: string, classicSlug: string, chapterTitle: string, passageNumber: number) {
  return `${origin}/guji?classic=${encodeURIComponent(classicSlug)}&chapter=${encodeURIComponent(chapterTitle)}&passage=${passageNumber}`;
}

export function buildCitationFilename(classicTitle: string, chapterTitle: string) {
  return `${classicTitle}-${chapterTitle}-引用索引.md`;
}

export function buildChapterCitationMarkdown(input: CitationExportInput) {
  const lines = [`# 《${input.classicTitle}》｜${input.chapterTitle}`, ""];
  for (const passage of input.passages) {
    const href = buildCitationHref(input.origin, input.classicSlug, input.chapterTitle, passage.passageNumber);
    lines.push(`- 第${passage.passageNumber}条｜${passage.title}｜${passage.sourceReference}｜${href}`);
    lines.push(`  - 原典：${passage.sourceUrl}`);
  }
  return lines.join("\n");
}

export function triggerPrint(printFn: () => void) {
  printFn();
}
