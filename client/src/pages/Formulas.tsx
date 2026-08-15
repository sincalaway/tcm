/**
 * 宋刻书斋：经方页通过条文出处、药味与结构三层展开；辰砂印只标识文献研读状态。
 */
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageMasthead } from "@/components/SiteChrome";
import { ExternalSource, InkStamp, RuleLabel, StudyDetail } from "@/components/StudyElements";
import { formulas, type Formula } from "@/data/tcmContent";

const sourceUrl = "https://zh.wikisource.org/wiki/%E5%82%B7%E5%AF%92%E8%AB%96";

export default function Formulas() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(formulas[0].id);
  const matches = useMemo(() => formulas.filter((formula) => `${formula.name}${formula.source}${formula.index}${formula.ingredients.join("")}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = formulas.find((formula) => formula.id === selectedId) ?? matches[0] ?? formulas[0];

  return (
    <main className="inner-page">
      <PageMasthead index="乙 · 经方研读" title="经方详情查询" lead="以出处为锚，以药味为线，观察方剂结构与原文语境。" />
      <section className="study-board formula-board">
        <div className="study-list-panel">
          <div className="panel-heading"><div><RuleLabel>方目</RuleLabel><h2>经方索引</h2></div><span className="result-count">{matches.length} 方</span></div>
          <label className="index-search"><Search size={18} aria-hidden="true" /><span className="sr-only">检索经方条目</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="检索方名、出处或药味" /></label>
          <div className="formula-list">
            {matches.map((formula, index) => <FormulaRow key={formula.id} formula={formula} index={index} active={formula.id === selected.id} onChoose={() => setSelectedId(formula.id)} />)}
            {matches.length === 0 && <p className="empty-note">未找到相符方剂。可尝试“桂枝”“伤寒论”或“茯苓”。</p>}
          </div>
        </div>
        <FormulaDetail formula={selected} />
      </section>
      <aside className="method-note"><InkStamp>阅方次第</InkStamp><p>先确认原典出处与条文，再观察药味组合与上下文。页面仅作文本学习，不替代辨证、配伍或用药决策。</p><ExternalSource href={sourceUrl}>打开《伤寒论》原文阅览入口</ExternalSource></aside>
    </main>
  );
}

function FormulaRow({ formula, index, active, onChoose }: { formula: Formula; index: number; active: boolean; onChoose: () => void }) {
  return <button className={active ? "formula-row active" : "formula-row"} type="button" onClick={onChoose} aria-pressed={active}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{formula.name}</b><small>{formula.source}</small></div><i>{formula.index.split(" · ")[0]}</i></button>;
}

function FormulaDetail({ formula }: { formula: Formula }) {
  return (
    <StudyDetail title={formula.name} meta={formula.source}>
      <div className="detail-callout"><span>经典方剂研读</span><InkStamp>方</InkStamp></div>
      <div className="detail-section"><RuleLabel>原文线索</RuleLabel><blockquote className="classic-quote">“{formula.origin}”</blockquote></div>
      <div className="detail-section"><RuleLabel>组成药味</RuleLabel><div className="ingredient-list">{formula.ingredients.map((item, index) => <span key={item}><i>{index + 1}</i>{item}</span>)}</div></div>
      <div className="detail-section"><RuleLabel>结构提示</RuleLabel><p>{formula.structure}</p></div>
      <p className="caution-copy">{formula.note}</p>
    </StudyDetail>
  );
}

