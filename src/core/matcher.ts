import type {
  CandidateDefinition,
  MatchDebug,
  MatchField,
  MatchResult,
  UsageSnapshot,
} from "./types";

interface FieldMatch {
  readonly rank: number;
  readonly distance: number;
  readonly debug: MatchDebug;
}

export function normalizeQuery(input: string): string {
  const normalized = input
    .normalize("NFKC")
    .replace(/[A-Z]/g, (letter) => letter.toLowerCase())
    .trim();
  return normalized.startsWith("\\") ? normalized.slice(1) : normalized;
}

/** Normalize a query for case-sensitive canonical LaTeX commands. */
const normalizeCanonicalQuery = (input: string): string => {
  const normalized = input.normalize("NFKC").trim();
  return normalized.startsWith("\\") ? normalized.slice(1) : normalized;
};

const normalizeField = (input: string): string =>
  input
    .normalize("NFKC")
    .replace(/[A-Z]/g, (letter) => letter.toLowerCase())
    .trim();

function prefixDistance(query: string, field: string): number | undefined {
  return field.startsWith(query) ? field.length - query.length : undefined;
}

export function subsequenceDistance(query: string, field: string): number | undefined {
  if (!query || query.length > field.length) return undefined;
  let best: number | undefined;
  for (let start = 0; start < field.length; start += 1) {
    if (field[start] !== query[0]) continue;
    let queryIndex = 1;
    let end = start + 1;
    while (end < field.length && queryIndex < query.length) {
      if (field[end] === query[queryIndex]) queryIndex += 1;
      end += 1;
    }
    if (queryIndex !== query.length) continue;
    const windowLength = end - start;
    const skipped = windowLength - query.length;
    const distance = windowLength - query.length + skipped;
    best = best === undefined ? distance : Math.min(best, distance);
  }
  return best;
}

export function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] ?? 0;
      const insertion = current[rightIndex - 1] ?? 0;
      const deletion = previous[rightIndex] ?? 0;
      current[rightIndex] = Math.min(
        insertion + 1,
        deletion + 1,
        substitution + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index] ?? 0;
  }
  return previous[right.length] ?? 0;
}

