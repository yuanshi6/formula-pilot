import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";

export interface FormulaQuery {
  readonly from: number;
  readonly to: number;
  readonly query: string;
  readonly raw: string;
}

export interface SyntaxDiagnostics {
  readonly position: number;
  readonly ancestors: readonly string[];
  readonly mathNamedNodes: readonly string[];
}

const REJECTED_NODE_PARTS = ["code", "frontmatter", "yaml", "comment"] as const;
const MAX_MATH_SIBLINGS_TO_INSPECT = 64;

export const KNOWN_MATH_NODE_NAMES: ReadonlySet<string> = new Set([
  "math",
  "mathblock",
  "mathinline",
  "math_tag",
  "block-math",
  "inline-math",
  "math_math-block",
  "math_math-inline",
  "mathblock_math",
  "mathinline_math",
]);

export function isRecognizedMathNodeName(name: string): boolean {
  const normalized = name.toLowerCase();
  if (REJECTED_NODE_PARTS.some((part) => normalized.includes(part))) return false;
  if (KNOWN_MATH_NODE_NAMES.has(normalized)) return true;
  return normalized.includes("math") && (normalized.includes("inline") || normalized.includes("block"));
}

function hasMathDelimiter(
  nodeNames: readonly string[],
  delimiter: "begin" | "end",
): boolean {
  for (const nodeName of nodeNames) {
    const normalized = nodeName.toLowerCase();
    if (REJECTED_NODE_PARTS.some((part) => normalized.includes(part))) return false;
    if (normalized.includes("math") && normalized.includes(delimiter)) return true;
    if (!normalized.includes("math")) return false;
  }
  return false;
}

/**
 * Obsidian 1.12.7 parses an otherwise valid Unicode command such as `\\分数`
 * as `error_math`. Only accept that exact error node when it remains inside a
 * contiguous, explicitly delimited math run. Generic or unbalanced errors stay
 * fail-closed.
 */
export function isDelimitedMathErrorContext(
  nodeName: string,
  previousNodeNames: readonly string[],
  nextNodeNames: readonly string[],
): boolean {
  return (
    nodeName.toLowerCase() === "error_math" &&
    hasMathDelimiter(previousNodeNames, "begin") &&
    hasMathDelimiter(nextNodeNames, "end")
  );
}

function isDelimitedMathErrorNode(node: SyntaxNode): boolean {
  const previousNodeNames: string[] = [];
  let previous = node.prevSibling;
  while (previous && previousNodeNames.length < MAX_MATH_SIBLINGS_TO_INSPECT) {
    previousNodeNames.push(previous.type.name);
    if (!previous.type.name.toLowerCase().includes("math")) break;
    previous = previous.prevSibling;
  }

  const nextNodeNames: string[] = [];
  let next = node.nextSibling;
  while (next && nextNodeNames.length < MAX_MATH_SIBLINGS_TO_INSPECT) {
    nextNodeNames.push(next.type.name);
    if (!next.type.name.toLowerCase().includes("math")) break;
    next = next.nextSibling;
  }

  return isDelimitedMathErrorContext(node.type.name, previousNodeNames, nextNodeNames);
}

export function isInMathEnvironment(state: EditorState, position = state.selection.main.head): boolean {
  if (position < 0 || position > state.doc.length) return false;
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(Math.max(0, position - 1), -1);
  while (node) {
    const nodeName = node.type.name;
    if (isDelimitedMathErrorNode(node)) return true;
    if (isRecognizedMathNodeName(nodeName)) return true;
    if (REJECTED_NODE_PARTS.some((part) => nodeName.toLowerCase().includes(part))) return false;
    node = node.parent;
  }
  return false;
}

export function getSyntaxDiagnostics(state: EditorState): SyntaxDiagnostics {
  const position = state.selection.main.head;
  const tree = syntaxTree(state);
  const mathNamedNodes: string[] = [];
  tree.iterate({
    enter(node) {
      if (node.name.toLowerCase().includes("math")) {
        mathNamedNodes.push(`${node.name}[${node.from},${node.to}]`);
      }
    },
  });
  const ancestors: string[] = [];
  let node: SyntaxNode | null = tree.resolveInner(Math.max(0, position - 1), -1);
  while (node) {
    ancestors.push(`${node.type.name}[${node.from},${node.to}]`);
    node = node.parent;
  }
  return { position, ancestors, mathNamedNodes };
}

export function extractFormulaQuery(state: EditorState): FormulaQuery | null {
  const selection = state.selection.main;
  if (!selection.empty || state.selection.ranges.length !== 1) return null;
  const position = selection.head;
  if (!isInMathEnvironment(state, position)) return null;
  const line = state.doc.lineAt(position);
  const beforeCursor = state.doc.sliceString(line.from, position);
  return extractQueryFromLine(beforeCursor, line.from);
}

export function extractQueryFromLine(beforeCursor: string, lineFrom = 0): FormulaQuery | null {
  const match = /\\([\p{L}]+)$/u.exec(beforeCursor);
  if (!match || match.index === undefined) return null;
  const slashOffset = match.index;
  let slashRun = 1;
  for (let index = slashOffset - 1; index >= 0 && beforeCursor[index] === "\\"; index -= 1) {
    slashRun += 1;
  }
  if (slashRun % 2 === 0) return null;
  const query = match[1];
  if (!query) return null;
  const from = lineFrom + slashOffset;
  return { from, to: lineFrom + beforeCursor.length, query, raw: `\\${query}` };
}

export function manualQueryAtCursor(state: EditorState): FormulaQuery | null {
  if (!isInMathEnvironment(state)) return null;
  return extractFormulaQuery(state) ?? {
    from: state.selection.main.head,
    to: state.selection.main.head,
    query: "",
    raw: "",
  };
}
