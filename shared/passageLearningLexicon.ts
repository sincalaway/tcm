export type PassageSymptomLexiconEntry = {
  canonical: string;
  aliases: string[];
  group: string;
};

/**
 * 现代口语检索词到站内《伤寒论》索引词的学习性映射。
 * 它不代表症状等价、体质判定、疾病诊断、方证识别或用药建议。
 */
export const passageSymptomLexicon: PassageSymptomLexiconEntry[] = [
  { canonical: "恶寒", aliases: ["怕冷", "畏寒", "发冷", "寒战"], group: "寒热感受" },
  { canonical: "恶风", aliases: ["怕风", "怕吹风", "风吹不适"], group: "寒热感受" },
  { canonical: "发热", aliases: ["发烧", "身热", "热感"], group: "寒热感受" },
  { canonical: "潮热", aliases: ["午后发热", "定时发热"], group: "寒热感受" },
  { canonical: "汗出", aliases: ["出汗", "自汗", "容易出汗"], group: "汗出与津液" },
  { canonical: "无汗", aliases: ["不出汗", "汗少"], group: "汗出与津液" },
  { canonical: "口渴", aliases: ["口干", "口燥", "想喝水"], group: "汗出与津液" },
  { canonical: "小便不利", aliases: ["尿少", "小便少", "排尿不畅"], group: "汗出与津液" },
  { canonical: "头痛", aliases: ["头疼", "头部疼痛"], group: "头身与表证" },
  { canonical: "项强", aliases: ["颈项强", "脖子僵", "颈部僵硬"], group: "头身与表证" },
  { canonical: "身疼痛", aliases: ["全身痛", "肌肉酸痛", "关节痛"], group: "头身与表证" },
  { canonical: "喘", aliases: ["气喘", "喘促", "呼吸急"], group: "呼吸与胸胁" },
  { canonical: "咳", aliases: ["咳嗽"], group: "呼吸与胸胁" },
  { canonical: "胸胁满", aliases: ["胸胁胀", "胁下胀", "胸闷"], group: "呼吸与胸胁" },
  { canonical: "心下痞", aliases: ["心下满", "胃脘堵", "胃脘痞满"], group: "饮食与腹部" },
  { canonical: "腹满", aliases: ["腹胀", "肚子胀"], group: "饮食与腹部" },
  { canonical: "腹痛", aliases: ["肚子痛", "腹部疼痛"], group: "饮食与腹部" },
  { canonical: "不能食", aliases: ["吃不下", "食欲差"], group: "饮食与腹部" },
  { canonical: "不欲食", aliases: ["不想吃", "没胃口", "不思饮食"], group: "饮食与腹部" },
  { canonical: "呕", aliases: ["恶心", "干呕", "呕吐"], group: "饮食与腹部" },
  { canonical: "下利", aliases: ["腹泻", "泄泻", "大便稀"], group: "饮食与腹部" },
  { canonical: "大便硬", aliases: ["便秘", "大便干", "排便困难"], group: "饮食与腹部" },
  { canonical: "口苦", aliases: ["嘴苦", "口中发苦"], group: "口咽与感官" },
  { canonical: "咽干", aliases: ["嗓子干", "咽喉干"], group: "口咽与感官" },
  { canonical: "目眩", aliases: ["头晕", "眩晕"], group: "口咽与感官" },
  { canonical: "心烦", aliases: ["烦躁", "心里烦"], group: "睡眠与情志" },
  { canonical: "不得眠", aliases: ["失眠", "睡不着", "难入睡"], group: "睡眠与情志" },
  { canonical: "惊悸", aliases: ["心慌", "心悸", "心跳不安"], group: "睡眠与情志" },
  { canonical: "四逆", aliases: ["手足冷", "四肢冷", "手脚冰凉"], group: "四肢与寒热" },
  { canonical: "身重", aliases: ["身体沉重", "身子发沉"], group: "四肢与寒热" },
];

export type PassageCooccurrenceHint = {
  id: string;
  title: string;
  terms: string[];
  prompt: string;
};

/**
 * 供学习者回到原文逐项核对的“并见线索”，不用于判定合病、并病、传经或其他临床结论。
 */
export const passageCooccurrenceHints: PassageCooccurrenceHint[] = [
  { id: "surface-sweat", title: "汗出与寒热感受并见", terms: ["汗出", "恶风", "恶寒", "发热"], prompt: "可回看条文中汗出、恶风／恶寒、发热是否同时出现，并继续核对上下文；不能由此单独判定证候。" },
  { id: "surface-no-sweat", title: "无汗与身痛／喘并见", terms: ["无汗", "身疼痛", "喘", "发热"], prompt: "可逐项核对无汗、身痛、喘与发热在原文中的位置和限定语，不将关键词组合直接等同于方证。" },
  { id: "shaoyang-terms", title: "往来寒热与胸胁／呕并见", terms: ["往来寒热", "胸胁满", "呕", "口苦"], prompt: "可查看相关条文是否还含口苦、咽干、目眩等索引词；这只是并列阅读提示，不构成少阳或合病判定。" },
  { id: "fluid-terms", title: "口渴与小便线索并见", terms: ["口渴", "小便不利", "汗出", "无汗"], prompt: "可对读原文中口渴、小便与汗出状态的搭配；不同条文与版本的语境不可自动合并解释。" },
  { id: "digestive-terms", title: "腹满与饮食／二便线索并见", terms: ["腹满", "呕", "下利", "大便硬"], prompt: "可在原典中观察腹满与呕、下利或大便状态的并列描述；不以此代替病因或病性鉴别。" },
  { id: "sleep-terms", title: "烦与睡眠线索并见", terms: ["心烦", "不得眠", "口渴", "汗出"], prompt: "可回到对应条文查看烦、不得眠与津液线索是否同现；不将其用于情绪或体质判断。" },
  { id: "cold-lower", title: "四肢冷与腹部线索并见", terms: ["四逆", "下利", "腹痛", "呕"], prompt: "可逐项对读手足冷、下利、腹痛、呕的文本搭配及其限定条件；不根据此提示推导实际用药。" },
];

export function expandPassageLearningTerms(terms: string[]) {
  const expanded: Array<{ input: string; canonical: string }> = [];
  for (const term of terms) {
    const normalized = term.trim();
    if (!normalized) continue;
    const entry = passageSymptomLexicon.find(item => item.canonical === normalized || item.aliases.includes(normalized));
    expanded.push({ input: normalized, canonical: entry?.canonical ?? normalized });
  }
  return Array.from(new Map(expanded.map(item => [`${item.input}:${item.canonical}`, item])).values());
}
