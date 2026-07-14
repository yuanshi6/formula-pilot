import type {
  CandidateDefinition,
  CommandCandidateDefinition,
  FunctionCandidateDefinition,
  ParameterDefinition,
  SymbolCandidateDefinition,
} from "./types";
import { getCandidateSearchMetadata } from "./catalog-search";

interface BasicCatalogRow {
  readonly stableId: string;
  readonly type: "symbol" | "command";
  readonly trigger: string;
  readonly insertText: string;
  readonly chineseName: string;
  readonly category: string;
  readonly description?: string;
  readonly placeholderIds?: readonly string[];
  readonly priority?: number;
}

const BASIC_ROWS: readonly BasicCatalogRow[] = [
  { stableId: "symbol.alpha", type: "symbol", trigger: "alpha", insertText: "\\alpha", chineseName: "阿尔法", category: "希腊字母" },
  { stableId: "symbol.beta", type: "symbol", trigger: "beta", insertText: "\\beta", chineseName: "贝塔", category: "希腊字母" },
  { stableId: "symbol.gamma", type: "symbol", trigger: "gamma", insertText: "\\gamma", chineseName: "伽马", category: "希腊字母" },
  { stableId: "symbol.delta", type: "symbol", trigger: "delta", insertText: "\\delta", chineseName: "德尔塔", category: "希腊字母" },
  { stableId: "symbol.epsilon", type: "symbol", trigger: "epsilon", insertText: "\\epsilon", chineseName: "艾普西隆", category: "希腊字母" },
  { stableId: "symbol.theta", type: "symbol", trigger: "theta", insertText: "\\theta", chineseName: "西塔", category: "希腊字母" },
  { stableId: "symbol.lambda", type: "symbol", trigger: "lambda", insertText: "\\lambda", chineseName: "拉姆达", category: "希腊字母" },
  { stableId: "symbol.mu", type: "symbol", trigger: "mu", insertText: "\\mu", chineseName: "缪", category: "希腊字母" },
  { stableId: "symbol.pi", type: "symbol", trigger: "pi", insertText: "\\pi", chineseName: "圆周率", category: "希腊字母" },
  { stableId: "symbol.rho", type: "symbol", trigger: "rho", insertText: "\\rho", chineseName: "柔", category: "希腊字母" },
  { stableId: "symbol.sigma", type: "symbol", trigger: "sigma", insertText: "\\sigma", chineseName: "西格玛", category: "希腊字母" },
  { stableId: "symbol.tau", type: "symbol", trigger: "tau", insertText: "\\tau", chineseName: "陶", category: "希腊字母" },
  { stableId: "symbol.phi", type: "symbol", trigger: "phi", insertText: "\\phi", chineseName: "斐", category: "希腊字母" },
  { stableId: "symbol.omega", type: "symbol", trigger: "omega", insertText: "\\omega", chineseName: "欧米伽", category: "希腊字母" },
  { stableId: "symbol.chi", type: "symbol", trigger: "chi", insertText: "\\chi", chineseName: "卡方字母", category: "希腊字母" },
  { stableId: "symbol.psi", type: "symbol", trigger: "psi", insertText: "\\psi", chineseName: "普赛", category: "希腊字母" },
  { stableId: "symbol.infty", type: "symbol", trigger: "infty", insertText: "\\infty", chineseName: "无穷大", category: "常量" },
  { stableId: "symbol.partial", type: "symbol", trigger: "partial", insertText: "\\partial", chineseName: "偏微分符号", category: "微积分" },
  { stableId: "symbol.nabla", type: "symbol", trigger: "nabla", insertText: "\\nabla", chineseName: "纳布拉算子", category: "微积分" },
  { stableId: "symbol.forall", type: "symbol", trigger: "forall", insertText: "\\forall", chineseName: "任意", category: "逻辑" },
  { stableId: "symbol.exists", type: "symbol", trigger: "exists", insertText: "\\exists", chineseName: "存在", category: "逻辑" },
  { stableId: "symbol.neg", type: "symbol", trigger: "neg", insertText: "\\neg", chineseName: "逻辑非", category: "逻辑" },
  { stableId: "symbol.in", type: "symbol", trigger: "in", insertText: "\\in", chineseName: "属于", category: "集合" },
  { stableId: "symbol.notin", type: "symbol", trigger: "notin", insertText: "\\notin", chineseName: "不属于", category: "集合" },
  { stableId: "symbol.subset", type: "symbol", trigger: "subset", insertText: "\\subset", chineseName: "真子集", category: "集合" },
  { stableId: "symbol.subseteq", type: "symbol", trigger: "subseteq", insertText: "\\subseteq", chineseName: "子集", category: "集合" },
  { stableId: "symbol.supset", type: "symbol", trigger: "supset", insertText: "\\supset", chineseName: "真超集", category: "集合" },
  { stableId: "symbol.supseteq", type: "symbol", trigger: "supseteq", insertText: "\\supseteq", chineseName: "超集", category: "集合" },
  { stableId: "symbol.cup", type: "symbol", trigger: "cup", insertText: "\\cup", chineseName: "并集", category: "集合" },
  { stableId: "symbol.cap", type: "symbol", trigger: "cap", insertText: "\\cap", chineseName: "交集", category: "集合" },
  { stableId: "symbol.emptyset", type: "symbol", trigger: "emptyset", insertText: "\\emptyset", chineseName: "空集", category: "集合" },
  { stableId: "relation.leq", type: "symbol", trigger: "leq", insertText: "\\leq", chineseName: "小于等于", category: "关系" },
  { stableId: "relation.geq", type: "symbol", trigger: "geq", insertText: "\\geq", chineseName: "大于等于", category: "关系" },
  { stableId: "relation.neq", type: "symbol", trigger: "neq", insertText: "\\neq", chineseName: "不等于", category: "关系" },
  { stableId: "relation.approx", type: "symbol", trigger: "approx", insertText: "\\approx", chineseName: "约等于", category: "关系" },
  { stableId: "relation.equiv", type: "symbol", trigger: "equiv", insertText: "\\equiv", chineseName: "恒等或等价", category: "关系" },
  { stableId: "arrow.to", type: "symbol", trigger: "to", insertText: "\\to", chineseName: "趋向", category: "箭头" },
  { stableId: "arrow.rightarrow", type: "symbol", trigger: "rightarrow", insertText: "\\rightarrow", chineseName: "右箭头", category: "箭头" },
  { stableId: "arrow.leftarrow", type: "symbol", trigger: "leftarrow", insertText: "\\leftarrow", chineseName: "左箭头", category: "箭头" },
  { stableId: "arrow.leftrightarrow", type: "symbol", trigger: "leftrightarrow", insertText: "\\leftrightarrow", chineseName: "双向箭头", category: "箭头" },
  { stableId: "operator.times", type: "symbol", trigger: "times", insertText: "\\times", chineseName: "乘号", category: "运算符" },
  { stableId: "operator.cdot", type: "symbol", trigger: "cdot", insertText: "\\cdot", chineseName: "点乘", category: "运算符" },
  { stableId: "operator.pm", type: "symbol", trigger: "pm", insertText: "\\pm", chineseName: "正负号", category: "运算符" },
  { stableId: "operator.mp", type: "symbol", trigger: "mp", insertText: "\\mp", chineseName: "负正号", category: "运算符" },
  { stableId: "command.sum", type: "command", trigger: "sum", insertText: "\\sum", chineseName: "求和符号", category: "微积分", priority: 900 },
  { stableId: "command.prod", type: "command", trigger: "prod", insertText: "\\prod", chineseName: "乘积符号", category: "微积分", priority: 900 },
  { stableId: "command.int", type: "command", trigger: "int", insertText: "\\int", chineseName: "积分符号", category: "微积分", priority: 900 },
  { stableId: "command.lim", type: "command", trigger: "lim", insertText: "\\lim", chineseName: "极限符号", category: "微积分", priority: 900 },
  { stableId: "command.liminf", type: "command", trigger: "liminf", insertText: "\\liminf", chineseName: "下极限", category: "微积分" },
  { stableId: "command.limsup", type: "command", trigger: "limsup", insertText: "\\limsup", chineseName: "上极限", category: "微积分" },
  { stableId: "command.frac", type: "command", trigger: "frac", insertText: "\\frac{}{}", chineseName: "分数命令", category: "代数", placeholderIds: ["numerator", "denominator"], priority: 900 },
  { stableId: "command.sqrt", type: "command", trigger: "sqrt", insertText: "\\sqrt{}", chineseName: "根式命令", category: "代数", placeholderIds: ["radicand"], priority: 900 },
  { stableId: "command.sin", type: "command", trigger: "sin", insertText: "\\sin", chineseName: "正弦", category: "函数" },
  { stableId: "command.cos", type: "command", trigger: "cos", insertText: "\\cos", chineseName: "余弦", category: "函数" },
  { stableId: "command.tan", type: "command", trigger: "tan", insertText: "\\tan", chineseName: "正切", category: "函数" },
  { stableId: "command.log", type: "command", trigger: "log", insertText: "\\log", chineseName: "对数", category: "函数" },
  { stableId: "command.ln", type: "command", trigger: "ln", insertText: "\\ln", chineseName: "自然对数", category: "函数" },
  { stableId: "command.exp", type: "command", trigger: "exp", insertText: "\\exp", chineseName: "指数函数", category: "函数" },
  { stableId: "command.left", type: "command", trigger: "left", insertText: "\\left", chineseName: "自适应左定界符", category: "定界符" },
  { stableId: "command.right", type: "command", trigger: "right", insertText: "\\right", chineseName: "自适应右定界符", category: "定界符" },
];

