/** 宋刻书斋：古籍页支持站内篇章、条文与版本筛选，并记录个人阅读进度。 */
import { BookOpen, ChevronRight, ExternalLink, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { PageMasthead } from "@/components/SiteChrome";
import {
  ExternalSource,
  InkStamp,
  RuleLabel,
} from "@/components/StudyElements";
import { AiStudyAssistant } from "@/components/AiStudyAssistant";
import { StudyMargin } from "@/components/StudyMargin";
import { PassageLearningMatcher } from "@/components/PassageLearningMatcher";
import {
  PassageHerbLinks,
  type PassageHerbRecord,
} from "@/components/PassageHerbLinks";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  buildChapterCitationMarkdown,
  buildCitationFilename,
  triggerPrint,
} from "@/lib/citationExport";
import { getClassicStudyNotes, getHerbPairings } from "@/data/shangHanStudyIndex";

export default function Classics() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialQuery = params.get("q") ?? "";
  const preferredClassicSlug = params.get("classic");
  const preferredChapterTitle = params.get("chapter");
  const preferredPassageNumber = Number(params.get("passage")) || undefined;
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fullTextQuery, setFullTextQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);

  useEffect(() => {
    const nextQuery = new URLSearchParams(search).get("q") ?? "";
    setQuery(nextQuery);
    setFullTextQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    setSelectedId(null);
  }, [search]);

  const filters = trpc.catalog.filters.useQuery();
  const classicsQuery = trpc.catalog.classics.useQuery({
    query: query || undefined,
    category: category || undefined,
  });
  const records = classicsQuery.data ?? [];
  const selected =
    records.find(record => record.id === selectedId) ??
    records.find(record => record.slug === preferredClassicSlug) ??
    records[0];
  const chaptersQuery = trpc.catalog.chapters.useQuery(
    { classicId: selected?.id ?? 0 },
    { enabled: Boolean(selected) }
  );
  const fullTextResults = trpc.catalog.wikisourceSearch.useQuery(
    { query: submittedQuery || "中医" },
    { enabled: Boolean(submittedQuery) }
  );
  const progressMutation = trpc.study.progress.set.useMutation({
    onSuccess: () => {
      void utils.study.desk.invalidate();
      toast.success("阅读进度已记入书案");
    },
  });

  return (
    <main className="inner-page">
      <PageMasthead
        index="丙 · 古籍文献"
        title="从一段原文，回到一部书"
        lead="先用站内目录定位篇章，再按关键词检索维基文库公开原文。"
      />
      <section className="catalog-controls classic-controls">
        <label className="catalog-search">
          <Search size={18} />
          <span className="sr-only">搜索古籍目录</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="检索书名、作者、类别或简介"
          />
        </label>
        <label className="facet-select">
          <span>类别</span>
          <select
            value={category}
            onChange={event => setCategory(event.target.value)}
          >
            <option value="">不限</option>
            {(filters.data?.classicCategories ?? []).map(item => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <p>
          {classicsQuery.isLoading
            ? "正在整理书目……"
            : `共得 ${records.length} 部典籍`}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("");
            }}
          >
            清除筛选
          </button>
        </p>
      </section>
      <PassageLearningMatcher />
      <section
        className={`archive-layout ${classicsQuery.isLoading || chaptersQuery.isLoading ? "is-loading" : ""}`}
        aria-busy={classicsQuery.isLoading || chaptersQuery.isLoading}
      >
        <aside className="archive-spine" aria-label="古籍目录">
          <div className="archive-spine-heading">
            <BookOpen size={20} strokeWidth={1.4} />
            <div>
              <RuleLabel>藏书目录</RuleLabel>
              <h2>医籍索引</h2>
            </div>
          </div>
          <div className="classic-tabs">
            {classicsQuery.isLoading && !records.length
              ? Array.from({ length: 4 }, (_, index) => (
                  <div className="classic-tab skeleton-row" key={index}>
                    <span />
                    <div>
                      <b />
                      <small />
                    </div>
                  </div>
                ))
              : records.map((classic, index) => (
                  <button
                    key={classic.id}
                    type="button"
                    className={
                      selected?.id === classic.id
                        ? "classic-tab active"
                        : "classic-tab"
                    }
                    onClick={() => setSelectedId(classic.id)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <b>{classic.title}</b>
                      <small>
                        {classic.era} · {classic.category}
                      </small>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
            {!records.length && !classicsQuery.isLoading ? (
              <p className="empty-note">当前筛选没有书目。</p>
            ) : null}
          </div>
        </aside>
        {selected ? (
          <ClassicLeaf
            classic={selected}
            chapters={chaptersQuery.data ?? []}
            preferredChapterTitle={preferredChapterTitle}
            preferredPassageNumber={preferredPassageNumber}
            onProgress={(progressPercent, chapterId) => {
              if (!isAuthenticated) return startLogin();
              progressMutation.mutate({
                classicId: selected.id,
                chapterId,
                progressPercent,
              });
            }}
          />
        ) : classicsQuery.isLoading ? (
          <div className="empty-leaf detail-skeleton">
            <p>正在展开古籍目录……</p>
          </div>
        ) : (
          <div className="empty-leaf">
            <p>从左侧目录选择一部医籍。</p>
          </div>
        )}
      </section>
      <section className="source-search">
        <div>
          <RuleLabel>公开全文检索</RuleLabel>
          <h2>在维基文库中寻一段原文</h2>
          <p>
            结果来自中文维基文库公开接口；本站只显示标题、摘要与原站链接，便于回到原典继续阅读。
          </p>
        </div>
        <form
          onSubmit={event => {
            event.preventDefault();
            setSubmittedQuery(fullTextQuery.trim());
          }}
        >
          <input
            value={fullTextQuery}
            onChange={event => setFullTextQuery(event.target.value)}
            placeholder="例如：伤寒论、桂枝汤、痰饮"
          />
          <button type="submit">检索原文</button>
        </form>
        {fullTextResults.isFetching ? (
          <p className="source-search-status">正在查询公开文献……</p>
        ) : null}
        <div className="source-result-list">
          {fullTextResults.data?.map(item => (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              key={item.pageId}
            >
              <span>公开原典</span>
              <b>{item.title}</b>
              <p>{item.snippet}</p>
              <small>
                {new Date(item.timestamp).toLocaleDateString("zh-CN")}
              </small>
              <ExternalLink size={15} />
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

type ClassicRecord = {
  id: number;
  slug: string;
  title: string;
  era: string | null;
  author: string | null;
  category: string | null;
  summary: string | null;
  sourceUrl: string;
};
type ChapterRecord = {
  id: number;
  sequence: number;
  title: string;
  excerpt: string | null;
  sourceUrl?: string | null;
};
type PassageRecord = {
  id: number;
  passageNumber: number;
  title: string;
  excerpt: string;
  keywords: string | null;
  sourceReference: string;
  sourceUrl: string;
};
type PassageFormulaRecord = {
  id: number;
  name: string;
  sourceTitle: string;
  relationType: "primary" | "related";
};
const MAX_COMPARE_EDITIONS = 4;

type PassageVersionRecord = {
  id: number;
  editionLabel: string;
  text: string;
  variantNote: string | null;
  verificationStatus: "verified" | "pending" | "reference_only";
  sourceReference: string;
  sourceUrl: string;
};

function containsKeyword(
  values: Array<string | null | undefined>,
  keyword: string
) {
  const normalized = keyword.trim().toLocaleLowerCase("zh-CN");
  return (
    !normalized ||
    values.some(value => value?.toLocaleLowerCase("zh-CN").includes(normalized))
  );
}

function ClassicLeaf({
  classic,
  chapters,
  preferredChapterTitle,
  preferredPassageNumber,
  onProgress,
}: {
  classic: ClassicRecord;
  chapters: ChapterRecord[];
  preferredChapterTitle: string | null;
  preferredPassageNumber?: number;
  onProgress: (progress: number, chapterId?: number) => void;
}) {
  const [activeChapterId, setActiveChapterId] = useState<number | undefined>(
    undefined
  );
  const [activePassageId, setActivePassageId] = useState<number | undefined>(
    undefined
  );
  const [chapterQuery, setChapterQuery] = useState("");
  const [passageQuery, setPassageQuery] = useState("");
  const [versionFilter, setVersionFilter] = useState("");
  const [compareEditionLabels, setCompareEditionLabels] = useState<string[]>([]);
  const [sidebarHerb, setSidebarHerb] = useState<PassageHerbRecord | null>(null);

  useEffect(() => {
    const match = preferredChapterTitle
      ? chapters.find(chapter => chapter.title === preferredChapterTitle)
      : undefined;
    setActiveChapterId(match?.id);
    setActivePassageId(undefined);
    setChapterQuery("");
    setPassageQuery("");
  }, [chapters, preferredChapterTitle, classic.id]);

  const filteredChapters = useMemo(
    () =>
      chapters.filter(chapter =>
        containsKeyword([chapter.title, chapter.excerpt], chapterQuery)
      ),
    [chapters, chapterQuery]
  );
  useEffect(() => {
    if (
      chapterQuery &&
      !filteredChapters.some(chapter => chapter.id === activeChapterId)
    ) {
      setActiveChapterId(filteredChapters[0]?.id);
      setActivePassageId(undefined);
    }
  }, [activeChapterId, chapterQuery, filteredChapters]);

  const activeChapter =
    chapters.find(chapter => chapter.id === activeChapterId) ?? chapters[0];
  const passagesQuery = trpc.catalog.passages.useQuery(
    { chapterId: activeChapter?.id ?? 0 },
    { enabled: Boolean(activeChapter) }
  );
  const passages = (passagesQuery.data ?? []) as PassageRecord[];
  const filteredPassages = useMemo(
    () =>
      passages.filter(passage =>
        containsKeyword(
          [
            passage.title,
            passage.excerpt,
            passage.keywords,
            passage.sourceReference,
          ],
          passageQuery
        )
      ),
    [passages, passageQuery]
  );

  useEffect(() => {
    const match = preferredPassageNumber
      ? passages.find(
          passage => passage.passageNumber === preferredPassageNumber
        )
      : undefined;
    setActivePassageId(match?.id);
  }, [activeChapter?.id, passages, preferredPassageNumber]);
  useEffect(() => {
    if (
      passageQuery &&
      !filteredPassages.some(passage => passage.id === activePassageId)
    )
      setActivePassageId(filteredPassages[0]?.id);
  }, [activePassageId, filteredPassages, passageQuery]);

  const activePassage =
    filteredPassages.find(passage => passage.id === activePassageId) ??
    filteredPassages[0];
  const passageFormulasQuery = trpc.catalog.passageFormulas.useQuery(
    { passageId: activePassage?.id ?? 0 },
    { enabled: Boolean(activePassage) }
  );
  const passageVersionsQuery = trpc.catalog.passageVersions.useQuery(
    { passageId: activePassage?.id ?? 0 },
    { enabled: Boolean(activePassage) }
  );
  const herbDirectoryQuery = trpc.catalog.herbs.useQuery({});
  const herbRecords = (herbDirectoryQuery.data ?? []) as PassageHerbRecord[];
  const versions = (passageVersionsQuery.data ?? []) as PassageVersionRecord[];
  const editionLabels = useMemo(
    () => Array.from(new Set(versions.map(version => version.editionLabel))),
    [versions]
  );
  const visibleVersions = versionFilter
    ? versions.filter(version => version.editionLabel === versionFilter)
    : versions;

  useEffect(() => {
    setVersionFilter("");
    setCompareEditionLabels([]);
    setSidebarHerb(null);
  }, [activePassage?.id]);

  const toggleEditionComparison = (editionLabel: string) => {
    setCompareEditionLabels(current => {
      if (current.includes(editionLabel))
        return current.filter(item => item !== editionLabel);
      if (current.length >= MAX_COMPARE_EDITIONS) return current;
      return [...current, editionLabel];
    });
  };

  const comparisonVersions = versions.filter(version =>
    compareEditionLabels.includes(version.editionLabel)
  );
  const addVisibleEditions = () => {
    setCompareEditionLabels(
      Array.from(new Set(visibleVersions.map(version => version.editionLabel))).slice(
        0,
        MAX_COMPARE_EDITIONS
      )
    );
  };
  const excerpt = activePassage?.excerpt ?? activeChapter?.excerpt ?? undefined;
  const title = activePassage
    ? `${classic.title} · ${activePassage.title}`
    : activeChapter
      ? `${classic.title} · ${activeChapter.title}`
      : classic.title;
  const passageFormulas = (passageFormulasQuery.data ??
    []) as PassageFormulaRecord[];
  const citationHref =
    activeChapter && activePassage
      ? `/guji?classic=${encodeURIComponent(classic.slug)}&chapter=${encodeURIComponent(activeChapter.title)}&passage=${activePassage.passageNumber}`
      : `/guji?classic=${encodeURIComponent(classic.slug)}&chapter=${encodeURIComponent(activeChapter?.title ?? "")}`;
  const citationText =
    activeChapter && activePassage
      ? `《${classic.title}》｜${activeChapter.title}｜第${activePassage.passageNumber}条｜${activePassage.sourceReference}｜${activePassage.sourceUrl}`
      : `《${classic.title}》｜${activeChapter?.title ?? "章节"}｜${activeChapter?.sourceUrl ?? classic.sourceUrl}`;
  const [copiedCitation, setCopiedCitation] = useState(false);

  const copyCitation = async () => {
    try {
      await navigator.clipboard.writeText(citationText);
      setCopiedCitation(true);
      window.setTimeout(() => setCopiedCitation(false), 1600);
    } catch {
      toast.error("当前环境无法复制，请使用引用链接");
    }
  };
  const exportChapterCitations = () => {
    if (!activeChapter) return;
    const markdown = buildChapterCitationMarkdown({
      classicTitle: classic.title,
      classicSlug: classic.slug,
      chapterTitle: activeChapter.title,
      origin: window.location.origin,
      passages: filteredPassages,
    });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildCitationFilename(classic.title, activeChapter.title);
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const printChapter = () => triggerPrint(() => window.print());

  return (
    <article className="classic-leaf paper-noise">
      <div className="leaf-head">
        <span>卷 · 文献研读</span>
        <span>{classic.era}</span>
      </div>
      <div className="leaf-title">
        <div>
          <p className="eyebrow">{classic.category}</p>
          <h2>{classic.title}</h2>
          <p className="leaf-author">{classic.author}</p>
        </div>
        <InkStamp>阅</InkStamp>
      </div>
      <p className="classic-summary">{classic.summary}</p>
      <div className="chapter-block">
        <div className="passage-filter-heading">
          <RuleLabel>篇章索引</RuleLabel>
          {classic.slug === "shang-han-lun" ? (
            <span>《伤寒论》可按篇名或关键词定位</span>
          ) : null}
        </div>
        <label className="passage-filter-input">
          <Search size={14} />
          <span className="sr-only">筛选当前典籍的章节</span>
          <input
            value={chapterQuery}
            onChange={event => setChapterQuery(event.target.value)}
            placeholder="筛选篇章，例如：少阴、太阳、劳复"
          />
          {chapterQuery ? (
            <button type="button" onClick={() => setChapterQuery("")}>
              清除
            </button>
          ) : null}
        </label>
        <p className="passage-filter-count">
          命中 {filteredChapters.length} / {chapters.length} 篇
        </p>
        <ol>
          {filteredChapters.map(chapter => (
            <li key={chapter.id}>
              <button
                type="button"
                className={
                  activeChapter?.id === chapter.id
                    ? "chapter-select active"
                    : "chapter-select"
                }
                onClick={() => {
                  setActiveChapterId(chapter.id);
                  setActivePassageId(undefined);
                  setPassageQuery("");
                }}
              >
                <span className="chapter-sequence">
                  {String(chapter.sequence).padStart(2, "0")}
                </span>
                {chapter.title}
              </button>
            </li>
          ))}
        </ol>
        {!filteredChapters.length ? (
          <p className="empty-note">没有匹配的篇章，请调整关键词。</p>
        ) : null}
      </div>
      {activeChapter ? (
        <div className="passage-block">
          <div className="passage-filter-heading">
            <RuleLabel>{passages.length ? "条文索引" : "章节摘录"}</RuleLabel>
            {activeChapter ? <span>{activeChapter.title}</span> : null}
          </div>
          {passages.length ? (
            <>
              <label className="passage-filter-input">
                <Search size={14} />
                <span className="sr-only">筛选当前篇章的条文</span>
                <input
                  value={passageQuery}
                  onChange={event => setPassageQuery(event.target.value)}
                  placeholder="筛选方名、条文或检索词"
                />
                {passageQuery ? (
                  <button type="button" onClick={() => setPassageQuery("")}>
                    清除
                  </button>
                ) : null}
              </label>
              <p className="passage-filter-count">
                命中 {filteredPassages.length} / {passages.length} 条
              </p>
              <div className="passage-list">
                {filteredPassages.map(passage => (
                  <button
                    key={passage.id}
                    type="button"
                    className={
                      activePassage?.id === passage.id
                        ? "passage-select active"
                        : "passage-select"
                    }
                    onClick={() => setActivePassageId(passage.id)}
                  >
                    <span>第{passage.passageNumber}条</span>
                    {passage.title}
                  </button>
                ))}
              </div>
              {!filteredPassages.length ? (
                <p className="empty-note">没有匹配的条文，请调整关键词。</p>
              ) : null}
            </>
          ) : null}
          <div className="passage-reading-layout">
            <div className="passage-reading-main">
              <blockquote>
                “
                {activePassage ? (
                  <PassageHerbLinks
                    text={activePassage.excerpt}
                    herbs={herbRecords}
                    onSelectHerb={setSidebarHerb}
                  />
                ) : (
                  excerpt
                )}
                ”
              </blockquote>
              {activePassage && herbDirectoryQuery.isLoading ? (
                <p className="passage-herb-loading">正在关联本草目录……</p>
              ) : null}
              {activePassage ? (
                <p className="passage-herb-hint">
                  点击条文中的棕色药名，在右侧展开本草、配伍与方剂检索索引。
                </p>
              ) : null}
              {activePassage ? (
                <p className="passage-meta">
                  {activePassage.sourceReference} · {activePassage.keywords}
                </p>
              ) : null}
            </div>
            {activePassage ? (
              <HerbStudySidebar
                herb={sidebarHerb}
                passageFormulas={passageFormulas}
                onClose={() => setSidebarHerb(null)}
              />
            ) : null}
          </div>
          {activePassage && versions.length ? (
            <section
              className="passage-versions"
              aria-labelledby="passage-versions-title"
            >
              <div className="passage-versions-heading">
                <div>
                  <RuleLabel>版本对照</RuleLabel>
                  <h3 id="passage-versions-title">同一条文的底本与传本参照</h3>
                </div>
                <small>未标“已核”者不视为确定异文</small>
              </div>
              <div className="version-filter-bar">
                <label className="facet-select">
                  <span>历史版本</span>
                  <select
                    value={versionFilter}
                    onChange={event => setVersionFilter(event.target.value)}
                  >
                    <option value="">全部版本</option>
                    {editionLabels.map(edition => (
                      <option value={edition} key={edition}>
                        {edition}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  显示 {visibleVersions.length} / {versions.length} 版；最多可选 {MAX_COMPARE_EDITIONS} 版同屏对读。
                </p>
                <div className="version-bulk-actions">
                  <button type="button" onClick={addVisibleEditions} disabled={!visibleVersions.length}>
                    加入当前可见版本
                  </button>
                  <button type="button" onClick={() => setCompareEditionLabels([])} disabled={!compareEditionLabels.length}>
                    清空对读
                  </button>
                </div>
              </div>
              {comparisonVersions.length ? (
                <div
                  className={`version-comparison-focus count-${comparisonVersions.length} ${comparisonVersions.length >= 2 ? "ready" : ""}`}
                >
                  <div>
                    <RuleLabel>聚焦对读</RuleLabel>
                    <p>
                      {comparisonVersions.length >= 2
                        ? `已选 ${comparisonVersions.length} 版；以下按同一条文并列呈现文字与异文注记。`
                        : "已选一版；再从下方加入至少一版即可进行并列对读。"}
                    </p>
                  </div>
                  <div className="passage-version-grid comparison-grid">
                    {comparisonVersions.map(version => (
                      <VersionCard
                        version={version}
                        key={`focus-${version.id}`}
                        selected
                        onToggle={toggleEditionComparison}
                        compareCount={compareEditionLabels.length}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="passage-version-grid">
                {visibleVersions.map(version => (
                  <VersionCard
                    version={version}
                    key={version.id}
                    selected={compareEditionLabels.includes(
                      version.editionLabel
                    )}
                    onToggle={toggleEditionComparison}
                    compareCount={compareEditionLabels.length}
                  />
                ))}
              </div>
              {!visibleVersions.length ? (
                <p className="empty-note">当前条文没有匹配的版本记录。</p>
              ) : null}
            </section>
          ) : null}
          <div className="passage-citation">
            <div>
              <RuleLabel>章节引用索引</RuleLabel>
              <code>
                {activeChapter.title}
                {activePassage ? ` · 第${activePassage.passageNumber}条` : ""}
              </code>
            </div>
            <div className="citation-actions">
              <a href={citationHref}>
                {copiedCitation ? "已复制引用" : "复制/定位链接"}
              </a>
              <button type="button" onClick={copyCitation}>
                {copiedCitation ? "已复制" : "复制引用"}
              </button>
              <button type="button" onClick={exportChapterCitations}>
                导出当前结果
              </button>
              <button type="button" onClick={printChapter}>
                打印本篇
              </button>
            </div>
            <small>
              原典定位：{activePassage?.sourceReference ?? activeChapter.title}
            </small>
          </div>
          {activePassage && passageFormulas.length ? (
            <div className="passage-formula-links">
              <RuleLabel>关联方剂</RuleLabel>
              {passageFormulas.map(formula => (
                <Link
                  key={formula.id}
                  href={`/jingfang?q=${encodeURIComponent(formula.name)}`}
                >
                  <span>
                    {formula.relationType === "primary" ? "主方" : "相关方"}
                  </span>
                  <b>{formula.name}</b>
                  <small>{formula.sourceTitle}</small>
                </Link>
              ))}
            </div>
          ) : null}
          <div className="progress-actions">
            <span>读至此处</span>
            <button
              type="button"
              onClick={() => onProgress(35, activeChapter.id)}
            >
              标记为 35%
            </button>
            <button
              type="button"
              onClick={() => onProgress(70, activeChapter.id)}
            >
              标记为 70%
            </button>
            <button
              type="button"
              onClick={() => onProgress(100, activeChapter.id)}
            >
              本篇读毕
            </button>
          </div>
        </div>
      ) : null}
      <ExternalSource href={activePassage?.sourceUrl ?? classic.sourceUrl}>
        前往公开原文阅览页 <ExternalLink size={14} />
      </ExternalSource>
      <AiStudyAssistant
        context={{
          kind: "古籍章节",
          title,
          sourceTitle: `《${classic.title}》`,
          excerpt,
          studyNote: activePassage
            ? `条文检索词：${activePassage.keywords ?? "未提供"}`
            : (classic.summary ?? undefined),
        }}
      />
      <StudyMargin
        resourceType="classic"
        resourceId={classic.id}
        resourceTitle={classic.title}
      />
    </article>
  );
}

function VersionCard({
  version,
  selected,
  onToggle,
  compareCount,
}: {
  version: PassageVersionRecord;
  selected: boolean;
  onToggle: (editionLabel: string) => void;
  compareCount: number;
}) {
  const cannotAdd = !selected && compareCount >= MAX_COMPARE_EDITIONS;
  return (
    <article
      className={`passage-version-card ${selected ? "is-selected" : ""}`}
    >
      <header>
        <b>{version.editionLabel}</b>
        <span className={`verification-badge ${version.verificationStatus}`}>
          {version.verificationStatus === "verified"
            ? "已核"
            : version.verificationStatus === "pending"
              ? "待核"
              : "来源参照"}
        </span>
      </header>
      <p>“{version.text}”</p>
      {version.variantNote ? <small>{version.variantNote}</small> : null}
      <div className="version-card-actions">
        <button
          type="button"
          className="version-compare-toggle"
          onClick={() => onToggle(version.editionLabel)}
          disabled={cannotAdd}
          aria-pressed={selected}
        >
          {selected ? "移出对读" : cannotAdd ? `已达 ${MAX_COMPARE_EDITIONS} 版上限` : "加入对读"}
        </button>
        <a href={version.sourceUrl} target="_blank" rel="noreferrer">
          {version.sourceReference} <ExternalLink size={13} />
        </a>
      </div>
    </article>
  );
}

function HerbStudySidebar({
  herb,
  passageFormulas,
  onClose,
}: {
  herb: PassageHerbRecord | null;
  passageFormulas: PassageFormulaRecord[];
  onClose: () => void;
}) {
  const pairings = herb ? getHerbPairings(herb.name) : [];
  const studyNotes = herb ? getClassicStudyNotes(herb.name) : [];

  return (
    <aside className="herb-study-sidebar" aria-live="polite">
      {herb ? (
        <>
          <header className="herb-sidebar-header">
            <div>
              <RuleLabel>条文药材侧栏</RuleLabel>
              <h3>{herb.name}</h3>
              <p>{herb.pinyin ?? "本草索引"} · {herb.category ?? "本草目录"}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="关闭药材侧边栏">
              收起
            </button>
          </header>

          <dl className="herb-sidebar-facts">
            <div><dt>性味</dt><dd>{[herb.nature, herb.taste].filter(Boolean).join(" · ") || "—"}</dd></div>
            <div><dt>归经</dt><dd>{herb.meridians ?? "—"}</dd></div>
            <div><dt>别名</dt><dd>{herb.aliases ?? "—"}</dd></div>
          </dl>

          <section className="herb-sidebar-section">
            <RuleLabel>原典配伍规律</RuleLabel>
            {pairings.length ? (
              <div className="pairing-stack">
                {pairings.map(pairing => (
                  <article key={`${pairing.herbName}-${pairing.formulaName}`}>
                    <Link href={`/jingfang?q=${encodeURIComponent(pairing.formulaName)}`}>
                      <b>{pairing.formulaName}</b>
                      <span>{[pairing.herbName, ...pairing.companionNames].join(" · ")}</span>
                    </Link>
                    <p>{pairing.studyFocus}</p>
                    <a href={pairing.sourceUrl} target="_blank" rel="noreferrer">
                      {pairing.sourceLabel} <ExternalLink size={12} />
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <p className="sidebar-empty">当前索引尚未收录固定配伍条目；可从方剂库继续检索。</p>
            )}
          </section>

          <section className="herb-sidebar-section">
            <RuleLabel>方剂检索扩展</RuleLabel>
            <div className="sidebar-formula-links">
              <Link href={`/jingfang?q=${encodeURIComponent(herb.name)}`}>
                检索全部含“{herb.name}”的站内经方
              </Link>
              {passageFormulas.map(formula => (
                <Link key={formula.id} href={`/jingfang?q=${encodeURIComponent(formula.name)}`}>
                  <span>{formula.relationType === "primary" ? "本条主方" : "本条相关方"}</span>
                  {formula.name}
                </Link>
              ))}
            </div>
          </section>

          <section className="herb-sidebar-section">
            <RuleLabel>历代经典研读索引</RuleLabel>
            {studyNotes.length ? (
              <div className="classic-study-stack">
                {studyNotes.map(note => (
                  <article key={`${note.scholar}-${note.work}`}>
                    <header><b>{note.scholar}</b><span>{note.era}</span></header>
                    <p><em>{note.work}</em>：{note.focus}</p>
                    <a href={note.sourceUrl} target="_blank" rel="noreferrer">
                      {note.sourceLabel} <ExternalLink size={12} />
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <p className="sidebar-empty">该药材的历代研读索引正在整理中；可先打开完整本草条目交叉阅读。</p>
            )}
          </section>

          <div className="herb-sidebar-actions">
            <Link href={`/bencao?q=${encodeURIComponent(herb.name)}`}>打开完整本草条目</Link>
            {herb.sourceUrl ? <a href={herb.sourceUrl} target="_blank" rel="noreferrer">药典目录入口 <ExternalLink size={12} /></a> : null}
          </div>
          <p className="herb-sidebar-disclaimer">配伍与医家内容用于文本检索和版本化研读，不构成诊断、处方、剂量或自行用药建议。</p>
        </>
      ) : (
        <div className="herb-sidebar-placeholder">
          <RuleLabel>条文药材侧栏</RuleLabel>
          <h3>点击正文中的药名</h3>
          <p>在此查看本草索引、原典配伍、方剂扩展检索及历代医家研读入口。</p>
        </div>
      )}
    </aside>
  );
}
