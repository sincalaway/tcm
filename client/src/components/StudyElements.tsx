/**
 * 宋刻书斋：组件使用版心细线、目录签与朱批标记，不采用通用圆角卡片语言。
 */
import { ArrowUpRight, BookOpen, ExternalLink, X } from "lucide-react";
import type { ReactNode } from "react";

export function RuleLabel({ children }: { children: ReactNode }) {
  return <span className="rule-label">{children}</span>;
}

export function InkStamp({ children }: { children: ReactNode }) {
  return <span className="ink-stamp">{children}</span>;
}

export function StudyDetail({
  title,
  meta,
  onClose,
  children,
}: {
  title: string;
  meta: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="study-detail" aria-label={`${title}详情`}>
      <div className="detail-topline">
        <RuleLabel>{meta}</RuleLabel>
        {onClose && (
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭详情">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="folio-edge" aria-hidden="true">
        <span>校读</span><i /><i /><i />
      </div>
      <h2>{title}</h2>
      {children}
    </aside>
  );
}

export function ExternalSource({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="external-source" href={href} target="_blank" rel="noreferrer">
      <ExternalLink size={14} />
      {children}
    </a>
  );
}

export function IndexCta({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <a className="index-cta" href={href}>
      <span>
        <b>{label}</b>
        <small>{detail}</small>
      </span>
      <ArrowUpRight size={18} />
    </a>
  );
}

export function BookGlyph() {
  return <BookOpen aria-hidden="true" size={19} strokeWidth={1.45} />;
}
