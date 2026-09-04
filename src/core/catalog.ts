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
  readonly canonicalCaseSensitive?: boolean;
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
  // Remaining lowercase Greek letters and variants.
  { stableId: "symbol.zeta", type: "symbol", trigger: "zeta", insertText: "\\zeta", chineseName: "泽塔", category: "希腊字母" },
  { stableId: "symbol.eta", type: "symbol", trigger: "eta", insertText: "\\eta", chineseName: "伊塔", category: "希腊字母" },
  { stableId: "symbol.iota", type: "symbol", trigger: "iota", insertText: "\\iota", chineseName: "约塔", category: "希腊字母" },
  { stableId: "symbol.kappa", type: "symbol", trigger: "kappa", insertText: "\\kappa", chineseName: "卡帕", category: "希腊字母" },
  { stableId: "symbol.nu", type: "symbol", trigger: "nu", insertText: "\\nu", chineseName: "纽", category: "希腊字母" },
  { stableId: "symbol.xi", type: "symbol", trigger: "xi", insertText: "\\xi", chineseName: "克西", category: "希腊字母" },
  { stableId: "symbol.upsilon", type: "symbol", trigger: "upsilon", insertText: "\\upsilon", chineseName: "宇普西隆", category: "希腊字母" },
  { stableId: "symbol.varepsilon", type: "symbol", trigger: "varepsilon", insertText: "\\varepsilon", chineseName: "变体艾普西隆", category: "希腊字母变体" },
  { stableId: "symbol.vartheta", type: "symbol", trigger: "vartheta", insertText: "\\vartheta", chineseName: "变体西塔", category: "希腊字母变体" },
  { stableId: "symbol.varkappa", type: "symbol", trigger: "varkappa", insertText: "\\varkappa", chineseName: "变体卡帕", category: "希腊字母变体" },
  { stableId: "symbol.varpi", type: "symbol", trigger: "varpi", insertText: "\\varpi", chineseName: "变体圆周率", category: "希腊字母变体" },
  { stableId: "symbol.varrho", type: "symbol", trigger: "varrho", insertText: "\\varrho", chineseName: "变体柔", category: "希腊字母变体" },
  { stableId: "symbol.varsigma", type: "symbol", trigger: "varsigma", insertText: "\\varsigma", chineseName: "变体西格玛", category: "希腊字母变体" },
  { stableId: "symbol.varphi", type: "symbol", trigger: "varphi", insertText: "\\varphi", chineseName: "变体斐", category: "希腊字母变体" },
  // Uppercase Greek commands are case-sensitive in LaTeX.
  { stableId: "symbol.upper-gamma", type: "symbol", trigger: "Gamma", canonicalCaseSensitive: true, insertText: "\\Gamma", chineseName: "大写伽马", category: "大写希腊字母" },
  { stableId: "symbol.upper-delta", type: "symbol", trigger: "Delta", canonicalCaseSensitive: true, insertText: "\\Delta", chineseName: "大写德尔塔", category: "大写希腊字母" },
  { stableId: "symbol.upper-theta", type: "symbol", trigger: "Theta", canonicalCaseSensitive: true, insertText: "\\Theta", chineseName: "大写西塔", category: "大写希腊字母" },
  { stableId: "symbol.upper-lambda", type: "symbol", trigger: "Lambda", canonicalCaseSensitive: true, insertText: "\\Lambda", chineseName: "大写拉姆达", category: "大写希腊字母" },
  { stableId: "symbol.upper-xi", type: "symbol", trigger: "Xi", canonicalCaseSensitive: true, insertText: "\\Xi", chineseName: "大写克西", category: "大写希腊字母" },
  { stableId: "symbol.upper-pi", type: "symbol", trigger: "Pi", canonicalCaseSensitive: true, insertText: "\\Pi", chineseName: "大写圆周率字母", category: "大写希腊字母" },
  { stableId: "symbol.upper-sigma", type: "symbol", trigger: "Sigma", canonicalCaseSensitive: true, insertText: "\\Sigma", chineseName: "大写西格玛", category: "大写希腊字母" },
  { stableId: "symbol.upper-upsilon", type: "symbol", trigger: "Upsilon", canonicalCaseSensitive: true, insertText: "\\Upsilon", chineseName: "大写宇普西隆", category: "大写希腊字母" },
  { stableId: "symbol.upper-phi", type: "symbol", trigger: "Phi", canonicalCaseSensitive: true, insertText: "\\Phi", chineseName: "大写斐", category: "大写希腊字母" },
  { stableId: "symbol.upper-psi", type: "symbol", trigger: "Psi", canonicalCaseSensitive: true, insertText: "\\Psi", chineseName: "大写普赛", category: "大写希腊字母" },
  { stableId: "symbol.upper-omega", type: "symbol", trigger: "Omega", canonicalCaseSensitive: true, insertText: "\\Omega", chineseName: "大写欧米伽", category: "大写希腊字母" },
  // Geometry and complex symbols.
  { stableId: "geometry.angle-symbol", type: "symbol", trigger: "angle", insertText: "\\angle", chineseName: "角", category: "几何" },
  { stableId: "geometry.triangle", type: "symbol", trigger: "triangle", insertText: "\\triangle", chineseName: "三角形", category: "几何" },
  { stableId: "geometry.perpendicular", type: "symbol", trigger: "perpendicular", insertText: "\\perp", chineseName: "垂直", category: "几何" },
  { stableId: "geometry.parallel", type: "symbol", trigger: "parallel", insertText: "\\parallel", chineseName: "平行", category: "几何" },
  { stableId: "geometry.congruent", type: "symbol", trigger: "congruent", insertText: "\\cong", chineseName: "全等", category: "几何" },
  { stableId: "geometry.similar", type: "symbol", trigger: "similar", insertText: "\\sim", chineseName: "相似", category: "几何" },
  { stableId: "geometry.degree", type: "symbol", trigger: "degree", insertText: "^\\circ", chineseName: "度", category: "几何" },
  { stableId: "geometry.therefore", type: "symbol", trigger: "therefore", insertText: "\\therefore", chineseName: "所以", category: "几何" },
  { stableId: "geometry.because", type: "symbol", trigger: "because", insertText: "\\because", chineseName: "因为", category: "几何" },
  { stableId: "complex.imaginary-unit", type: "symbol", trigger: "imaginaryunit", insertText: "\\mathrm{i}", chineseName: "虚数单位", category: "复数" },
  { stableId: "complex.set", type: "symbol", trigger: "complexset", insertText: "\\mathbb{C}", chineseName: "复数集", category: "复数" },
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

