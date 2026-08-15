/** 宋刻书斋：汇总本草、经方和古籍目录的跨库检索，避免用户在页面间反复切换。 */
import { Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { PageMasthead } from "@/components/SiteChrome";
import { RuleLabel } from "@/components/StudyElements";
import { trpc } from "@/lib/trpc";

export default function SearchPage() { const [value, setValue] = useState(""); const [query, setQuery] = useState(""); const results = trpc.catalog.search.useQuery({ query: query || "本草" }, { enabled: Boolean(query) }); function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setQuery(value.trim()); } return <main className="inner-page"><PageMasthead index="丁 · 全域检索" title="循词入卷" lead="同时检索本草、经方与古籍目录，将每个词引回对应的研读书页。" /><section className="global-search"><form onSubmit={submit}><Search size={24} /><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="输入药名、方名、古籍、作者或章节关键词" /><button type="submit">检索书斋</button></form>{!query ? <p>例如：桂枝、茯苓、伤寒论、痰饮。</p> : null}</section>{query ? <section className="search-columns"><SearchColumn title="本草条目" label="药味" items={results.data?.herbs ?? []} href="/bencao" /><SearchColumn title="经方条目" label="方目" items={results.data?.formulas ?? []} href="/jingfang" /><SearchColumn title="古籍目录" label="藏书" items={results.data?.classics ?? []} href="/guji" /></section> : null}</main>; }
function SearchColumn({ title, label, items, href }: { title: string; label: string; items: Array<{ id: number; name?: string | null; title?: string | null; category?: string | null; sourceTitle?: string | null }>; href: string }) { return <section className="search-column"><RuleLabel>{label}</RuleLabel><h2>{title}</h2>{items.map((item) => <Link key={item.id} href={`${href}?q=${encodeURIComponent(item.name ?? item.title ?? "")}`}><b>{item.name ?? item.title}</b><small>{item.category ?? item.sourceTitle}</small></Link>)}{!items.length ? <p>未找到相关条目。</p> : null}</section>; }
