export type CandidateKind = "symbol" | "command" | "function";

export type GuidedMode = "guided" | "direct";

export type ParameterInputKind = "text" | "enum" | "positive-integer";

export interface ParameterOption {
  readonly label: string;
  readonly value: string;
}

export interface ParameterDefinition {
  readonly id: string;
  readonly label: string;
  readonly input: ParameterInputKind;
  readonly defaultValue: string;
  readonly required: boolean;
  readonly help?: string;
  readonly options?: readonly ParameterOption[];
}

export interface BaseCandidateDefinition {
  readonly stableId: string;
  readonly type: CandidateKind;
  readonly canonicalTrigger: string;
  readonly englishName: string;
  readonly chineseName: string;
  readonly aliases: readonly string[];
  readonly chineseAliases: readonly string[];
  readonly pinyinAliases: readonly string[];
  readonly category: string;
  readonly builtinPriority: number;
  readonly description: string;
}

export type MatchField =
  | "canonicalTrigger"
  | "englishName"
  | "alias"
  | "chineseName"
  | "chineseAlias"
  | "pinyinAlias"
  | "description";

export interface SymbolCandidateDefinition extends BaseCandidateDefinition {
  readonly type: "symbol";
  readonly insertText: string;
}

export interface CommandCandidateDefinition extends BaseCandidateDefinition {
  readonly type: "command";
  readonly insertText: string;
  readonly placeholderIds: readonly string[];
}

export interface FunctionCandidateDefinition extends BaseCandidateDefinition {
  readonly type: "function";
  readonly parameters: readonly ParameterDefinition[];
  readonly directPlaceholderIds: readonly string[];
}

export type CandidateDefinition =
  | SymbolCandidateDefinition
  | CommandCandidateDefinition
  | FunctionCandidateDefinition;

export type ParameterValues = Readonly<Record<string, string>>;

export interface PlaceholderRange {
  readonly id: string;
  readonly from: number;
  readonly to: number;
}

export interface GeneratedFormula {
  readonly latex: string;
  readonly placeholders: readonly PlaceholderRange[];
  readonly cursorEnd: number;
}

export interface UsageEntry {
  readonly usageCount: number;
  readonly lastUsedAt: number;
}

export type UsageSnapshot = Readonly<Record<string, UsageEntry>>;

export interface MatchDebug {
  readonly field: MatchField;
  readonly normalizedField: string;
}

export interface MatchResult {
  readonly candidate: CandidateDefinition;
  readonly matchRank: number;
  readonly stringDistance: number;
  readonly usageCount: number;
  readonly lastUsedAt: number;
  readonly debug: MatchDebug;
}

export interface ValidationIssue {
  readonly parameterId: string;
  readonly message: string;
}
