import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ExternalSource,
  InkStamp,
  RuleLabel,
} from "@/components/StudyElements";

export type PassageHerbRecord = {
  id: number;
  name: string;
  pinyin: string | null;
  aliases: string | null;
  category: string | null;
  nature: string | null;
  taste: string | null;
  meridians: string | null;
  medicinalPart: string | null;
  traditionalIndex: string | null;
  learningNote: string | null;
  sourceUrl: string | null;
};

type TextSegment = { text: string; herb?: PassageHerbRecord };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeSegments(text: string, herbs: PassageHerbRecord[]): TextSegment[] {
  const nameMap = new Map<string, PassageHerbRecord>();
  for (const herb of herbs) {
    nameMap.set(herb.name, herb);
    for (const alias of herb.aliases?.split("、") ?? []) {
      const normalized = alias.trim();
      if (normalized.length >= 2) nameMap.set(normalized, herb);
    }
  }
  const names = Array.from(nameMap.keys()).sort(
    (left, right) =>
      right.length - left.length || left.localeCompare(right, "zh-CN")
  );
  if (!names.length) return [{ text }];
  const pattern = new RegExp(names.map(escapeRegExp).join("|"), "g");
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of Array.from(text.matchAll(pattern))) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ text: text.slice(cursor, index) });
    const matchedName = match[0];
    segments.push({ text: matchedName, herb: nameMap.get(matchedName) });
    cursor = index + matchedName.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.length ? segments : [{ text }];
}

export function PassageHerbLinks({
  text,
  herbs,
}: {
  text: string;
  herbs: PassageHerbRecord[];
}) {
  const [selectedHerb, setSelectedHerb] = useState<PassageHerbRecord | null>(
    null
  );
  const segments = useMemo(() => makeSegments(text, herbs), [text, herbs]);

  return (
    <>
      <span className="passage-herb-text">
        {segments.map((segment, index) =>
          segment.herb ? (
            <button
              key={`${segment.text}-${index}`}
              type="button"
              className="passage-herb-link"
              onClick={() => setSelectedHerb(segment.herb ?? null)}
              aria-label={`查看中药${segment.herb.name}的索引详情`}
            >
              {segment.text}
            </button>
          ) : (
            <span key={`${segment.text}-${index}`}>{segment.text}</span>
          )
        )}
      </span>
      <HerbQuickView
        herb={selectedHerb}
        onOpenChange={open => {
          if (!open) setSelectedHerb(null);
        }}
      />
    </>
  );
}

function HerbQuickView({
  herb,
  onOpenChange,
}: {
  herb: PassageHerbRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(herb)} onOpenChange={onOpenChange}>
      {herb ? (
        <DialogContent className="herb-detail-dialog max-h-[calc(100dvh-2rem)] overflow-y-auto border-stone-300 bg-[#fffdf8] text-stone-800 sm:max-w-2xl">
          <DialogHeader className="pr-7 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <RuleLabel>本草索引</RuleLabel>
                <DialogTitle className="mt-2 text-2xl font-semibold text-stone-900">
                  {herb.name}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {herb.pinyin ?? "中药条目"} · {herb.category ?? "本草目录"}
                </DialogDescription>
              </div>
              <InkStamp>本草</InkStamp>
            </div>
          </DialogHeader>
          <dl className="character-grid herb-dialog-grid">
            <div>
              <dt>性</dt>
              <dd>{herb.nature ?? "—"}</dd>
            </div>
            <div>
              <dt>味</dt>
              <dd>{herb.taste ?? "—"}</dd>
            </div>
            <div>
              <dt>归经</dt>
              <dd>{herb.meridians ?? "—"}</dd>
            </div>
            <div>
              <dt>药用部位</dt>
              <dd>{herb.medicinalPart ?? "—"}</dd>
            </div>
          </dl>
          {herb.aliases ? (
            <section className="detail-section">
              <RuleLabel>别名与检索词</RuleLabel>
              <p>{herb.aliases}</p>
            </section>
          ) : null}
          <section className="detail-section">
            <RuleLabel>传统功用索引</RuleLabel>
            <p className="large-detail-copy">{herb.traditionalIndex ?? "—"}</p>
          </section>
          <section className="detail-section">
            <RuleLabel>研读提示</RuleLabel>
            <p>{herb.learningNote ?? "—"}</p>
          </section>
          <section
            className="passage-herb-dialog-actions"
            aria-label={`${herb.name} 交叉研读入口`}
          >
            <Link href={`/jingfang?q=${encodeURIComponent(herb.name)}`}>
              查阅相关经方
            </Link>
            <Link href={`/bencao?q=${encodeURIComponent(herb.name)}`}>
              打开完整本草条目
            </Link>
          </section>
          {herb.sourceUrl ? (
            <ExternalSource href={herb.sourceUrl}>
              查阅药典目录入口 <ExternalLink size={14} />
            </ExternalSource>
          ) : null}
          <p className="passage-herb-disclaimer">
            本窗口提供传统本草与经方文本的学习索引，不构成诊断、处方、剂量或自行用药建议。
          </p>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
