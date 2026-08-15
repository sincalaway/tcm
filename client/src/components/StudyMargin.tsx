/**
 * 宋刻书斋：以朱批边注承载个人收藏与学习笔记；所有写入均在登录后绑定当前用户。
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Bookmark, Loader2, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ResourceType = "herb" | "formula" | "classic" | "chapter";

export function StudyMargin({ resourceType, resourceId, resourceTitle }: { resourceType: ResourceType; resourceId: number; resourceTitle: string }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [draftOpen, setDraftOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const savedQuery = trpc.study.saved.list.useQuery(undefined, { enabled: isAuthenticated });
  const notesQuery = trpc.study.notes.list.useQuery({ resourceType, resourceId }, { enabled: isAuthenticated });
  const isSaved = Boolean(savedQuery.data?.some((item) => item.resourceType === resourceType && item.resourceId === resourceId));
  const saveMutation = trpc.study.saved.toggle.useMutation({
    onSuccess: ({ saved }) => {
      void utils.study.saved.list.invalidate();
      void utils.study.desk.invalidate();
      toast.success(saved ? "已收入我的收藏" : "已从收藏移除");
    },
  });
  const createMutation = trpc.study.notes.create.useMutation({
    onSuccess: () => {
      resetDraft();
      void utils.study.notes.list.invalidate();
      void utils.study.desk.invalidate();
      toast.success("笔记已保存到书案");
    },
    onError: (error) => toast.error(error.message || "笔记保存失败，请稍后重试"),
  });
  const updateMutation = trpc.study.notes.update.useMutation({
    onSuccess: () => {
      resetDraft();
      void utils.study.notes.list.invalidate();
      void utils.study.desk.invalidate();
      toast.success("笔记已更新");
    },
    onError: (error) => toast.error(error.message || "笔记更新失败，请稍后重试"),
  });
  const deleteMutation = trpc.study.notes.delete.useMutation({
    onSuccess: () => { void utils.study.notes.list.invalidate(); void utils.study.desk.invalidate(); toast.success("笔记已删除"); },
    onError: (error) => toast.error(error.message || "笔记删除失败，请稍后重试"),
  });
  const resetDraft = () => { setTitle(""); setBody(""); setEditingNoteId(null); setDraftOpen(false); };
  const beginEdit = (note: { id: number; title: string; body: string }) => { setEditingNoteId(note.id); setTitle(note.title); setBody(note.body); setDraftOpen(true); };
  const submitting = createMutation.isPending || updateMutation.isPending;

  if (!isAuthenticated) {
    return <aside className="study-margin"><NotebookPen size={18} strokeWidth={1.35} /><p>登录后可为“{resourceTitle}”留下朱批、加入收藏，并在书案中续读。</p><button type="button" onClick={() => startLogin()}>登录以记录</button></aside>;
  }

  return (
    <aside className="study-margin">
      <div className="study-margin-head"><span><NotebookPen size={16} /> 我的朱批</span><button type="button" className={isSaved ? "save-toggle saved" : "save-toggle"} onClick={() => saveMutation.mutate({ resourceType, resourceId })} disabled={saveMutation.isPending}><Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />{isSaved ? "已收藏" : "收入书签"}</button></div>
      {notesQuery.isLoading ? <p className="margin-status"><Loader2 size={14} className="spin" /> 正在展开笔记</p> : null}
      {notesQuery.data?.map((note) => <article className="margin-note" key={note.id}><div><b>{note.title}</b><span><button type="button" onClick={() => beginEdit(note)} aria-label="编辑笔记"><Pencil size={13} /></button><button type="button" onClick={() => deleteMutation.mutate({ id: note.id })} aria-label="删除笔记"><Trash2 size={13} /></button></span></div><p>{note.body}</p></article>)}
      {draftOpen ? <form className="margin-editor" onSubmit={(event) => { event.preventDefault(); if (editingNoteId) updateMutation.mutate({ id: editingNoteId, title, body }); else createMutation.mutate({ resourceType, resourceId, title, body }); }}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="笔记标题" maxLength={255} required /><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="写下本次研读的线索、问题或关联条目……" maxLength={10000} required /><div><button type="button" onClick={resetDraft}>取消</button><button type="submit" disabled={submitting}>{submitting ? "保存中" : editingNoteId ? "更新笔记" : "存入书案"}</button></div></form> : <button type="button" className="add-margin-note" onClick={() => { setEditingNoteId(null); setDraftOpen(true); }}><Plus size={15} /> 添加一则笔记</button>}
    </aside>
  );
}
