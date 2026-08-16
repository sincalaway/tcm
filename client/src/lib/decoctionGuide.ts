export type DecoctionGuideStage = {
  id: "check" | "predecoct" | "regular" | "late-add" | "serve";
  title: string;
  body: string;
  emphasis?: "attention" | "normal";
};

export type DecoctionStudyGuide = {
  ingredients: string[];
  predecoctionCandidates: string[];
  lateAdditionCandidates: string[];
  stages: DecoctionGuideStage[];
  notice: string;
  sources: Array<{ label: string; url: string }>;
};

const predecoctionTerms = [
  "附子",
  "川乌",
  "草乌",
  "乌头",
  "石膏",
  "龙骨",
  "牡蛎",
  "石决明",
  "磁石",
  "代赭石",
  "禹余粮",
  "赤石脂",
  "龟甲",
  "鳖甲",
];

const lateAdditionTerms = [
  "薄荷",
  "藿香",
  "佩兰",
  "砂仁",
  "白豆蔻",
  "豆蔻",
  "沉香",
  "青蒿",
  "钩藤",
  "番泻叶",
];

const sources = [
  {
    label: "北京市卫生健康委员会：中药该怎么煎？",
    url: "https://wjw.beijing.gov.cn/bmfw_20143/jkzs/jksh/202307/t20230727_3208581.html",
  },
  {
    label: "北京中医医院怀柔医院：中药是不是煎煮时间越长越好？",
    url: "http://wjw.beijing.gov.cn/bmfw_20143/jkzs/jksh/202107/t20210712_2434439.html",
  },
];

/** 将药名文本拆为供学习索引使用的规范化、去重药味列表。 */
export function parseDecoctionIngredients(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[\s,，、;；/\n]+/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 40);
}

function resolveCandidates(ingredients: string[], terms: string[]) {
  return ingredients.filter(ingredient =>
    terms.some(term => ingredient.includes(term) || term.includes(ingredient))
  );
}

/**
 * 生成公开煎煮资料的学习性核对清单。
 * 处方、药房另包标签和执业医师/药师交代优先于任何自动识别结果。
 */
export function generateDecoctionStudyGuide(input: string): DecoctionStudyGuide {
  const ingredients = parseDecoctionIngredients(input);
  const predecoctionCandidates = resolveCandidates(ingredients, predecoctionTerms);
  const lateAdditionCandidates = resolveCandidates(ingredients, lateAdditionTerms);
  const stages: DecoctionGuideStage[] = [
    {
      id: "check",
      title: "先核对处方与药房标签",
      body: "逐味核对饮片名称、炮制规格、另包说明及医嘱；自动识别结果不能替代处方中的“先煎、后下、包煎、烊化、冲服或另煎”标注。",
      emphasis: "attention",
    },
  ];

  if (predecoctionCandidates.length) {
    stages.push({
      id: "predecoct",
      title: "候选“先煎”核对项",
      body: `检测到 ${predecoctionCandidates.join("、")}。公开资料将部分矿物、贝壳、甲壳及特定药材列为应核对“先煎”标注的类别；仅在处方或药房明确标注时，才按标注的起始顺序和时长处理。`,
      emphasis: "attention",
    });
  }

  stages.push({
    id: "regular",
    title: "常规煎煮流程学习提示",
    body: "在已完成处方标注核对的前提下，公开科普通常描述为：以武火使药液煮沸，再转文火维持微沸。加水量、浸泡、煎次、每煎时间与药液分装均应以处方、药房交代或执业中医师/药师的具体说明为准。",
  });

  if (lateAdditionCandidates.length) {
    stages.push({
      id: "late-add",
      title: "候选“后下”核对项",
      body: `检测到 ${lateAdditionCandidates.join("、")}。公开资料将部分芳香、挥发性或久煎可能影响成分的药材列为应核对“后下”标注的类别；仅在处方或药房明确标注时，于指定阶段加入。`,
      emphasis: "attention",
    });
  }

  stages.push({
    id: "serve",
    title: "煎后处理与服用核对",
    body: "将每煎药液是否合并、分次、服用时点和保存方式均以药房标签与医嘱为准。若处方信息不完整、饮片来源不明或存在任何疑问，应先咨询开方医师或中药师。",
    emphasis: "attention",
  });

  return {
    ingredients,
    predecoctionCandidates,
    lateAdditionCandidates,
    stages,
    notice:
      "此结果是根据药名生成的公开资料学习清单，不构成对任何复方的煎煮或服用决定；未识别到候选项并不表示该方没有特殊煎法。",
    sources,
  };
}
