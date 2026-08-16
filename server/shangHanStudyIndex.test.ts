import { describe, expect, it } from "vitest";
import {
  classicStudyIndex,
  getClassicStudyNotes,
  getHerbPairings,
  herbPairingIndex,
} from "../client/src/data/shangHanStudyIndex";

describe("Shang Han Lun study side panel index", () => {
  it("keeps pairing records source-backed and formula-searchable", () => {
    expect(herbPairingIndex.length).toBeGreaterThanOrEqual(12);
    for (const item of herbPairingIndex) {
      expect(item.herbName).toBeTruthy();
      expect(item.companionNames.length).toBeGreaterThan(0);
      expect(item.formulaName).toBeTruthy();
      expect(item.studyFocus).toBeTruthy();
      expect(item.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it("provides indexed pairing and classical-study routes for representative herbs", () => {
    expect(getHerbPairings("桂枝").map(item => item.formulaName)).toEqual(
      expect.arrayContaining(["桂枝汤", "麻黄汤"])
    );
    expect(getHerbPairings("蜀漆")[0]?.formulaName).toContain("蜀漆");
    expect(getClassicStudyNotes("柴胡")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scholar: "柯琴", work: "《伤寒来苏集》" }),
      ])
    );
    expect(
      classicStudyIndex.every(item => item.sourceUrl.startsWith("http"))
    ).toBe(true);
  });
});
