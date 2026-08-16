import { BookMarked, Search, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const perspectives = [
  { id: "all", label: "不预设角度", helper: "仅按输入词检索。" },
  { id: "cold-heat", label: "寒热感受", helper: "扩展恶寒、发热、寒热等条文词。" },
  { id: "sweat-fluid", label: "汗出与津液", helper: "扩展汗出、无汗、口渴、小便等条文词。" },
  { id: "digestive", label: "饮食与腹部", helper: "扩展腹满、不能食、呕、下利等条文词。" },
  { id: "sleep-emotion", label: "睡眠与情志", helper: "扩展烦、不得眠、惊悸等条文词。" },
] as const;

type Perspective = (typeof perspectives)[number]["id"];

export function PassageLearningMatcher() {
  const [query, setQuery] = useState("");
  const [perspective, setPerspective] = useState<Perspective>("all");
  const [matchMode, setMatchMode] = useState<"all" | "any">("any");
  const activePerspective = perspectives.find(item => item.id === perspective) ?? perspectives[0];
  const result = trpc.catalog.shangHanPassageLearning.useQuery(
    { query: query.trim() || undefined, perspective, matchMode },
    { enabled: Boolean(query.trim()) || perspective !== "all" }
  );

  return (
    <section className="passage-learning-matcher" aria-label="体质自我观察与伤寒论条文学习匹配">
      <header>
        <div><span>条文线索台</span><h2>体质自我观察与《伤寒论》条文匹配</h2><p>把自我观察角度和症候词转化为站内条文索引，回到原典逐条阅读与核对。</p></div>
        <BookMarked size={27} strokeWidth={1.25} />
      </header>
      <p className="passage-learning-disclaimer"><ShieldAlert size={16} />中医体质判定有专门标准与专业流程。本工具只匹配本地条文标题、摘录和关键词，<b>不判定体质、不诊断疾病、不推荐经方或用药</b>；持续或严重不适请咨询合格医疗专业人员。</p>
      <div className="passage-learning-controls">
        <label className="passage-learning-input"><Search size={16} /><span className="sr-only">输入条文线索或自我观察词</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="例如：汗出、恶风、口渴；以空格、顿号或逗号分隔" maxLength={100} /></label>
        <label className="facet-select"><span>匹配方式</span><select value={matchMode} onChange={event => setMatchMode(event.target.value as "all" | "any")}><option value="any">命中任一线索</option><option value="all">同时命中全部线索</option></select></label>
      </div>
      <div className="perspective-options" role="group" aria-label="体质自我观察角度">{perspectives.map(item => <button type="button" key={item.id} className={perspective === item.id ? "active" : ""} onClick={() => setPerspective(item.id)}><b>{item.label}</b><small>{item.helper}</small></button>)}</div>
      <p className="perspective-helper">当前角度：{activePerspective.helper} 这只是在文本检索中补充关键词，不等同于体质结论。</p>
      {query.trim() || perspective !== "all" ? <div className="passage-learning-results" aria-live="polite">{result.isFetching ? <p>正在对照《伤寒论》条文关键词……</p> : result.data?.length ? <><p>得到 {result.data.length} 条学习线索。排序依据为标题、章节、关键词和摘录中的文本命中，不代表临床相关性或适用性。</p>{result.data.slice(0, 8).map(item => <article key={item.id}><div><span>{item.matchedTerms.join(" · ")}</span><h3>{item.title}</h3><p>{item.excerpt}</p><small>{item.sourceReference}</small></div><div className="passage-learning-links"><Link href={`/guji?classic=shang-han-lun&chapter=${encodeURIComponent(item.chapterTitle)}&passage=${item.passageNumber}`}>在站内阅读</Link><a href={item.sourceUrl} target="_blank" rel="noreferrer">原典来源</a></div></article>)}</> : <p>当前条文目录没有匹配项。可减少输入词、改为“命中任一线索”，或切换观察角度。</p>}</div> : <p className="passage-learning-empty">输入至少一个条文线索，或选择一个自我观察角度后开始对读。</p>}
    </section>
  );
}
