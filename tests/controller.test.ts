import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { getCandidate, getDefaultParameterValues } from "../src/core/catalog";
import { DEFAULT_DATA, DEFAULT_PREFERENCES } from "../src/core/settings";
import { generateStructuredFormula } from "../src/core/templates";
import type { GeneratedFormula, GuidedMode, UsageSnapshot } from "../src/core/types";
import { createFormulaPilotEditorExtension } from "../src/editor/controller";
import type {
  FormulaPilotControllerHandle,
  FormulaPilotRuntime,
} from "../src/editor/runtime";

class TestRuntime implements FormulaPilotRuntime {
  controller: FormulaPilotControllerHandle | undefined;
  active: FormulaPilotControllerHandle | undefined;

  getPreferences() {
    return DEFAULT_PREFERENCES;
  }

  getUsageSnapshot(): UsageSnapshot {
    return Object.freeze({});
  }

  getLastMode(_stableId: string): GuidedMode | undefined {
    return undefined;
  }

  recordInsertion(_stableId: string): void {}
  recordMode(_stableId: string, _mode: GuidedMode): void {}

  registerController(controller: FormulaPilotControllerHandle): void {
    this.controller = controller;
  }

  unregisterController(controller: FormulaPilotControllerHandle): void {
    if (this.controller === controller) this.controller = undefined;
  }

  getController(view: EditorView): FormulaPilotControllerHandle | undefined {
    return this.controller?.view === view ? this.controller : undefined;
  }

  activate(controller: FormulaPilotControllerHandle): void {
    this.active = controller;
  }

  deactivate(controller: FormulaPilotControllerHandle): void {
    if (this.active === controller) this.active = undefined;
  }

  isActive(controller: FormulaPilotControllerHandle): boolean {
    return this.active === controller;
  }

  getData() {
    return DEFAULT_DATA;
  }
}

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

describe("placeholder keyboard ownership", () => {
  it("keeps the controller active and owns Tab after direct insertion", () => {
    const runtime = new TestRuntime();
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "\\li",
        extensions: [createFormulaPilotEditorExtension(runtime)],
      }),
    });
    views.push(view);

    const formula: GeneratedFormula = {
      latex: "\\lim_{x\\to 0} f(x)",
      placeholders: [
        { id: "variable", from: 6, to: 7 },
        { id: "target", from: 11, to: 12 },
        { id: "expression", from: 14, to: 18 },
      ],
      cursorEnd: 18,
    };
    const controller = runtime.controller;
    expect(controller).toBeDefined();
    const testController = controller as FormulaPilotControllerHandle & {
      insertGenerated(
        stableId: string,
        query: { from: number; to: number; raw: string; query: string },
        generated: GeneratedFormula,
      ): void;
    };
    testController.insertGenerated(
      "structured.limit.general",
      { from: 0, to: 3, raw: "\\li", query: "li" },
      formula,
    );

    expect(runtime.active).toBe(controller);
    expect(view.state.doc.toString()).toBe(formula.latex);
    expect(view.state.selection.main.from).toBe(6);
    expect(view.state.selection.main.to).toBe(7);

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    view.contentDOM.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(view.state.doc.toString()).toBe(formula.latex);
    expect(view.state.selection.main.from).toBe(11);
    expect(view.state.selection.main.to).toBe(12);
  });

  it("runs before a lower-priority editor Tab handler", () => {
    const runtime = new TestRuntime();
    const parent = document.createElement("div");
    document.body.append(parent);
    const fallbackTabHandler = EditorView.domEventHandlers({
      keydown(event, view) {
        if (event.key !== "Tab") return false;
        event.preventDefault();
        view.dispatch({ changes: { from: 0, insert: "\t" } });
        return true;
      },
    });
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "\\li",
        extensions: [fallbackTabHandler, createFormulaPilotEditorExtension(runtime)],
      }),
    });
    views.push(view);

    const controller = runtime.controller as FormulaPilotControllerHandle & {
      insertGenerated(
        stableId: string,
        query: { from: number; to: number; raw: string; query: string },
        generated: GeneratedFormula,
      ): void;
    };
    controller.insertGenerated(
      "fraction.guided",
      { from: 0, to: 3, raw: "\\li", query: "li" },
      {
        latex: "\\frac{a}{b}",
        placeholders: [
          { id: "numerator", from: 6, to: 7 },
          { id: "denominator", from: 9, to: 10 },
        ],
        cursorEnd: 11,
      },
    );

    view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    );

    expect(view.state.doc.toString()).toBe("\\frac{a}{b}");
    expect(view.state.selection.main.from).toBe(9);
    expect(view.state.selection.main.to).toBe(10);
  });

  it("uses aligned for direct custom environments and exposes only the body placeholder", () => {
    const runtime = new TestRuntime();
    const parent = document.createElement("div");
    document.body.append(parent);
    const queryRaw = "\\environment";
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: queryRaw,
        extensions: [createFormulaPilotEditorExtension(runtime)],
      }),
    });
    views.push(view);

    const candidate = getCandidate("environment.custom");
    if (candidate.type !== "function") throw new Error("Expected custom environment function");
    const values = getDefaultParameterValues(candidate);
    const formula = generateStructuredFormula(candidate, values, true);
    expect(formula.latex).toBe("\\begin{aligned}a&=b+c\\\\d&=e+f\\end{aligned}");
    expect(formula.placeholders.map((placeholder) => placeholder.id)).toEqual(["body"]);

    const controller = runtime.controller as FormulaPilotControllerHandle & {
      insertGenerated(
        stableId: string,
        query: { from: number; to: number; raw: string; query: string },
        generated: GeneratedFormula,
      ): void;
    };
    controller.insertGenerated(
      candidate.stableId,
      { from: 0, to: queryRaw.length, raw: queryRaw, query: "environment" },
      formula,
    );

    expect(view.state.doc.toString()).toBe(formula.latex);
    expect(view.state.selection.main.from).toBe(formula.placeholders[0]?.from);
    expect(view.state.selection.main.to).toBe(formula.placeholders[0]?.to);
    expect(view.state.selection.main.to - view.state.selection.main.from).toBe("a&=b+c\\\\d&=e+f".length);
  });
});
