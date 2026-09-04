import { describe, expect, it } from "vitest";
import {
  assertCatalogIntegrity,
  CANDIDATE_CATALOG,
  CANDIDATES_BY_ID,
} from "../src/core/catalog";
import type { CandidateDefinition } from "../src/core/types";

describe("frozen MVP catalog", () => {
  it("contains exactly 96 basic and 53 structured candidates", () => {
    expect(CANDIDATE_CATALOG).toHaveLength(149);
    expect(CANDIDATE_CATALOG.filter((candidate) => candidate.type === "function")).toHaveLength(53);
    expect(CANDIDATE_CATALOG.filter((candidate) => candidate.type !== "function")).toHaveLength(96);
    expect(CANDIDATES_BY_ID.size).toBe(149);
    const addedIds = new Set(["box.content", "environment.custom"]);
    expect(CANDIDATE_CATALOG.filter((candidate) => !addedIds.has(candidate.stableId))).toHaveLength(147);
    expect([...addedIds].every((stableId) => CANDIDATES_BY_ID.has(stableId))).toBe(true);
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
      "matrix.2x2",
      "matrix.3x3",
      "matrix.custom",
      "determinant.2x2",
      "determinant.custom",
      "piecewise.2",
      "piecewise.custom",
      "system.2",
      "system.custom",
      "aligned.2",
      "aligned.custom",
      "rounding.floor",
      "rounding.ceil",
      "absolute.value",
      "norm.expression",
      "set.cardinality",
      "vector.arrow",
      "vector.bold",
      "vector.dot",
      "vector.cross",
      "matrix.transpose",
      "matrix.inverse",
      "set.builder",
      "set.builder.condition",
      "probability.simple",
      "probability.conditional",
      "statistics.expectation",
      "statistics.variance",
      "statistics.covariance",
      "probability.distribution",
      "complex.number",
      "complex.conjugate",
      "complex.real-part",
      "complex.imaginary-part",
      "complex.polar",
      "geometry.segment",
      "geometry.ray",
      "geometry.arc",
      "geometry.angle-points",
      "box.content",
      "environment.custom",
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

  it("keeps stable IDs lowercase and matrix delimiter style out of direct placeholders", () => {
    expect(CANDIDATE_CATALOG.every((candidate) => candidate.stableId === candidate.stableId.toLowerCase())).toBe(true);
    const matrix = CANDIDATES_BY_ID.get("matrix.2x2");
    expect(matrix?.type).toBe("function");
    if (matrix?.type === "function") {
      const delimiter = matrix.parameters.find((parameter) => parameter.id === "delimiterStyle");
      expect(delimiter).toMatchObject({ input: "enum", defaultValue: "pmatrix" });
      expect(delimiter?.options?.map((option) => option.value)).toEqual([
        "pmatrix",
        "bmatrix",
        "Bmatrix",
        "matrix",
      ]);
      expect(matrix.directPlaceholderIds).not.toContain("delimiterStyle");
    }
  });

  it("uses scalar matrix notation and text probability distribution parameters", () => {
    for (const stableId of ["matrix.transpose", "matrix.inverse"]) {
      const candidate = CANDIDATES_BY_ID.get(stableId);
      expect(candidate?.type).toBe("function");
      if (candidate?.type === "function") {
        expect(candidate.parameters).toEqual([
          { id: "matrix", label: "矩阵", input: "text", defaultValue: "A", required: true },
        ]);
        expect(candidate.directPlaceholderIds).toEqual(["matrix"]);
      }
    }
    const distribution = CANDIDATES_BY_ID.get("probability.distribution");
    expect(distribution?.type).toBe("function");
    if (distribution?.type === "function") {
      expect(distribution.parameters.find((parameter) => parameter.id === "parameters")).toMatchObject({ input: "text" });
    }
  });

  it("keeps boxed and custom environment contracts", () => {
    const boxed = CANDIDATES_BY_ID.get("box.content");
    expect(boxed?.type).toBe("function");
    if (boxed?.type === "function") {
      expect(boxed.parameters).toEqual([
        { id: "content", label: "内容", input: "text", defaultValue: "x^2+y^2=1", required: true },
      ]);
      expect(boxed.directPlaceholderIds).toEqual(["content"]);
      expect(boxed.chineseAliases).not.toContain(boxed.chineseName);
    }
    const environment = CANDIDATES_BY_ID.get("environment.custom");
    expect(environment?.type).toBe("function");
    if (environment?.type === "function") {
      expect(environment.parameters).toEqual([
        {
          id: "environmentName",
          label: "环境名称",
          input: "enum",
          defaultValue: "aligned",
          required: true,
          options: [
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
          ],
        },
        { id: "body", label: "环境内容", input: "multiline-text", defaultValue: "a&=b+c\nd&=e+f", required: true },
      ]);
      expect(environment.directPlaceholderIds).toEqual(["body"]);
      expect(environment.chineseAliases).not.toContain(environment.chineseName);
    }
  });

  it("keeps fixed multi-row defaults cell-based and custom defaults physically multiline", () => {
    for (const stableId of ["matrix.2x2", "matrix.3x3", "determinant.2x2", "piecewise.2", "system.2", "aligned.2"]) {
      const candidate = CANDIDATES_BY_ID.get(stableId);
      expect(candidate?.type).toBe("function");
      if (candidate?.type === "function") {
        expect(candidate.parameters.every((parameter) => !parameter.defaultValue.includes("\\\\"))).toBe(true);
      }
    }
    for (const stableId of ["matrix.custom", "determinant.custom", "piecewise.custom", "system.custom", "aligned.custom"]) {
      const candidate = CANDIDATES_BY_ID.get(stableId);
      expect(candidate?.type).toBe("function");
      if (candidate?.type === "function") {
        const body = candidate.parameters.find((parameter) => parameter.id === "body");
        expect(body?.input).toBe("multiline-text");
        expect(body?.defaultValue).toContain("\n");
      }
    }
    const systemCustom = CANDIDATES_BY_ID.get("system.custom");
    expect(systemCustom?.type).toBe("function");
    if (systemCustom?.type === "function") {
      expect(systemCustom.parameters.find((parameter) => parameter.id === "body")?.defaultValue).toBe("x+y&=1\n2x-y&=0");
    }
    for (const stableId of ["piecewise.custom", "aligned.custom"]) {
      const candidate = CANDIDATES_BY_ID.get(stableId);
      if (candidate?.type === "function") {
        const body = candidate.parameters.find((parameter) => parameter.id === "body")?.defaultValue ?? "";
        expect(body.split("\n").every((line) => (line.match(/&/g) ?? []).length === 1)).toBe(true);
      }
    }
  });

  it("contains exactly the planned 36 new symbols", () => {
    const expectedNewSymbolIds = [
      "symbol.zeta",
      "symbol.eta",
      "symbol.iota",
      "symbol.kappa",
      "symbol.nu",
      "symbol.xi",
      "symbol.upsilon",
      "symbol.varepsilon",
      "symbol.vartheta",
      "symbol.varkappa",
      "symbol.varpi",
      "symbol.varrho",
      "symbol.varsigma",
      "symbol.varphi",
      "symbol.upper-gamma",
      "symbol.upper-delta",
      "symbol.upper-theta",
      "symbol.upper-lambda",
      "symbol.upper-xi",
      "symbol.upper-pi",
      "symbol.upper-sigma",
      "symbol.upper-upsilon",
      "symbol.upper-phi",
      "symbol.upper-psi",
      "symbol.upper-omega",
      "geometry.angle-symbol",
      "geometry.triangle",
      "geometry.perpendicular",
      "geometry.parallel",
      "geometry.congruent",
      "geometry.similar",
      "geometry.degree",
      "geometry.therefore",
      "geometry.because",
      "complex.imaginary-unit",
      "complex.set",
    ];
    expect(
      CANDIDATE_CATALOG.filter((candidate) => candidate.type === "symbol" && expectedNewSymbolIds.includes(candidate.stableId)).map(
        (candidate) => candidate.stableId,
      ),
    ).toEqual(expectedNewSymbolIds);
    expect(CANDIDATE_CATALOG.filter((candidate) => candidate.type === "symbol" && candidate.category === "几何")).toHaveLength(9);
    expect(CANDIDATE_CATALOG.filter((candidate) => candidate.type === "symbol" && candidate.category === "大写希腊字母")).toHaveLength(11);
  });
});
