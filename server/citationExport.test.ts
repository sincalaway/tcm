import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { buildChapterCitationMarkdown, buildCitationFilename, buildCitationHref, PRINT_HIDDEN_SELECTORS, triggerPrint } from "../client/src/lib/citationExport";

describe("章节引用导出与打印契约", () => {
  const input = {
    classicTitle: "伤寒论",
    classicSlug: "shang-han-lun",
    chapterTitle: "辨太阳病脉证并治",
    origin: "https://example.test",
    passages: [
      { passageNumber: 23, title: "桂枝麻黄各半汤 · 如疟状", sourceReference: "《伤寒论》·辨太阳病脉证并治·第23条", sourceUrl: "https://zh.wikisource.org/zh-hans/伤寒论" },
      { passageNumber: 24, title: "桂枝汤 · 初服烦不解", sourceReference: "《伤寒论》·辨太阳病脉证并治·第24条", sourceUrl: "https://ctext.org/shang-han-lun/bian-tai-yang-bing-mai-zheng/zhs" },
    ],
  };

  it("生成稳定文件名与完整章节 Markdown 引用", () => {
    const markdown = buildChapterCitationMarkdown(input);
    expect(buildCitationFilename(input.classicTitle, input.chapterTitle)).toBe("伤寒论-辨太阳病脉证并治-引用索引.md");
    expect(markdown).toContain("# 《伤寒论》｜辨太阳病脉证并治");
    expect(markdown).toContain("第23条｜桂枝麻黄各半汤 · 如疟状");
    expect(markdown).toContain("第24条｜桂枝汤 · 初服烦不解");
    expect(markdown).toContain(buildCitationHref(input.origin, input.classicSlug, input.chapterTitle, 23));
    expect(markdown).toContain("https://zh.wikisource.org/zh-hans/伤寒论");
    expect(markdown).toContain("https://ctext.org/shang-han-lun/bian-tai-yang-bing-mai-zheng/zhs");
  });

  it("打印契约调用传入的打印函数并声明关键隐藏区域", () => {
    const print = vi.fn();
    triggerPrint(print);
    expect(print).toHaveBeenCalledOnce();
    expect(PRINT_HIDDEN_SELECTORS).toEqual(expect.arrayContaining([".citation-actions", ".site-header", ".chapter-block", ".ai-study-assistant"]));
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(css).toContain("@media print");
    expect(css).toContain(".citation-actions");
    expect(css).toContain(".chapter-block");
    expect(css).toContain(".passage-block");
  });
});
