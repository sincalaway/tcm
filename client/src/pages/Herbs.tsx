/**
 * 宋刻书斋：本草页以“目录签 + 详情书页”并列，强调检索与细读而非通用商品卡片。
 */
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { PageMasthead } from "@/components/SiteChrome";
import { ExternalSource, InkStamp, RuleLabel, StudyDetail } from "@/components/StudyElements";
import { herbs, officialPharmacopoeiaUrl, type Herb } from "@/data/tcmContent";

const categories = ["全部", ...Array.from(new Set(herbs.map((herb) => herb.category)))];

export default function Herbs() {
  const [location] = useLocation();
  const initialQuery = new URLSearchParams(location.split("?")[1] ?? "").get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("全部");
  const [selectedId, setSelectedId] = useState(herbs.find((herb) => herb.name === initialQuery)?.id ?? herbs[0].id);

  const matches = useMemo(() => herbs.filter((herb) => {
    const text = `${herb.name}${herb.pinyin}${herb.index}${herb.category}${herb.meridians}`.toLowerCase();
    return (category === "全部" || herb.category === category) && text.includes(query.toLowerCase());
  }), [category, query]);

  const selected = herbs.find((herb) => herb.id === selectedId) ?? matches[0] ?? herbs[0];

  return (
    <main className="inner-page">
      <PageMasthead index="甲 · 本草索引" title="中药详情查询" lead="以药名、类别或性味关键词进入一味药的学习书页。" />
      <section className="study-board">
        <div className="study-list-panel">
          <div className="panel-heading">
            <div><RuleLabel>目录</RuleLabel><h2>药味条目</h2></div>
            <span className="result-count">{matches.length} 味</span>
          </div>
          <label className="index-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">检索中药条目</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="检索药名、归经或功用" />
          </label>
          <div className="filter-row" aria-label="按类别筛选">
            {categories.map((item) => <button key={item} type="button" className={category === item ? "filter-chip active" : "filter-chip"} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <div className="record-list">
            {matches.map((herb, index) => <HerbRow key={herb.id} herb={herb} index={index} active={selected.id === herb.id} onChoose={() => setSelectedId(herb.id)} />)}
            {matches.length === 0 && <p className="empty-note">未找到相符药味。可尝试“桂枝”“补虚”或“脾经”。</p>}
          </div>
        </div>
        <HerbDetail herb={selected} />
      </section>
      <aside className="method-note">
        <InkStamp>资料提示</InkStamp>
        <p>本草条目用于学习索引。药材基原、质量标准和临床使用等信息请以最新版药典与合格专业人员意见为准。</p>
        <ExternalSource href={officialPharmacopoeiaUrl}>访问《中国药典》在线目录</ExternalSource>
      </aside>
    </main>
  );
}

function HerbRow({ herb, index, active, onChoose }: { herb: Herb; index: number; active: boolean; onChoose: () => void }) {
  return (
    <button className={active ? "record-row active" : "record-row"} type="button" onClick={onChoose} aria-pressed={active}>
      <span className="record-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="record-main"><b>{herb.name}</b><small>{herb.pinyin}</small></span>
      <span className="record-meta">{herb.category}</span>
    </button>
  );
}

function HerbDetail({ herb }: { herb: Herb }) {
  return (
    <StudyDetail title={herb.name} meta={herb.pinyin}>
      <div className="detail-callout"><span>{herb.category}</span><InkStamp>本草</InkStamp></div>
      <dl className="character-grid">
        <div><dt>性</dt><dd>{herb.nature}</dd></div>
        <div><dt>味</dt><dd>{herb.taste}</dd></div>
        <div><dt>归经</dt><dd>{herb.meridians}</dd></div>
        <div><dt>药用部位</dt><dd>{herb.part}</dd></div>
      </dl>
      <div className="detail-section"><RuleLabel>传统功用索引</RuleLabel><p className="large-detail-copy">{herb.index}</p></div>
      <div className="detail-section"><RuleLabel>研读提示</RuleLabel><p>{herb.note}</p></div>
      <div className="detail-source-line">点击左侧任一药味，即可切换详情书页。</div>
    </StudyDetail>
  );
}

