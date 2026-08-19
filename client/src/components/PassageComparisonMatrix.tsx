import { Columns3, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { buildPassageComparisonMatrix } from "@shared/passageComparisonMatrix";
import { PassageFormulaGraph } from "@/components/PassageFormulaGraph";
import { trpc } from "@/lib/trpc";

export function PassageComparisonMatrix() {
  const [filter, setFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const index = trpc.catalog.shangHanPassageIndex.useQuery();
  const matrix = trpc.catalog.shangHanPassageMatrix.useQuery(
    { passageIds: selectedIds },
    { enabled: selectedIds.length >= 2 }
  );
  const candidates = useMemo(() => {
    const keyword = filter.trim();
    const records = index.data ?? [];
    if (!keyword) return records.slice(0, 10);
    return records
      .filter(record =>
        `${record.chapterTitle} ${record.passageNumber} ${record.title} ${record.keywords ?? ""} ${record.excerpt}`.includes(keyword)
      )
      .slice(0, 12);
  }, [filter, index.data]);
  const selectedRecords = matrix.data ?? [];
  const rows = useMemo(
    () => buildPassageComparisonMatrix(selectedRecords),
    [selectedRecords]
  );

  function togglePassage(id: number) {
    setSelectedIds(current => {
      if (current.includes(id)) return current.filter(item => item !== id);
      if (current.length >= 4) return current;
      return current.concat(id);
    });
  }

  return (
    <section className="passage-comparison-matrix" aria-label="伤寒论夹杂证候与兼证矩阵对读">
      <header>
        <div>
          <span>并读矩阵</span>
          <h2>夹杂证候与兼证：多条文交叉对读</h2>
          <p>选取 2–4 条站内条文，在同一表格中比较原典词组、并见线索、注家评析、关联方剂、版本参照与出处。</p>
        </div>
        <Columns3 size={27} strokeWidth={1.25} />
      </header>
      <p className="passage-matrix-notice">
        矩阵只汇集已收录文本的横向信息，<b>不把不同条文自动拼合为合病、并病、兼证、夹杂证候或方证结论</b>；“合病／并病文字线索”仅显示条文中实际出现的标签词。
      </p>
      <div className="passage-matrix-picker">
        <label>
          <Search size={16} />
          <span className="sr-only">筛选用于矩阵的伤寒论条文</span>
          <input value={filter} onChange={event => setFilter(event.target.value)} placeholder="筛选章节、条文标题或关键词，例如：合病、下利、胸胁" />
        </label>
        <p>已选 <b>{selectedIds.length}</b>/4 条；至少选择 2 条后生成矩阵。</p>
      </div>
      <div className="passage-matrix-options" aria-live="polite">
        {index.isLoading ? <p>正在读取《伤寒论》条文索引……</p> : candidates.length ? candidates.map(record => {
          const checked = selectedIds.includes(record.id);
          const blocked = !checked && selectedIds.length >= 4;
          return <button key={record.id} type="button" className={checked ? "active" : ""} aria-pressed={checked} disabled={blocked} onClick={() => togglePassage(record.id)}>
            <span>{checked ? "已选" : "选择"}</span>
            <b>{record.chapterTitle} · 第{record.passageNumber}条</b>
            <small>{record.title}</small>
          </button>;
        }) : <p>没有匹配条文。可尝试“合病”“下利”“胸胁”等站内关键词。</p>}
      </div>
      {selectedIds.length ? <div className="passage-matrix-selected">
        <b>当前对读：</b>
        {selectedIds.map(id => {
          const record = (index.data ?? []).find(item => item.id === id);
          return record ? <button type="button" key={id} onClick={() => togglePassage(id)}>{record.title}<X size={12} /></button> : null;
        })}
      </div> : null}
      {selectedIds.length >= 2 ? <div className="passage-matrix-output" aria-live="polite">
        {matrix.isFetching ? <p>正在编排多条文对读矩阵……</p> : selectedRecords.length ? <>
          <div className="passage-matrix-scroll">
            <table>
              <thead><tr><th scope="col">对读维度</th>{selectedRecords.map(record => <th scope="col" key={record.id}>
                <span>{record.chapterTitle} · 第{record.passageNumber}条</span>
                <Link href={`/guji?classic=shang-han-lun&chapter=${encodeURIComponent(record.chapterTitle)}&passage=${record.passageNumber}`}>{record.title}</Link>
              </th>)}</tr></thead>
              <tbody>{rows.map(row => <tr key={row.id}>
                <th scope="row"><b>{row.label}</b><small>{row.description}</small></th>
                {row.cells.map(({ passageId, cell }) => <td key={passageId}>
                  <b>{cell.primary}</b>
                  {cell.details.map(detail => row.id === "source" && detail.startsWith("http")
                    ? <a key={detail} href={detail} target="_blank" rel="noreferrer">打开来源</a>
                    : <small key={detail}>{detail}</small>)}
                  {cell.links?.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}
                </td>)}
              </tr>)}</tbody>
            </table>
          </div>
          <PassageFormulaGraph records={selectedRecords} />
        </> : <p>未能读取所选条文；请重新选择站内《伤寒论》条目。</p>}
      </div> : <div className="passage-matrix-empty"><Columns3 size={18} /><p>请选择任意两条条文后开始横向对读。手机端矩阵会保持列结构，可横向滚动查看。</p></div>}
    </section>
  );
}
