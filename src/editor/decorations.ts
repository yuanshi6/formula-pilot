import { StateEffect, StateField, Transaction } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import type { PlaceholderRange } from "../core/types";

export interface GuidedHintState {
  readonly from: number;
  readonly to: number;
  readonly text: string;
}

class GuidedHintWidget extends WidgetType {
  constructor(private readonly text: string) {
    super();
  }

  override eq(other: GuidedHintWidget): boolean {
    return other.text === this.text;
  }

  override toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span");
    span.className = "formula-pilot-guided-hint";
    span.textContent = this.text;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

export const setGuidedHint = StateEffect.define<GuidedHintState | null>({
  map(value, mapping) {
    if (!value) return null;
    return {
      ...value,
      from: mapping.mapPos(value.from, -1),
      to: mapping.mapPos(value.to, 1),
    };
  },
});

export const guidedHintField = StateField.define<GuidedHintState | null>({
  create: () => null,
  update(value, transaction) {
    let next: GuidedHintState | null = value
      ? {
          ...value,
          from: transaction.changes.mapPos(value.from, -1),
          to: transaction.changes.mapPos(value.to, 1),
        }
      : null;
    for (const effect of transaction.effects) {
      if (effect.is(setGuidedHint)) next = effect.value;
    }
    return next;
  },
});

const guidedHintDecorations = EditorView.decorations.compute([guidedHintField], (state): DecorationSet => {
  const hint = state.field(guidedHintField);
  if (!hint) return Decoration.none;
  return Decoration.set([
    Decoration.replace({ widget: new GuidedHintWidget(hint.text) }).range(hint.from, hint.to),
  ]);
});

export interface PlaceholderSession {
  readonly ranges: readonly PlaceholderRange[];
  readonly index: number;
  readonly cursorEnd: number;
}

export const setPlaceholderSession = StateEffect.define<PlaceholderSession | null>({
  map(value, mapping) {
    if (!value) return null;
    return {
      ...value,
      ranges: value.ranges.map((range) => ({
        ...range,
        from: mapping.mapPos(range.from, -1),
        to: mapping.mapPos(range.to, 1),
      })),
      cursorEnd: mapping.mapPos(value.cursorEnd, 1),
    };
  },
});

export const placeholderField = StateField.define<PlaceholderSession | null>({
  create: () => null,
  update(value, transaction) {
    let next: PlaceholderSession | null = value
      ? {
          ...value,
          ranges: value.ranges.map((range) => ({
            ...range,
            from: transaction.changes.mapPos(range.from, -1),
            to: transaction.changes.mapPos(range.to, 1),
          })),
          cursorEnd: transaction.changes.mapPos(value.cursorEnd, 1),
        }
      : null;
    for (const effect of transaction.effects) {
      if (effect.is(setPlaceholderSession)) next = effect.value;
    }
    if (transaction.isUserEvent("undo") || transaction.isUserEvent("redo")) return null;
    return next;
  },
});

export const formulaPilotStateExtensions: readonly Extension[] = [
  guidedHintField,
  guidedHintDecorations,
  placeholderField,
];

export function dispatchGuidedHint(view: EditorView, hint: GuidedHintState | null): void {
  view.dispatch({ effects: setGuidedHint.of(hint), annotations: Transaction.addToHistory.of(false) });
}

export function dispatchPlaceholderSession(
  view: EditorView,
  session: PlaceholderSession | null,
): void {
  view.dispatch({
    effects: setPlaceholderSession.of(session),
    annotations: Transaction.addToHistory.of(false),
  });
}
