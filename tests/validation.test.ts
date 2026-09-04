import { describe, expect, it } from "vitest";
import { getCandidate, getDefaultParameterValues } from "../src/core/catalog";
import { normalizeMultilineBody } from "../src/core/templates";
import { hasBalancedBraces, validateParameters } from "../src/core/validation";
import type { FunctionCandidateDefinition } from "../src/core/types";

const candidate = (stableId: string): FunctionCandidateDefinition => {
  const found = getCandidate(stableId);
  if (found.type !== "function") throw new Error("Expected function candidate");
  return found;
};

describe("guided parameter validation", () => {
  it("accepts balanced nested and escaped braces", () => {
    expect(hasBalancedBraces("\\frac{a}{b}")) .toBe(true);
    expect(hasBalancedBraces("\\{x\\}")) .toBe(true);
  });

  it("rejects negative depth and unmatched openings", () => {
    expect(hasBalancedBraces("x}")) .toBe(false);
    expect(hasBalancedBraces("{x")) .toBe(false);
  });

  it("rejects empty required parameters", () => {
    const definition = candidate("fraction.guided");
    const issues = validateParameters(definition, {
      ...getDefaultParameterValues(definition),
      denominator: "",
    });
    expect(issues[0]?.parameterId).toBe("denominator");
  });

  it.each(["0", "-1", "1.5", "n"])("rejects invalid derivative order %s", (order) => {
    const definition = candidate("derivative.ordinary");
    const issues = validateParameters(definition, {
      ...getDefaultParameterValues(definition),
      order,
    });
    expect(issues.some((issue) => issue.parameterId === "order")).toBe(true);
  });

  it("allows an empty root index because it means square root", () => {
    const definition = candidate("root.guided");
    expect(
      validateParameters(definition, {
        ...getDefaultParameterValues(definition),
        index: "",
      }),
    ).toEqual([]);
  });

  it("normalizes CRLF, trims rows and ignores empty rows", () => {
    expect(normalizeMultilineBody(" a&b \r\n\r\n c&d ")).toBe("a&b\\\\c&d");
  });

  it("validates custom matrix row shape and rejects user row separators", () => {
    const definition = candidate("matrix.custom");
    const defaults = getDefaultParameterValues(definition);
    expect(validateParameters(definition, { ...defaults, body: "a&b\nc" })
      .some((issue) => issue.parameterId === "body")).toBe(true);
    expect(validateParameters(definition, { ...defaults, body: "a&b\\\\c&d" })
      .some((issue) => issue.message.includes("行分隔"))).toBe(true);
  });

  it("requires one alignment ampersand per custom piecewise/system row", () => {
    const piecewise = candidate("piecewise.custom");
    expect(validateParameters(piecewise, {
      ...getDefaultParameterValues(piecewise), body: "x^2\nx<0",
    }).some((issue) => issue.message.includes("恰好包含一个"))).toBe(true);
    const system = candidate("system.custom");
    expect(validateParameters(system, {
      ...getDefaultParameterValues(system), body: "\\begin{aligned}x&=1\n y&=0\\end{aligned}",
    }).some((issue) => issue.message.includes("嵌套同名"))).toBe(true);
    expect(validateParameters(system, {
      ...getDefaultParameterValues(system), body: "x+y=1\n2x-y=0",
    }).some((issue) => issue.message.includes("恰好包含一个"))).toBe(true);
  });

  it("validates custom environment names and permits free-form rows", () => {
    const definition = candidate("environment.custom");
    const defaults = getDefaultParameterValues(definition);
    expect(validateParameters(definition, defaults)).toEqual([]);
    for (const environmentName of [
      "aligned", "aligned*", "gathered", "gathered*", "split", "split*", "cases", "matrix",
      "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix", "smallmatrix",
    ]) {
      expect(validateParameters(definition, { ...defaults, environmentName })).toEqual([]);
    }
    expect(validateParameters(definition, { ...defaults, body: " a\r\n\r\n b " })).toEqual([]);
    expect(validateParameters(definition, { ...defaults, body: "a\nb" })).toEqual([]);

    for (const environmentName of ["", "begin", "end", "aligned_", "align\\ed", "align{ed}", "align**", "array", "customenv"]) {
      expect(validateParameters(definition, { ...defaults, environmentName })
        .some((issue) => issue.parameterId === "environmentName")).toBe(true);
    }
  });

  it("rejects row separators and nested environments in custom environment bodies", () => {
    const definition = candidate("environment.custom");
    const defaults = getDefaultParameterValues(definition);
    expect(validateParameters(definition, { ...defaults, body: "a\\\\b" })
      .some((issue) => issue.message.includes("行分隔"))).toBe(true);
    for (const body of ["a\n\\begin{cases}b\\end{cases}", "a\n\\begin {cases}b", "a\n\\end{aligned}"]) {
      expect(validateParameters(definition, { ...defaults, body })
        .some((issue) => issue.message.includes("嵌套 begin/end"))).toBe(true);
    }
  });
});
