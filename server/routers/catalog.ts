import { z } from "zod";
import { getCatalogFilters, getClassicChapters, getClassics, getFormulas, getHerbs, getLocalSearch, searchWikisource } from "../db";
import { publicProcedure, router } from "../_core/trpc";

const textQuery = z.string().trim().max(100).optional();

export const catalogRouter = router({
  filters: publicProcedure.query(() => getCatalogFilters()),
  herbs: publicProcedure.input(z.object({ query: textQuery, category: z.string().max(128).optional(), nature: z.string().max(64).optional(), meridian: z.string().max(128).optional() })).query(({ input }) => getHerbs(input)),
  formulas: publicProcedure.input(z.object({ query: textQuery, sourceTitle: z.string().max(255).optional() })).query(({ input }) => getFormulas(input)),
  classics: publicProcedure.input(z.object({ query: textQuery, category: z.string().max(128).optional() })).query(({ input }) => getClassics(input)),
  chapters: publicProcedure.input(z.object({ classicId: z.number().int().positive() })).query(({ input }) => getClassicChapters(input.classicId)),
  search: publicProcedure.input(z.object({ query: z.string().trim().min(1).max(100) })).query(({ input }) => getLocalSearch(input.query)),
  wikisourceSearch: publicProcedure.input(z.object({ query: z.string().trim().min(1).max(100) })).query(({ input }) => searchWikisource(input.query)),
});