function bestMatch(candidate: CandidateDefinition, query: string, canonicalQuery: string): FieldMatch | undefined {
  const canonical = candidate.canonicalCaseSensitive
    ? candidate.canonicalTrigger.normalize("NFKC").trim()
    : normalizeField(candidate.canonicalTrigger);
  const canonicalMatchQuery = candidate.canonicalCaseSensitive ? canonicalQuery : query;
  const english = normalizeField(candidate.englishName);
  const aliases = candidate.aliases.map(normalizeField);
  const chinese = normalizeField(candidate.chineseName);
  const chineseAliases = candidate.chineseAliases.map(normalizeField);
  const pinyinAliases = candidate.pinyinAliases.map(normalizeField);
  const description = normalizeField(candidate.description);
  const matches: FieldMatch[] = [];
  const englishFields: readonly (readonly [MatchField, string])[] = [
    ["canonicalTrigger", canonical],
    ["englishName", english],
    ...aliases.map((alias) => ["alias", alias] as const),
  ];
  const localizedExactFields: readonly (readonly [MatchField, string])[] = [
    ["chineseName", chinese],
    ...chineseAliases.map((alias) => ["chineseAlias", alias] as const),
    ...pinyinAliases.map((alias) => ["pinyinAlias", alias] as const),
  ];

  if (canonical === canonicalMatchQuery) {
    matches.push({
      // A case-sensitive canonical hit must beat the case-insensitive legacy
      // spelling (for example `Gamma` must beat `gamma`).
      rank: candidate.canonicalCaseSensitive ? 0 : 1,
      distance: 0,
      debug: { field: "canonicalTrigger", normalizedField: canonical },
    });
  } else {
    const distance = prefixDistance(canonicalMatchQuery, canonical);
    if (distance !== undefined) {
      matches.push({
        rank: candidate.canonicalCaseSensitive ? 2 : 3,
        distance,
        debug: { field: "canonicalTrigger", normalizedField: canonical },
      });
    }
  }

  for (const [field, normalizedField] of localizedExactFields) {
    if (normalizedField === query) {
      matches.push({ rank: 2, distance: 0, debug: { field, normalizedField } });
    }
  }

  const englishDistance = prefixDistance(query, english);
  if (englishDistance !== undefined) {
    matches.push({ rank: 4, distance: englishDistance, debug: { field: "englishName", normalizedField: english } });
  }

  for (const alias of aliases) {
    const distance = alias === query ? 0 : prefixDistance(query, alias);
    if (distance !== undefined) {
      matches.push({ rank: 5, distance, debug: { field: "alias", normalizedField: alias } });
    }
  }

  for (const pinyin of pinyinAliases) {
    if (pinyin === query) continue;
    const distance = prefixDistance(query, pinyin);
    if (distance !== undefined) {
      matches.push({ rank: 6, distance, debug: { field: "pinyinAlias", normalizedField: pinyin } });
    }
  }

  for (const [field, normalizedField] of englishFields) {
    const distance = subsequenceDistance(query, normalizedField);
    if (distance !== undefined) matches.push({ rank: 7, distance, debug: { field, normalizedField } });
  }

  if (query.length >= 3) {
    const maximum = query.length <= 5 ? 1 : 2;
    const correctedFields: readonly (readonly [MatchField, string])[] = [
      ...englishFields,
      ...pinyinAliases.map((alias) => ["pinyinAlias", alias] as const),
    ];
    for (const [field, normalizedField] of correctedFields) {
      const distance = levenshteinDistance(query, normalizedField);
      if (distance <= maximum) matches.push({ rank: 8, distance, debug: { field, normalizedField } });
    }
  }

  const chineseFields: readonly (readonly [MatchField, string])[] = [
    ["chineseName", chinese],
    ...chineseAliases.map((alias) => ["chineseAlias", alias] as const),
    ["description", description],
  ];
  for (const [field, normalizedField] of chineseFields) {
    if (normalizedField === query && field !== "description") continue;
    const distance = normalizedField === query ? 0 : prefixDistance(query, normalizedField);
    if (distance !== undefined) matches.push({ rank: 9, distance, debug: { field, normalizedField } });
  }

  return matches.sort((left, right) => left.rank - right.rank || left.distance - right.distance)[0];
}

export function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (character) => character.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

export function compareMatchResults(left: MatchResult, right: MatchResult): number {
  return (
    left.matchRank - right.matchRank ||
    left.stringDistance - right.stringDistance ||
    right.usageCount - left.usageCount ||
    right.lastUsedAt - left.lastUsedAt ||
    right.candidate.builtinPriority - left.candidate.builtinPriority ||
    compareUnicodeCodePoints(left.candidate.stableId, right.candidate.stableId)
  );
}

export function matchCandidates(
  rawQuery: string,
  catalog: readonly CandidateDefinition[],
  usage: UsageSnapshot = {},
): readonly MatchResult[] {
  const query = normalizeQuery(rawQuery);
  const canonicalQuery = normalizeCanonicalQuery(rawQuery);
  if (!query) return [];
  const results: MatchResult[] = [];
  for (const candidate of catalog) {
    const matched = bestMatch(candidate, query, canonicalQuery);
    if (!matched) continue;
    const history = usage[candidate.stableId];
    results.push({
      candidate,
      matchRank: matched.rank,
      stringDistance: matched.distance,
      usageCount: history?.usageCount ?? 0,
      lastUsedAt: history?.lastUsedAt ?? 0,
      debug: matched.debug,
    });
  }
  return results.sort(compareMatchResults);
}

export function topStructuredCandidates(
  catalog: readonly CandidateDefinition[],
  usage: UsageSnapshot = {},
): readonly CandidateDefinition[] {
  return catalog
    .filter((candidate): candidate is CandidateDefinition & { type: "function" } => candidate.type === "function")
    .slice()
    .sort((left, right) => {
      const leftUsage = usage[left.stableId];
      const rightUsage = usage[right.stableId];
      return (
        (rightUsage?.usageCount ?? 0) - (leftUsage?.usageCount ?? 0) ||
        (rightUsage?.lastUsedAt ?? 0) - (leftUsage?.lastUsedAt ?? 0) ||
        right.builtinPriority - left.builtinPriority ||
        compareUnicodeCodePoints(left.stableId, right.stableId)
      );
    });
}
