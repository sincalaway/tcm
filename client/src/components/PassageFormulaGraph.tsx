import { Network, Pointer } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { buildPassageFormulaGraph, type PassageGraphNode } from "@shared/passageFormulaGraph";
import type { PassageMatrixRecord } from "@shared/passageComparisonMatrix";

function shortLabel(value: string) {
  return value.length > 12 ? `${value.slice(0, 11)}…` : value;
}

export function PassageFormulaGraph({ records }: { records: PassageMatrixRecord[] }) {
  const [relationFilter, setRelationFilter] = useState<"all" | "primary">("all");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const rawGraph = useMemo(() => buildPassageFormulaGraph(records), [records]);
  const graph = useMemo(() => {
    const links = relationFilter === "primary" ? rawGraph.links.filter(link => link.relationType === "primary") : rawGraph.links;
    const connected = new Set(links.flatMap(link => [link.source, link.target]));
    return { ...rawGraph, links, nodes: rawGraph.nodes.filter(node => node.kind === "passage" || connected.has(node.id)) };
  }, [rawGraph, relationFilter]);
  const activeNode = graph.nodes.find(node => node.id === activeNodeId) ?? null;
  const activeLinks = activeNode ? graph.links.filter(link => link.source === activeNode.id || link.target === activeNode.id) : graph.links;
  const activeNodeIds = new Set(activeLinks.flatMap(link => [link.source, link.target]));
  const passages = graph.nodes.filter(node => node.kind === "passage");
  const formulas = graph.nodes.filter(node => node.kind === "formula");
  const height = Math.max(280, Math.max(passages.length, formulas.length) * 94 + 98);
  const positions = new Map<string, { x: number; y: number }>();
  passages.forEach((node, index) => positions.set(node.id, { x: 164, y: 70 + index * (height - 140) / Math.max(1, passages.length - 1) }));
  formulas.forEach((node, index) => positions.set(node.id, { x: 716, y: 70 + index * (height - 140) / Math.max(1, formulas.length - 1) }));

  function selectNode(node: PassageGraphNode) {
    setActiveNodeId(current => current === node.id ? null : node.id);
  }

  return <section className="passage-formula-graph" aria-label="条文与经方关联图谱">
    <header><div><span>关系图谱</span><h3>条文—经方关联可视化</h3><p>以已选条文与站内维护的方剂映射为节点和连线，直观查看一条文对多方、或多条文关联同一方的目录结构。</p></div><Network size={24} strokeWidth={1.3} /></header>
    <p className="passage-graph-notice">{rawGraph.notice}</p>
    <div className="passage-graph-controls"><label className="facet-select"><span>显示关系</span><select value={relationFilter} onChange={event => { setRelationFilter(event.target.value as "all" | "primary"); setActiveNodeId(null); }}><option value="all">全部目录关联</option><option value="primary">仅主关联</option></select></label><p><i className="passage-graph-dot passage" />条文 <i className="passage-graph-dot formula" />方剂 <Pointer size={13} />点击节点高亮其连线</p></div>
    {graph.links.length ? <><div className="passage-graph-stage"><svg viewBox={`0 0 880 ${height}`} role="img" aria-label="已选伤寒论条文与站内关联方剂的网络图"><text x="164" y="26" textAnchor="middle" className="graph-column-label">已选条文</text><text x="716" y="26" textAnchor="middle" className="graph-column-label">关联方剂</text><g className="graph-links">{graph.links.map(link => { const from = positions.get(link.source)!; const to = positions.get(link.target)!; const dimmed = Boolean(activeNode && !activeLinks.some(item => item.id === link.id)); return <path key={link.id} d={`M ${from.x + 98} ${from.y} C 385 ${from.y}, 495 ${to.y}, ${to.x - 98} ${to.y}`} className={dimmed ? "is-dimmed" : activeNode ? "is-active" : ""}><title>{`${link.relationType}${link.studyNote ? `：${link.studyNote}` : ""}`}</title></path>; })}</g><g className="graph-nodes">{graph.nodes.map(node => { const position = positions.get(node.id)!; const dimmed = Boolean(activeNode && !activeNodeIds.has(node.id)); return <g key={node.id} transform={`translate(${position.x} ${position.y})`} className={`${node.kind} ${activeNodeId === node.id ? "is-selected" : ""} ${dimmed ? "is-dimmed" : ""}`} role="button" tabIndex={0} aria-label={`${node.kind === "passage" ? "条文" : "方剂"}：${node.label}`} onClick={() => selectNode(node)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node); } }}><rect x="-98" y="-25" width="196" height="50" rx="4" /><text textAnchor="middle" y="-3">{shortLabel(node.label)}</text><text textAnchor="middle" y="14">{shortLabel(node.meta)}</text><title>{`${node.label}：${node.meta}`}</title></g>; })}</g></svg></div>{activeNode ? <GraphDetail node={activeNode} records={records} links={activeLinks} onClear={() => setActiveNodeId(null)} /> : <p className="passage-graph-empty">选择一个节点，可查看它在当前对读范围内的关联数量与目录入口。</p>}</> : <p className="passage-graph-empty">在当前关系筛选下，所选条文没有已维护的方剂映射；图谱不会从症状词或注家摘要自动补线。</p>}
  </section>;
}

function GraphDetail({ node, records, links, onClear }: { node: PassageGraphNode; records: PassageMatrixRecord[]; links: ReturnType<typeof buildPassageFormulaGraph>["links"]; onClear: () => void }) {
  const count = links.length;
  const passage = node.passageId ? records.find(record => record.id === node.passageId) : undefined;
  return <div className="passage-graph-detail"><div><b>{node.label}</b><span>{node.meta}</span><p>当前筛选下关联 {count} 条目录连线；连线类型与研读备注可悬停查看。</p></div>{passage ? <Link href={`/guji?classic=shang-han-lun&chapter=${encodeURIComponent(passage.chapterTitle)}&passage=${passage.passageNumber}`}>在站内阅读条文</Link> : <Link href="/jingfang">在经方页继续检索</Link>}<button type="button" onClick={onClear}>取消高亮</button></div>;
}
