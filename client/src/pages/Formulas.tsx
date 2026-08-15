/** 宋刻书斋：经方页读取数据库条目，按方名、出处和药味全文检索。 */
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { PageMasthead } from "@/components/SiteChrome";
import { ExternalSource, InkStamp, RuleLabel, StudyDetail } from "@/components/StudyElements";
import { StudyMargin } from "@/components/StudyMargin";
import { trpc } from "@/lib/trpc";

export default function Formulas() {
  const [query, setQuery] = useState(""); const [sourceTitle, setSourceTitle] = useState(""); const [selectedId, setSelectedId] = useState<number | null>(null);
  const filters = trpc.catalog.filters.useQuery();
  const recordsQuery = trpc.catalog.formulas.useQuery({ query: query || undefined, sourceTitle: sourceTitle || undefined });
  const records = recordsQuery.data ?? []; const selected = records.find((record) => record.id === selectedId) ?? records[0];
  return <main className="inner-page"><PageMasthead index="乙 · 经方研读" title="经方详情查询" lead="以出处为锚，以药味为线，在可维护目录中检索并保存阅读线索。" />
    <section className="catalog-controls"><label className="catalog-search"><Search size={18} /><span className="sr-only">搜索经方条目</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="检索方名、出处、条文或组成药味" /></label><div className="facet-set"><SlidersHorizontal size={16} /><Facet label="出处" value={sourceTitle} onChange={setSourceTitle} options={filters.data?.formulaSources ?? []} /></div><p>{recordsQuery.isLoading ? "正在翻检方目……" : `共得 ${records.length} 首方剂`}<button type="button" onClick={() => { setQuery(""); setSourceTitle(""); }}>清除筛选</button></p></section>
    <section className="study-board formula-board"><div className="study-list-panel"><div className="panel-heading"><div><RuleLabel>方目</RuleLabel><h2>经方索引</h2></div><span className="result-count">来源可溯</span></div><div className="formula-list">{records.map((formula, index) => <button className={selected?.id === formula.id ? "formula-row active" : "formula-row"} type="button" key={formula.id} onClick={() => setSelectedId(formula.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{formula.name}</b><small>{formula.sourceTitle}</small></div><i>{formula.studyIndex?.split(" · ")[0]}</i></button>)}{!recordsQuery.isLoading && !records.length ? <p className="empty-note">未找到相符方剂。可从“桂枝”“伤寒论”或“茯苓”开始。</p> : null}</div></div>{selected ? <FormulaDetail formula={selected} /> : <div className="empty-leaf"><p>从左侧方目选择一首方剂。</p></div>}</section>
    <aside className="method-note"><InkStamp>阅方次第</InkStamp><p>先确认原典出处与条文，再观察药味组合与上下文。页面用于文本学习，不替代辨证、配伍或用药决策。</p><ExternalSource href="https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96">打开《伤寒论》原文阅览入口</ExternalSource></aside>
  </main>;
}

function Facet({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="facet-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">不限</option>{options.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>; }
type FormulaRecord = { id: number; name: string; sourceTitle: string; sourceExcerpt: string | null; ingredients: string; structuralNote: string | null; sourceUrl: string | null; };
function FormulaDetail({ formula }: { formula: FormulaRecord }) { const ingredients = (() => { try { return JSON.parse(formula.ingredients) as string[]; } catch { return []; } })(); return <StudyDetail title={formula.name} meta={formula.sourceTitle}><div className="detail-callout"><span>经典方剂研读</span><InkStamp>方</InkStamp></div><div className="detail-section"><RuleLabel>原文线索</RuleLabel><blockquote className="classic-quote">“{formula.sourceExcerpt}”</blockquote></div><div className="detail-section"><RuleLabel>组成药味</RuleLabel><div className="ingredient-list">{ingredients.map((item, index) => <span key={item}><i>{index + 1}</i>{item}</span>)}</div></div><div className="detail-section"><RuleLabel>结构提示</RuleLabel><p>{formula.structuralNote}</p></div>{formula.sourceUrl ? <ExternalSource href={formula.sourceUrl}>查阅原典来源</ExternalSource> : null}<StudyMargin resourceType="formula" resourceId={formula.id} resourceTitle={formula.name} /></StudyDetail>; }
