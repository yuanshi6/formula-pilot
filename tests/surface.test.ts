import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CANDIDATE_CATALOG, getCandidate, getDefaultParameterValues } from "../src/core/catalog";
import { DEFAULT_PREFERENCES } from "../src/core/settings";
import type { FunctionCandidateDefinition } from "../src/core/types";
import { FormulaPilotSurface } from "../src/ui/surface";

const views: EditorView[] = [];
const surfaces: FormulaPilotSurface[] = [];

afterEach(() => {
  for (const surface of surfaces.splice(0)) surface.destroy();
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

const createSurface = () => {
  const parent = document.createElement("div");
  document.body.append(parent);
  const view = new EditorView({ parent, state: EditorState.create({ doc: "\\li" }) });
  vi.spyOn(view, "coordsAtPos").mockReturnValue({ left: 20, right: 21, top: 20, bottom: 38 });
  views.push(view);
  const callbacks = {
    onCandidateHover: vi.fn(),
    onCandidateSelect: vi.fn(),
    onPage: vi.fn(),
    onModeSelect: vi.fn(),
    onGuidedChange: vi.fn(),
    onGuidedSubmit: vi.fn(),
    onGuidedCancel: vi.fn(),
  };
  const surface = new FormulaPilotSurface(view, callbacks);
  surfaces.push(surface);
  return { surface, callbacks };
};

describe("Formula Pilot surface", () => {
  it("shows at most seven numbered candidates and an accurate range", () => {
    const { surface, callbacks } = createSurface();
    surface.renderCandidates({
      candidates: CANDIDATE_CATALOG.slice(0, 10),
      selectedIndex: 0,
      queryFrom: 0,
      preferences: { ...DEFAULT_PREFERENCES, showPreview: false },
    });
    expect(document.querySelectorAll(".formula-pilot-candidate-row")).toHaveLength(7);
    expect(document.querySelector(".formula-pilot-page-range")?.textContent).toBe("1–7 / 10");
    document.querySelector<HTMLElement>(".formula-pilot-candidate-row")?.click();
    expect(callbacks.onCandidateSelect).toHaveBeenCalledWith(0);
  });

  it("renders the two-mode menu with the requested selection", () => {
    const { surface } = createSurface();
    const candidate = getCandidate("limit.general") as FunctionCandidateDefinition;
    surface.renderMode(candidate, "direct", 0, DEFAULT_PREFERENCES);
    expect(document.querySelectorAll(".formula-pilot-mode-row")).toHaveLength(2);
    expect(document.querySelector(".formula-pilot-mode-row.is-selected")?.textContent).toContain("直接插入");
  });

  it("focuses and selects the first default value in guided mode", () => {
    const { surface } = createSurface();
    const candidate = getCandidate("limit.general") as FunctionCandidateDefinition;
    surface.renderGuided(
      candidate,
      getDefaultParameterValues(candidate),
      0,
      DEFAULT_PREFERENCES,
    );
    const input = document.querySelector<HTMLInputElement>(".formula-pilot-field-control");
    expect(document.activeElement).toBe(input);
    expect(input?.selectionStart).toBe(0);
    expect(input?.selectionEnd).toBe(input?.value.length);
  });
});
