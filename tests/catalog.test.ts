import { describe, expect, it } from "vitest";
import {
  assertCatalogIntegrity,
  CANDIDATE_CATALOG,
  CANDIDATES_BY_ID,
} from "../src/core/catalog";
import type { CandidateDefinition } from "../src/core/types";

describe("frozen MVP catalog", () => {
  it("contains exactly 60 basic and 12 structured candidates", () => {
    expect(CANDIDATE_CATALOG).toHaveLength(72);
    expect(CANDIDATE_CATALOG.filter((candidate) => candidate.type === "function")).toHaveLength(12);
    expect(CANDIDATE_CATALOG.filter((candidate) => candidate.type !== "function")).toHaveLength(60);
    expect(CANDIDATES_BY_ID.size).toBe(72);
    expect(() => assertCatalogIntegrity()).not.toThrow();
  });

  it("keeps all stable IDs unique", () => {
    const ids = CANDIDATE_CATALOG.map((candidate) => candidate.stableId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains every required structured contract", () => {
    expect(
      CANDIDATE_CATALOG.filter((candidate) => candidate.type === "function").map(
        (candidate) => candidate.stableId,
      ),
    ).toEqual([
      "limit.general",
      "limit.left",
      "limit.right",
      "summation.guided",
      "product.guided",
      "integral.definite",
      "integral.indefinite",
      "fraction.guided",
      "root.guided",
      "derivative.ordinary",
      "derivative.partial",
      "binomial.guided",
    ]);
  });

  it("freezes valid Chinese and pinyin search metadata for every candidate", () => {
    for (const candidate of CANDIDATE_CATALOG) {
      expect(candidate.pinyinAliases.length).toBeGreaterThan(0);
      expect(candidate.pinyinAliases.every((alias) => /^[a-z]+$/.test(alias))).toBe(true);
      expect(candidate.chineseAliases.every((alias) => /^\p{Script=Han}+$/u.test(alias))).toBe(true);
    }
    expect(CANDIDATES_BY_ID.get("fraction.guided")?.chineseAliases).toContain("分数");
    expect(CANDIDATES_BY_ID.get("fraction.guided")?.pinyinAliases).toContain("fenshu");
    expect(CANDIDATES_BY_ID.get("product.guided")?.pinyinAliases).toContain("chengji");
  });

  it("rejects invalid or colliding localized shortcuts", () => {
    const replaceCandidate = (
      stableId: string,
      replacement: (candidate: CandidateDefinition) => CandidateDefinition,
    ): readonly CandidateDefinition[] =>
      CANDIDATE_CATALOG.map((candidate) =>
        candidate.stableId === stableId ? replacement(candidate) : candidate,
      );

    expect(() =>
      assertCatalogIntegrity(
        replaceCandidate("fraction.guided", (candidate) => ({
          ...candidate,
          pinyinAliases: ["FenShu"],
        })),
      ),
    ).toThrow(/Invalid Formula Pilot pinyin alias/);

    expect(() =>
      assertCatalogIntegrity(
        replaceCandidate("symbol.beta", (candidate) => ({
          ...candidate,
          chineseAliases: ["阿尔法"],
        })),
      ),
    ).toThrow(/Chinese alias collision/);
  });
});
