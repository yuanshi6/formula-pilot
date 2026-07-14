import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import os from "node:os";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CANDIDATE_CATALOG } from "../src/core/catalog";
import { DEFAULT_PREFERENCES } from "../src/core/settings";
import { FormulaPilotSurface } from "../src/ui/surface";

const percentile95 = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
};

const views: EditorView[] = [];
const surfaces: FormulaPilotSurface[] = [];

afterEach(() => {
  for (const surface of surfaces.splice(0)) surface.destroy();
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

describe("candidate list performance", () => {
  it("keeps 1,000 seven-row DOM updates under the 32 ms P95 budget", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({ doc: "\\li" }),
    });
    vi.spyOn(view, "coordsAtPos").mockReturnValue({
      left: 20,
      right: 21,
      top: 20,
      bottom: 38,
    });
    views.push(view);
    const noop = (): void => {};
    const surface = new FormulaPilotSurface(view, {
      onCandidateHover: noop,
      onCandidateSelect: noop,
      onPage: noop,
      onModeSelect: noop,
      onGuidedChange: noop,
      onGuidedSubmit: noop,
      onGuidedCancel: noop,
    });
    surfaces.push(surface);

    const durations: number[] = [];
    const preferences = { ...DEFAULT_PREFERENCES, showPreview: false };
    for (let index = 0; index < 1_000; index += 1) {
      const start = performance.now();
      surface.renderCandidates({
        candidates: CANDIDATE_CATALOG,
        selectedIndex: index % CANDIDATE_CATALOG.length,
        queryFrom: 0,
        preferences,
      });
      durations.push(performance.now() - start);
    }

    const p95 = percentile95(durations);
    process.stdout.write(
      `${JSON.stringify({
        metric: "candidate-list-dom-update-p95-ms",
        p95,
        runs: durations.length,
        node: process.version,
        platform: `${process.platform}-${process.arch}`,
        machine: os.cpus()[0]?.model ?? "unknown",
        system: `${os.type()} ${os.release()}`,
        obsidianTarget: "1.12.7",
        theme: "Obsidian default dark",
        visibleRows: 7,
        catalogSize: CANDIDATE_CATALOG.length,
      })}\n`,
    );
    expect(p95).toBeLessThan(32);
  });
});
