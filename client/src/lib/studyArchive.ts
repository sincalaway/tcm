export type StudyArchiveNote = {
  id: number;
  resourceType: string;
  resourceId: number;
  title: string;
  body: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type StudyArchiveSavedItem = {
  id: number;
  resourceType: string;
  resourceId: number;
  createdAt: Date | string;
  resource?: {
    title: string;
    subtitle?: string | null;
    kind: string;
    href: string;
  } | null;
};

export type StudyArchiveProgress = {
  id: number;
  progressPercent: number;
  lastReadAt: Date | string;
  classicTitle?: string | null;
  chapterTitle?: string | null;
};

export type StudyArchive = {
  exportedAt: Date;
  notes: StudyArchiveNote[];
  saved: StudyArchiveSavedItem[];
  progress: StudyArchiveProgress[];
};

function dateText(value: Date | string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function markdownText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function buildStudyArchiveMarkdown(archive: StudyArchive) {
  const lines = [
    "# 本草经方 · 我的书案导出",
    "",
    `导出时间：${dateText(archive.exportedAt)}`,
    "",
    "> 此文件仅包含当前登录用户在本站保存的学习记录。内容用于个人研读整理，不构成诊断、处方、剂量或自行用药建议。",
    "",
    "## 我的收藏",
    "",
  ];

  if (archive.saved.length) {
    for (const item of archive.saved) {
      const resource = item.resource;
      lines.push(
        `- **${resource?.title ?? "已归档条目"}**｜${resource?.kind ?? item.resourceType}${resource?.subtitle ? `｜${resource.subtitle}` : ""}${resource?.href ? `｜站内路径：${resource.href}` : ""}`
      );
    }
  } else {
    lines.push("暂无收藏。\n");
  }

  lines.push("", "## 研读笔记", "");
  if (archive.notes.length) {
    for (const note of archive.notes) {
      lines.push(`### ${note.title}`, "", `- 关联对象：${note.resourceType} #${note.resourceId}`, `- 最后更新：${dateText(note.updatedAt)}`, "", markdownText(note.body), "");
    }
  } else {
    lines.push("暂无笔记。\n");
  }

  lines.push("", "## 续读进度", "");
  if (archive.progress.length) {
    for (const item of archive.progress) {
      lines.push(`- **${item.classicTitle ?? "古籍研读"}**${item.chapterTitle ? `｜${item.chapterTitle}` : ""}｜${item.progressPercent}%｜更新于 ${dateText(item.lastReadAt)}`);
    }
  } else {
    lines.push("暂无阅读进度。\n");
  }

  return `${lines.join("\n").trim()}\n`;
}

export function buildStudyArchiveJson(archive: StudyArchive) {
  return `${JSON.stringify(
    {
      version: 1,
      exportedAt: archive.exportedAt.toISOString(),
      notice: "仅供个人研读整理；不构成诊断、处方、剂量或自行用药建议。",
      notes: archive.notes,
      saved: archive.saved,
      progress: archive.progress,
    },
    null,
    2
  )}\n`;
}

export function downloadStudyArchive(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
