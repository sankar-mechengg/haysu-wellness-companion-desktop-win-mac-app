/**
 * A deliberately small Markdown → block-tree converter for AI replies.
 * Supports headings, paragraphs, bullet and numbered lists, bold, italics,
 * inline code, fenced code and horizontal rules. Everything else is text.
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "bold"; v: string }
  | { t: "em"; v: string }
  | { t: "code"; v: string };

export type Block =
  | { t: "h"; level: number; inlines: Inline[] }
  | { t: "p"; inlines: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "code"; lang: string; v: string }
  | { t: "hr" };

const INLINE_RE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of s.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ t: "text", v: s.slice(last, idx) });
    const tok = m[0];
    if (tok.startsWith("**") || tok.startsWith("__")) {
      out.push({ t: "bold", v: tok.slice(2, -2) });
    } else if (tok.startsWith("`")) {
      out.push({ t: "code", v: tok.slice(1, -1) });
    } else {
      out.push({ t: "em", v: tok.slice(1, -1) });
    }
    last = idx + tok.length;
  }
  if (last < s.length) out.push({ t: "text", v: s.slice(last) });
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ t: "p", inlines: parseInline(para.join(" ")) });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ t: list.kind, items: list.items.map(parseInline) });
      list = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushPara();
      flushList();
      const lang = trimmed.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      blocks.push({ t: "code", lang, v: buf.join("\n") });
      continue;
    }
    if (trimmed === "") {
      flushPara();
      flushList();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara();
      flushList();
      blocks.push({ t: "hr" });
      continue;
    }
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      blocks.push({ t: "h", level: h[1].length, inlines: parseInline(h[2]) });
      continue;
    }
    const ul = trimmed.match(/^[-*•]\s+(.*)$/);
    const ol = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const kind = ul ? "ul" : "ol";
      const text = (ul ?? ol)![1];
      if (!list || list.kind !== kind) {
        flushList();
        list = { kind, items: [] };
      }
      list.items.push(text);
      continue;
    }
    // Continuation of a list item (indented text).
    if (list && /^\s{2,}/.test(line)) {
      list.items[list.items.length - 1] += " " + trimmed;
      continue;
    }
    flushList();
    para.push(trimmed);
  }
  flushPara();
  flushList();
  return blocks;
}

/** Plain text (for previews and notifications). */
export function markdownToText(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|`|\*|_)/g, "")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
