import { describe, expect, it } from "vitest";
import { markdownToText, parseInline, parseMarkdown } from "../markdown";

describe("markdown", () => {
  it("parses inline styles", () => {
    expect(parseInline("a **b** `c` *d* e")).toEqual([
      { t: "text", v: "a " },
      { t: "bold", v: "b" },
      { t: "text", v: " " },
      { t: "code", v: "c" },
      { t: "text", v: " " },
      { t: "em", v: "d" },
      { t: "text", v: " e" },
    ]);
  });

  it("parses blocks", () => {
    const blocks = parseMarkdown(
      "# Title\n\nSome text\nmore text\n\n- one\n- two\n\n1. first\n2) second\n\n---\n```js\nlet x = 1;\n```"
    );
    expect(blocks.map((b) => b.t)).toEqual(["h", "p", "ul", "ol", "hr", "code"]);
    expect(blocks[1]).toEqual({ t: "p", inlines: [{ t: "text", v: "Some text more text" }] });
    expect((blocks[2] as { items: unknown[] }).items).toHaveLength(2);
    expect(blocks[5]).toEqual({ t: "code", lang: "js", v: "let x = 1;" });
  });

  it("keeps indented continuation inside a list item", () => {
    const blocks = parseMarkdown("- item\n  continued here\n- next");
    expect((blocks[0] as { items: { v: string }[][] }).items[0][0].v).toBe("item continued here");
  });

  it("flattens to text", () => {
    expect(markdownToText("## Hi\n\n**bold** and `code`\n- a\n- b")).toBe(
      "Hi\nbold and code\na\nb"
    );
  });
});