const directionOptions = [
  { label: "双侧极限", value: "both" },
  { label: "左极限", value: "left" },
  { label: "右极限", value: "right" },
] as const;

const textParameter = (
  id: string,
  label: string,
  defaultValue: string,
  required = true,
): ParameterDefinition => ({ id, label, input: "text", defaultValue, required });

const positiveIntegerParameter = (
  id: string,
  label: string,
  defaultValue: string,
): ParameterDefinition => ({
  id,
  label,
  input: "positive-integer",
  defaultValue,
  required: false,
  help: "留空或输入正整数",
});

const limitParameters = (direction: string): readonly ParameterDefinition[] => [
  textParameter("variable", "变量", "x"),
  textParameter("target", "趋近于", "0"),
  {
    id: "direction",
    label: "方向",
    input: "enum",
    defaultValue: direction,
    required: true,
    options: directionOptions,
  },
  textParameter("expression", "表达式", "f(x)"),
];

const createFunction = (
  definition: Omit<
    FunctionCandidateDefinition,
    "type" | "category" | "chineseAliases" | "pinyinAliases"
  > & { readonly category?: string },
): FunctionCandidateDefinition => ({
  ...definition,
  ...getCandidateSearchMetadata(definition.stableId),
  type: "function",
  category: definition.category ?? "微积分",
});

