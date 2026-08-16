import {
  convertAncientMeasure,
  formatConvertedValue,
  type AncientMeasureUnit,
  type WeightStandard,
} from "./ancientMeasures";

export type FormulaDoseItem = {
  herb: string;
  amount: number;
  unit: AncientMeasureUnit | "piece";
  preparation?: string;
};

export type FormulaDoseProfile = {
  formulaSlug: string;
  sourceLabel: string;
  sourceUrl: string;
  transcriptionNote: string;
  doses: FormulaDoseItem[];
};

const sourceUrl = "https://zh.wikisource.org/zh-hans/%E5%82%B7%E5%AF%92%E8%AB%96%E9%A1%9E%E6%96%B9";
const sourceLabel = "《伤寒论类方》公开阅读页";

/**
 * 仅保存可回到公开页面核对的古制数量抄录。不同传本、炮制与原文异同未在此处归一；
 * 不能将其解释为现代处方、实际剂量或用户自定义加减数量。
 */
export const formulaDoseProfiles: FormulaDoseProfile[] = [
  { formulaSlug: "gui-zhi-tang", sourceLabel, sourceUrl, transcriptionNote: "桂枝汤类方所载数量；大枣按枚保留，不换算为质量。", doses: [{ herb: "桂枝", amount: 3, unit: "liang" }, { herb: "芍药", amount: 3, unit: "liang" }, { herb: "炙甘草", amount: 2, unit: "liang" }, { herb: "生姜", amount: 3, unit: "liang" }, { herb: "大枣", amount: 12, unit: "piece" }] },
  { formulaSlug: "ma-huang-tang", sourceLabel, sourceUrl, transcriptionNote: "麻黄汤类方所载数量；杏仁按枚保留，不换算为质量。", doses: [{ herb: "麻黄", amount: 3, unit: "liang" }, { herb: "桂枝", amount: 2, unit: "liang" }, { herb: "炙甘草", amount: 1, unit: "liang" }, { herb: "杏仁", amount: 70, unit: "piece" }] },
  { formulaSlug: "ge-gen-tang", sourceLabel, sourceUrl, transcriptionNote: "葛根汤类方所载数量；大枣按枚保留。", doses: [{ herb: "葛根", amount: 4, unit: "liang" }, { herb: "麻黄", amount: 3, unit: "liang" }, { herb: "芍药", amount: 2, unit: "liang" }, { herb: "生姜", amount: 3, unit: "liang" }, { herb: "炙甘草", amount: 2, unit: "liang" }, { herb: "桂枝", amount: 3, unit: "liang" }, { herb: "大枣", amount: 12, unit: "piece" }] },
  { formulaSlug: "xiao-chai-hu-tang", sourceLabel, sourceUrl, transcriptionNote: "小柴胡汤类方所载数量；大枣按枚保留。", doses: [{ herb: "柴胡", amount: 0.5, unit: "jin" }, { herb: "黄芩", amount: 3, unit: "liang" }, { herb: "人参", amount: 3, unit: "liang" }, { herb: "炙甘草", amount: 3, unit: "liang" }, { herb: "生姜", amount: 3, unit: "liang" }, { herb: "半夏", amount: 0.5, unit: "jin" }, { herb: "大枣", amount: 12, unit: "piece" }] },
  { formulaSlug: "da-cheng-qi-tang", sourceLabel, sourceUrl, transcriptionNote: "大承气汤类方所载数量；枳实按枚、芒硝按合保留，不能与质量项合计。", doses: [{ herb: "大黄", amount: 4, unit: "liang" }, { herb: "厚朴", amount: 0.5, unit: "jin" }, { herb: "枳实", amount: 5, unit: "piece" }, { herb: "芒硝", amount: 3, unit: "he" }] },
  { formulaSlug: "xiao-qing-long-tang", sourceLabel, sourceUrl, transcriptionNote: "小青龙汤类方所载数量；五味子、半夏以斤计，采用同一研究口径显示。", doses: [{ herb: "麻黄", amount: 3, unit: "liang" }, { herb: "芍药", amount: 3, unit: "liang" }, { herb: "细辛", amount: 3, unit: "liang" }, { herb: "干姜", amount: 3, unit: "liang" }, { herb: "炙甘草", amount: 3, unit: "liang" }, { herb: "桂枝", amount: 3, unit: "liang" }, { herb: "五味子", amount: 0.5, unit: "jin" }, { herb: "半夏", amount: 0.5, unit: "jin" }] },
  { formulaSlug: "si-ni-tang", sourceLabel, sourceUrl, transcriptionNote: "四逆汤原典数量中的附子按枚保留，不换算为克数。", doses: [{ herb: "炙甘草", amount: 2, unit: "liang" }, { herb: "干姜", amount: 1.5, unit: "liang" }, { herb: "附子", amount: 1, unit: "piece", preparation: "原文炮、去皮、破八片" }] },
  { formulaSlug: "zhen-wu-tang", sourceLabel, sourceUrl, transcriptionNote: "真武汤原典数量中的附子按枚保留，不换算为克数。", doses: [{ herb: "茯苓", amount: 3, unit: "liang" }, { herb: "芍药", amount: 3, unit: "liang" }, { herb: "生姜", amount: 3, unit: "liang" }, { herb: "白术", amount: 2, unit: "liang" }, { herb: "附子", amount: 1, unit: "piece", preparation: "原文炮、去皮、破八片" }] },
  { formulaSlug: "bai-hu-tang", sourceLabel, sourceUrl, transcriptionNote: "白虎汤类方所载数量；粳米以合计，保留容量项。", doses: [{ herb: "知母", amount: 6, unit: "liang" }, { herb: "石膏", amount: 1, unit: "jin" }, { herb: "甘草", amount: 2, unit: "liang" }, { herb: "粳米", amount: 6, unit: "he" }] },
  { formulaSlug: "ban-xia-xie-xin-tang", sourceLabel, sourceUrl, transcriptionNote: "半夏泻心汤类方所载数量；半夏以升计、 大枣按枚保留。", doses: [{ herb: "半夏", amount: 0.5, unit: "sheng" }, { herb: "黄芩", amount: 3, unit: "liang" }, { herb: "干姜", amount: 3, unit: "liang" }, { herb: "人参", amount: 3, unit: "liang" }, { herb: "炙甘草", amount: 3, unit: "liang" }, { herb: "黄连", amount: 1, unit: "liang" }, { herb: "大枣", amount: 12, unit: "piece" }] },
];

