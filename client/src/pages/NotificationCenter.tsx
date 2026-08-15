import { BellRing, CalendarDays, Check, Filter, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type NotificationStatus = "all" | "unread" | "read";

export default function NotificationCenter() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<NotificationStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filters = useMemo(() => ({ status, from: from ? new Date(`${from}T00:00:00`) : undefined, to: to ? new Date(`${to}T23:59:59`) : undefined }), [status, from, to]);
  const notifications = trpc.study.notifications.list.useQuery(filters);
  const markSeen = trpc.study.reminders.markSeen.useMutation({ onSuccess: () => void utils.study.notifications.list.invalidate() });
  const markAllSeen = trpc.study.reminders.markAllSeen.useMutation({ onSuccess: () => void utils.study.notifications.list.invalidate() });
  const unreadCount = notifications.data?.filter((item) => !item.seenAt).length ?? 0;

  return <main className="notification-page">
    <header className="notification-header"><div><p className="eyebrow">书案消息 · 复习提醒</p><h1>通知中心</h1><p>集中查看每一则到期复习记录；筛选和已阅状态只作用于当前登录用户。</p></div><Link href="/shuzhai">返回我的书案</Link></header>
    <section className="notification-toolbar" aria-label="通知筛选"><div><Filter size={17} /><label>状态<select value={status} onChange={(event) => setStatus(event.target.value as NotificationStatus)}><option value="all">全部记录</option><option value="unread">待阅</option><option value="read">已阅</option></select></label></div><label><CalendarDays size={16} />起始<input value={from} onChange={(event) => setFrom(event.target.value)} type="date" /></label><label><CalendarDays size={16} />截至<input value={to} onChange={(event) => setTo(event.target.value)} type="date" /></label><span>{unreadCount} 则待阅</span>{unreadCount ? <button type="button" onClick={() => markAllSeen.mutate()} disabled={markAllSeen.isPending}>全部标为已阅</button> : null}</section>
    <section className="notification-list" aria-live="polite">
      {notifications.isLoading ? <p className="notification-empty">正在翻检书案消息……</p> : notifications.data?.map((item) => <article className={item.seenAt ? "notification-item seen" : "notification-item unread"} key={item.id}><div className="notification-seal">{item.seenAt ? <Check size={18} /> : <BellRing size={18} />}</div><div><p>{item.seenAt ? "已阅记录" : "待复习"}</p><h2>{item.title}</h2><small>{item.goalTitle ?? "独立复习主题"} · 到期 {new Date(item.dueAt).toLocaleString("zh-CN")}</small>{item.seenAt ? <small>已阅于 {new Date(item.seenAt).toLocaleString("zh-CN")}</small> : null}</div>{!item.seenAt ? <button type="button" disabled={markSeen.isPending} onClick={() => markSeen.mutate({ eventId: item.id })}>标为已阅</button> : <span className="notification-status">已归档</span>}</article>)}
      {!notifications.isLoading && !notifications.data?.length ? <div className="notification-empty"><Inbox size={26} /><b>暂无相符提醒</b><span>你设置的定期复习提醒在到期后会显示在这里。</span></div> : null}
    </section>
  </main>;
}
