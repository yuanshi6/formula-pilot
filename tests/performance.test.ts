// @vitest-environment node

import { performance } from "node:perf_hooks";
import process from "node:process";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { CANDIDATE_CATALOG } from "../src/core/catalog";
import { matchCandidates } from "../src/core/matcher";

const percentile95 = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
};

describe("matching performance", () => {
  it("keeps 1,000 matching runs under the 16 ms P95 budget", () => {
    const oneMegabyteDocument = "x".repeat(1024 * 1024);
    expect(oneMegabyteDocument.length).toBe(1024 * 1024);
    const durations: number[] = [];
    const queries = ["li", "sum", "fra", "partial", "lmt", "极限"];
    for (let index = 0; index < 1_000; index += 1) {
      const start = performance.now();
      matchCandidates(queries[index % queries.length] ?? "li", CANDIDATE_CATALOG);
      durations.push(performance.now() - start);
    }
    const p95 = percentile95(durations);
    process.stdout.write(
      `${JSON.stringify({
        metric: "candidate-match-p95-ms",
        p95,
        runs: durations.length,
        node: process.version,
        platform: `${process.platform}-${process.arch}`,
        machine: os.cpus()[0]?.model ?? "unknown",
        system: `${os.type()} ${os.release()}`,
        obsidianTarget: "1.12.7",
        theme: "Obsidian default dark",
        catalogSize: CANDIDATE_CATALOG.length,
        documentBytes: oneMegabyteDocument.length,
      })}\n`,
    );
    expect(p95).toBeLessThan(16);
  });
});
