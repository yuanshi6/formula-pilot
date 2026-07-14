import { describe, expect, it } from "vitest";
import { CANDIDATE_CATALOG } from "../src/core/catalog";
import {
  levenshteinDistance,
  matchCandidates,
  normalizeQuery,
  subsequenceDistance,
} from "../src/core/matcher";

const idsFor = (query: string): readonly string[] =>
  matchCandidates(query, CANDIDATE_CATALOG).map((result) => result.candidate.stableId);

describe("candidate matcher", () => {
  it.each([
    ["li", ["limit.general", "command.lim", "limit.left", "limit.right", "command.liminf", "command.limsup"]],
    ["lim", ["limit.general", "command.lim", "limit.left", "limit.right", "command.liminf", "command.limsup"]],
    ["fra", ["fraction.guided", "command.frac"]],
    ["sum", ["summation.guided", "command.sum"]],
    ["inf", ["symbol.infty"]],
  ])("preserves the golden order for %s", (query, expected) => {
    expect(idsFor(query).slice(0, expected.length)).toEqual(expected);
  });

  it("never lets usage cross match rank", () => {
    const results = matchCandidates("lim", CANDIDATE_CATALOG, {
      "command.liminf": { usageCount: 1_000_000, lastUsedAt: Number.MAX_SAFE_INTEGER },
    });
    expect(results.findIndex((result) => result.candidate.stableId === "command.liminf")).toBeGreaterThan(
      results.findIndex((result) => result.candidate.stableId === "limit.right"),
    );
  });

  it("never lets usage cross string distance", () => {
    const results = matchCandidates("l", CANDIDATE_CATALOG, {
      "command.liminf": { usageCount: 1_000_000, lastUsedAt: Number.MAX_SAFE_INTEGER },
    });
    const short = results.find((result) => result.candidate.stableId === "command.lim");
    const long = results.find((result) => result.candidate.stableId === "command.liminf");
    expect(short?.stringDistance).toBeLessThan(long?.stringDistance ?? 0);
    expect(results.indexOf(short!)).toBeLessThan(results.indexOf(long!));
  });

  it("uses history before builtin priority only when similarity is identical", () => {
    const results = matchCandidates("lim", CANDIDATE_CATALOG, {
      "command.lim": { usageCount: 1, lastUsedAt: 100 },
    });
    expect(results[0]?.candidate.stableId).toBe("command.lim");
  });

  it("normalizes slash, NFKC, ASCII case, and surrounding whitespace", () => {
    expect(normalizeQuery("  \\ＬI  ")).toBe("li");
  });

  it("supports subsequence and bounded spelling correction", () => {
    expect(subsequenceDistance("lmt", "limit")).toBeTypeOf("number");
    expect(levenshteinDistance("lmi", "lim")).toBe(2);
    expect(idsFor("lmi")).toContain("limit.general");
  });

  it.each([
    ["分数", "fraction.guided"],
    ["fenshu", "fraction.guided"],
    ["fen", "fraction.guided"],
    ["fensuh", "fraction.guided"],
    ["乘积", "product.guided"],
    ["chengji", "product.guided"],
    ["积分", "integral.definite"],
    ["jifen", "integral.definite"],
    ["不定积分", "integral.indefinite"],
    ["budingjifen", "integral.indefinite"],
    ["阿尔法", "symbol.alpha"],
    ["aerfa", "symbol.alpha"],
    ["小于等于", "relation.leq"],
    ["xiaoyudengyu", "relation.leq"],
  ])("puts the localized shortcut %s first", (query, stableId) => {
    expect(idsFor(query)[0]).toBe(stableId);
  });

  it("keeps full command names distinct from structured shortcuts", () => {
    expect(idsFor("分数命令")[0]).toBe("command.frac");
    expect(idsFor("fenshumingling")[0]).toBe("command.frac");
    expect(idsFor("乘积符号")[0]).toBe("command.prod");
    expect(idsFor("chengjifuhao")[0]).toBe("command.prod");
  });

  it.each([
    ["分数", "fraction.guided", "command.frac"],
    ["fenshu", "fraction.guided", "command.frac"],
    ["乘积", "product.guided", "command.prod"],
    ["chengji", "product.guided", "command.prod"],
  ])("does not let history override exact shortcut %s", (query, expected, boosted) => {
    const results = matchCandidates(query, CANDIDATE_CATALOG, {
      [boosted]: { usageCount: 1_000_000, lastUsedAt: Number.MAX_SAFE_INTEGER },
    });
    expect(results[0]?.candidate.stableId).toBe(expected);
  });

  it("does not treat initials as pinyin shortcuts", () => {
    expect(idsFor("fs")).toEqual([]);
  });
});
