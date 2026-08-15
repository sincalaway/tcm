/**
 * 宋刻书斋：首页采用“书案 + 纵向书页”的非对称布局；首屏左侧为阅读与检索，右侧承载生成的宋刻书斋图景。
 */
import { ArrowRight, BookOpen, Leaf, Search, ScrollText } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation, Link } from "wouter";
import { classics, formulas, herbs } from "@/data/tcmContent";
import { IndexCta, InkStamp, RuleLabel } from "@/components/StudyElements";

const heroImage = "/manus-storage/tcm-hero-song-printing_db65d154.png";
const botanicPlate = "/manus-storage/tcm-herb-botanical-plate_fe9e072d.png";
const manuscriptImage = "/manus-storage/tcm-classics-manuscript_7ac13543.png";

export default function Home() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    setLocation(`/bencao${normalized ? `?q=${encodeURIComponent(normalized)}` : ""}`);
  }

  return (
    <main>
      <section className="hero-section paper-noise">
        <div className="hero-copy">
          <div className="hero-rail" aria-hidden="true"><span>卷一</span><i /></div>
          <div className="hero-copy-inner">
            <p className="eyebrow">一方书案 · 以索引入门</p>
            <h1>
              读一味本草，
              <em>见一方脉络。</em>
            </h1>
            <p className="hero-lead">
              从药材、经方到古籍原文，以可检索的书页结构，整理一条适合反复研读的中医学习路径。
            </p>
            <form className="hero-search" onSubmit={handleSearch}>
              <Search size={20} aria-hidden="true" />
              <label className="sr-only" htmlFor="home-search">搜索药名或关键词</label>
              <input
                id="home-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="试搜：桂枝、黄芪、茯苓……"
              />
              <button type="submit">检索本草</button>
            </form>
            <p className="search-hint">可从一味药开始，进入性味、归经与相关方剂的交叉阅读。</p>
          </div>
        </div>
        <div className="hero-leaf-page">
          <div className="hero-page-topline"><span>本草经方</span><span>卷首</span></div>
          <img src={heroImage} alt="书案上的古籍、笔墨与草药静物" />
          <div className="hero-image-caption">
            <span>以检索重开一卷医书</span>
            <InkStamp>研习</InkStamp>
          </div>
        </div>
      </section>

      <section className="path-section">
        <div className="section-title-block">
          <p className="eyebrow">卷次导读 · 由浅入深</p>
          <h2>循目录入卷，按线索深读</h2>
          <p>三个入口对应三种阅读动作：查一味、读一方、对一段原文。</p>
        </div>
        <div className="path-list">
          <Link href="/bencao" className="path-item herb-path">
            <div className="path-symbol"><Leaf size={24} strokeWidth={1.35} /></div>
            <div><RuleLabel>甲 · 本草</RuleLabel><h3>中药详情查询</h3><p>性味、归经、药用部位与相关学习索引。</p></div>
            <ArrowRight className="path-arrow" size={20} />
          </Link>
          <Link href="/jingfang" className="path-item formula-path">
            <div className="path-symbol"><ScrollText size={24} strokeWidth={1.35} /></div>
            <div><RuleLabel>乙 · 经方</RuleLabel><h3>经方结构对读</h3><p>从出处、药味到方义线索，保留原典入口。</p></div>
            <ArrowRight className="path-arrow" size={20} />
          </Link>
          <Link href="/guji" className="path-item classic-path">
            <div className="path-symbol"><BookOpen size={24} strokeWidth={1.35} /></div>
            <div><RuleLabel>丙 · 文献</RuleLabel><h3>古籍原文阅览</h3><p>按典籍、篇章和摘录回到历史文本的语境。</p></div>
            <ArrowRight className="path-arrow" size={20} />
          </Link>
        </div>
      </section>

      <section className="featured-section">
        <div className="featured-herb-visual">
          <div className="vertical-note">本草图谱 · 一味入门</div>
          <img src={botanicPlate} alt="传统本草风格的药材线描图谱" />
        </div>
        <div className="featured-content">
          <p className="eyebrow">本周书签 · 药味索引</p>
          <h2>从药味看见方中位置</h2>
          <p className="featured-lead">药物条目并不止于一个结论。把性味、归经、药用部位和相关经方并置，才容易建立可持续的记忆线索。</p>
          <div className="mini-index-grid">
            {herbs.slice(0, 4).map((herb, index) => (
              <Link href={`/bencao?q=${encodeURIComponent(herb.name)}`} key={herb.id} className="mini-index-item">
                <span>0{index + 1}</span><b>{herb.name}</b><small>{herb.index.split("、")[0]}</small>
              </Link>
            ))}
          </div>
          <IndexCta href="/bencao" label="进入本草索引" detail="从常见药味开始查阅" />
        </div>
      </section>

      <section className="shelf-section paper-noise">
        <div className="shelf-copy">
          <p className="eyebrow">经方 · 条文 · 出处</p>
          <h2>让一则条文，成为可回溯的阅读路径。</h2>
          <p>首版以五首常见方为索引样本：先读其出处，再看药味结构，最后转到古籍原文继续对读。</p>
          <div className="shelf-formulas">
            {formulas.slice(0, 3).map((formula) => <span key={formula.id}>{formula.name}</span>)}
          </div>
          <IndexCta href="/jingfang" label="展开经方页" detail="查看出处与药味组成" />
        </div>
        <div className="shelf-image-wrap">
          <img src={manuscriptImage} alt="摆放在书案上的古籍文献与朱印" />
          <div className="shelf-caption"><span>文献旁读</span><b>以原典为锚</b></div>
        </div>
      </section>

      <section className="classic-strip">
        <div><p className="eyebrow">藏书目录 · 文献互读</p><h2>四部典籍，四条阅读线索。</h2></div>
        <div className="classic-strip-list">
          {classics.map((classic, index) => (
            <Link href={`/guji?book=${classic.id}`} className="classic-strip-item" key={classic.id}>
              <span>0{index + 1}</span><b>{classic.title}</b><small>{classic.category}</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
