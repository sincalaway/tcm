import type { Message } from "@/components/AIChatBox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { BotMessageSquare, FileSearch, ListCollapse, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

const AIChatBox = lazy(() => import("@/components/AIChatBox").then((module) => ({ default: module.AIChatBox })));

type StudyContext = { kind: "本草" | "经方" | "古籍章节"; title: string; sourceTitle?: string; excerpt?: string; studyNote?: string; };
type Provider = "auto" | "builtin" | "local" | "network";

export function AiStudyAssistant({ context }: { context: StudyContext }) {
  const { isAuthenticated } = useAuth(); const utils = trpc.useUtils();
  const [open, setOpen] = useState(false); const [messages, setMessages] = useState<Message[]>([]); const [provider, setProvider] = useState<Provider>("auto"); const [conversationId, setConversationId] = useState<number | undefined>(); const [summary, setSummary] = useState(""); const [historySearch, setHistorySearch] = useState(""); const [knowledgeIds, setKnowledgeIds] = useState<number[]>([]);
  const providersQuery = trpc.aiStudy.providers.useQuery(undefined, { enabled: isAuthenticated && open });
  const conversationsQuery = trpc.aiStudy.conversations.list.useQuery({ context: { kind: context.kind, title: context.title } }, { enabled: isAuthenticated && open });
  const conversationQuery = trpc.aiStudy.conversations.get.useQuery({ id: conversationId ?? 0 }, { enabled: Boolean(conversationId) && open });
  const historySearchInput = useMemo(() => ({ query: historySearch.trim() }), [historySearch]);
  const historySearchQuery = trpc.aiStudy.conversations.search.useQuery(historySearchInput, { enabled: isAuthenticated && open && historySearch.trim().length > 0 });
  const knowledgeQuery = trpc.study.knowledge.list.useQuery(undefined, { enabled: isAuthenticated && open });
  useEffect(() => { if (!conversationQuery.data) return; setMessages(conversationQuery.data.messages.map((message) => ({ role: message.role, content: message.content }))); setSummary(conversationQuery.data.summary?.content ?? ""); }, [conversationQuery.data]);
  useEffect(() => { setConversationId(undefined); setMessages([]); setSummary(""); setHistorySearch(""); }, [context.kind, context.title]);
  const explainMutation = trpc.aiStudy.explain.useMutation({
    onSuccess: async (result) => { setConversationId(result.conversationId); setMessages((current) => [...current, { role: "assistant", content: typeof result.answer === "string" ? result.answer : "学习助手未返回可显示的文字内容，请换一种问法再试。" }]); await utils.aiStudy.conversations.list.invalidate(); },
    onError: (error) => setMessages((current) => [...current, { role: "assistant", content: `暂时无法生成学习说明：${error.message}` }]),
  });
  const deleteConversation = trpc.aiStudy.conversations.delete.useMutation({ onSuccess: async () => { setConversationId(undefined); setMessages([]); await utils.aiStudy.conversations.list.invalidate(); } });
  const generateSummary = trpc.aiStudy.summaries.generate.useMutation({ onSuccess: async (result) => { setSummary(result.summary.content); await Promise.all([utils.aiStudy.conversations.get.invalidate(), utils.aiStudy.conversations.list.invalidate()]); } });
  const availableProviders: Array<{ value: Provider; label: string }> = [{ value: "auto", label: providersQuery.data?.local || providersQuery.data?.network ? "自动选择（优先外部端点）" : "自动选择（内置服务）" }, { value: "builtin", label: "内置学习服务" }, ...(providersQuery.data?.local ? [{ value: "local" as const, label: "本地 OpenAI 兼容端点" }] : []), ...(providersQuery.data?.network ? [{ value: "network" as const, label: "网络 API" }] : [])];

  function sendQuestion(question: string) { if (!isAuthenticated) { startLogin(); return; } setMessages((current) => [...current, { role: "user", content: question }]); explainMutation.mutate({ context, question, provider, conversationId, knowledgeDocumentIds: knowledgeIds }); }
  function selectConversation(id: number | undefined) { setConversationId(id); if (!id) { setMessages([]); setSummary(""); } }
  if (!isAuthenticated) return <button className="ai-study-trigger" type="button" onClick={startLogin}><Sparkles size={15} /> 登录后向学习助手提问</button>;

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button className="ai-study-trigger" type="button"><BotMessageSquare size={15} /> 询问本页学习助手</button></DialogTrigger>
    <DialogContent className="ai-study-dialog" showCloseButton>
      <DialogHeader><DialogTitle>本页学习助手 · {context.title}</DialogTitle><DialogDescription>仅解释当前页面提供的文献线索与学习结构，不提供诊疗、处方、剂量或用药建议。</DialogDescription></DialogHeader>
      <div className="ai-provider-row"><label htmlFor="ai-provider">学习服务</label><select id="ai-provider" value={provider} onChange={(event) => setProvider(event.target.value as Provider)} disabled={providersQuery.isLoading || explainMutation.isPending}>{availableProviders.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>{providersQuery.isLoading ? "正在读取可用服务……" : "未配置的本地或网络端点不会显示，系统会安全回退。"}</small></div>
      <div className="ai-conversation-row"><label htmlFor="ai-conversation">本页历史</label><select id="ai-conversation" value={conversationId ?? ""} onChange={(event) => selectConversation(event.target.value ? Number(event.target.value) : undefined)} disabled={conversationsQuery.isLoading || explainMutation.isPending}><option value="">新对话</option>{conversationsQuery.data?.map((conversation) => <option value={conversation.id} key={conversation.id}>{new Date(conversation.updatedAt).toLocaleString("zh-CN")} · {conversation.title}</option>)}</select><button type="button" onClick={() => selectConversation(undefined)} title="新建对话"><Plus size={14} /> 新对话</button>{conversationId ? <button type="button" onClick={() => deleteConversation.mutate({ id: conversationId })} disabled={deleteConversation.isPending} title="删除当前对话"><Trash2 size={14} /> 删除</button> : null}<small>历史仅保存于你的个人书案；每次回答只引用当前条目和最近 8 条对话。</small></div>
      <div className="ai-history-search"><Search size={15} /><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} maxLength={80} placeholder="检索个人历史对话关键词" aria-label="检索个人历史对话关键词" />{historySearch.trim() ? <div>{historySearchQuery.isLoading ? <small>检索中……</small> : historySearchQuery.data?.map((item) => <button type="button" key={item.id} onClick={() => { selectConversation(item.id); setHistorySearch(""); }}><b>{item.title}</b><span>{item.matchedSnippet}</span></button>)}{!historySearchQuery.isLoading && !historySearchQuery.data?.length ? <small>未找到相符历史</small> : null}</div> : null}</div>
      {knowledgeQuery.data?.length ? <fieldset className="ai-knowledge-citations"><legend>引用我的知识库（最多 3 份）</legend>{knowledgeQuery.data.filter((document) => document.textPreview).map((document) => <label key={document.id}><input type="checkbox" checked={knowledgeIds.includes(document.id)} disabled={!knowledgeIds.includes(document.id) && knowledgeIds.length >= 3} onChange={() => setKnowledgeIds((ids) => ids.includes(document.id) ? ids.filter((id) => id !== document.id) : [...ids, document.id])} />《{document.title}》</label>)}</fieldset> : null}
      {conversationId ? <div className="ai-summary-panel"><div><ListCollapse size={15} /><b>长对话学习摘要</b><small>{summary ? "摘要会作为下一轮连续学习的受控线索。" : "尚未生成；可在较长对话后手动整理。"}</small></div><button type="button" disabled={generateSummary.isPending || !messages.length} onClick={() => generateSummary.mutate({ conversationId, provider })}>生成摘要</button>{summary ? <p>{summary}</p> : null}</div> : null}
      <Suspense fallback={<p className="ai-study-loading">正在展开学习助手……</p>}><AIChatBox messages={messages} onSendMessage={sendQuestion} isLoading={explainMutation.isPending || conversationQuery.isLoading || generateSummary.isPending} height="370px" placeholder="例如：这段条文可以从哪些关键词继续查阅？" emptyStateMessage="从本页条文、药味或章节结构开始提问" suggestedPrompts={["概括本页的学习线索", "哪些关键词适合继续查原典？", "请帮我区分条文、药味与出处信息"]} className="ai-study-chat" /></Suspense>
    </DialogContent>
  </Dialog>;
}
