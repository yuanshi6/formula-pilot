import { generateStructuredFormula } from "./templates";
import type {
  FunctionCandidateDefinition,
  ParameterValues,
  ValidationIssue,
} from "./types";

export function hasBalancedBraces(input: string): boolean {
  let depth = 0;
  let slashRun = 0;
  for (const character of input) {
    if (character === "\\") {
      slashRun += 1;
      continue;
    }
    const escaped = slashRun % 2 === 1;
    slashRun = 0;
    if (escaped) continue;
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export function validateParameters(
  candidate: FunctionCandidateDefinition,
  values: ParameterValues,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const parameter of candidate.parameters) {
    const current = values[parameter.id]?.trim() ?? "";
    if (parameter.required && !current) {
      issues.push({ parameterId: parameter.id, message: `${parameter.label}不能为空。` });
      continue;
    }
    if (current && !hasBalancedBraces(current)) {
      issues.push({ parameterId: parameter.id, message: `${parameter.label}中的花括号不配对。` });
    }
    if (
      parameter.input === "enum" &&
      current &&
      !parameter.options?.some((option) => option.value === current)
    ) {
      issues.push({ parameterId: parameter.id, message: `${parameter.label}不是允许的选项。` });
    }
    if (parameter.input === "positive-integer" && current && !/^[1-9]\d*$/.test(current)) {
      issues.push({ parameterId: parameter.id, message: `${parameter.label}必须是正整数。` });
    }
  }
  if (issues.length === 0 && !generateStructuredFormula(candidate, values).latex) {
    issues.push({ parameterId: candidate.parameters[0]?.id ?? "", message: "生成的公式不能为空。" });
  }
  return issues;
}
