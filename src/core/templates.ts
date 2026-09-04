import { FormulaBuilder } from "./formula-builder";
import type {
  CandidateDefinition,
  FunctionCandidateDefinition,
  GeneratedFormula,
  ParameterValues,
} from "./types";

const value = (values: ParameterValues, id: string): string => values[id]?.trim() ?? "";

/** Normalize custom multi-row input into LaTeX row separators. */
export function normalizeMultilineBody(input: string): string {
  const lines = input
    .replace(/\r\n?/g, "\n")
    .split(/\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.join("\\\\");
}

const normalizedBody = (values: ParameterValues, id = "body"): string =>
  normalizeMultilineBody(value(values, id));

const matrixDelimiter = (values: ParameterValues, direct: boolean): string => {
  if (direct) return "pmatrix";
  const style = value(values, "delimiterStyle") || value(values, "delimiter");
  return style === "bmatrix" || style === "Bmatrix" || style === "matrix" ? style : "pmatrix";
};

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

    case "matrix.2x2": {
      const style = matrixDelimiter(values, direct);
      return builder
        .append(`\\begin{${style}}`)
        .parameter("a11", value(values, "a11"), placeholders).append("&")
        .parameter("a12", value(values, "a12"), placeholders).append("\\\\")
        .parameter("a21", value(values, "a21"), placeholders).append("&")
        .parameter("a22", value(values, "a22"), placeholders)
        .append(`\\end{${style}}`).build();
    }
    case "matrix.3x3": {
      const style = matrixDelimiter(values, direct);
      return builder
        .append(`\\begin{${style}}`)
        .parameter("a11", value(values, "a11"), placeholders).append("&")
        .parameter("a12", value(values, "a12"), placeholders).append("&")
        .parameter("a13", value(values, "a13"), placeholders).append("\\\\")
        .parameter("a21", value(values, "a21"), placeholders).append("&")
        .parameter("a22", value(values, "a22"), placeholders).append("&")
        .parameter("a23", value(values, "a23"), placeholders).append("\\\\")
        .parameter("a31", value(values, "a31"), placeholders).append("&")
        .parameter("a32", value(values, "a32"), placeholders).append("&")
        .parameter("a33", value(values, "a33"), placeholders)
        .append(`\\end{${style}}`).build();
    }
    case "matrix.custom":
      return builder.append(`\\begin{${matrixDelimiter(values, direct)}}`)
        .parameter("body", normalizedBody(values), placeholders)
        .append(`\\end{${matrixDelimiter(values, direct)}}`).build();
    case "determinant.2x2":
      return builder
        .append("\\begin{vmatrix}")
        .parameter("a11", value(values, "a11"), placeholders).append("&")
        .parameter("a12", value(values, "a12"), placeholders).append("\\\\")
        .parameter("a21", value(values, "a21"), placeholders).append("&")
        .parameter("a22", value(values, "a22"), placeholders)
        .append("\\end{vmatrix}").build();
    case "determinant.custom":
      return builder.append("\\begin{vmatrix}").parameter("body", normalizedBody(values), placeholders)
        .append("\\end{vmatrix}").build();
    case "piecewise.2":
      return builder.append("\\begin{cases}")
        .parameter("expression1", value(values, "expression1"), placeholders).append("&")
        .parameter("condition1", value(values, "condition1"), placeholders).append("\\\\")
        .parameter("expression2", value(values, "expression2"), placeholders).append("&")
        .parameter("condition2", value(values, "condition2"), placeholders)
        .append("\\end{cases}").build();
    case "piecewise.custom":
      return builder.append("\\begin{cases}").parameter("body", normalizedBody(values), placeholders)
        .append("\\end{cases}").build();
    case "system.2":
      return builder.append("\\left\\{\\begin{aligned}")
        .parameter("lhs1", value(values, "lhs1"), placeholders).append("&")
        .parameter("relation1", value(values, "relation1"), placeholders)
        .parameter("rhs1", value(values, "rhs1"), placeholders).append("\\\\")
        .parameter("lhs2", value(values, "lhs2"), placeholders).append("&")
        .parameter("relation2", value(values, "relation2"), placeholders)
        .parameter("rhs2", value(values, "rhs2"), placeholders)
        .append("\\end{aligned}\\right.").build();
    case "system.custom":
      return builder.append("\\left\\{\\begin{aligned}").parameter("body", normalizedBody(values), placeholders)
        .append("\\end{aligned}\\right.").build();
    case "aligned.2":
      return builder.append("\\begin{aligned}")
        .parameter("lhs1", value(values, "lhs1"), placeholders).append("&=")
        .parameter("rhs1", value(values, "rhs1"), placeholders).append("\\\\")
        .parameter("lhs2", value(values, "lhs2"), placeholders).append("&=")
        .parameter("rhs2", value(values, "rhs2"), placeholders)
        .append("\\end{aligned}").build();
    case "aligned.custom":
      return builder.append("\\begin{aligned}").parameter("body", normalizedBody(values), placeholders)
        .append("\\end{aligned}").build();
    case "rounding.floor":
      return builder.append("\\lfloor ").parameter("expression", value(values, "expression"), placeholders)
        .append(" \\rfloor").build();
    case "rounding.ceil":
      return builder.append("\\lceil ").parameter("expression", value(values, "expression"), placeholders)
        .append(" \\rceil").build();
    case "absolute.value":
      return builder.append("\\left\\lvert ").parameter("expression", value(values, "expression"), placeholders)
        .append(" \\right\\rvert").build();
    case "matrix.transpose":
      return builder.parameter("matrix", value(values, "matrix"), placeholders)
        .append("^{\\mathsf T}").build();
    case "matrix.inverse":
      return builder.parameter("matrix", value(values, "matrix"), placeholders)
        .append("^{-1}").build();
    case "norm.expression":
      return builder.append("\\left\\lVert ").parameter("expression", value(values, "expression"), placeholders)
        .append(" \\right\\Vert").build();
    case "set.cardinality":
      return builder.append("\\left\\lvert ").parameter("set", value(values, "set"), placeholders)
        .append(" \\right\\rvert").build();
    case "vector.arrow":
      return builder.append("\\vec{").parameter("vector", value(values, "vector"), placeholders).append("}").build();
    case "vector.bold":
      return builder.append("\\mathbf{").parameter("vector", value(values, "vector"), placeholders).append("}").build();
    case "vector.dot":
      return builder.append("\\mathbf{").parameter("left", value(values, "left"), placeholders).append("}\\cdot\\mathbf{")
        .parameter("right", value(values, "right"), placeholders).append("}").build();
    case "vector.cross":
      return builder.append("\\mathbf{").parameter("left", value(values, "left"), placeholders).append("}\\times\\mathbf{")
        .parameter("right", value(values, "right"), placeholders).append("}").build();
    case "set.builder":
      return builder.append("\\left\\{").parameter("element", value(values, "element"), placeholders)
        .append("\\in").parameter("domain", value(values, "domain"), placeholders).append("\\mid")
        .parameter("predicate", value(values, "predicate"), placeholders).append("\\right\\}").build();
    case "set.builder.condition":
      return builder.append("\\left\\{").parameter("element", value(values, "element"), placeholders).append("\\mid")
        .parameter("predicate", value(values, "predicate"), placeholders).append("\\right\\}").build();
    case "probability.simple":
      return builder.append("\\Pr(").parameter("event", value(values, "event"), placeholders).append(")").build();
    case "probability.conditional":
      return builder.append("\\Pr(").parameter("event", value(values, "event"), placeholders).append("\\mid")
        .parameter("condition", value(values, "condition"), placeholders).append(")").build();
    case "statistics.expectation":
      return builder.append("\\mathbb{E}[")
        .parameter("variable", value(values, "variable"), placeholders).append("]").build();
    case "statistics.variance":
      return builder.append("\\operatorname{Var}(")
        .parameter("data", value(values, "data"), placeholders).append(")").build();
    case "statistics.covariance":
      return builder.append("\\operatorname{Cov}(").parameter("left", value(values, "left"), placeholders).append(",")
        .parameter("right", value(values, "right"), placeholders).append(")").build();
    case "probability.distribution":
      return builder.parameter("variable", value(values, "variable"), placeholders).append("\\sim")
        .parameter("distribution", value(values, "distribution"), placeholders).append("(")
        .parameter("parameters", value(values, "parameters"), placeholders).append(")").build();
    case "complex.number":
      return builder.parameter("realPart", value(values, "realPart"), placeholders).append("+")
        .parameter("imaginaryPart", value(values, "imaginaryPart"), placeholders).append("\\mathrm{i}").build();
    case "complex.conjugate":
      return builder.append("\\overline{")
        .parameter("number", value(values, "number"), placeholders).append("}").build();
    case "complex.real-part":
      return builder.append("\\Re(").parameter("number", value(values, "number"), placeholders).append(")").build();
    case "complex.imaginary-part":
      return builder.append("\\Im(").parameter("number", value(values, "number"), placeholders).append(")").build();
    case "complex.polar":
      return builder.parameter("modulus", value(values, "modulus"), placeholders)
        .append("e^{\\mathrm{i}")
        .parameter("argument", value(values, "argument"), placeholders).append("}").build();
    case "geometry.segment":
      return builder.append("\\overline{").parameter("points", value(values, "points"), placeholders).append("}").build();
    case "geometry.ray":
      return builder.append("\\overrightarrow{").parameter("points", value(values, "points"), placeholders).append("}").build();
    case "geometry.arc":
      return builder.append("\\widehat{").parameter("points", value(values, "points"), placeholders).append("}").build();
    case "geometry.angle-points":
      return builder.append("\\angle ").parameter("points", value(values, "points"), placeholders).build();
    case "box.content":
      return builder.append("\\boxed{")
        .parameter("content", value(values, "content"), placeholders)
        .append("}").build();
    case "environment.custom": {
      const environmentName = direct ? "aligned" : value(values, "environmentName");
      return builder.append("\\begin{").append(environmentName).append("}")
        .parameter("body", normalizedBody(values), placeholders)
        .append("\\end{").append(environmentName).append("}").build();
    }

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
