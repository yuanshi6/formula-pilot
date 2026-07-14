import { history, undo } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import {
  dispatchGuidedHint,
  dispatchPlaceholderSession,
  formulaPilotStateExtensions,
  guidedHintField,
  placeholderField,
} from "../src/editor/decorations";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

const createView = (doc: string): EditorView => {
  const parent = document.createElement("div");
  document.body.append(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, extensions: [history(), formulaPilotStateExtensions] }),
  });
  views.push(view);
  return view;
};

describe("editor state fields", () => {
  it("renders a replacement hint without changing the document", () => {
    const view = createView("\\li");
    dispatchGuidedHint(view, { from: 0, to: 3, text: "lim  (x → 0)  (f(x))" });
    expect(view.state.doc.toString()).toBe("\\li");
    expect(view.state.field(guidedHintField)?.text).toContain("x → 0");
    expect(document.querySelector(".formula-pilot-guided-hint")?.textContent).toContain("f(x)");
  });

  it("maps placeholder ranges through document edits and clears them on undo", () => {
    const view = createView("\\frac{a}{b}");
    dispatchPlaceholderSession(view, {
      ranges: [
        { id: "numerator", from: 6, to: 7 },
        { id: "denominator", from: 9, to: 10 },
      ],
      index: 0,
      cursorEnd: 11,
    });
    view.dispatch({ changes: { from: 6, to: 7, insert: "xx" } });
    const mapped = view.state.field(placeholderField);
    expect(mapped?.ranges[0]).toEqual({ id: "numerator", from: 6, to: 8 });
    expect(mapped?.ranges[1]).toEqual({ id: "denominator", from: 10, to: 11 });
    expect(undo(view)).toBe(true);
    expect(view.state.field(placeholderField)).toBeNull();
  });
});
