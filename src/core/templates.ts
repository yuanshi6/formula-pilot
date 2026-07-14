import { FormulaBuilder } from "./formula-builder";
import type {
  CandidateDefinition,
  FunctionCandidateDefinition,
  GeneratedFormula,
  ParameterValues,
} from "./types";

const value = (values: ParameterValues, id: string): string => values[id]?.trim() ?? "";

const placeholderSet = (
  candidate: FunctionCandidateDefinition,
  direct: boolean,
): ReadonlySet<string> => new Set(direct ? candidate.directPlaceholderIds : []);

export function generateStructuredFormula(
  candidate: FunctionCandidateDefinition,
  values: ParameterValues,
  direct = false,
): GeneratedFormula {
  const placeholders = placeholderSet(candidate, direct);
  const builder = new FormulaBuilder();

  switch (candidate.stableId) {
    case "limit.general":
    case "limit.left":
    case "limit.right": {
      const direction = value(values, "direction");
      builder.append("\\lim_{").parameter("variable", value(values, "variable"), placeholders).append("\\to ");
      if (direction === "left" || direction === "right") {
        builder
          .append("{")
          .parameter("target", value(values, "target"), placeholders)
          .append(direction === "left" ? "}^{-}" : "}^{+}");
      } else {
        builder.parameter("target", value(values, "target"), placeholders);
      }
      return builder
        .append("} ")
        .parameter("expression", value(values, "expression"), placeholders)
        .build();
    }
    case "summation.guided":
    case "product.guided": {
      const command = candidate.stableId === "summation.guided" ? "\\sum_{" : "\\prod_{";
      return builder
        .append(command)
        .parameter("index", value(values, "index"), placeholders)
        .append("=")
        .parameter("start", value(values, "start"), placeholders)
        .append("}^{")
        .parameter("end", value(values, "end"), placeholders)
        .append("} ")
        .parameter("expression", value(values, "expression"), placeholders)
        .build();
    }
    case "integral.definite":
      return builder
        .append("\\int_{")
        .parameter("lower", value(values, "lower"), placeholders)
        .append("}^{")
        .parameter("upper", value(values, "upper"), placeholders)
        .append("} ")
        .parameter("integrand", value(values, "integrand"), placeholders)
        .append("\\,d")
        .parameter("variable", value(values, "variable"), placeholders)
        .build();
    case "integral.indefinite":
      return builder
        .append("\\int ")
        .parameter("integrand", value(values, "integrand"), placeholders)
        .append("\\,d")
        .parameter("variable", value(values, "variable"), placeholders)
        .build();
    case "fraction.guided":
      return builder
        .append("\\frac{")
        .parameter("numerator", value(values, "numerator"), placeholders)
        .append("}{")
        .parameter("denominator", value(values, "denominator"), placeholders)
        .append("}")
        .build();
    case "root.guided": {
      const index = direct ? "" : value(values, "index");
      builder.append("\\sqrt");
      if (index && index !== "2") {
        builder.append("[").parameter("index", index, placeholders).append("]");
      }
      return builder
        .append("{")
        .parameter("radicand", value(values, "radicand"), placeholders)
        .append("}")
        .build();
    }
    case "derivative.ordinary":
    case "derivative.partial": {
      const partial = candidate.stableId === "derivative.partial";
      const operator = partial ? "\\partial" : "d";
      const order = direct ? "1" : value(values, "order") || "1";
      builder.append("\\frac{").append(operator);
      if (order !== "1") builder.append("^{").append(order).append("}");
      builder.append(" ").parameter("function", value(values, "function"), placeholders).append("}{");
      if (partial) builder.append("\\partial ");
      else builder.append("d");
      builder.parameter("variable", value(values, "variable"), placeholders);
      if (order !== "1") builder.append("^{").append(order).append("}");
      return builder.append("}").build();
    }
    case "binomial.guided":
      return builder
        .append("\\binom{")
        .parameter("upper", value(values, "upper"), placeholders)
        .append("}{")
        .parameter("lower", value(values, "lower"), placeholders)
        .append("}")
        .build();
    default:
      throw new Error(`No structured generator for ${candidate.stableId}`);
  }
}

export function generateBasicFormula(candidate: CandidateDefinition): GeneratedFormula {
  if (candidate.type === "function") {
    throw new Error(`Expected a basic candidate; received ${candidate.stableId}`);
  }
  if (candidate.type === "symbol" || candidate.placeholderIds.length === 0) {
    return { latex: candidate.insertText, placeholders: [], cursorEnd: candidate.insertText.length };
  }
  if (candidate.stableId === "command.frac") {
    return {
      latex: candidate.insertText,
      placeholders: [
        { id: "numerator", from: 6, to: 6 },
        { id: "denominator", from: 8, to: 8 },
      ],
      cursorEnd: candidate.insertText.length,
    };
  }
  if (candidate.stableId === "command.sqrt") {
    return {
      latex: candidate.insertText,
      placeholders: [{ id: "radicand", from: 6, to: 6 }],
      cursorEnd: candidate.insertText.length,
    };
  }
  throw new Error(`No basic placeholder generator for ${candidate.stableId}`);
}

export function generateDefaultStructuredFormula(
  candidate: FunctionCandidateDefinition,
  direct = false,
): GeneratedFormula {
  const values = Object.fromEntries(
    candidate.parameters.map((parameter) => [parameter.id, parameter.defaultValue]),
  );
  return generateStructuredFormula(candidate, values, direct);
}

export function buildGuidedHint(
  candidate: FunctionCandidateDefinition,
  values: ParameterValues,
): string {
  const display = (id: string, fallback: string): string => value(values, id) || fallback;
  switch (candidate.stableId) {
    case "limit.general":
    case "limit.left":
    case "limit.right": {
      const direction = display("direction", "both");
      const suffix = direction === "left" ? "⁻" : direction === "right" ? "⁺" : "";
      return `lim  (${display("variable", "变量")} → ${display("target", "趋近值")}${suffix})  (${display("expression", "表达式")})`;
    }
    default:
      return candidate.parameters
        .map((parameter) => `(${display(parameter.id, parameter.label)})`)
        .join("  ");
  }
}
