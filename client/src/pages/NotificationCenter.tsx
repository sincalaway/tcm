import { BellRing, CalendarDays, Check, CheckCheck, Filter, Inbox, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type NotificationStatus = "all" | "unread" | "read";

export default function NotificationCenter() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<NotificationStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const filters = useMemo(() => ({ status, from: from ? new Date(`${from}T00:00:00`) : undefined, to: to ? new Date(`${to}T23:59:59`) : undefined }), [status, from, to]);
  const notifications = trpc.study.notifications.list.useQuery(filters);
  const markSeen = trpc.study.reminders.markSeen.useMutation({ onSuccess: () => void utils.study.notifications.list.invalidate() });
  const markAllSeen = trpc.study.notifications.markAllSeen.useMutation({ onSuccess: async () => { setSelectedIds([]); await utils.study.notifications.list.invalidate(); } });
  const removeNotifications = trpc.study.notifications.delete.useMutation({ onSuccess: async () => { setSelectedIds([]); await utils.study.notifications.list.invalidate(); } });
  const unreadCount = notifications.data?.filter((item) => !item.seenAt).length ?? 0;
  const visibleIds = notifications.data?.map((item) => item.id) ?? [];
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const toggleSelected = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleVisible = () => setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds])));

  return <main className="notification-page">
    <header className="notification-header"><div><p className="eyebrow">书案消息 · 复习提醒</p><h1>通知中心</h1><p>集中查看每一则到期复习记录；筛选和已阅状态只作用于当前登录用户。</p></div><Link href="/shuzhai">返回我的书案</Link></header>
    <section className="notification-toolbar" aria-label="通知筛选"><div><Filter size={17} /><label>状态<select value={status} onChange={(event) => setStatus(event.target.value as NotificationStatus)}><option value="all">全部记录</option><option value="unread">待阅</option><option value="read">已阅</option></select></label></div><label><CalendarDays size={16} />起始<input value={from} onChange={(event) => setFrom(event.target.value)} type="date" /></label><label><CalendarDays size={16} />截至<input value={to} onChange={(event) => setTo(event.target.value)} type="date" /></label><span>{unreadCount} 则待阅</span>{visibleIds.length ? <label className="notification-select-all"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} />全选当前结果</label> : null}{unreadCount ? <button type="button" onClick={() => markAllSeen.mutate()} disabled={markAllSeen.isPending}><CheckCheck size={14} />全部标为已阅</button> : null}{selectedIds.length ? <button className="notification-delete-selected" type="button" onClick={() => { if (window.confirm(`确认删除选中的 ${selectedIds.length} 则通知吗？`)) removeNotifications.mutate({ eventIds: selectedIds }); }} disabled={removeNotifications.isPending}><Trash2 size={14} />删除已选（{selectedIds.length}）</button> : null}</section>
    <section className="notification-list" aria-live="polite">
      {notifications.isLoading ? <p className="notification-empty">正在翻检书案消息……</p> : notifications.data?.map((item) => <article className={item.seenAt ? "notification-item seen" : "notification-item unread"} key={item.id}><label className="notification-select"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} aria-label={`选择${item.title}`} /></label><div className="notification-seal">{item.seenAt ? <Check size={18} /> : <BellRing size={18} />}</div><div><p>{item.seenAt ? "已阅记录" : "待复习"}</p><h2>{item.title}</h2><small>{item.goalTitle ?? "独立复习主题"} · 到期 {new Date(item.dueAt).toLocaleString("zh-CN")}</small>{item.seenAt ? <small>已阅于 {new Date(item.seenAt).toLocaleString("zh-CN")}</small> : null}</div><div className="notification-item-actions">{!item.seenAt ? <button type="button" disabled={markSeen.isPending} onClick={() => markSeen.mutate({ eventId: item.id })}>标为已阅</button> : <span className="notification-status">已归档</span>}<button className="notification-delete-one" type="button" onClick={() => { if (window.confirm("确认删除这则通知吗？")) removeNotifications.mutate({ eventIds: [item.id] }); }} disabled={removeNotifications.isPending} title="删除通知"><Trash2 size={14} /></button></div></article>)}
      {!notifications.isLoading && !notifications.data?.length ? <div className="notification-empty"><Inbox size={26} /><b>暂无相符提醒</b><span>你设置的定期复习提醒在到期后会显示在这里。</span></div> : null}
    </section>
  </main>;
}
