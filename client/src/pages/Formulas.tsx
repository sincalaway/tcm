/** 宋刻书斋：经方页读取数据库条目，按方名、出处和药味全文检索。 */
import { Calculator, Lightbulb, ListChecks, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { PageMasthead } from "@/components/SiteChrome";
import { ExternalSource, InkStamp, RuleLabel, StudyDetail } from "@/components/StudyElements";
import { AiStudyAssistant } from "@/components/AiStudyAssistant";
import { StudyMargin } from "@/components/StudyMargin";
import { FormulaCombinationSimulator } from "@/components/FormulaCombinationSimulator";
import { trpc } from "@/lib/trpc";
import { ancientMeasureUnits, convertAncientMeasure, formatConvertedValue, weightStandards, type AncientMeasureUnit } from "@/lib/ancientMeasures";
import { generateDecoctionStudyGuide } from "@/lib/decoctionGuide";

export default function Formulas() {
  const search = useSearch(); const initialQuery = new URLSearchParams(search).get("q") ?? "";
  const [query, setQuery] = useState(initialQuery); const [sourceTitle, setSourceTitle] = useState(""); const [selectedId, setSelectedId] = useState<number | null>(null);
  const [studyQuery, setStudyQuery] = useState(""); const [matchMode, setMatchMode] = useState<"all" | "any">("all");
  const [measureAmount, setMeasureAmount] = useState("1"); const [measureUnit, setMeasureUnit] = useState<AncientMeasureUnit>("liang"); const [weightStandardId, setWeightStandardId] = useState(weightStandards[0].id);
  const [decoctionIngredients, setDecoctionIngredients] = useState(""); const [decoctionGuideOpen, setDecoctionGuideOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setQuery(new URLSearchParams(search).get("q") ?? ""); setSelectedId(null); }, [search]);
  const filters = trpc.catalog.filters.useQuery();
  const recordsQuery = trpc.catalog.formulas.useQuery({ query: query || undefined, sourceTitle: sourceTitle || undefined });
  const allFormulasQuery = trpc.catalog.formulas.useQuery({});
  const allHerbsQuery = trpc.catalog.herbs.useQuery({});
  const records = recordsQuery.data ?? []; const selected = records.find((record) => record.id === selectedId) ?? records[0];
  const studySearchQuery = trpc.catalog.formulaStudySearch.useQuery({ query: studyQuery.trim() || undefined, sourceTitle: sourceTitle || undefined, matchMode }, { enabled: Boolean(studyQuery.trim()) });
  const conversion = useMemo(() => convertAncientMeasure(Number(measureAmount), measureUnit, weightStandardId), [measureAmount, measureUnit, weightStandardId]);
  const selectedIngredientNames = useMemo(() => { try { return selected ? JSON.parse(selected.ingredients) as string[] : []; } catch { return []; } }, [selected]);
  const decoctionGuide = useMemo(() => generateDecoctionStudyGuide(decoctionIngredients), [decoctionIngredients]);
  function selectFormula(id: number, resetDirectoryQuery = false) { if (resetDirectoryQuery) setQuery(""); setSelectedId(id); window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }), 0); }
  return <main className="inner-page"><PageMasthead index="乙 · 经方研读" title="经方详情查询" lead="以出处为锚，以药味为线，在可维护目录中检索并保存阅读线索。" />
    <section className="catalog-controls"><label className="catalog-search"><Search size={18} /><span className="sr-only">搜索经方条目</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="检索方名、出处、条文或组成药味" /></label><div className="facet-set"><SlidersHorizontal size={16} /><Facet label="出处" value={sourceTitle} onChange={setSourceTitle} options={filters.data?.formulaSources ?? []} /></div><p>{recordsQuery.isLoading ? "正在翻检方目……" : `共得 ${records.length} 首方剂`}<button type="button" onClick={() => { setQuery(""); setSourceTitle(""); }}>清除筛选</button></p></section>
    <FormulaStudyTools studyQuery={studyQuery} onStudyQueryChange={setStudyQuery} matchMode={matchMode} onMatchModeChange={setMatchMode} searchResult={studySearchQuery.data ?? []} searchLoading={studySearchQuery.isFetching} onSelectFormula={(id) => selectFormula(id, true)} measureAmount={measureAmount} onMeasureAmountChange={setMeasureAmount} measureUnit={measureUnit} onMeasureUnitChange={setMeasureUnit} weightStandardId={weightStandardId} onWeightStandardChange={setWeightStandardId} conversion={conversion} decoctionIngredients={decoctionIngredients} onDecoctionIngredientsChange={(value) => { setDecoctionIngredients(value); setDecoctionGuideOpen(false); }} selectedFormulaName={selected?.name ?? null} selectedIngredientNames={selectedIngredientNames} onUseSelectedFormula={() => { setDecoctionIngredients(selectedIngredientNames.join("、")); setDecoctionGuideOpen(false); }} onGenerateDecoctionGuide={() => setDecoctionGuideOpen(true)} decoctionGuideOpen={decoctionGuideOpen} decoctionGuide={decoctionGuide} />
    <FormulaCombinationSimulator formulas={allFormulasQuery.data ?? []} herbs={allHerbsQuery.data ?? []} weightStandardId={weightStandardId} onWeightStandardChange={setWeightStandardId} onSendToDecoction={(ingredients) => { setDecoctionIngredients(ingredients.join("、")); setDecoctionGuideOpen(true); }} />
    <section className={`study-board formula-board ${recordsQuery.isLoading ? "is-loading" : ""}`} aria-busy={recordsQuery.isLoading}><div className="study-list-panel"><div className="panel-heading"><div><RuleLabel>方目</RuleLabel><h2>经方索引</h2></div><span className="result-count">来源可溯</span></div><div className="formula-list">{recordsQuery.isLoading && !records.length ? Array.from({ length: 5 }, (_, index) => <div className="formula-row skeleton-row" key={index}><span /><div><b /><small /></div><i /></div>) : records.map((formula, index) => <button className={selected?.id === formula.id ? "formula-row active" : "formula-row"} type="button" key={formula.id} onClick={() => selectFormula(formula.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{formula.name}</b><small>{formula.sourceTitle}</small></div><i>{formula.studyIndex?.split(" · ")[0]}</i></button>)}{!recordsQuery.isLoading && !records.length ? <p className="empty-note">未找到相符方剂。可从“桂枝”“伤寒论”或“茯苓”开始。</p> : null}</div></div>{selected ? <div ref={detailRef} className="detail-anchor"><FormulaDetail formula={selected} /></div> : recordsQuery.isLoading ? <div className="empty-leaf detail-skeleton"><p>正在展开经方书页……</p></div> : <div className="empty-leaf"><p>从左侧方目选择一首方剂。</p></div>}</section>
    <aside className="method-note"><InkStamp>阅方次第</InkStamp><p>先确认原典出处与条文，再观察药味组合与上下文。页面用于文本学习，不替代辨证、配伍或用药决策。</p><ExternalSource href="https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96">打开《伤寒论》原文阅览入口</ExternalSource></aside>
  </main>;
}

function Facet({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="facet-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">不限</option>{options.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>; }
type FormulaRecord = { id: number; name: string; sourceTitle: string; sourceExcerpt: string | null; ingredients: string; structuralNote: string | null; sourceUrl: string | null; };
function FormulaDetail({ formula }: { formula: FormulaRecord }) { const ingredients = (() => { try { return JSON.parse(formula.ingredients) as string[]; } catch { return []; } })(); const chapter = resolveFormulaChapter(formula); const book = formula.sourceTitle.replace(/[《》]/g, ""); return <StudyDetail title={formula.name} meta={formula.sourceTitle}><div className="detail-callout"><span>经典方剂研读</span><InkStamp>方</InkStamp></div><div className="detail-section"><RuleLabel>原文线索</RuleLabel><blockquote className="classic-quote">“{formula.sourceExcerpt}”</blockquote></div><div className="detail-section"><RuleLabel>组成药味 · 逐味对读</RuleLabel><div className="ingredient-list">{ingredients.map((item, index) => <Link href={`/bencao?q=${encodeURIComponent(item)}`} key={item}><i>{index + 1}</i>{item}</Link>)}</div></div><FormulaPassageLinks formulaId={formula.id} formulaName={formula.name} /><div className="detail-section cross-reading"><RuleLabel>继续入卷</RuleLabel><p>可先逐味查阅本草条目，再回到原典确认“{formula.sourceTitle}”中的条文语境。</p>{chapter ? <Link href={`/guji?q=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}`}>直达“{chapter}” →</Link> : <Link href={`/guji?q=${encodeURIComponent(book)}`}>检索“{formula.sourceTitle}”原文 →</Link>}</div><div className="detail-section"><RuleLabel>结构提示</RuleLabel><p>{formula.structuralNote}</p></div>{formula.sourceUrl ? <ExternalSource href={formula.sourceUrl}>查阅原典来源</ExternalSource> : null}<AiStudyAssistant context={{ kind: "经方", title: formula.name, sourceTitle: formula.sourceTitle, excerpt: formula.sourceExcerpt ?? undefined, studyNote: formula.structuralNote ?? undefined }} /><StudyMargin resourceType="formula" resourceId={formula.id} resourceTitle={formula.name} /></StudyDetail>; }

function FormulaPassageLinks({ formulaId, formulaName }: { formulaId: number; formulaName: string }) {
  const passagesQuery = trpc.catalog.formulaPassages.useQuery({ formulaId });
  if (passagesQuery.isLoading) return <div className="detail-section passage-links-loading">正在定位原典条文……</div>;
  if (!passagesQuery.data?.length) return null;
  return <div className="detail-section formula-passage-links"><RuleLabel>原典条文定位</RuleLabel><p>以下链接由站内目录映射到《伤寒论》具体条文；“主条文”是本页默认对读入口。</p>{passagesQuery.data.map((passage) => <Link key={passage.id} href={`/guji?q=${encodeURIComponent("伤寒论")}&chapter=${encodeURIComponent(passage.chapterTitle)}&passage=${passage.passageNumber}`}><span>{passage.relationType === "primary" ? "主条文" : "相关条文"}</span><b>{passage.chapterTitle} · 第{passage.passageNumber}条</b><small>{passage.title} · {formulaName}</small></Link>)}</div>;
}

function resolveFormulaChapter(formula: FormulaRecord) { if (formula.sourceTitle === "《伤寒论》") { if (formula.name === "大承气汤") return "辨阳明病脉证并治"; if (formula.name === "小柴胡汤") return "辨少阳病脉证并治"; if (formula.name === "半夏泻心汤") return "辨发汗吐下后脉证并治"; if (formula.name === "四逆汤") return "辨少阴病脉证并治"; return "辨太阳病脉证并治"; } if (formula.sourceTitle === "《金匮要略》") return formula.name === "苓桂术甘汤" ? "痰饮咳嗽病脉证并治第十二" : "脏腑经络先后病脉证第一"; return null; }

type FormulaStudySearchCard = {
  id: number;
  name: string;
  sourceTitle: string;
  matchedTerms: string[];
  structuralNote: string | null;
};

function FormulaStudyTools({
  studyQuery,
  onStudyQueryChange,
  matchMode,
  onMatchModeChange,
  searchResult,
  searchLoading,
  onSelectFormula,
  measureAmount,
  onMeasureAmountChange,
  measureUnit,
  onMeasureUnitChange,
  weightStandardId,
  onWeightStandardChange,
  conversion,
  decoctionIngredients,
  onDecoctionIngredientsChange,
  selectedFormulaName,
  selectedIngredientNames,
  onUseSelectedFormula,
  onGenerateDecoctionGuide,
  decoctionGuideOpen,
  decoctionGuide,
}: {
  studyQuery: string;
  onStudyQueryChange: (value: string) => void;
  matchMode: "all" | "any";
  onMatchModeChange: (value: "all" | "any") => void;
  searchResult: FormulaStudySearchCard[];
  searchLoading: boolean;
  onSelectFormula: (id: number) => void;
  measureAmount: string;
  onMeasureAmountChange: (value: string) => void;
  measureUnit: AncientMeasureUnit;
  onMeasureUnitChange: (value: AncientMeasureUnit) => void;
  weightStandardId: (typeof weightStandards)[number]["id"];
  onWeightStandardChange: (value: (typeof weightStandards)[number]["id"]) => void;
  conversion: ReturnType<typeof convertAncientMeasure>;
  decoctionIngredients: string;
  onDecoctionIngredientsChange: (value: string) => void;
  selectedFormulaName: string | null;
  selectedIngredientNames: string[];
  onUseSelectedFormula: () => void;
  onGenerateDecoctionGuide: () => void;
  decoctionGuideOpen: boolean;
  decoctionGuide: ReturnType<typeof generateDecoctionStudyGuide>;
}) {
  return (
    <section className="formula-study-tools" aria-label="经方药证学习检索与古今衡重换算">
      <header className="formula-tools-heading">
        <div>
          <RuleLabel>研读工具</RuleLabel>
          <h2>药证检索与古今衡重换算</h2>
          <p>以药名、条文症候词和学习索引交叉定位方目；衡重结果可选择不同研究口径进行文献对照。</p>
        </div>
        <InkStamp>考</InkStamp>
      </header>
      <div className="formula-tools-grid">
        <section className="formula-tool-card">
          <header><Lightbulb size={18} /><div><h3>药证学习检索</h3><p>例如输入“桂枝 汗出 恶风”或“柴胡 往来寒热”。</p></div></header>
          <label className="tool-search-input"><Search size={15} /><span className="sr-only">输入药名或症候词</span><input value={studyQuery} onChange={event => onStudyQueryChange(event.target.value)} placeholder="多个关键词以空格、顿号或逗号分隔" maxLength={100} /></label>
          <div className="tool-controls"><label className="facet-select"><span>匹配方式</span><select value={matchMode} onChange={event => onMatchModeChange(event.target.value as "all" | "any")}><option value="all">同时命中全部词</option><option value="any">命中任一词</option></select></label><div className="study-query-examples"><button type="button" onClick={() => onStudyQueryChange("桂枝 汗出 恶风")}>桂枝 · 汗出 · 恶风</button><button type="button" onClick={() => onStudyQueryChange("柴胡 往来寒热")}>柴胡 · 往来寒热</button></div></div>
          {studyQuery.trim() ? <div className="study-search-results" aria-live="polite">{searchLoading ? <p>正在核对方名、药味与条文索引……</p> : searchResult.length ? <><p>命中 {searchResult.length} 首方剂；结果依据站内方名、别名、药味、原文摘录和学习索引排序。</p>{searchResult.slice(0, 6).map(item => <button type="button" key={item.id} onClick={() => onSelectFormula(item.id)}><span>{item.matchedTerms.join(" · ")}</span><b>{item.name}</b><small>{item.sourceTitle}{item.structuralNote ? ` · ${item.structuralNote}` : ""}</small></button>)}</> : <p>没有同时匹配的方目。可尝试减少关键词，或切换为“命中任一词”。</p>}</div> : <p className="tool-empty">输入至少一个药名、条文症候词或结构关键词后开始检索。</p>}
        </section>

        <section className="formula-tool-card measure-tool-card">
          <header><Calculator size={18} /><div><h3>古今衡重换算</h3><p>支持两、铢、斤及升、合、斗；每次换算均保留所选研究口径。</p></div></header>
          <div className="measure-controls"><label><span>原文数值</span><input value={measureAmount} onChange={event => onMeasureAmountChange(event.target.value)} type="number" min="0" step="any" inputMode="decimal" /></label><label><span>原文单位</span><select value={measureUnit} onChange={event => onMeasureUnitChange(event.target.value as AncientMeasureUnit)}>{ancientMeasureUnits.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></label></div>
          {ancientMeasureUnits.find(unit => unit.value === measureUnit)?.kind === "weight" ? <label className="measure-standard"><span>研究口径</span><select value={weightStandardId} onChange={event => onWeightStandardChange(event.target.value as (typeof weightStandards)[number]["id"])}>{weightStandards.map(standard => <option key={standard.id} value={standard.id}>{standard.label}</option>)}</select></label> : <p className="measure-standard-note">容量采用研究资料中的东汉口径：1 升约 200 mL；固体药材的体积不能通用地换算为克。</p>}
          <div className="measure-result"><span>换算结果</span><b>≈ {formatConvertedValue(conversion.value)} {conversion.unit}</b><small>{conversion.formula}</small></div>
          <p className="measure-source">{conversion.standard.description} <a href={conversion.standard.sourceUrl} target="_blank" rel="noreferrer">查看来源：{conversion.standard.sourceLabel}</a></p>
          <p className="measure-disclaimer">此工具仅用于古籍计量与不同研究口径的学习对照。原方剂量、炮制、煎服法和个体情况均不可由通用换算推导；请勿据此自行调整或使用药物。</p>
        </section>

        <section className="formula-tool-card decoction-guide-card">
          <header><ListChecks size={18} /><div><h3>复方煎煮研读提示</h3><p>输入复方药味，生成“先煎、常规煎煮、后下、煎后核对”的学习流程草案；处方、药房标签和医嘱始终优先。</p></div></header>
          <label className="decoction-input"><span>复方药味</span><textarea value={decoctionIngredients} onChange={event => onDecoctionIngredientsChange(event.target.value)} placeholder="例如：附子、干姜、炙甘草、牡蛎；以顿号、逗号或换行分隔" maxLength={800} rows={3} /></label>
          <div className="decoction-actions">{selectedFormulaName && selectedIngredientNames.length ? <button type="button" className="decoction-fill" onClick={onUseSelectedFormula}>填入当前方剂：{selectedFormulaName}</button> : <span>从经方目录选择方剂后，可一键带入其组成药味。</span>}<button type="button" className="decoction-generate" onClick={onGenerateDecoctionGuide} disabled={!decoctionIngredients.trim()}>生成煎煮研读提示</button></div>
          {decoctionGuideOpen ? <div className="decoction-guide-result" aria-live="polite"><p className="decoction-notice">{decoctionGuide.notice}</p>{decoctionGuide.ingredients.length ? <p className="decoction-ingredients">已识别药味：{decoctionGuide.ingredients.join("、")}</p> : null}<ol>{decoctionGuide.stages.map((stage, index) => <li className={stage.emphasis === "attention" ? "is-attention" : ""} key={stage.id}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{stage.title}</b><p>{stage.body}</p></div></li>)}</ol><p className="decoction-sources">来源：{decoctionGuide.sources.map((source, index) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{index ? "；" : ""}{source.label}</a>)}</p></div> : <p className="tool-empty">生成结果会明确列出需要人工核对的特殊煎法，不自动决定煎煮时长、加水量、分服次数或服用时间。</p>}
        </section>
      </div>
    </section>
  );
}
