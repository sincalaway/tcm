import { describe, expect, it } from "vitest";
import { classicSeed, formulaPassageSeed, formulaSeed, herbSeed, shangHanPassageSeed, sourceSeed } from "./catalogSeed";

const expectedFormulaSources: Record<string, string> = {
  "《伤寒论》": "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96",
  "《金匮要略》": "https://zh.wikisource.org/wiki/%E9%87%91%E5%8C%B1%E8%A6%81%E7%95%A5",
  "《太平惠民和剂局方》": "https://ctext.org/wiki.pl?if=gb&chapter=85192",
};

describe("source-backed starter catalog", () => {
  it("includes distinct official catalog and public-text sources", () => {
    expect(sourceSeed.map((source) => source.slug)).toEqual([
      "chinese-pharmacopoeia",
      "zh-wikisource",
      "chinese-text-project",
    ]);
    expect(sourceSeed.every((source) => source.baseUrl.startsWith("https://"))).toBe(true);
  });

  it("keeps each formula source title aligned to its source URL", () => {
    for (const formula of formulaSeed) {
      const [, name, , sourceTitle, , , , , sourceUrl] = formula;
      expect(expectedFormulaSources[sourceTitle], `${name} 的出处未配置`).toBe(sourceUrl.replace("/zh-hans/", "/wiki/"));
    }
  });

  it("maps the Chinese Text Project formula to its own catalog source", () => {
    const fourGentlemen = formulaSeed.find((formula) => formula[1] === "四君子汤");
    expect(fourGentlemen?.[8]).toContain("ctext.org");
    expect(sourceSeed.find((source) => source.slug === "chinese-text-project")?.baseUrl).toBe("https://ctext.org/");
  });

  it("uses unique stable slugs for herbs, formulas, and classics", () => {
    for (const group of [herbSeed, formulaSeed, classicSeed]) {
      const slugs = group.map((record) => record[0]);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("includes expanded formula records with a source-backed chapter study index", () => {
    for (const name of ["麻黄汤", "小柴胡汤", "葛根汤", "半夏泻心汤", "四逆汤", "苓桂术甘汤"]) {
      const record = formulaSeed.find((formula) => formula[1] === name);
      expect(record, `${name} 应在经方目录中`).toBeDefined();
      expect(record?.[3]).toMatch(/伤寒论|金匮要略/);
      expect(record?.[7]).toBeTruthy();
    }
  });

  it("keeps expanded Shang Han Lun passages and formula mappings traceable", () => {
    expect(shangHanPassageSeed.length).toBeGreaterThanOrEqual(30);
    expect(shangHanPassageSeed.every((passage) => passage[6].includes("zh.wikisource.org"))).toBe(true);
    expect(shangHanPassageSeed.filter((passage) => passage[0] === "辨太阳病脉证并治").length).toBeGreaterThanOrEqual(11);
    expect(shangHanPassageSeed.filter((passage) => passage[0] === "辨阳明病脉证并治").length).toBeGreaterThanOrEqual(10);
    for (const formulaSlug of ["ma-huang-tang", "xiao-chai-hu-tang", "ban-xia-xie-xin-tang", "si-ni-tang"]) {
      expect(formulaPassageSeed.some((mapping) => mapping[0] === formulaSlug), `${formulaSlug} 应关联具体条文`).toBe(true);
    }
    const shangHanFormulaSlugs = formulaSeed.filter((formula) => formula[3] === "《伤寒论》").map((formula) => formula[0]);
    for (const formulaSlug of shangHanFormulaSlugs) {
      expect(formulaPassageSeed.some((mapping) => mapping[0] === formulaSlug), `${formulaSlug} 应关联至少一条《伤寒论》条文`).toBe(true);
    }
  });
});
