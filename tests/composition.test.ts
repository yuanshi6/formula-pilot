import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DATA, DEFAULT_PREFERENCES } from "../src/core/settings";
import type { GuidedMode, UsageSnapshot } from "../src/core/types";
import type {
  FormulaPilotControllerHandle,
  FormulaPilotRuntime,
} from "../src/editor/runtime";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
  vi.doUnmock("../src/editor/query-detector");
  vi.resetModules();
});

describe("IME query ownership", () => {
  it("waits for compositionend before opening localized candidates", async () => {
    const extractQuery = (state: EditorState) => {
      const position = state.selection.main.head;
      const beforeCursor = state.doc.sliceString(0, position);
      const match = /\\([\p{L}]+)$/u.exec(beforeCursor);
      if (!match || match.index === undefined || !match[1]) return null;
      return {
        from: match.index,
        to: position,
        query: match[1],
        raw: `\\${match[1]}`,
      };
    };
    vi.doMock("../src/editor/query-detector", () => ({
      extractFormulaQuery: extractQuery,
      manualQueryAtCursor: extractQuery,
      getSyntaxDiagnostics: (state: EditorState) => ({
        position: state.selection.main.head,
        ancestors: [],
        mathNamedNodes: [],
      }),
    }));
    const { createFormulaPilotEditorExtension } = await import("../src/editor/controller");

    let controller: FormulaPilotControllerHandle | undefined;
    let active: FormulaPilotControllerHandle | undefined;
    const runtime: FormulaPilotRuntime = {
      getPreferences: () => DEFAULT_PREFERENCES,
      getUsageSnapshot: (): UsageSnapshot => Object.freeze({}),
      getLastMode: (_stableId: string): GuidedMode | undefined => undefined,
      recordInsertion: (_stableId: string): void => {},
      recordMode: (_stableId: string, _mode: GuidedMode): void => {},
      registerController: (nextController): void => {
        controller = nextController;
      },
      unregisterController: (nextController): void => {
        if (controller === nextController) controller = undefined;
      },
      getController: (view): FormulaPilotControllerHandle | undefined =>
        controller?.view === view ? controller : undefined,
      activate: (nextController): void => {
        active = nextController;
      },
      deactivate: (nextController): void => {
        if (active === nextController) active = undefined;
      },
      isActive: (nextController): boolean => active === nextController,
      getData: () => DEFAULT_DATA,
    };
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "\\fen",
        selection: { anchor: 4 },
        extensions: [createFormulaPilotEditorExtension(runtime)],
      }),
    });
    views.push(view);
    expect(controller).toBeDefined();

    view.contentDOM.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true, data: "分" }),
    );
    view.dispatch({
      changes: { from: 4, insert: "shu" },
      selection: { anchor: 7 },
    });
    expect(controller?.getDebugSnapshot()).toMatchObject({
      state: "Idle",
      compositionPending: true,
    });
    expect(document.querySelector(".formula-pilot-candidate-row")).toBeNull();

    view.contentDOM.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "分数" }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(controller?.getDebugSnapshot()).toMatchObject({
      state: "CandidateOpen",
      compositionPending: false,
    });
    expect(document.querySelector(".formula-pilot-candidate-row")?.textContent).toContain(
      "分数模板",
    );
  });
});
