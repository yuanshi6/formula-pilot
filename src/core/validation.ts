import { generateStructuredFormula } from "./templates";
import type {
  FunctionCandidateDefinition,
  ParameterValues,
  ValidationIssue,
} from "./types";

const MULTILINE_CONFIG: Readonly<Record<string, { parameterId: string; environment: string; rule: "matrix" | "single-alignment" | "free" }>> = {
  "matrix.custom": { parameterId: "body", environment: "pmatrix", rule: "matrix" },
  "determinant.custom": { parameterId: "body", environment: "vmatrix", rule: "matrix" },
  "piecewise.custom": { parameterId: "body", environment: "cases", rule: "single-alignment" },
  "system.custom": { parameterId: "body", environment: "aligned", rule: "single-alignment" },
  "aligned.custom": { parameterId: "body", environment: "aligned", rule: "single-alignment" },
  "environment.custom": { parameterId: "body", environment: "", rule: "free" },
};

const ALLOWED_CUSTOM_ENVIRONMENTS = new Set([
  "aligned", "aligned*", "gathered", "gathered*", "split", "split*",
  "cases", "matrix", "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix", "smallmatrix",
]);

function nonEmptyLines(input: string): string[] {
  return input.replace(/\r\n?/g, "\n").split("\n")
    .map((line) => line.trim()).filter(Boolean);
}

function containsEnvironment(input: string, environment: string): boolean {
  return input.includes(`\\begin{${environment}}`) || input.includes(`\\end{${environment}}`);
}

function countUnescapedAmpersands(input: string): number {
  let count = 0;
  let slashRun = 0;
  for (const character of input) {
    if (character === "\\") {
      slashRun += 1;
      continue;
    }
    if (character === "&" && slashRun % 2 === 0) count += 1;
    slashRun = 0;
  }
  return count;
}

function multilineIssues(
  candidate: FunctionCandidateDefinition,
  input: string,
): string | undefined {
  const lines = nonEmptyLines(input);
  if (lines.some((line) => line.includes("\\\\"))) {
    return "多行内容请使用换行分隔，不要输入 LaTeX 行分隔符 \\\\\u3002";
  }
  const config = MULTILINE_CONFIG[candidate.stableId];
  if (!config) return undefined;
  if (config.rule === "free") {
    if (/\\(?:begin|end)\s*\{/.test(input)) return "自定义环境内容不能嵌套 begin/end 环境。";
    return undefined;
  }
  if (containsEnvironment(input, config.environment)) return `内容不能嵌套同名 ${config.environment} 环境。`;
  if (config.rule === "matrix") {
    const counts = lines.map(countUnescapedAmpersands);
    if (counts.some((count) => count !== counts[0])) return "矩阵每行必须包含相同数量的列分隔符 &。";
  }
  if (config.rule === "single-alignment" && lines.some((line) => countUnescapedAmpersands(line) !== 1)) {
    return candidate.stableId.startsWith("piecewise")
      ? "分段函数每行必须恰好包含一个 &。"
      : "方程组或对齐环境每行必须恰好包含一个 &。";
  }
  return undefined;
}


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
    const isCustomEnvironmentName = candidate.stableId === "environment.custom" && parameter.id === "environmentName";
    if (
      parameter.input === "enum" &&
      current &&
      !isCustomEnvironmentName &&
      !parameter.options?.some((option) => option.value === current)
    ) {
      issues.push({ parameterId: parameter.id, message: `${parameter.label}不是允许的选项。` });
    }
    if (parameter.input === "positive-integer" && current && !/^[1-9]\d*$/.test(current)) {
      issues.push({ parameterId: parameter.id, message: `${parameter.label}必须是正整数。` });
    }
    if (candidate.stableId === "environment.custom" && parameter.id === "environmentName" && current) {
      if (!/^[A-Za-z]+\*?$/.test(current) || /^(?:begin|end)\*?$/i.test(current)) {
        issues.push({ parameterId: parameter.id, message: "环境名称只能是 ASCII 字母，可选一个结尾 *，且不能为 begin/end。" });
      } else if (!ALLOWED_CUSTOM_ENVIRONMENTS.has(current)) {
        issues.push({ parameterId: parameter.id, message: "环境名称不在允许列表中。" });
      }
    }
    const multiline = MULTILINE_CONFIG[candidate.stableId];
    if (multiline?.parameterId === parameter.id && current) {
      const message = multilineIssues(candidate, current);
      if (message) issues.push({ parameterId: parameter.id, message });
    }
  }
  if (issues.length === 0) {
    try {
      if (!generateStructuredFormula(candidate, values).latex) {
        issues.push({ parameterId: candidate.parameters[0]?.id ?? "", message: "生成的公式不能为空。" });
      }
    } catch (error) {
      issues.push({
        parameterId: "body",
        message: error instanceof Error ? error.message : "公式内容无效。",
      });
    }
  }
  return issues;
}