const STRUCTURED_CANDIDATES: readonly FunctionCandidateDefinition[] = [
  createFunction({
    stableId: "limit.general",
    canonicalTrigger: "lim",
    englishName: "limit",
    chineseName: "一般极限",
    aliases: [],
    builtinPriority: 1000,
    description: "填写变量、趋近值、方向和表达式。",
    parameters: limitParameters("both"),
    directPlaceholderIds: ["variable", "target", "expression"],
  }),
  createFunction({
    stableId: "limit.left",
    canonicalTrigger: "lim",
    englishName: "left hand limit",
    chineseName: "左极限",
    aliases: ["leftlimit"],
    builtinPriority: 800,
    description: "从小于目标值的一侧趋近。",
    parameters: limitParameters("left"),
    directPlaceholderIds: ["variable", "target", "expression"],
  }),
  createFunction({
    stableId: "limit.right",
    canonicalTrigger: "lim",
    englishName: "right hand limit",
    chineseName: "右极限",
    aliases: ["rightlimit"],
    builtinPriority: 700,
    description: "从大于目标值的一侧趋近。",
    parameters: limitParameters("right"),
    directPlaceholderIds: ["variable", "target", "expression"],
  }),
  createFunction({
    stableId: "summation.guided",
    canonicalTrigger: "sum",
    englishName: "summation",
    chineseName: "求和模板",
    aliases: [],
    builtinPriority: 1000,
    description: "填写索引、起点、终点和被求和表达式。",
    parameters: [
      textParameter("index", "索引", "i"),
      textParameter("start", "起点", "1"),
      textParameter("end", "终点", "n"),
      textParameter("expression", "表达式", "a_i"),
    ],
    directPlaceholderIds: ["index", "start", "end", "expression"],
  }),
  createFunction({
    stableId: "product.guided",
    canonicalTrigger: "prod",
    englishName: "product",
    chineseName: "乘积模板",
    aliases: [],
    builtinPriority: 1000,
    description: "填写索引、起点、终点和乘积表达式。",
    parameters: [
      textParameter("index", "索引", "i"),
      textParameter("start", "起点", "1"),
      textParameter("end", "终点", "n"),
      textParameter("expression", "表达式", "a_i"),
    ],
    directPlaceholderIds: ["index", "start", "end", "expression"],
  }),
  createFunction({
    stableId: "integral.definite",
    canonicalTrigger: "int",
    englishName: "definite integral",
    chineseName: "定积分",
    aliases: ["definiteint"],
    builtinPriority: 1000,
    description: "填写积分变量、上下限和被积函数。",
    parameters: [
      textParameter("variable", "变量", "x"),
      textParameter("lower", "下限", "a"),
      textParameter("upper", "上限", "b"),
      textParameter("integrand", "被积函数", "f(x)"),
    ],
    directPlaceholderIds: ["lower", "upper", "integrand", "variable"],
  }),
  createFunction({
    stableId: "integral.indefinite",
    canonicalTrigger: "int",
    englishName: "indefinite integral",
    chineseName: "不定积分",
    aliases: ["indefiniteint"],
    builtinPriority: 800,
    description: "填写积分变量和被积函数。",
    parameters: [
      textParameter("variable", "变量", "x"),
      textParameter("integrand", "被积函数", "f(x)"),
    ],
    directPlaceholderIds: ["integrand", "variable"],
  }),
  createFunction({
    stableId: "fraction.guided",
    canonicalTrigger: "frac",
    englishName: "fraction",
    chineseName: "分数模板",
    aliases: [],
    category: "代数",
    builtinPriority: 1000,
    description: "填写分子和分母。",
    parameters: [
      textParameter("numerator", "分子", "a"),
      textParameter("denominator", "分母", "b"),
    ],
    directPlaceholderIds: ["numerator", "denominator"],
  }),
  createFunction({
    stableId: "root.guided",
    canonicalTrigger: "sqrt",
    englishName: "root",
    chineseName: "根式模板",
    aliases: ["nthroot"],
    category: "代数",
    builtinPriority: 1000,
    description: "填写可选根指数和被开方表达式。",
    parameters: [
      textParameter("index", "根指数", "", false),
      textParameter("radicand", "被开方表达式", "x"),
    ],
    directPlaceholderIds: ["radicand"],
  }),
  createFunction({
    stableId: "derivative.ordinary",
    canonicalTrigger: "der",
    englishName: "derivative",
    chineseName: "普通导数",
    aliases: ["diff"],
    builtinPriority: 1000,
    description: "填写函数、变量和导数阶数。",
    parameters: [
      textParameter("function", "函数", "f"),
      textParameter("variable", "变量", "x"),
      positiveIntegerParameter("order", "阶数", "1"),
    ],
    directPlaceholderIds: ["function", "variable"],
  }),
  createFunction({
    stableId: "derivative.partial",
    canonicalTrigger: "partial",
    englishName: "partial derivative",
    chineseName: "偏导数",
    aliases: ["partialdiff"],
    builtinPriority: 1000,
    description: "填写函数、变量和偏导阶数。",
    parameters: [
      textParameter("function", "函数", "f"),
      textParameter("variable", "变量", "x"),
      positiveIntegerParameter("order", "阶数", "1"),
    ],
    directPlaceholderIds: ["function", "variable"],
  }),
  createFunction({
    stableId: "binomial.guided",
    canonicalTrigger: "binom",
    englishName: "binomial coefficient",
    chineseName: "二项式系数",
    aliases: ["choose"],
    category: "代数",
    builtinPriority: 1000,
    description: "填写二项式系数的上参数和下参数。",
    parameters: [
      textParameter("upper", "上参数", "n"),
      textParameter("lower", "下参数", "k"),
    ],
    directPlaceholderIds: ["upper", "lower"],
  }),
];

