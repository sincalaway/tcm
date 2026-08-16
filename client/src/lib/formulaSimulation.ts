import { generateDecoctionStudyGuide } from "./decoctionGuide";

export type SimulationHerb = {
  id: number;
  name: string;
  aliases: string | null;
  category: string | null;
  nature: string | null;
  taste: string | null;
  meridians: string | null;
  traditionalIndex: string | null;
  learningNote: string | null;
};

export type FormulaSimulation = {
  baseIngredients: string[];
  simulatedIngredients: string[];
  added: string[];
  removed: string[];
  addedHerbs: SimulationHerb[];
  removedHerbs: SimulationHerb[];
  baseProfile: ReturnType<typeof buildPropertyProfile>;
  simulatedProfile: ReturnType<typeof buildPropertyProfile>;
  decoctionCandidates: ReturnType<typeof generateDecoctionStudyGuide>;
  notice: string;
};

function resolveHerb(name: string, herbs: SimulationHerb[]) {
  return herbs.find(herb => {
    if (herb.name === name) return true;
    return herb.aliases?.split(/[、，,]/).some(alias => alias.trim() === name) ?? false;
  });
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildPropertyProfile(ingredientNames: string[], herbs: SimulationHerb[]) {
  const resolved = ingredientNames
    .map(name => resolveHerb(name, herbs))
    .filter((herb): herb is SimulationHerb => Boolean(herb));
  const collect = (key: keyof Pick<SimulationHerb, "category" | "nature" | "taste" | "meridians">) =>
    unique(
      resolved.flatMap(herb =>
        herb[key]?.split(/[、，,]/).map(item => item.trim()).filter(Boolean) ?? []
      )
    );

  return {
    total: ingredientNames.length,
    indexed: resolved.length,
    categories: collect("category"),
    natures: collect("nature"),
    tastes: collect("taste"),
    meridians: collect("meridians"),
  };
}

/**
 * 对目录中的药味组合进行文本和属性层面的比较。
 * 结果仅呈现站内本草索引的变化，不能据此推导具体方剂、剂量或个体化加减结论。
 */
export function simulateFormulaCombination(input: {
  baseIngredients: string[];
  added: string[];
  removed: string[];
  herbs: SimulationHerb[];
}): FormulaSimulation {
  const baseIngredients = unique(input.baseIngredients);
  const removed = unique(input.removed).filter(name => baseIngredients.includes(name));
  const added = unique(input.added).filter(
    name => !baseIngredients.includes(name) && !removed.includes(name)
  );
  const simulatedIngredients = baseIngredients
    .filter(name => !removed.includes(name))
    .concat(added);

  return {
    baseIngredients,
    simulatedIngredients,
    added,
    removed,
    addedHerbs: added
      .map(name => resolveHerb(name, input.herbs))
      .filter((herb): herb is SimulationHerb => Boolean(herb)),
    removedHerbs: removed
      .map(name => resolveHerb(name, input.herbs))
      .filter((herb): herb is SimulationHerb => Boolean(herb)),
    baseProfile: buildPropertyProfile(baseIngredients, input.herbs),
    simulatedProfile: buildPropertyProfile(simulatedIngredients, input.herbs),
    decoctionCandidates: generateDecoctionStudyGuide(simulatedIngredients.join("、")),
    notice:
      "此模拟器只对已编目的药味、药性索引与特殊煎煮候选项作学习性对比；不产生处方、剂量、适应证或个体化加减建议。",
  };
}

export function formatProfileValues(values: string[]) {
  return values.length ? values.join("、") : "未在目录中形成可比较的索引";
}
