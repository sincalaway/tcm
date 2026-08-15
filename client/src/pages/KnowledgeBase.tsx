import { Download, FileText, Search, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const MAX_BYTES = 5 * 1024 * 1024;
const supportedMimeTypes = new Set(["text/plain", "text/markdown", "application/pdf"]);

function inferMimeType(file: File) {
  if (supportedMimeTypes.has(file.type)) return file.type;
  const name = file.name.toLocaleLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "text/markdown";
  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "";
}

export default function KnowledgeBase() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const input = useMemo(() => ({ query: query.trim() || undefined }), [query]);
  const documents = trpc.study.knowledge.list.useQuery(input);
  const upload = trpc.study.knowledge.upload.useMutation({ onSuccess: async () => { setStatus("文档已收入个人知识库。"); await utils.study.knowledge.list.invalidate(); }, onError: (error) => setStatus(`上传未完成：${error.message}`) });
  const download = trpc.study.knowledge.download.useMutation({ onSuccess: (result) => window.open(result.storageUrl, "_blank", "noopener,noreferrer") });
  const remove = trpc.study.knowledge.delete.useMutation({ onSuccess: () => void utils.study.knowledge.list.invalidate() });

  function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const mimeType = inferMimeType(file);
    if (!mimeType) { setStatus("仅支持 TXT、Markdown 或 PDF 文件。"); return; }
    if (file.size > MAX_BYTES) { setStatus("文件不能超过 5MB。"); return; }
    const reader = new FileReader();
    reader.onload = () => { const dataUrl = typeof reader.result === "string" ? reader.result : ""; const base64 = dataUrl.split(",")[1]; if (!base64) { setStatus("无法读取该文件。"); return; } upload.mutate({ fileName: file.name, mimeType: mimeType as "text/plain" | "text/markdown" | "application/pdf", base64 }); };
    reader.onerror = () => setStatus("无法读取该文件。"); reader.readAsDataURL(file);
  }

  return <main className="knowledge-page">
    <header className="knowledge-header"><div><p className="eyebrow">个人资料夹 · 受保护存储</p><h1>知识库</h1><p>上传个人学习资料，用于整理与检索；文件仅在你的知识库记录中显示，不会自动作为 AI 的对话上下文。</p></div><Link href="/shuzhai">返回我的书案</Link></header>
    <section className="knowledge-upload-panel"><div><Upload size={21} /><div><b>收入学习资料</b><small>支持 TXT、Markdown 与 PDF，单文件不超过 5MB。</small></div></div><label className="knowledge-upload-button"><input type="file" accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf" onChange={uploadFile} disabled={upload.isPending} />{upload.isPending ? "正在存入……" : "选择文件"}</label>{status ? <p>{status}</p> : null}</section>
    <section className="knowledge-toolbar"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} placeholder="按标题或文本摘录检索个人资料" aria-label="检索个人知识库" /><span>{documents.data?.length ?? 0} 份资料</span></section>
    <section className="knowledge-list" aria-live="polite">{documents.isLoading ? <p className="knowledge-empty">正在打开资料夹……</p> : documents.data?.map((document) => <article key={document.id}><FileText size={21} /><div><h2>{document.title}</h2><small>{document.mimeType === "application/pdf" ? "PDF" : document.mimeType === "text/markdown" ? "Markdown" : "TXT"} · {(document.sizeBytes / 1024).toFixed(1)} KB · 更新于 {new Date(document.updatedAt).toLocaleString("zh-CN")}</small>{document.textPreview ? <p>{document.textPreview.slice(0, 220)}{document.textPreview.length > 220 ? "…" : ""}</p> : <p>PDF 文件仅保留安全元数据与下载入口，不在页面解析正文。</p>}</div><div className="knowledge-actions"><button type="button" onClick={() => download.mutate({ id: document.id })} disabled={download.isPending} title="打开文件"><Download size={15} /></button><button type="button" onClick={() => remove.mutate({ id: document.id })} disabled={remove.isPending} title="从知识库移除"><Trash2 size={15} /></button></div></article>)}{!documents.isLoading && !documents.data?.length ? <div className="knowledge-empty"><FileText size={27} /><b>{query ? "未找到匹配资料" : "资料夹尚未收录文件"}</b><span>{query ? "可调整关键词重新检索。" : "上传一份 TXT、Markdown 或 PDF 学习资料开始整理。"}</span></div> : null}</section>
  </main>;
}
