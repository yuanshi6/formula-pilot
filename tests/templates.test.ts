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
    ["box.content", {}, "\\boxed{x^2+y^2=1}"],
    ["box.content", { content: "\\text{hello}" }, "\\boxed{\\text{hello}}"],
  ])("generates %s", (stableId, overrides, expected) => {
    expect(generate(stableId, overrides)).toBe(expected);
  });

  it.each([
    ["matrix.2x2", { a11: "a", a12: "b", a21: "c", a22: "d" }, "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}"],
    ["matrix.3x3", { a11: "1", a12: "2", a13: "3", a21: "4", a22: "5", a23: "6", a31: "7", a32: "8", a33: "9" }, "\\begin{pmatrix}1&2&3\\\\4&5&6\\\\7&8&9\\end{pmatrix}"],
    ["matrix.custom", { body: "a&b\nc&d", delimiterStyle: "bmatrix" }, "\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}"],
    ["matrix.custom", { body: "a&b\nc&d", delimiterStyle: "bmatrix" }, "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}", true],
    ["determinant.2x2", { a11: "a", a12: "b", a21: "c", a22: "d" }, "\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}"],
    ["determinant.custom", { body: "a&b\nc&d" }, "\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}"],
    ["piecewise.2", { expression1: "x^2", condition1: "x\\ge0", expression2: "-x", condition2: "x<0" }, "\\begin{cases}x^2&x\\ge0\\\\-x&x<0\\end{cases}"],
    ["piecewise.custom", { body: "x^2&x\\ge0\n-x&x<0" }, "\\begin{cases}x^2&x\\ge0\\\\-x&x<0\\end{cases}"],
    ["system.2", { lhs1: "x+y", relation1: "=", rhs1: "1", lhs2: "x-y", relation2: "=", rhs2: "0" }, "\\left\\{\\begin{aligned}x+y&=1\\\\x-y&=0\\end{aligned}\\right."],
    ["system.custom", { body: "x+y&=1\nx-y&=0" }, "\\left\\{\\begin{aligned}x+y&=1\\\\x-y&=0\\end{aligned}\\right."],
    ["aligned.2", { lhs1: "f(x)", rhs1: "x^2", lhs2: "g(x)", rhs2: "x+1" }, "\\begin{aligned}f(x)&=x^2\\\\g(x)&=x+1\\end{aligned}"],
    ["aligned.custom", { body: "f(x)&=x^2\ng(x)&=x+1" }, "\\begin{aligned}f(x)&=x^2\\\\g(x)&=x+1\\end{aligned}"],
    ["environment.custom", { environmentName: "gathered", body: "a&=b\n\n c&=d" }, "\\begin{gathered}a&=b\\\\c&=d\\end{gathered}"],
    ["environment.custom", { environmentName: "cases", body: "a&=b\nc&=d" }, "\\begin{aligned}a&=b\\\\c&=d\\end{aligned}", true],
    ["matrix.transpose", { matrix: "A" }, "A^{\\mathsf T}"],
    ["matrix.inverse", { matrix: "A" }, "A^{-1}"],
  ])("generates Beta multi-row golden output for %s", (stableId, overrides, expected, direct = false) => {
    const definition = structured(stableId);
    const values = { ...getDefaultParameterValues(definition), ...overrides };
    expect(generateStructuredFormula(definition, values, direct).latex).toBe(expected);
  });

  it("provides a generator and stable direct placeholder order for every Beta function", () => {
    const betaIds = [
      "matrix.2x2", "matrix.3x3", "matrix.custom", "determinant.2x2", "determinant.custom",
      "piecewise.2", "piecewise.custom", "system.2", "system.custom", "aligned.2", "aligned.custom",
      "rounding.ceil", "rounding.floor", "absolute.value", "norm.expression", "set.cardinality",
      "vector.arrow", "vector.bold", "vector.dot", "vector.cross", "matrix.transpose", "matrix.inverse",
      "set.builder", "set.builder.condition", "probability.simple", "probability.conditional",
      "statistics.expectation", "statistics.variance", "statistics.covariance", "probability.distribution",
      "complex.number", "complex.conjugate", "complex.real-part", "complex.imaginary-part", "complex.polar",
      "geometry.segment", "geometry.ray", "geometry.arc", "geometry.angle-points",
      "box.content", "environment.custom",
    ];
    for (const stableId of betaIds) {
      const definition = structured(stableId);
      const values = getDefaultParameterValues(definition);
      const generated = generateStructuredFormula(definition, values);
      const direct = generateStructuredFormula(definition, values, true);
      expect(generated.latex.length, stableId).toBeGreaterThan(0);
      expect(direct.latex.length, stableId).toBeGreaterThan(0);
      expect(direct.placeholders.map((placeholder) => placeholder.id), stableId).toEqual(
        definition.directPlaceholderIds,
      );
      for (const placeholder of direct.placeholders) {
        expect(direct.latex.slice(placeholder.from, placeholder.to), stableId).not.toBe("");
      }
    }
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

  it("uses only body as the direct placeholder for custom environments", () => {
    const definition = structured("environment.custom");
    const values = { ...getDefaultParameterValues(definition), environmentName: "cases" };
    const guided = generateStructuredFormula(definition, values);
    expect(guided.latex).toBe("\\begin{cases}a&=b+c\\\\d&=e+f\\end{cases}");
    const direct = generateStructuredFormula(definition, values, true);
    expect(direct.latex).toBe("\\begin{aligned}a&=b+c\\\\d&=e+f\\end{aligned}");
    expect(direct.placeholders.map((placeholder) => placeholder.id)).toEqual(["body"]);
    const bodyPlaceholder = direct.placeholders[0];
    expect(bodyPlaceholder).toBeDefined();
    if (bodyPlaceholder) {
      expect(direct.latex.slice(bodyPlaceholder.from, bodyPlaceholder.to)).toBe("a&=b+c\\\\d&=e+f");
    }
  });

  it("does not normalize probability distribution parameters as matrix rows", () => {
    const parameters = ["a", "b"].join("\n");
    expect(generate("probability.distribution", { parameters }))
      .toBe(`X\\simN(${parameters})`);
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
