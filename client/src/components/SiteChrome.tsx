/**
 * 宋刻书斋：导航借鉴古籍目录签，砚石青为结构色，辰砂红仅用于当前路径与关键提示。
 */
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const sealMark = "/manus-storage/tcm-seal-leaf-mark_31399890.png";

const links = [
  { href: "/", label: "书斋首页" },
  { href: "/bencao", label: "本草索引" },
  { href: "/jingfang", label: "经方研读" },
  { href: "/guji", label: "古籍文献" },
];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand-lockup" aria-label="本草经方首页">
            <img className="brand-seal" src={sealMark} alt="篆刻式草叶图形标记" />
            <span className="brand-type">
              <b>本草经方</b>
              <small>一方书案 · 研习索引</small>
            </span>
          </Link>

          <nav className="desktop-nav" aria-label="主导航">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={location === link.href ? "nav-link active" : "nav-link"}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="header-utility" aria-label="项目定位">
            <span className="utility-mark">研习版</span>
            <button
              className="mobile-menu-button"
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? "收起导航" : "展开导航"}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="mobile-nav" aria-label="移动端主导航">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="mobile-nav-link" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {children}

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <p className="eyebrow">本草经方 · 研习版</p>
            <p className="footer-copy">以检索、对读与出处为线索，整理中医典籍学习的数字书案。</p>
          </div>
          <div className="footer-note">
            <span>学习资料，不构成诊断、处方或用药建议。</span>
            <span>身体不适请咨询合格医疗专业人员。</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PageMasthead({
  index,
  title,
  lead,
}: {
  index: string;
  title: string;
  lead: string;
}) {
  return (
    <section className="page-masthead">
      <div className="masthead-index">{index}</div>
      <div>
        <p className="eyebrow">卷内索引 · 逐条研读</p>
        <h1>{title}</h1>
      </div>
      <p className="masthead-lead">{lead}</p>
    </section>
  );
}
