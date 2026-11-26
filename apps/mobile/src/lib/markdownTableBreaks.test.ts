import { describe, expect, it } from "vite-plus/test";
import { ENRICHED_INLINE_FILE_LINK_REGEX } from "./enrichedLinkPresentation";
import { markdownForNativeRendering, markdownWithTableBreaks } from "./markdownDocument";

const table = "| Company | Fit |\n|---|---|\n| Acme | A |";

describe("tables right under a line of text", () => {
  it("separates a table from the paragraph it interrupts", () => {
    expect(markdownWithTableBreaks(`Companies on file\n${table}`)).toBe(
      `Companies on file\n\n${table}`,
    );
  });

  it("handles CRLF and CR line endings", () => {
    const crlf = table.replaceAll("\n", "\r\n");
    expect(markdownWithTableBreaks(`Companies on file\r\n${crlf}`)).toBe(
      `Companies on file\r\n\r\n${crlf}`,
    );
    const cr = table.replaceAll("\n", "\r");
    expect(markdownWithTableBreaks(`Companies on file\r${cr}`)).toBe(`Companies on file\r\r${cr}`);
  });

  it("keeps the blank line inside a blockquote", () => {
    const quoted = table.replace(/^/gm, "> ");
    expect(markdownWithTableBreaks(`> Companies on file\n${quoted}`)).toBe(
      `> Companies on file\n>\n${quoted}`,
    );
  });

  it("keeps a table with a lazy header row inside its container", () => {
    expect(markdownWithTableBreaks("> Intro\n| a | b |\n> | - | - |\n> | c | d |")).toBe(
      "> Intro\n>\n> | a | b |\n> | - | - |\n> | c | d |",
    );
  });

  it("leaves Markdown that already renders alone", () => {
    for (const markdown of [
      `Companies on file\n\n${table}`,
      `# Companies\n${table}`,
      `\`\`\`md\nCompanies on file\n${table}\n\`\`\``,
      "Not a table\n| a | b |\n|---|",
      "a | b\nplain text",
      `- Item\n\n${table}`,
      `> - Item\n>\n> ${table.replaceAll("\n", "\n> ")}`,
    ]) {
      expect(markdownWithTableBreaks(markdown)).toBe(markdown);
    }
  });
});

describe("tables inside list items", () => {
  it.each([
    [
      "lazy header row",
      "- Intro\n| a | b |\n  | - | - |\n  | c | d |",
      "- Intro\n\n| a | b |\n| - | - |\n| c | d |",
    ],
    [
      "table before the next item",
      "- **Summary:**\n\n  | Service | Status |\n  | --- | --- |\n  | `api` | `ok` |\n- Next",
      "- **Summary:**\n\n| Service | Status |\n| --- | --- |\n| `api` | `ok` |\n\n- Next",
    ],
    [
      "ordered item continuing after its table",
      "1. Build\n   | a | b |\n   | - | - |\n\n   Then deploy.\n1. Verify",
      "1. Build\n\n| a | b |\n| - | - |\n\nThen deploy.\n\n2. Verify",
    ],
    [
      "nested item inside a blockquote",
      "> - Services\n>   - API\n>\n>     | a | b |\n>     | - | - |\n>   - Worker\n>     more",
      "> - Services\n>   - API\n>\n> | a | b |\n> | - | - |\n>\n> - Worker\n>   more",
    ],
  ])("moves the table out of the list: %s", (_name, markdown, expected) => {
    expect(markdownWithTableBreaks(markdown)).toBe(expected);
    expect(markdownWithTableBreaks(markdown.replaceAll("\n", "\r\n"))).toBe(
      expected.replaceAll("\n", "\r\n"),
    );
  });

  it("links files in the table it moves", () => {
    expect(
      markdownForNativeRendering(
        "- Intro\n`./README.md` | file\n  | - | - |\n  | `./a.ts` | yes |\n- Next",
        ENRICHED_INLINE_FILE_LINK_REGEX,
      ),
    ).toBe(
      "- Intro\n\n[./README.md](<./README.md>) | file\n| - | - |\n| [./a.ts](<./a.ts>) | yes |\n\n- Next",
    );
  });
});