const multilineTextParameter = (
  id: string,
  label: string,
  defaultValue: string,
  required = true,
): ParameterDefinition => ({ id, label, input: "multiline-text", defaultValue, required });

const customEnvironmentOptions = [
  { label: "aligned — 对齐环境", value: "aligned" },
  { label: "aligned* — 对齐环境（星号）", value: "aligned*" },
  { label: "gathered — 聚合环境", value: "gathered" },
  { label: "gathered* — 聚合环境（星号）", value: "gathered*" },
  { label: "split — 分行环境", value: "split" },
  { label: "split* — 分行环境（星号）", value: "split*" },
  { label: "cases — 分段环境", value: "cases" },
  { label: "matrix — 矩阵环境", value: "matrix" },
  { label: "pmatrix — 圆括号矩阵环境", value: "pmatrix" },
  { label: "bmatrix — 方括号矩阵环境", value: "bmatrix" },
  { label: "Bmatrix — 大括号矩阵环境", value: "Bmatrix" },
  { label: "vmatrix — 行列式环境", value: "vmatrix" },
  { label: "Vmatrix — 双竖线行列式环境", value: "Vmatrix" },
  { label: "smallmatrix — 小矩阵环境", value: "smallmatrix" },
] as const;

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
  createFunction({
    stableId: "matrix.2x2",
    canonicalTrigger: "matrix2",
    englishName: "two by two matrix",
    chineseName: "二阶矩阵模板",
    aliases: ["2x2matrix"],
    category: "矩阵",
    builtinPriority: 1000,
    description: "填写二阶矩阵定界符和元素。",
    parameters: [
      {
        id: "delimiterStyle",
        label: "定界符",
        input: "enum",
        defaultValue: "pmatrix",
        required: true,
        options: [
          { label: "圆括号", value: "pmatrix" },
          { label: "方括号", value: "bmatrix" },
          { label: "大括号", value: "Bmatrix" },
          { label: "无定界符", value: "matrix" },
        ],
      },
      textParameter("a11", "a₁₁", "a_{11}"),
      textParameter("a12", "a₁₂", "a_{12}"),
      textParameter("a21", "a₂₁", "a_{21}"),
      textParameter("a22", "a₂₂", "a_{22}"),
    ],
    directPlaceholderIds: ["a11", "a12", "a21", "a22"],
  }),
  createFunction({
    stableId: "matrix.3x3",
    canonicalTrigger: "matrix3",
    englishName: "three by three matrix",
    chineseName: "三阶矩阵模板",
    aliases: ["3x3matrix"],
    category: "矩阵",
    builtinPriority: 950,
    description: "填写三阶矩阵定界符和元素。",
    parameters: [
      {
        id: "delimiterStyle",
        label: "定界符",
        input: "enum",
        defaultValue: "pmatrix",
        required: true,
        options: [
          { label: "圆括号", value: "pmatrix" },
          { label: "方括号", value: "bmatrix" },
          { label: "大括号", value: "Bmatrix" },
          { label: "无定界符", value: "matrix" },
        ],
      },
      textParameter("a11", "a₁₁", "a_{11}"), textParameter("a12", "a₁₂", "a_{12}"), textParameter("a13", "a₁₃", "a_{13}"),
      textParameter("a21", "a₂₁", "a_{21}"), textParameter("a22", "a₂₂", "a_{22}"), textParameter("a23", "a₂₃", "a_{23}"),
      textParameter("a31", "a₃₁", "a_{31}"), textParameter("a32", "a₃₂", "a_{32}"), textParameter("a33", "a₃₃", "a_{33}"),
    ],
    directPlaceholderIds: ["a11", "a12", "a13", "a21", "a22", "a23", "a31", "a32", "a33"],
  }),
  createFunction({
    stableId: "matrix.custom",
    canonicalTrigger: "matrixcustom",
    englishName: "custom matrix",
    chineseName: "自定义矩阵模板",
    aliases: ["custommat"],
    category: "矩阵",
    builtinPriority: 900,
    description: "填写矩阵定界符和多行内容。",
    parameters: [
      {
        id: "delimiterStyle",
        label: "定界符",
        input: "enum",
        defaultValue: "pmatrix",
        required: true,
        options: [
          { label: "圆括号", value: "pmatrix" },
          { label: "方括号", value: "bmatrix" },
          { label: "大括号", value: "Bmatrix" },
          { label: "无定界符", value: "matrix" },
        ],
      },
      multilineTextParameter("body", "矩阵内容", "a & b\nc & d"),
    ],
    directPlaceholderIds: ["body"],
  }),
  createFunction({
    stableId: "determinant.2x2",
    canonicalTrigger: "det2",
    englishName: "two by two determinant",
    chineseName: "二阶行列式模板",
    aliases: ["2x2determinant"],
    category: "行列式",
    builtinPriority: 850,
    description: "填写二阶行列式的四个元素。",
    parameters: [
      textParameter("a11", "a₁₁", "a_{11}"), textParameter("a12", "a₁₂", "a_{12}"),
      textParameter("a21", "a₂₁", "a_{21}"), textParameter("a22", "a₂₂", "a_{22}"),
    ],
    directPlaceholderIds: ["a11", "a12", "a21", "a22"],
  }),
  createFunction({
    stableId: "determinant.custom",
    canonicalTrigger: "detcustom",
    englishName: "custom determinant",
    chineseName: "自定义行列式模板",
    aliases: ["customdet"],
    category: "行列式",
    builtinPriority: 800,
    description: "填写多行行列式内容。",
    parameters: [multilineTextParameter("body", "行列式内容", "a & b\nc & d")],
    directPlaceholderIds: ["body"],
  }),
  createFunction({
    stableId: "piecewise.2",
    canonicalTrigger: "cases2",
    englishName: "two-case piecewise function",
    chineseName: "二段分段函数模板",
    aliases: ["twocases"],
    category: "分段与多行",
    builtinPriority: 1000,
    description: "填写两段分段函数的表达式和条件。",
    parameters: [
      textParameter("expression1", "表达式 1", "x^2"), textParameter("condition1", "条件 1", "x\\ge 0"),
      textParameter("expression2", "表达式 2", "-x"), textParameter("condition2", "条件 2", "x<0"),
    ],
    directPlaceholderIds: ["expression1", "condition1", "expression2", "condition2"],
  }),
  createFunction({
    stableId: "piecewise.custom",
    canonicalTrigger: "casescustom",
    englishName: "custom piecewise function",
    chineseName: "自定义分段函数模板",
    aliases: ["customcases"],
    category: "分段与多行",
    builtinPriority: 850,
    description: "填写任意数量的分段表达式和条件。",
    parameters: [multilineTextParameter("body", "分段内容", "x^2 & x\\ge 0\n-x & x<0")],
    directPlaceholderIds: ["body"],
  }),
  createFunction({
    stableId: "system.2",
    canonicalTrigger: "system2",
    englishName: "two-equation system",
    chineseName: "二元方程组模板",
    aliases: ["twosystem"],
    category: "方程与多行",
    builtinPriority: 1000,
    description: "填写两行方程及其关系符号。",
    parameters: [
      textParameter("lhs1", "左式 1", "x+y"), textParameter("relation1", "关系 1", "="), textParameter("rhs1", "右式 1", "1"),
      textParameter("lhs2", "左式 2", "x-y"), textParameter("relation2", "关系 2", "="), textParameter("rhs2", "右式 2", "0"),
    ],
    directPlaceholderIds: ["lhs1", "relation1", "rhs1", "lhs2", "relation2", "rhs2"],
  }),
  createFunction({
    stableId: "system.custom",
    canonicalTrigger: "systemcustom",
    englishName: "custom equation system",
    chineseName: "自定义方程组模板",
    aliases: ["customequations"],
    category: "方程与多行",
    builtinPriority: 950,
    description: "填写任意数量的方程组多行内容。",
    parameters: [multilineTextParameter("body", "方程组内容", "x+y&=1\n2x-y&=0")],
    directPlaceholderIds: ["body"],
  }),
  createFunction({
    stableId: "aligned.2",
    canonicalTrigger: "aligned2",
    englishName: "two-line aligned equations",
    chineseName: "二行对齐模板",
    aliases: ["twoaligned"],
    category: "方程与多行",
    builtinPriority: 850,
    description: "填写两行需要对齐的表达式。",
    parameters: [
      textParameter("lhs1", "左式 1", "f(x)"), textParameter("rhs1", "右式 1", "x^2"),
      textParameter("lhs2", "左式 2", "g(x)"), textParameter("rhs2", "右式 2", "x+1"),
    ],
    directPlaceholderIds: ["lhs1", "rhs1", "lhs2", "rhs2"],
  }),
  createFunction({
    stableId: "aligned.custom",
    canonicalTrigger: "alignedcustom",
    englishName: "custom aligned equations",
    chineseName: "自定义对齐模板",
    aliases: ["customalign"],
    category: "方程与多行",
    builtinPriority: 800,
    description: "填写任意数量的对齐方程。",
    parameters: [multilineTextParameter("body", "对齐内容", "f(x) & = x^2\ng(x) & = x+1")],
    directPlaceholderIds: ["body"],
  }),
  createFunction({
    stableId: "rounding.floor",
    canonicalTrigger: "floor",
    englishName: "floor",
    chineseName: "向下取整模板",
    aliases: ["flooring"],
    category: "取整与绝对值",
    builtinPriority: 1000,
    description: "生成下取整表达式。",
    parameters: [textParameter("expression", "表达式", "x")],
    directPlaceholderIds: ["expression"],
  }),
  createFunction({
    stableId: "rounding.ceil",
    canonicalTrigger: "ceil",
    englishName: "ceiling",
    chineseName: "向上取整模板",
    aliases: ["ceiling"],
    category: "取整与绝对值",
    builtinPriority: 1000,
    description: "生成上取整表达式。",
    parameters: [textParameter("expression", "表达式", "x")],
    directPlaceholderIds: ["expression"],
  }),
  createFunction({
    stableId: "absolute.value",
    canonicalTrigger: "abs",
    englishName: "absolute value",
    chineseName: "绝对值模板",
    aliases: ["absolute"],
    category: "取整与绝对值",
    builtinPriority: 1000,
    description: "使用成对竖线包围表达式。",
    parameters: [textParameter("expression", "表达式", "x")],
    directPlaceholderIds: ["expression"],
  }),
  createFunction({
    stableId: "norm.expression",
    canonicalTrigger: "norm",
    englishName: "norm",
    chineseName: "范数模板",
    aliases: ["magnitude"],
    category: "向量与矩阵",
    builtinPriority: 1000,
    description: "使用双竖线包围向量或表达式。",
    parameters: [textParameter("expression", "表达式", "v")],
    directPlaceholderIds: ["expression"],
  }),
  createFunction({
    stableId: "set.cardinality",
    canonicalTrigger: "cardinality",
    englishName: "set cardinality",
    chineseName: "集合基数模板",
    aliases: ["setsize"],
    category: "集合",
    builtinPriority: 850,
    description: "填写集合生成基数记号。",
    parameters: [textParameter("set", "集合", "A")],
    directPlaceholderIds: ["set"],
  }),
  createFunction({
    stableId: "vector.arrow",
    canonicalTrigger: "vec",
    englishName: "vector arrow",
    chineseName: "箭头向量模板",
    aliases: ["arrowvector"],
    category: "向量与矩阵",
    builtinPriority: 900,
    description: "在向量变量上方添加箭头。",
    parameters: [textParameter("vector", "向量", "v")],
    directPlaceholderIds: ["vector"],
  }),
  createFunction({
    stableId: "vector.bold",
    canonicalTrigger: "mathbf",
    englishName: "bold vector",
    chineseName: "粗体向量模板",
    aliases: ["bvector"],
    category: "向量与矩阵",
    builtinPriority: 900,
    description: "将向量变量设置为粗体。",
    parameters: [textParameter("vector", "向量", "v")],
    directPlaceholderIds: ["vector"],
  }),
  createFunction({
    stableId: "vector.dot",
    canonicalTrigger: "dotproduct",
    englishName: "dot product",
    chineseName: "向量点积模板",
    aliases: ["innerproduct"],
    category: "向量与矩阵",
    builtinPriority: 900,
    description: "填写两个向量生成点积。",
    parameters: [textParameter("left", "左向量", "u"), textParameter("right", "右向量", "v")],
    directPlaceholderIds: ["left", "right"],
  }),
  createFunction({
    stableId: "vector.cross",
    canonicalTrigger: "crossproduct",
    englishName: "cross product",
    chineseName: "向量叉积模板",
    aliases: ["vectorproduct"],
    category: "向量与矩阵",
    builtinPriority: 850,
    description: "填写两个向量生成叉积。",
    parameters: [textParameter("left", "左向量", "u"), textParameter("right", "右向量", "v")],
    directPlaceholderIds: ["left", "right"],
  }),
  createFunction({
    stableId: "matrix.transpose",
    canonicalTrigger: "transpose",
    englishName: "matrix transpose",
    chineseName: "矩阵转置模板",
    aliases: ["transposedmatrix"],
    category: "向量与矩阵",
    builtinPriority: 900,
    description: "填写矩阵生成转置记号。",
    parameters: [textParameter("matrix", "矩阵", "A")],
    directPlaceholderIds: ["matrix"],
  }),
  createFunction({
    stableId: "matrix.inverse",
    canonicalTrigger: "inverse",
    englishName: "matrix inverse",
    chineseName: "逆矩阵模板",
    aliases: ["inversematrix"],
    category: "向量与矩阵",
    builtinPriority: 850,
    description: "填写矩阵生成逆矩阵记号。",
    parameters: [textParameter("matrix", "矩阵", "A")],
    directPlaceholderIds: ["matrix"],
  }),
  createFunction({
    stableId: "set.builder",
    canonicalTrigger: "setbuilder",
    englishName: "set-builder notation",
    chineseName: "集合构造式模板",
    aliases: ["setnotation"],
    category: "集合",
    builtinPriority: 1000,
    description: "填写集合元素、定义域和性质。",
    parameters: [textParameter("element", "元素", "x"), textParameter("domain", "定义域", "\\mathbb{R}"), textParameter("predicate", "性质", "x>0")],
    directPlaceholderIds: ["element", "domain", "predicate"],
  }),
  createFunction({
    stableId: "set.builder.condition",
    canonicalTrigger: "setcondition",
    englishName: "set-builder condition",
    chineseName: "集合条件模板",
    aliases: ["setconditionnotation"],
    category: "集合",
    builtinPriority: 950,
    description: "填写集合元素和成立条件。",
    parameters: [textParameter("element", "元素", "x"), textParameter("predicate", "性质", "x>0")],
    directPlaceholderIds: ["element", "predicate"],
  }),
  createFunction({
    stableId: "probability.simple",
    canonicalTrigger: "prob",
    englishName: "probability",
    chineseName: "概率模板",
    aliases: ["prob"],
    category: "概率统计",
    builtinPriority: 1000,
    description: "填写事件生成概率记号。",
    parameters: [textParameter("event", "事件", "A")],
    directPlaceholderIds: ["event"],
  }),
  createFunction({
    stableId: "probability.conditional",
    canonicalTrigger: "conditionalprob",
    englishName: "conditional probability",
    chineseName: "条件概率模板",
    aliases: ["condprob"],
    category: "概率统计",
    builtinPriority: 950,
    description: "填写事件和条件事件。",
    parameters: [textParameter("event", "事件", "A"), textParameter("condition", "条件事件", "B")],
    directPlaceholderIds: ["event", "condition"],
  }),
  createFunction({
    stableId: "statistics.expectation",
    canonicalTrigger: "expectation",
    englishName: "expectation",
    chineseName: "数学期望模板",
    aliases: ["expectedvalue"],
    category: "概率统计",
    builtinPriority: 950,
    description: "填写随机变量生成数学期望。",
    parameters: [textParameter("variable", "随机变量", "X")],
    directPlaceholderIds: ["variable"],
  }),
  createFunction({
    stableId: "statistics.variance",
    canonicalTrigger: "variance",
    englishName: "variance",
    chineseName: "方差模板",
    aliases: ["var"],
    category: "概率统计",
    builtinPriority: 950,
    description: "填写数据集生成方差。",
    parameters: [textParameter("data", "数据", "x_1,\\ldots,x_n")],
    directPlaceholderIds: ["data"],
  }),
  createFunction({
    stableId: "statistics.covariance",
    canonicalTrigger: "covariance",
    englishName: "covariance",
    chineseName: "协方差模板",
    aliases: ["covar"],
    category: "概率统计",
    builtinPriority: 900,
    description: "填写两个变量生成协方差记号。",
    parameters: [textParameter("left", "左变量", "X"), textParameter("right", "右变量", "Y")],
    directPlaceholderIds: ["left", "right"],
  }),
  createFunction({
    stableId: "probability.distribution",
    canonicalTrigger: "distribution",
    englishName: "probability distribution",
    chineseName: "概率分布模板",
    aliases: ["distributionlaw"],
    category: "概率统计",
    builtinPriority: 850,
    description: "填写随机变量、分布和参数。",
    parameters: [textParameter("variable", "随机变量", "X"), textParameter("distribution", "分布", "N"), textParameter("parameters", "参数", "\\mu,\\sigma")],
    directPlaceholderIds: ["variable", "distribution", "parameters"],
  }),
  createFunction({
    stableId: "complex.number",
    canonicalTrigger: "complex",
    englishName: "complex number",
    chineseName: "复数模板",
    aliases: ["complexnumber"],
    category: "复数",
    builtinPriority: 1000,
    description: "填写实部和虚部生成复数。",
    parameters: [textParameter("realPart", "实部", "a"), textParameter("imaginaryPart", "虚部", "b")],
    directPlaceholderIds: ["realPart", "imaginaryPart"],
  }),
  createFunction({
    stableId: "complex.conjugate",
    canonicalTrigger: "conjugate",
    englishName: "complex conjugate",
    chineseName: "复共轭模板",
    aliases: ["complexconjugate"],
    category: "复数",
    builtinPriority: 900,
    description: "填写复数生成共轭记号。",
    parameters: [textParameter("number", "复数", "z")],
    directPlaceholderIds: ["number"],
  }),
  createFunction({
    stableId: "complex.real-part",
    canonicalTrigger: "realpart",
    englishName: "real part",
    chineseName: "实部模板",
    aliases: ["realpartofcomplex"],
    category: "复数",
    builtinPriority: 850,
    description: "填写复数生成实部记号。",
    parameters: [textParameter("number", "复数", "z")],
    directPlaceholderIds: ["number"],
  }),
  createFunction({
    stableId: "complex.imaginary-part",
    canonicalTrigger: "imagpart",
    englishName: "imaginary part",
    chineseName: "虚部模板",
    aliases: ["imaginarypartofcomplex"],
    category: "复数",
    builtinPriority: 850,
    description: "填写复数生成虚部记号。",
    parameters: [textParameter("number", "复数", "z")],
    directPlaceholderIds: ["number"],
  }),
  createFunction({
    stableId: "complex.polar",
    canonicalTrigger: "polar",
    englishName: "complex polar form",
    chineseName: "复数极坐标模板",
    aliases: ["polarcomplex"],
    category: "复数",
    builtinPriority: 900,
    description: "填写模和辐角生成复数极坐标形式。",
    parameters: [textParameter("modulus", "模", "r"), textParameter("argument", "辐角", "\\theta")],
    directPlaceholderIds: ["modulus", "argument"],
  }),
  createFunction({
    stableId: "geometry.segment",
    canonicalTrigger: "segment",
    englishName: "line segment",
    chineseName: "线段模板",
    aliases: ["linesegment"],
    category: "几何",
    builtinPriority: 1000,
    description: "填写端点生成线段记号。",
    parameters: [textParameter("points", "端点", "AB")],
    directPlaceholderIds: ["points"],
  }),
  createFunction({
    stableId: "geometry.ray",
    canonicalTrigger: "ray",
    englishName: "ray",
    chineseName: "射线模板",
    aliases: ["geometricray"],
    category: "几何",
    builtinPriority: 950,
    description: "填写端点生成射线记号。",
    parameters: [textParameter("points", "端点", "AB")],
    directPlaceholderIds: ["points"],
  }),
  createFunction({
    stableId: "geometry.arc",
    canonicalTrigger: "arc",
    englishName: "arc",
    chineseName: "圆弧模板",
    aliases: ["geometricarc"],
    category: "几何",
    builtinPriority: 900,
    description: "填写端点生成圆弧记号。",
    parameters: [textParameter("points", "端点", "AB")],
    directPlaceholderIds: ["points"],
  }),
  createFunction({
    stableId: "geometry.angle-points",
    canonicalTrigger: "angleof",
    englishName: "angle by points",
    chineseName: "点角模板",
    aliases: ["anglepoints"],
    category: "几何",
    builtinPriority: 900,
    description: "填写点名生成角记号。",
    parameters: [textParameter("points", "点名", "ABC")],
    directPlaceholderIds: ["points"],
  }),
  createFunction({
    stableId: "box.content",
    canonicalTrigger: "boxed",
    englishName: "boxed content",
    chineseName: "方框内容",
    aliases: ["boxcontent"],
    category: "结构与环境",
    builtinPriority: 800,
    description: "填写内容生成方框公式。",
    parameters: [textParameter("content", "内容", "x^2+y^2=1")],
    directPlaceholderIds: ["content"],
  }),
  createFunction({
    stableId: "environment.custom",
    canonicalTrigger: "environment",
    englishName: "custom environment",
    chineseName: "自定义环境",
    aliases: ["customenvironment"],
    category: "结构与环境",
    builtinPriority: 750,
    description: "填写环境名称和多行内容。",
    parameters: [
      {
        id: "environmentName",
        label: "环境名称",
        input: "enum",
        defaultValue: "aligned",
        required: true,
        options: customEnvironmentOptions,
      },
      multilineTextParameter("body", "环境内容", "a&=b+c\nd&=e+f"),
    ],
    directPlaceholderIds: ["body"],
  }),
];

const BASIC_CANDIDATES: readonly (SymbolCandidateDefinition | CommandCandidateDefinition)[] = BASIC_ROWS.map(
  (row) => {
    const common = {
      stableId: row.stableId,
      canonicalTrigger: row.trigger,
      ...(row.canonicalCaseSensitive ? { canonicalCaseSensitive: true } : {}),
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
  if (catalog.length !== 149) {
    throw new Error(`Formula Pilot catalog must contain 149 candidates; found ${catalog.length}.`);
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
