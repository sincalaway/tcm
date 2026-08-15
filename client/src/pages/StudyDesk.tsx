/** 宋刻书斋：登录后以内置账户布局承载个人收藏、笔记和最近阅读进度。 */
import { Award, Bookmark, NotebookPen, ScrollText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function StudyDesk() {
  const desk = trpc.study.desk.useQuery();
  const overview = trpc.study.overview.useQuery();
  const data = desk.data;
  const metrics = overview.data;

  return <div className="desk-page">
    <header><p>我的书案</p><h1>书签、朱批与续读</h1><span>所有记录仅归当前登录用户所有。</span></header>
    <section className="desk-overview" aria-label="学习成就概览"><div><p>研读概览</p><h2>将零散书页，续成自己的阅读次第。</h2></div><Award size={28} strokeWidth={1.25} /><div className="desk-overview-metrics"><span><b>{metrics?.completedPathCount ?? 0}/3</b><small>已完成路线</small></span><span><b>{metrics?.averageReadingProgress ?? 0}%</b><small>平均阅读</small></span><span><b>{(metrics?.savedCount ?? 0) + (metrics?.noteCount ?? 0)}</b><small>书签与朱批</small></span></div></section>
    {desk.isLoading ? <p className="desk-loading">正在铺开你的书案……</p> : <div className="desk-grid">
      <section><div className="desk-section-title"><Bookmark size={18} /><h2>我的收藏</h2><span>{data?.saved.length ?? 0}</span></div>{data?.saved.map((item) => item.resource ? <Link className="desk-row" key={item.id} href={item.resource.href}><b>{item.resource.title}</b><small>{item.resource.kind} · {item.resource.subtitle ?? "学习条目"}</small></Link> : <div className="desk-row" key={item.id}><b>已归档条目</b><small>原始条目已不可用</small></div>)}{!data?.saved.length ? <p className="desk-empty">在任一详情书页点击“收入书签”，收藏会出现在这里。</p> : null}</section>
      <section><div className="desk-section-title"><NotebookPen size={18} /><h2>最近笔记</h2><span>{data?.notes.length ?? 0}</span></div>{data?.notes.slice(0, 6).map((note) => <article className="desk-note" key={note.id}><b>{note.title}</b><p>{note.body}</p><small>{new Date(note.updatedAt).toLocaleString("zh-CN")}</small></article>)}{!data?.notes.length ? <p className="desk-empty">从本草、经方或古籍详情页添加你的第一则研读笔记。</p> : null}</section>
      <section><div className="desk-section-title"><ScrollText size={18} /><h2>续读进度</h2><span>{data?.progress.length ?? 0}</span></div>{data?.progress.map((item) => <Link className="desk-progress" key={item.id} href="/guji"><div><b>{item.classicTitle ?? "古籍研读"}</b><span>{item.progressPercent}%</span></div><small>{item.chapterTitle ? `已读至：${item.chapterTitle}` : "已记录阅读位置"} · {new Date(item.lastReadAt).toLocaleDateString("zh-CN")}</small><i><em style={{ width: `${item.progressPercent}%` }} /></i></Link>)}{!data?.progress.length ? <p className="desk-empty">在古籍阅读页标记读至何处，进度会自动记录。</p> : null}</section>
    </div>}
  </div>;
}
