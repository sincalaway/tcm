export type CommentarySource = {
  commentator: "成无己" | "方有执" | "柯琴";
  work: string;
  sourceUrl: string;
  sourceNote: string;
};

export const commentarySources: CommentarySource[] = [
  {
    commentator: "成无己",
    work: "《注解伤寒论》",
    sourceUrl: "https://zh.wikisource.org/zh-hans/%E6%B3%A8%E8%A7%A3%E5%82%B7%E5%AF%92%E8%AB%96",
    sourceNote: "公开页面标注校订不足；仅作原文回查入口。",
  },
  {
    commentator: "方有执",
    work: "《伤寒论条辨》",
    sourceUrl: "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96%E6%A2%9D%E8%BE%A8_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)",
    sourceNote: "以四库全书本为公开回查入口；摘要不替代逐字校勘。",
  },
  {
    commentator: "柯琴",
    work: "《伤寒论注》",
    sourceUrl: "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96%E6%B3%A8",
    sourceNote: "公开页面标注校订不足；只保留研读摘要与原文入口。",
  },
];

export type CommentaryPerspective = {
  commentator: CommentarySource["commentator"];
  label: string;
  methodSummary: string;
  source: CommentarySource;
};

export const commentaryPerspectives: CommentaryPerspective[] = [
  {
    commentator: "成无己",
    label: "合并辨与经义解释",
    methodSummary: "在太阳阳明合病相关注释中，区分“本太阳病不解，并于阳明”的并病与“二经俱受邪，相合病”的合病；此处仅作概念对读背景。",
    source: commentarySources[0],
  },
  {
    commentator: "方有执",
    label: "条辨与篇次审读",
    methodSummary: "以条文辨析、篇次与文义互证为研读入口。对同组条文可先比对前后次序、标题、限定语与异文参照，再作解释性阅读。",
    source: commentarySources[1],
  },
  {
    commentator: "柯琴",
    label: "以症类从与方证组织",
    methodSummary: "《伤寒论注》自述“以症为主”，将条文按症类组织并附带方剂线索。对同组条文可比较症候词与目录方剂映射，而不将映射当作适用结论。",
    source: commentarySources[2],
  },
];

export function commentaryPromptForText(text: string, commentator: CommentarySource["commentator"]) {
  const hasCombined = text.includes("合病") || text.includes("并病");
  const hasFormula = text.includes("汤") || text.includes("方") || text.includes("主之");
  if (commentator === "成无己") {
    return hasCombined
      ? "本条出现合病／并病文字，可将成氏合并辨定义作为背景对读；仍需核验其是否直接注释该条。"
      : "本条未出现合病／并病文字；不套用成氏合并辨定义，可仅比较其症候与上下条语境。";
  }
  if (commentator === "方有执") {
    return "以篇次、条文限定语和前后文互证为对读重心；本提示不声称方氏直接评注了当前条目。";
  }
  return hasFormula
    ? "可将本条的症候词与站内方剂映射并列阅读，作为柯氏“以症类从”方法的研读入口。"
    : "本条先按症候与章节定位阅读；未收录方剂映射不等于排除任何注家讨论。";
}