const BASIC_CANDIDATES: readonly (SymbolCandidateDefinition | CommandCandidateDefinition)[] = BASIC_ROWS.map(
  (row) => {
    const common = {
      stableId: row.stableId,
      canonicalTrigger: row.trigger,
      englishName: row.trigger,
      chineseName: row.chineseName,
      aliases: [] as const,
      ...getCandidateSearchMetadata(row.stableId),
      category: row.category,
      builtinPriority: row.priority ?? 0,
      description: row.description ?? `插入 ${row.insertText}`,
      insertText: row.insertText,
    };
    return row.type === "symbol"
      ? { ...common, type: "symbol" as const }
      : {
          ...common,
          type: "command" as const,
          placeholderIds: row.placeholderIds ?? [],
        };
  },
);

export const CANDIDATE_CATALOG: readonly CandidateDefinition[] = Object.freeze([
  ...BASIC_CANDIDATES,
  ...STRUCTURED_CANDIDATES,
]);

export const CANDIDATES_BY_ID: ReadonlyMap<string, CandidateDefinition> = new Map(
  CANDIDATE_CATALOG.map((candidate) => [candidate.stableId, candidate]),
);

export function assertCatalogIntegrity(catalog: readonly CandidateDefinition[] = CANDIDATE_CATALOG): void {
  if (catalog.length !== 72) {
    throw new Error(`Formula Pilot catalog must contain 72 candidates; found ${catalog.length}.`);
  }
  const ids = new Set<string>();
  const chineseShortcuts = new Map<string, string>();
  const pinyinShortcuts = new Map<string, string>();
  for (const candidate of catalog) {
    if (ids.has(candidate.stableId)) {
      throw new Error(`Duplicate Formula Pilot stable ID: ${candidate.stableId}`);
    }
    ids.add(candidate.stableId);
    if (!candidate.canonicalTrigger || !candidate.englishName || !candidate.chineseName) {
      throw new Error(`Incomplete Formula Pilot candidate: ${candidate.stableId}`);
    }
    if (candidate.pinyinAliases.length === 0) {
      throw new Error(`Missing Formula Pilot pinyin aliases: ${candidate.stableId}`);
    }
    const candidateChinese = [candidate.chineseName, ...candidate.chineseAliases];
    if (new Set(candidateChinese).size !== candidateChinese.length) {
      throw new Error(`Duplicate Formula Pilot Chinese alias: ${candidate.stableId}`);
    }
    const candidatePinyin = [...candidate.pinyinAliases];
    if (new Set(candidatePinyin).size !== candidatePinyin.length) {
      throw new Error(`Duplicate Formula Pilot pinyin alias: ${candidate.stableId}`);
    }
    for (const shortcut of candidateChinese) {
      if (!/^\p{Script=Han}+$/u.test(shortcut)) {
        throw new Error(`Invalid Formula Pilot Chinese alias: ${candidate.stableId}:${shortcut}`);
      }
      const owner = chineseShortcuts.get(shortcut);
      if (owner && owner !== candidate.stableId) {
        throw new Error(`Formula Pilot Chinese alias collision: ${shortcut}`);
      }
      chineseShortcuts.set(shortcut, candidate.stableId);
    }
    for (const shortcut of candidatePinyin) {
      if (!/^[a-z]+$/.test(shortcut)) {
        throw new Error(`Invalid Formula Pilot pinyin alias: ${candidate.stableId}:${shortcut}`);
      }
      const owner = pinyinShortcuts.get(shortcut);
      if (owner && owner !== candidate.stableId) {
        throw new Error(`Formula Pilot pinyin alias collision: ${shortcut}`);
      }
      pinyinShortcuts.set(shortcut, candidate.stableId);
    }
  }
}

export function getCandidate(stableId: string): CandidateDefinition {
  const candidate = CANDIDATES_BY_ID.get(stableId);
  if (!candidate) throw new Error(`Unknown Formula Pilot candidate: ${stableId}`);
  return candidate;
}

export function getDefaultParameterValues(
  candidate: FunctionCandidateDefinition,
): Record<string, string> {
  return Object.fromEntries(
    candidate.parameters.map((parameter) => [parameter.id, parameter.defaultValue]),
  );
}

assertCatalogIntegrity();
