/**
 * 宋刻书斋：内容数据以简明、可追溯的学习索引为原则；不提供诊断或处方建议。
 */
export type Herb = {
  id: string;
  name: string;
  pinyin: string;
  category: string;
  nature: string;
  taste: string;
  meridians: string;
  part: string;
  note: string;
  index: string;
};

export type Formula = {
  id: string;
  name: string;
  source: string;
  origin: string;
  ingredients: string[];
  structure: string;
  note: string;
  index: string;
};

export type Classic = {
  id: string;
  title: string;
  era: string;
  author: string;
  category: string;
  chapters: string[];
  summary: string;
  passage: string;
  sourceUrl: string;
};

export const herbs: Herb[] = [
  {
    id: "huang-qi",
    name: "黄芪",
    pinyin: "Huáng Qí",
    category: "补虚药",
    nature: "微温",
    taste: "甘",
    meridians: "脾、肺经",
    part: "根",
    note: "以豆科植物黄芪的根为常见药用部位；本页呈现传统本草的学习索引。",
    index: "补气、固表、利水、托毒、生肌",
  },
  {
    id: "gui-zhi",
    name: "桂枝",
    pinyin: "Guì Zhī",
    category: "解表药",
    nature: "温",
    taste: "辛、甘",
    meridians: "心、肺、膀胱经",
    part: "嫩枝",
    note: "桂枝在经方学习中常作为理解营卫、表里与配伍关系的切入药味。",
    index: "发汗解肌、温通经脉、助阳化气",
  },
  {
    id: "bai-shao",
    name: "白芍",
    pinyin: "Bái Sháo",
    category: "补血药",
    nature: "微寒",
    taste: "苦、酸",
    meridians: "肝、脾经",
    part: "根",
    note: "白芍与桂枝并见时，适合用于练习经方中“调和营卫”的配伍观察。",
    index: "养血调经、敛阴止汗、柔肝止痛、平抑肝阳",
  },
  {
    id: "gan-cao",
    name: "甘草",
    pinyin: "Gān Cǎo",
    category: "补虚药",
    nature: "平",
    taste: "甘",
    meridians: "心、肺、脾、胃经",
    part: "根及根茎",
    note: "在方剂结构中常被用于观察调和诸药、缓急等不同角色；具体用法应由专业人员判断。",
    index: "补脾益气、祛痰止咳、缓急止痛、调和诸药",
  },
  {
    id: "chai-hu",
    name: "柴胡",
    pinyin: "Chái Hú",
    category: "解表药",
    nature: "微寒",
    taste: "苦、辛",
    meridians: "肝、胆、肺经",
    part: "根",
    note: "柴胡是学习少阳相关方证时的常见索引药味，可结合《伤寒论》章节追读。",
    index: "解表退热、疏肝解郁、升举阳气",
  },
  {
    id: "fu-ling",
    name: "茯苓",
    pinyin: "Fú Líng",
    category: "利水渗湿药",
    nature: "平",
    taste: "甘、淡",
    meridians: "心、肺、脾、肾经",
    part: "菌核",
    note: "可与五苓散、苓桂术甘汤等条目交叉阅读，练习识别不同方中的角色变化。",
    index: "利水渗湿、健脾、宁心",
  },
];

