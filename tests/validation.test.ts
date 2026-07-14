import { describe, expect, it } from "vitest";
import { getCandidate, getDefaultParameterValues } from "../src/core/catalog";
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
});
