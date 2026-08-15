/** 宋刻书斋：本草页连接可维护目录，支持按类别、性、归经与关键词交叉检索。 */
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { PageMasthead } from "@/components/SiteChrome";
import { ExternalSource, InkStamp, RuleLabel, StudyDetail } from "@/components/StudyElements";
import { AiStudyAssistant } from "@/components/AiStudyAssistant";
import { StudyMargin } from "@/components/StudyMargin";
import { trpc } from "@/lib/trpc";

const pharmacopoeiaUrl = "https://ydz.chp.org.cn/";

export default function Herbs() {
  const search = useSearch();
  const initialQuery = new URLSearchParams(search).get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [nature, setNature] = useState("");
  const [meridian, setMeridian] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setQuery(new URLSearchParams(search).get("q") ?? ""); setSelectedId(null); }, [search]);
  const filters = trpc.catalog.filters.useQuery();
  const recordsQuery = trpc.catalog.herbs.useQuery({ query: query || undefined, category: category || undefined, nature: nature || undefined, meridian: meridian || undefined });
  const records = recordsQuery.data ?? [];
  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  function selectHerb(id: number) { setSelectedId(id); window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }), 0); }

  return <main className="inner-page">
    <PageMasthead index="甲 · 本草索引" title="中药详情查询" lead="按名称、类别、药性与归经交叉筛选，并保留官方药典目录入口。" />
    <section className="catalog-controls" aria-label="本草多维检索">
      <label className="catalog-search"><Search size={18} /><span className="sr-only">搜索中药条目</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="检索药名、别名、归经或传统功用" /></label>
      <div className="facet-set"><SlidersHorizontal size={16} /><Facet label="类别" value={category} onChange={setCategory} options={filters.data?.herbCategories ?? []} /><Facet label="性" value={nature} onChange={setNature} options={filters.data?.natures ?? []} /><Facet label="归经" value={meridian} onChange={setMeridian} options={filters.data?.meridians ?? []} /></div>
      <p>{recordsQuery.isLoading ? "正在翻检目录……" : `共得 ${records.length} 味药材`}<button type="button" onClick={() => { setQuery(""); setCategory(""); setNature(""); setMeridian(""); }}>清除筛选</button></p>
    </section>
    <section className={`study-board ${recordsQuery.isLoading ? "is-loading" : ""}`} aria-busy={recordsQuery.isLoading}>
      <div className="study-list-panel"><div className="panel-heading"><div><RuleLabel>目录</RuleLabel><h2>药味条目</h2></div><span className="result-count">实时目录</span></div><div className="record-list">{recordsQuery.isLoading && !records.length ? Array.from({ length: 5 }, (_, index) => <div className="record-row skeleton-row" key={index}><span /><span /><span /></div>) : records.map((herb, index) => <button className={selected?.id === herb.id ? "record-row active" : "record-row"} type="button" key={herb.id} onClick={() => selectHerb(herb.id)}><span className="record-number">{String(index + 1).padStart(2, "0")}</span><span className="record-main"><b>{herb.name}</b><small>{herb.pinyin}</small></span><span className="record-meta">{herb.category}</span></button>)}{!recordsQuery.isLoading && records.length === 0 ? <p className="empty-note">未找到相符药味。可移除部分筛选后再试。</p> : null}</div></div>
      {selected ? <div ref={detailRef} className="detail-anchor"><HerbDetail herb={selected} /></div> : recordsQuery.isLoading ? <div className="empty-leaf detail-skeleton"><p>正在展开本草书页……</p></div> : <div className="empty-leaf"><p>从左侧目录选择一味药材。</p></div>}
    </section>
    <aside className="method-note"><InkStamp>资料提示</InkStamp><p>药材基原、质量标准与临床使用以最新版药典和合格专业人员意见为准。本站仅提供可追溯的学习索引。</p><ExternalSource href={pharmacopoeiaUrl}>访问《中国药典》在线目录</ExternalSource></aside>
  </main>;
}

function Facet({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="facet-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">不限</option>{options.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>;
}

type HerbRecord = {
  id: number; name: string; pinyin: string | null; category: string | null; nature: string | null; taste: string | null;
  meridians: string | null; medicinalPart: string | null; traditionalIndex: string | null; learningNote: string | null; sourceUrl: string | null;
};

function HerbDetail({ herb }: { herb: HerbRecord }) {
  const chapter = resolveHerbChapter(herb.name); return <StudyDetail title={herb.name} meta={herb.pinyin ?? "本草条目"}><div className="detail-callout"><span>{herb.category ?? "本草目录"}</span><InkStamp>本草</InkStamp></div><dl className="character-grid"><div><dt>性</dt><dd>{herb.nature ?? "—"}</dd></div><div><dt>味</dt><dd>{herb.taste ?? "—"}</dd></div><div><dt>归经</dt><dd>{herb.meridians ?? "—"}</dd></div><div><dt>药用部位</dt><dd>{herb.medicinalPart ?? "—"}</dd></div></dl><div className="detail-section"><RuleLabel>传统功用索引</RuleLabel><p className="large-detail-copy">{herb.traditionalIndex}</p></div><div className="detail-section"><RuleLabel>研读提示</RuleLabel><p>{herb.learningNote}</p></div><div className="detail-section cross-reading"><RuleLabel>交叉研读</RuleLabel><p>以“{herb.name}”为线索，转入经方目录观察其在方中与条文中的位置。</p><Link href={`/jingfang?q=${encodeURIComponent(herb.name)}`}>查含“{herb.name}”的经方 →</Link>{chapter ? <Link className="chapter-link" href={`/guji?q=伤寒论&chapter=${encodeURIComponent(chapter)}`}>直达“{chapter}” →</Link> : null}</div>{herb.sourceUrl ? <ExternalSource href={herb.sourceUrl}>查阅来源入口</ExternalSource> : null}<AiStudyAssistant context={{ kind: "本草", title: herb.name, sourceTitle: "《中国药典》在线目录", studyNote: herb.learningNote ?? undefined }} /><StudyMargin resourceType="herb" resourceId={herb.id} resourceTitle={herb.name} /></StudyDetail>;
}

function resolveHerbChapter(name: string) { if (["柴胡", "黄芩", "半夏"].includes(name)) return "辨少阳病脉证并治"; if (["桂枝", "白芍", "甘草", "生姜", "茯苓", "泽泻"].includes(name)) return "辨太阳病脉证并治"; return null; }