export function getFormulaDoseProfile(formulaSlug: string) {
  return formulaDoseProfiles.find(profile => profile.formulaSlug === formulaSlug);
}

export function formatAncientDose(item: FormulaDoseItem) {
  const unit = item.unit === "piece" ? "枚" : item.unit === "liang" ? "两" : item.unit === "zhu" ? "铢" : item.unit === "jin" ? "斤" : item.unit === "sheng" ? "升" : item.unit === "he" ? "合" : "斗";
  return `${item.amount}${unit}${item.preparation ? `（${item.preparation}）` : ""}`;
}

export function buildDoseStudyRows(input: {
  formulaSlug: string;
  simulatedIngredients: string[];
  standardId: WeightStandard["id"];
}) {
  const profile = getFormulaDoseProfile(input.formulaSlug);
  if (!profile) return { profile: undefined, rows: [], missingIngredients: input.simulatedIngredients };
  const present = new Set(input.simulatedIngredients);
  const rows = profile.doses
    .filter(item => present.has(item.herb))
    .map(item => {
      if (item.unit === "piece") return { ...item, ancient: formatAncientDose(item), converted: "按枚保留，不作质量换算", kind: "piece" as const };
      const conversion = convertAncientMeasure(item.amount, item.unit, input.standardId);
      return { ...item, ancient: formatAncientDose(item), converted: `≈ ${formatConvertedValue(conversion.value)} ${conversion.unit}`, kind: conversion.kind };
    });
  return { profile, rows, missingIngredients: input.simulatedIngredients.filter(name => !profile.doses.some(item => item.herb === name)) };
}