export const formulas: Formula[] = [
  {
    id: "gui-zhi-tang",
    name: "桂枝汤",
    source: "《伤寒论》",
    origin: "太阳中风，阳浮而阴弱……桂枝汤主之。",
    ingredients: ["桂枝", "芍药", "炙甘草", "生姜", "大枣"],
    structure: "以桂枝、芍药为主轴，佐以生姜、大枣、炙甘草，常作为研习营卫关系的入门方。",
    note: "本条为经方文献学习索引，不等同于个人用药建议或处方。",
    index: "营卫 · 汗出 · 恶风 · 脉浮缓",
  },
  {
    id: "xiao-chai-hu-tang",
    name: "小柴胡汤",
    source: "《伤寒论》",
    origin: "伤寒五六日，中风，往来寒热……小柴胡汤主之。",
    ingredients: ["柴胡", "黄芩", "人参", "炙甘草", "半夏", "生姜", "大枣"],
    structure: "以柴胡、黄芩为主，配合扶正、和胃药味，是理解少阳枢机与方证条文的常用索引。",
    note: "原文的疾病术语和计量体系具有历史语境，应结合合格专业人员或正规课程辨析。",
    index: "少阳 · 往来寒热 · 胸胁苦满",
  },
  {
    id: "si-jun-zi-tang",
    name: "四君子汤",
    source: "《太平惠民和剂局方》",
    origin: "人参、白术、茯苓、炙甘草四味，常用于学习补益类方剂的基本构成。",
    ingredients: ["人参", "白术", "茯苓", "炙甘草"],
    structure: "四味药结构清晰，适合用于观察补益药、健脾药与调和药在方中所承担的不同位置。",
    note: "本页不提供适应证判断、剂量或煎服指导。",
    index: "补气 · 健脾 · 基础方结构",
  },
  {
    id: "wu-ling-san",
    name: "五苓散",
    source: "《伤寒论》",
    origin: "太阳病，发汗后，大汗出，胃中干……五苓散主之。",
    ingredients: ["泽泻", "猪苓", "茯苓", "白术", "桂枝"],
    structure: "以泽泻为主，配猪苓、茯苓、白术与桂枝，可作为理解水液代谢相关方义的研读案例。",
    note: "“水液代谢”等为传统医学学习用语，不应据此自行处理症状。",
    index: "蓄水 · 小便不利 · 水逆",
  },
  {
    id: "li-zhong-wan",
    name: "理中丸",
    source: "《伤寒论》",
    origin: "霍乱，头痛发热，身疼痛，热多欲饮水者，五苓散主之……寒多不用水者，理中丸主之。",
    ingredients: ["人参", "干姜", "白术", "炙甘草"],
    structure: "人参、白术、炙甘草与干姜组合，可与四君子汤并读，观察药味增减带来的方义线索。",
    note: "含有传统本草配伍信息，实际使用需考虑禁忌、炮制和个体情况。",
    index: "中焦 · 虚寒 · 结构对读",
  },
];

export const classics: Classic[] = [
  {
    id: "shang-han-lun",
    title: "伤寒论",
    era: "东汉",
    author: "张仲景",
    category: "外感与方证",
    chapters: ["辨太阳病脉证并治", "辨少阳病脉证并治", "辨阳明病脉证并治"],
    summary: "以六经辨证条文和方剂条文构成学习主线，是经方研读的重要典籍之一。",
    passage: "太阳中风，阳浮而阴弱，阳浮者，热自发；阴弱者，汗自出；啬啬恶寒，淅淅恶风，翕翕发热，鼻鸣干呕者，桂枝汤主之。",
    sourceUrl: "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96",
  },
  {
    id: "jin-gui-yao-lue",
    title: "金匮要略",
    era: "东汉",
    author: "张仲景",
    category: "杂病与方论",
    chapters: ["脏腑经络先后病脉证", "血痹虚劳病脉证并治", "痰饮咳嗽病脉证并治"],
    summary: "聚焦杂病脉证、治法与方药，为经方中的杂病研读提供重要文本线索。",
    passage: "问曰：上工治未病，何也？师曰：夫治未病者，见肝之病，知肝传脾，当先实脾。",
    sourceUrl: "https://zh.wikisource.org/wiki/%E9%87%91%E5%8C%B1%E8%A6%81%E7%95%A5",
  },
  {
    id: "shen-nong-ben-cao",
    title: "神农本草经",
    era: "汉代传本",
    author: "托名神农，历代辑佚",
    category: "本草学",
    chapters: ["上品", "中品", "下品"],
    summary: "以药物品类与传统药性认识为阅读线索，是理解本草分类和历史文献表达的重要入口。",
    passage: "药有君臣佐使，以相宣摄合和，宜用一君二臣，制之者也。",
    sourceUrl: "https://zh.wikisource.org/wiki/%E7%A5%9E%E8%BE%B2%E6%9C%AC%E8%8D%89%E7%BB%8F",
  },
  {
    id: "ben-cao-gang-mu",
    title: "本草纲目",
    era: "明代",
    author: "李时珍",
    category: "本草与博物",
    chapters: ["草部", "木部", "果部"],
    summary: "以广泛的物类编排、释名与引文呈现本草知识的历史积累，适合与现代药典目录对照学习。",
    passage: "本草之名，始见于《汉书·平帝纪》；其书，后世传述，日以繁广。",
    sourceUrl: "https://zh.wikisource.org/wiki/%E6%9C%AC%E8%8D%89%E7%B6%B1%E7%9B%AE",
  },
];

export const officialPharmacopoeiaUrl = "https://ydz.chp.org.cn/";

