import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CANDIDATE_CATALOG, getCandidate, getDefaultParameterValues } from "../src/core/catalog";
import { generateStructuredFormula } from "../src/core/templates";
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
    onGuidedChange: vi.fn<(parameterId: string, value: string) => void>(),
    onGuidedSubmit: vi.fn(),
    onGuidedCancel: vi.fn(),
  };
  const surface = new FormulaPilotSurface(view, callbacks);
  surfaces.push(surface);
  return { surface, callbacks, view };
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

  it("uses a textarea for multiline parameters and updates the preview", async () => {
    const { surface, callbacks } = createSurface();
    const base = getCandidate("limit.general") as FunctionCandidateDefinition;
    const candidate: FunctionCandidateDefinition = {
      ...base,
      parameters: base.parameters.map((parameter) =>
        parameter.id === "expression"
          ? { ...parameter, input: "multiline-text" as const, defaultValue: "f(x)\ng(x)" }
          : parameter,
      ),
    };
    const values = getDefaultParameterValues(candidate);
    callbacks.onGuidedChange.mockImplementation((parameterId: string, value: string) => {
      values[parameterId] = value;
      surface.updateGuidedPreview(generateStructuredFormula(candidate, values).latex);
    });
    surface.renderGuided(candidate, values, 0, DEFAULT_PREFERENCES);

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea.formula-pilot-field-control");
    expect(textarea).toBeTruthy();
    expect(textarea?.value).toBe("f(x)\ng(x)");
    textarea!.value = "f(x)\ng(x)+1";
    textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    expect(callbacks.onGuidedChange).toHaveBeenCalledWith("expression", "f(x)\ng(x)+1");
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector(".formula-pilot-preview-math .math-block")?.textContent).toContain(
      "g(x)+1",
    );
  });

  it("keeps custom environment name and multiline body synchronized with the preview", async () => {
    const { surface, callbacks } = createSurface();
    const candidate = getCandidate("environment.custom") as FunctionCandidateDefinition;
    const values = getDefaultParameterValues(candidate);
    callbacks.onGuidedChange.mockImplementation((parameterId: string, value: string) => {
      values[parameterId] = value;
      surface.updateGuidedPreview(generateStructuredFormula(candidate, values).latex);
    });
    surface.renderGuided(candidate, values, 0, DEFAULT_PREFERENCES);

    const controls = Array.from(document.querySelectorAll(".formula-pilot-field-control"));
    const environmentName = controls[0] as HTMLSelectElement;
    const body = controls[1] as HTMLTextAreaElement;
    expect(environmentName).toBeInstanceOf(HTMLSelectElement);
    expect(Array.from(environmentName.options).map((option) => option.textContent)).toEqual([
      "aligned — 对齐环境",
      "aligned* — 对齐环境（星号）",
      "gathered — 聚合环境",
      "gathered* — 聚合环境（星号）",
      "split — 分行环境",
      "split* — 分行环境（星号）",
      "cases — 分段环境",
      "matrix — 矩阵环境",
      "pmatrix — 圆括号矩阵环境",
      "bmatrix — 方括号矩阵环境",
      "Bmatrix — 大括号矩阵环境",
      "vmatrix — 行列式环境",
      "Vmatrix — 双竖线行列式环境",
      "smallmatrix — 小矩阵环境",
    ]);
    expect(body).toBeInstanceOf(HTMLTextAreaElement);

    environmentName.value = "gathered";
    environmentName.dispatchEvent(new Event("change", { bubbles: true }));
    body.value = "a&=b\nc&=d";
    body.dispatchEvent(new Event("input", { bubbles: true }));
    expect(callbacks.onGuidedChange).toHaveBeenNthCalledWith(1, "environmentName", "gathered");
    expect(callbacks.onGuidedChange).toHaveBeenNthCalledWith(2, "body", "a&=b\nc&=d");

    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector(".formula-pilot-preview-math .math-block")?.textContent).toContain(
      "\\begin{gathered}a&=b\\\\c&=d\\end{gathered}",
    );

    const newline = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    body.dispatchEvent(newline);
    expect(newline.defaultPrevented).toBe(false);
    expect(callbacks.onGuidedSubmit).not.toHaveBeenCalled();

    const submit = new KeyboardEvent("keydown", {
      key: "Enter",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    body.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
    expect(callbacks.onGuidedSubmit).toHaveBeenCalledTimes(1);
  });

  it("uses a regular text input for boxed content", () => {
    const { surface } = createSurface();
    const candidate = getCandidate("box.content") as FunctionCandidateDefinition;
    surface.renderGuided(candidate, getDefaultParameterValues(candidate), 0, DEFAULT_PREFERENCES);

    const input = document.querySelector<HTMLInputElement>("input.formula-pilot-field-control");
    expect(input).toBeTruthy();
    expect(input?.value).toBe("x^2+y^2=1");
    expect(document.querySelector("textarea.formula-pilot-field-control")).toBeNull();
  });

  it("leaves Enter available for multiline input and reserves Ctrl/Cmd+Enter for submit", () => {
    const { surface, callbacks } = createSurface();
    const base = getCandidate("limit.general") as FunctionCandidateDefinition;
    const candidate: FunctionCandidateDefinition = {
      ...base,
      parameters: base.parameters.map((parameter) =>
        parameter.id === "expression" ? { ...parameter, input: "multiline-text" as const } : parameter,
      ),
    };
    surface.renderGuided(candidate, getDefaultParameterValues(candidate), 0, DEFAULT_PREFERENCES);
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea.formula-pilot-field-control");
    expect(textarea).toBeTruthy();
    textarea!.focus();

    const newline = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    textarea!.dispatchEvent(newline);
    expect(newline.defaultPrevented).toBe(false);
    expect(callbacks.onGuidedSubmit).not.toHaveBeenCalled();

    const submit = new KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    textarea!.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
    expect(callbacks.onGuidedSubmit).toHaveBeenCalledTimes(1);
  });

  it("mounts the surface in the editor's ownerDocument", () => {
    const { surface, view } = createSurface();
    surface.renderCandidates({
      candidates: CANDIDATE_CATALOG.slice(0, 1),
      selectedIndex: 0,
      queryFrom: 0,
      preferences: { ...DEFAULT_PREFERENCES, showPreview: false },
    });
    const root = document.querySelector<HTMLElement>("[data-formula-pilot-surface='true']");
    expect(root?.ownerDocument).toBe(view.dom.ownerDocument);
  });
});
