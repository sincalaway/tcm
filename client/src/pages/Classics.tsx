/**
 * 宋刻书斋：古籍页营造目录签和展开书页的关系，保留外部原文入口以回到可追溯来源。
 */
import { BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { PageMasthead } from "@/components/SiteChrome";
import { ExternalSource, InkStamp, RuleLabel } from "@/components/StudyElements";
import { classics, type Classic } from "@/data/tcmContent";

export default function Classics() {
  const [location] = useLocation();
  const initial = new URLSearchParams(location.split("?")[1] ?? "").get("book") ?? classics[0].id;
  const [selectedId, setSelectedId] = useState(classics.some((item) => item.id === initial) ? initial : classics[0].id);
  const selected = classics.find((item) => item.id === selectedId) ?? classics[0];
  return (
    <main className="inner-page">
      <PageMasthead index="丙 · 古籍文献" title="从一段原文，回到一部书" lead="以典籍、篇章与摘录组织阅读；原文入口保留在每部书的详情页。" />
      <section className="archive-layout">
        <aside className="archive-spine" aria-label="古籍目录">
          <div className="archive-spine-heading"><BookOpen size={20} strokeWidth={1.4} /><div><RuleLabel>藏书目录</RuleLabel><h2>医籍四种</h2></div></div>
          <div className="classic-tabs">
            {classics.map((classic, index) => <button key={classic.id} type="button" className={selectedId === classic.id ? "classic-tab active" : "classic-tab"} onClick={() => setSelectedId(classic.id)} aria-pressed={selectedId === classic.id}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{classic.title}</b><small>{classic.era} · {classic.category}</small></div><ChevronRight size={16} /></button>)}
          </div>
        </aside>
        <ClassicLeaf classic={selected} />
      </section>
      <section className="reading-method">
        <div><RuleLabel>读法建议</RuleLabel><h2>先知篇章，再读条文。</h2></div>
        <p>古籍中各版本、注本与标点或有差异；站内摘录只作为进入原文的书签。阅读原典和进行医学学习时，建议对照可靠版本与正规课程材料。</p>
      </section>
    </main>
  );
}

function ClassicLeaf({ classic }: { classic: Classic }) {
  return (
    <article className="classic-leaf paper-noise">
      <div className="leaf-head"><span>卷 · 文献研读</span><span>{classic.era}</span></div>
      <div className="leaf-title"><div><p className="eyebrow">{classic.category}</p><h2>{classic.title}</h2><p className="leaf-author">{classic.author}</p></div><InkStamp>阅</InkStamp></div>
      <p className="classic-summary">{classic.summary}</p>
      <div className="chapter-block"><RuleLabel>建议从这些篇章进入</RuleLabel><ol>{classic.chapters.map((chapter) => <li key={chapter}>{chapter}</li>)}</ol></div>
      <div className="passage-block"><RuleLabel>原文摘录</RuleLabel><blockquote>“{classic.passage}”</blockquote></div>
      <ExternalSource href={classic.sourceUrl}>前往公开原文阅览页 <ExternalLink size={14} /></ExternalSource>
    </article>
  );
}

