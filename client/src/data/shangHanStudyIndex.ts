export type HerbPairingIndex = {
  herbName: string;
  companionNames: string[];
  formulaName: string;
  passageHint: string;
  studyFocus: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type ClassicStudyIndex = {
  herbName: string;
  scholar: string;
  work: string;
  era: string;
  focus: string;
  sourceLabel: string;
  sourceUrl: string;
};

const wikisourceClassifiedFormulas =
  "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96%E9%A1%9E%E6%96%B9";
const scholarsOverview = "http://www.cnpharm.com/c/2021-09-02/801756.shtml";
const decoctionStudy =
  "https://zyj.beijing.gov.cn/sy/wxxw/201912/t20191219_1323242.html";

/**
 * 配伍记录只承担“从药名回到方名与条文”的检索功能。
 * 它们不是处方、剂量或针对任何人的用药建议。
 */
export const herbPairingIndex: HerbPairingIndex[] = [
  {
    herbName: "桂枝",
    companionNames: ["白芍", "炙甘草", "生姜", "大枣"],
    formulaName: "桂枝汤",
    passageHint: "太阳中风条文",
    studyFocus: "以五味同现的方名结构，观察营卫、汗出与解肌的文本线索。",
    sourceLabel: "《伤寒论类方》·桂枝汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "桂枝",
    companionNames: ["麻黄", "杏仁", "炙甘草"],
    formulaName: "麻黄汤",
    passageHint: "太阳无汗而喘条文",
    studyFocus: "与桂枝汤对读时，留意药味增减和条文中“汗出／无汗”的表述差异。",
    sourceLabel: "《伤寒论类方》·麻黄汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "麻黄",
    companionNames: ["桂枝", "杏仁", "炙甘草"],
    formulaName: "麻黄汤",
    passageHint: "太阳无汗而喘条文",
    studyFocus: "以麻黄、桂枝、杏仁、甘草的固定组合定位类方入口。",
    sourceLabel: "《伤寒论类方》·麻黄汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "麻黄",
    companionNames: ["细辛", "附子"],
    formulaName: "麻黄附子细辛汤",
    passageHint: "少阴反发热条文",
    studyFocus: "作为少阴与太阳相关条文的方名检索组合，适合核对章节与药味。",
    sourceLabel: "《伤寒论类方》·麻黄汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "柴胡",
    companionNames: ["黄芩", "半夏", "人参", "生姜", "大枣"],
    formulaName: "小柴胡汤",
    passageHint: "少阳往来寒热条文",
    studyFocus: "以柴胡、黄芩为检索轴，回看少阳篇中方名、条文与加减结构。",
    sourceLabel: "《伤寒论类方》·柴胡汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "半夏",
    companionNames: ["黄芩", "黄连", "干姜", "人参", "炙甘草", "大枣"],
    formulaName: "半夏泻心汤",
    passageHint: "吐下后心下痞条文",
    studyFocus: "适合对读寒热药味并见的方名结构与误治后条文语境。",
    sourceLabel: "《伤寒论类方》·泻心汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "干姜",
    companionNames: ["附子", "炙甘草"],
    formulaName: "四逆汤",
    passageHint: "少阴脉沉条文",
    studyFocus: "以三味简方定位少阴篇，并和通脉四逆汤等方名作横向检索。",
    sourceLabel: "《伤寒论类方》·四逆汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "茯苓",
    companionNames: ["桂枝", "白术", "炙甘草"],
    formulaName: "苓桂术甘汤",
    passageHint: "痰饮相关条文",
    studyFocus: "用于比较茯苓在五苓散、真武汤和苓桂术甘汤中的组合位置。",
    sourceLabel: "《伤寒论类方》与《金匮要略》对读",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "栀子",
    companionNames: ["淡豆豉"],
    formulaName: "栀子豉汤",
    passageHint: "阳明心中懊憹条文",
    studyFocus: "按栀子汤类回读方名、条文与后世类方编排。",
    sourceLabel: "《伤寒论类方》·栀子汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "大黄",
    companionNames: ["厚朴", "枳实", "芒硝"],
    formulaName: "大承气汤",
    passageHint: "阳明潮热腹满条文",
    studyFocus: "通过承气汤类观察大承气、调胃承气和小承气的药味差异。",
    sourceLabel: "《伤寒论类方》·承气汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "五味子",
    companionNames: ["干姜", "细辛", "半夏"],
    formulaName: "小青龙汤",
    passageHint: "太阳心下有水气条文",
    studyFocus: "以小青龙汤加减条文回看方内同现药味与检索词。",
    sourceLabel: "《伤寒论类方》·麻黄汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "牡蛎",
    companionNames: ["柴胡", "桂枝", "干姜", "栝蒌根"],
    formulaName: "柴胡桂枝干姜汤",
    passageHint: "少阳兼水饮条文",
    studyFocus: "从方名进入少阳篇，核对牡蛎在不同方中的同现关系。",
    sourceLabel: "《伤寒论类方》·柴胡汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "蜀漆",
    companionNames: ["桂枝", "龙骨", "牡蛎"],
    formulaName: "桂枝去芍药加蜀漆龙骨牡蛎救逆汤",
    passageHint: "火劫后惊狂条文",
    studyFocus:
      "作为较少见药味，可直接定位方名与救逆类条文，不将文献索引转化为用药建议。",
    sourceLabel: "《伤寒论类方》·桂枝汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "瓜蒂",
    companionNames: ["赤小豆"],
    formulaName: "瓜蒂散",
    passageHint: "可吐篇方名",
    studyFocus: "以瓜蒂、赤小豆的成对出现建立古方索引入口。",
    sourceLabel: "《伤寒论》公开原文与类方索引",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "葶苈子",
    companionNames: ["大黄", "芒硝", "杏仁"],
    formulaName: "大陷胸丸",
    passageHint: "结胸相关方名",
    studyFocus:
      "作为大陷胸汤、丸之间的药味对读索引，关注剂型与方名层面的差异。",
    sourceLabel: "《伤寒论类方》·陷胸汤类",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "赤石脂",
    companionNames: ["干姜", "粳米"],
    formulaName: "桃花汤",
    passageHint: "少阴下利条文",
    studyFocus: "以赤石脂、干姜、粳米的固定组合回读少阴篇方名。",
    sourceLabel: "《伤寒论》公开原文索引",
    sourceUrl: wikisourceClassifiedFormulas,
  },
];

/**
 * “医家研读索引”只归纳公开资料所述的阅读路径，保留作品和来源入口，
 * 不把后世阐释视为原典定论或临床指令。
 */
export const classicStudyIndex: ClassicStudyIndex[] = [
  {
    herbName: "桂枝",
    scholar: "徐大椿",
    work: "《伤寒论类方》",
    era: "清",
    focus: "以桂枝汤类组织相关加减方，便于按类方回查药味与条文。",
    sourceLabel: "维基文库《伤寒论类方》",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "麻黄",
    scholar: "徐大椿",
    work: "《伤寒论类方》",
    era: "清",
    focus: "以麻黄汤类集中呈现麻黄汤、小青龙汤及相关方的文本编排。",
    sourceLabel: "维基文库《伤寒论类方》",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "麻黄",
    scholar: "现代煎法研究资料",
    work: "《伤寒论》药物煎法学习资料",
    era: "现代",
    focus: "将含麻黄方的先煎、去沫等记载作为方后文献阅读线索。",
    sourceLabel: "北京市中医药管理局转载资料",
    sourceUrl: decoctionStudy,
  },
  {
    herbName: "柴胡",
    scholar: "柯琴",
    work: "《伤寒来苏集》",
    era: "清",
    focus: "以方名与汤证组织条文，是回查小柴胡汤等类方的一条阅读路径。",
    sourceLabel: "伤寒学派代表医家概述",
    sourceUrl: scholarsOverview,
  },
  {
    herbName: "半夏",
    scholar: "徐大椿",
    work: "《伤寒论类方》",
    era: "清",
    focus: "可按泻心汤类回看半夏在寒热并见方名中的位置。",
    sourceLabel: "维基文库《伤寒论类方》",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "干姜",
    scholar: "尤怡",
    work: "《伤寒贯珠集》",
    era: "清",
    focus: "以治法统领病证的阅读路径，可与四逆、理中等方名交叉查找。",
    sourceLabel: "伤寒学派代表医家概述",
    sourceUrl: scholarsOverview,
  },
  {
    herbName: "大黄",
    scholar: "现代煎法研究资料",
    work: "《伤寒论》药物煎法学习资料",
    era: "现代",
    focus: "将承气汤与柴胡加龙骨牡蛎汤中大黄的后下记载作为方后文本线索。",
    sourceLabel: "北京市中医药管理局转载资料",
    sourceUrl: decoctionStudy,
  },
  {
    herbName: "甘草",
    scholar: "徐大椿",
    work: "《伤寒论类方》",
    era: "清",
    focus: "在桂枝、麻黄及泻心等类方中检索甘草的同现关系与方名增减。",
    sourceLabel: "维基文库《伤寒论类方》",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "牡蛎",
    scholar: "徐大椿",
    work: "《伤寒论类方》",
    era: "清",
    focus: "可由桂枝去芍药加蜀漆龙骨牡蛎救逆汤和柴胡类方进入对读。",
    sourceLabel: "维基文库《伤寒论类方》",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "蜀漆",
    scholar: "徐大椿",
    work: "《伤寒论类方》",
    era: "清",
    focus: "可从桂枝汤类中定位蜀漆、龙骨、牡蛎并见的方名与火劫条文。",
    sourceLabel: "维基文库《伤寒论类方》",
    sourceUrl: wikisourceClassifiedFormulas,
  },
  {
    herbName: "茯苓",
    scholar: "陈修园",
    work: "《伤寒论浅注》",
    era: "清",
    focus: "以分经审证的阅读方法检索五苓、真武等方名与章节线索。",
    sourceLabel: "伤寒学派代表医家概述",
    sourceUrl: scholarsOverview,
  },
  {
    herbName: "栀子",
    scholar: "徐大椿",
    work: "《伤寒论类方》",
    era: "清",
    focus: "以栀子汤类集中回看栀子、豆豉及其加减方的方名结构。",
    sourceLabel: "维基文库《伤寒论类方》",
    sourceUrl: wikisourceClassifiedFormulas,
  },
];

export function getHerbPairings(name: string) {
  return herbPairingIndex.filter(
    item => item.herbName === name || item.companionNames.includes(name)
  );
}

export function getClassicStudyNotes(name: string) {
  return classicStudyIndex.filter(item => item.herbName === name);
}
