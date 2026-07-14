import { describe, expect, it } from "vitest";
import {
  extractQueryFromLine,
  isDelimitedMathErrorContext,
  isRecognizedMathNodeName,
} from "../src/editor/query-detector";

describe("math query detector", () => {
  it.each([
    "math",
    "inline-math",
    "math_math-inline",
    "math_math-block",
    "math_tag",
    "formatting_math-inline",
  ])("recognizes supported math node %s", (name) => {
    expect(isRecognizedMathNodeName(name)).toBe(true);
  });

  it.each(["codeblock", "frontmatter", "yaml", "comment", "paragraph"])(
    "rejects non-math node %s",
    (name) => expect(isRecognizedMathNodeName(name)).toBe(false),
  );

  it("accepts Obsidian's Unicode-command error node only inside balanced math delimiters", () => {
    const begin = "formatting_formatting-math-begin_keyword_math_math-block";
    const end = "formatting_formatting-math-end_keyword_math_math-block";

    expect(isDelimitedMathErrorContext("error_math", [begin], [end])).toBe(true);
    expect(isDelimitedMathErrorContext("error_math", [begin], ["Paragraph"])).toBe(false);
    expect(isDelimitedMathErrorContext("error_math", ["CodeBlock", begin], [end])).toBe(false);
    expect(isDelimitedMathErrorContext("error", [begin], [end])).toBe(false);
    expect(isRecognizedMathNodeName("error_math")).toBe(false);
  });

  it("extracts a Unicode-letter query at the cursor", () => {
    expect(extractQueryFromLine("prefix \\li", 10)).toEqual({
      from: 17,
      to: 20,
      query: "li",
      raw: "\\li",
    });
    expect(extractQueryFromLine("\\极限")).toEqual({ from: 0, to: 3, query: "极限", raw: "\\极限" });
    expect(extractQueryFromLine("\\fenshu")).toEqual({
      from: 0,
      to: 7,
      query: "fenshu",
      raw: "\\fenshu",
    });
  });

  it("rejects numbers, escaped command slashes, and missing queries", () => {
    expect(extractQueryFromLine("\\li2")).toBeNull();
    expect(extractQueryFromLine("\\\\li")).toBeNull();
    expect(extractQueryFromLine("\\")).toBeNull();
  });
});
