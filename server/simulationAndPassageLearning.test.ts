import { describe, expect, it } from "vitest";
import { simulateFormulaCombination } from "../client/src/lib/formulaSimulation";
import {
  matchPassageLearningRecords,
  parsePassageLearningTerms,
} from "./passageLearningMatch";

describe("formula simulation and passage learning matching", () => {
  it("compares indexed herb properties and decoction candidates without prescribing a formula", () => {
    const herbs = [
      { id: 1, name: "附子", aliases: null, category: "温里药", nature: "大热", taste: "辛、甘", meridians: "心、肾、脾", traditionalIndex: null, learningNote: null },
      { id: 2, name: "牡蛎", aliases: null, category: "平肝息风药", nature: "微寒", taste: "咸", meridians: "肝、胆、肾", traditionalIndex: null, learningNote: null },
      { id: 3, name: "薄荷", aliases: null, category: "解表药", nature: "凉", taste: "辛", meridians: "肺、肝", traditionalIndex: null, learningNote: null },
      { id: 4, name: "甘草", aliases: "炙甘草", category: "补虚药", nature: "平", taste: "甘", meridians: "心、肺、脾、胃", traditionalIndex: null, learningNote: null },
    ];
    const simulation = simulateFormulaCombination({
      baseIngredients: ["附子", "炙甘草"],
      added: ["牡蛎", "薄荷"],
      removed: ["炙甘草"],
      herbs,
    });

    expect(simulation.simulatedIngredients).toEqual(["附子", "牡蛎", "薄荷"]);
    expect(simulation.addedHerbs.map(herb => herb.name)).toEqual(["牡蛎", "薄荷"]);
    expect(simulation.decoctionCandidates.predecoctionCandidates).toEqual(["附子", "牡蛎"]);
    expect(simulation.decoctionCandidates.lateAdditionCandidates).toEqual(["薄荷"]);
    expect(simulation.notice).toContain("不产生处方");
  });

  it("matches passage text as explainable study references rather than a constitution conclusion", () => {
    const records = [
      { id: 1, chapterId: 1, chapterTitle: "辨太阳病脉证并治", passageNumber: 12, title: "太阳中风 · 汗出恶风", excerpt: "太阳中风，阳浮而阴弱，阳浮者热自发，阴弱者汗自出，啬啬恶寒。", keywords: "太阳中风、汗出、恶风", sourceReference: "《伤寒论》·太阳篇第12条", sourceUrl: "https://example.test/1" },
      { id: 2, chapterId: 2, chapterTitle: "辨阳明病脉证并治", passageNumber: 11, title: "阳明中风 · 口苦咽干", excerpt: "阳明中风，口苦咽干，腹满微喘。", keywords: "阳明中风、口苦、腹满", sourceReference: "《伤寒论》·阳明篇第11条", sourceUrl: "https://example.test/2" },
    ];

    expect(parsePassageLearningTerms("汗出、恶风 汗出")).toEqual(["汗出", "恶风"]);
    const matches = matchPassageLearningRecords(records, { query: "汗出 恶风", perspective: "all", matchMode: "all" });
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: 1, matchedTerms: ["汗出", "恶风"] });
    expect(matchPassageLearningRecords(records, { perspective: "digestive", matchMode: "any" }).map(item => item.id)).toContain(2);
  });
});
