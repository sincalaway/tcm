import { describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getCatalogFilters: vi.fn(), getClassicChapters: vi.fn(), getClassicPassages: vi.fn(), getClassics: vi.fn(), getFormulaPassages: vi.fn(), getPassageFormulas: vi.fn(), getFormulas: vi.fn(), getHerbs: vi.fn(), getLocalSearch: vi.fn(), searchWikisource: vi.fn(),
}));
vi.mock("./db", () => dbMock);

import { catalogRouter } from "./routers/catalog";

describe("catalog 条文双向映射", () => {
  it("按条文 ID 返回关联方剂", async () => {
    const row = { id: 2, slug: "ma-huang-tang", name: "麻黄汤", sourceTitle: "《伤寒论》", sourceExcerpt: "原文线索", relationType: "primary" };
    dbMock.getPassageFormulas.mockResolvedValue([row]);
    const caller = catalogRouter.createCaller({} as never);
    await expect(caller.passageFormulas({ passageId: 103 })).resolves.toEqual([row]);
    expect(dbMock.getPassageFormulas).toHaveBeenCalledWith(103);
  });
});
