export function markdownFileName(title: string): string {
  const name = title
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${name || "page"}.md`;
}

export function hasImages(markdown: string): boolean {
  return /!\[[^\]]*\]\(https?:\/\//.test(markdown);
}
