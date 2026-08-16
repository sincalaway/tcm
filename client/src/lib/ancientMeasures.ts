export type WeightStandard = {
  id: "han-13-75" | "han-16" | "mingqing-3-75";
  label: string;
  gramsPerLiang: number;
  description: string;
  sourceLabel: string;
  sourceUrl: string;
};

export const weightStandards: WeightStandard[] = [
  {
    id: "han-13-75",
    label: "东汉考据口径：1 两 ≈ 13.75 g",
    gramsPerLiang: 13.75,
    description: "以文献、实物份量与煎煮水量比较提出的研究结论；仅供文献学习时选择口径。",
    sourceLabel: "戴子穠等，《伤寒论》中之“两”如何换算为现今之“克”",
    sourceUrl:
      "https://www.nricm.edu.tw/var/file/0/1000/attach/73/pta_2250_6508780_30566.pdf",
  },
  {
    id: "han-16",
    label: "东汉考据口径：1 两 ≈ 16 g",
    gramsPerLiang: 16,
    description: "另一文献与文物考证路径，以东汉一斤约 250 g、十六两为一斤折算。",
    sourceLabel: "《仲景方用药剂量的古今折算与临床应用》",
    sourceUrl: "http://xbsk.njucm.edu.cn/cn/article/pdf/preview/SK2014_0306.pdf",
  },
  {
    id: "mingqing-3-75",
    label: "明清“古一两今一钱”学习口径：1 两 ≈ 3.75 g",
    gramsPerLiang: 3.75,
    description: "反映后世“古一两今一钱”的折算法；不等同于东汉实物衡制。",
    sourceLabel: "戴子穠等，2016 年研究的争议口径综述",
    sourceUrl:
      "https://www.nricm.edu.tw/var/file/0/1000/attach/73/pta_2250_6508780_30566.pdf",
  },
];

export type AncientMeasureUnit = "liang" | "zhu" | "jin" | "sheng" | "he" | "dou";

export const ancientMeasureUnits: Array<{
  value: AncientMeasureUnit;
  label: string;
  kind: "weight" | "volume";
}> = [
  { value: "liang", label: "两", kind: "weight" },
  { value: "zhu", label: "铢（24 铢 = 1 两）", kind: "weight" },
  { value: "jin", label: "斤（16 两 = 1 斤）", kind: "weight" },
  { value: "sheng", label: "升", kind: "volume" },
  { value: "he", label: "合（10 合 = 1 升）", kind: "volume" },
  { value: "dou", label: "斗（10 升 = 1 斗）", kind: "volume" },
];

export function convertAncientMeasure(
  amount: number,
  unit: AncientMeasureUnit,
  standardId: WeightStandard["id"]
) {
  const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;
  const standard =
    weightStandards.find(item => item.id === standardId) ?? weightStandards[0];

  if (unit === "sheng" || unit === "he" || unit === "dou") {
    const milliliters =
      unit === "sheng" ? safeAmount * 200 : unit === "he" ? safeAmount * 20 : safeAmount * 2_000;
    return {
      kind: "volume" as const,
      value: milliliters,
      unit: "mL",
      formula:
        unit === "sheng"
          ? `${safeAmount} 升 × 200 mL/升`
          : unit === "he"
            ? `${safeAmount} 合 × 20 mL/合`
            : `${safeAmount} 斗 × 2,000 mL/斗`,
      standard,
    };
  }

  const liang =
    unit === "liang" ? safeAmount : unit === "zhu" ? safeAmount / 24 : safeAmount * 16;
  return {
    kind: "weight" as const,
    value: liang * standard.gramsPerLiang,
    unit: "g",
    formula:
      unit === "liang"
        ? `${safeAmount} 两 × ${standard.gramsPerLiang} g/两`
        : unit === "zhu"
          ? `${safeAmount} 铢 ÷ 24 × ${standard.gramsPerLiang} g/两`
          : `${safeAmount} 斤 × 16 两/斤 × ${standard.gramsPerLiang} g/两`,
    standard,
  };
}

export function formatConvertedValue(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value);
}
