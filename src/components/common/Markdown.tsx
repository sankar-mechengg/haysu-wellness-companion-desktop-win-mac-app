import { useMemo } from "react";
import { parseMarkdown, type Inline } from "../../lib/markdown";

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => {
        switch (p.t) {
          case "bold":
            return (
              <strong
                key={i}
                className="font-semibold text-text-primary dark:text-text-primary-dark"
              >
                {p.v}
              </strong>
            );
          case "em":
            return <em key={i}>{p.v}</em>;
          case "code":
            return (
              <code
                key={i}
                className="px-1 py-0.5 rounded bg-surface-hover dark:bg-surface-hover-dark font-mono text-[0.85em]"
              >
                {p.v}
              </code>
            );
          default:
            return <span key={i}>{p.v}</span>;
        }
      })}
    </>
  );
}

/** Renders AI replies. Safe by construction: no raw HTML is ever injected. */
export default function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <div
      className={`space-y-2 text-sm leading-relaxed text-text-primary dark:text-text-primary-dark ${className}`}
    >
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h": {
            const size = b.level <= 2 ? "text-base" : "text-sm";
            return (
              <p key={i} className={`${size} font-semibold mt-3 first:mt-0`}>
                <Inlines parts={b.inlines} />
              </p>
            );
          }
          case "ul":
            return (
              <ul key={i} className="list-disc pl-5 space-y-1">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inlines parts={it} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal pl-5 space-y-1">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inlines parts={it} />
                  </li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre
                key={i}
                className="p-3 rounded-xl bg-surface-hover dark:bg-surface-hover-dark font-mono text-xs overflow-x-auto whitespace-pre-wrap"
              >
                {b.v}
              </pre>
            );
          case "hr":
            return <hr key={i} className="border-border/60 dark:border-border-dark/60 my-2" />;
          default:
            return (
              <p key={i}>
                <Inlines parts={b.inlines} />
              </p>
            );
        }
      })}
    </div>
  );
}
