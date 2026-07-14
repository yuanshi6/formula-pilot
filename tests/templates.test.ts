import { describe, expect, it } from "vitest";
import { getCandidate, getDefaultParameterValues } from "../src/core/catalog";
import {
  generateBasicFormula,
  generateStructuredFormula,
} from "../src/core/templates";
import type { FunctionCandidateDefinition } from "../src/core/types";

const structured = (stableId: string): FunctionCandidateDefinition => {
  const candidate = getCandidate(stableId);
  if (candidate.type !== "function") throw new Error(`${stableId} is not structured`);
  return candidate;
};

const generate = (stableId: string, overrides: Record<string, string> = {}): string => {
  const candidate = structured(stableId);
  return generateStructuredFormula(candidate, {
    ...getDefaultParameterValues(candidate),
    ...overrides,
  }).latex;
};

describe("structured template golden output", () => {
  it.each([
    ["limit.general", {}, "\\lim_{x\\to 0} f(x)"],
    ["limit.general", { variable: "n", target: "\\infty", expression: "a_n" }, "\\lim_{n\\to \\infty} a_n"],
    ["limit.left", {}, "\\lim_{x\\to {0}^{-}} f(x)"],
    ["limit.right", { target: "a" }, "\\lim_{x\\to {a}^{+}} f(x)"],
    ["summation.guided", {}, "\\sum_{i=1}^{n} a_i"],
    ["summation.guided", { index: "k", start: "0", end: "m", expression: "x_k" }, "\\sum_{k=0}^{m} x_k"],
    ["product.guided", {}, "\\prod_{i=1}^{n} a_i"],
    ["product.guided", { index: "k", start: "1", end: "N", expression: "p_k" }, "\\prod_{k=1}^{N} p_k"],
    ["integral.definite", {}, "\\int_{a}^{b} f(x)\\,dx"],
    ["integral.definite", { variable: "t", lower: "0", upper: "1", integrand: "g(t)" }, "\\int_{0}^{1} g(t)\\,dt"],
    ["integral.indefinite", {}, "\\int f(x)\\,dx"],
    ["integral.indefinite", { variable: "t", integrand: "e^t" }, "\\int e^t\\,dt"],
    ["fraction.guided", {}, "\\frac{a}{b}"],
    ["fraction.guided", { numerator: "x+1", denominator: "x-1" }, "\\frac{x+1}{x-1}"],
    ["root.guided", { index: "", radicand: "x" }, "\\sqrt{x}"],
    ["root.guided", { index: "3", radicand: "x+1" }, "\\sqrt[3]{x+1}"],
    ["derivative.ordinary", {}, "\\frac{d f}{dx}"],
    ["derivative.ordinary", { function: "g", variable: "t", order: "2" }, "\\frac{d^{2} g}{dt^{2}}"],
    ["derivative.partial", {}, "\\frac{\\partial f}{\\partial x}"],
    ["derivative.partial", { function: "u", variable: "y", order: "2" }, "\\frac{\\partial^{2} u}{\\partial y^{2}}"],
    ["binomial.guided", {}, "\\binom{n}{k}"],
    ["binomial.guided", { upper: "N", lower: "r" }, "\\binom{N}{r}"],
  ])("generates %s", (stableId, overrides, expected) => {
    expect(generate(stableId, overrides)).toBe(expected);
  });

  it("records direct placeholder ranges in the frozen order", () => {
    const candidate = structured("integral.definite");
    const generated = generateStructuredFormula(
      candidate,
      getDefaultParameterValues(candidate),
      true,
    );
    expect(generated.placeholders.map((placeholder) => placeholder.id)).toEqual([
      "lower",
      "upper",
      "integrand",
      "variable",
    ]);
    for (const placeholder of generated.placeholders) {
      expect(generated.latex.slice(placeholder.from, placeholder.to)).not.toBe("");
    }
  });

  it("creates zero-length placeholders for basic frac and sqrt commands", () => {
    const fraction = generateBasicFormula(getCandidate("command.frac"));
    const root = generateBasicFormula(getCandidate("command.sqrt"));
    expect(fraction.placeholders).toEqual([
      { id: "numerator", from: 6, to: 6 },
      { id: "denominator", from: 8, to: 8 },
    ]);
    expect(root.placeholders).toEqual([{ id: "radicand", from: 6, to: 6 }]);
  });
});
