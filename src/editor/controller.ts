import { EditorSelection, Prec, Transaction } from "@codemirror/state";
import type { Extension, TransactionSpec } from "@codemirror/state";
import { ViewPlugin } from "@codemirror/view";
import type { EditorView, ViewUpdate } from "@codemirror/view";
import { CANDIDATE_CATALOG, getDefaultParameterValues } from "../core/catalog";
import { matchCandidates, topStructuredCandidates } from "../core/matcher";
import {
  buildGuidedHint,
  generateBasicFormula,
  generateDefaultStructuredFormula,
  generateStructuredFormula,
} from "../core/templates";
import type {
  CandidateDefinition,
  FunctionCandidateDefinition,
  GeneratedFormula,
  GuidedMode,
  ParameterValues,
  UsageSnapshot,
} from "../core/types";
import { validateParameters } from "../core/validation";
import { FormulaPilotSurface } from "../ui/surface";
import {
  dispatchGuidedHint,
  dispatchPlaceholderSession,
  formulaPilotStateExtensions,
  placeholderField,
  setPlaceholderSession,
} from "./decorations";
import type { PlaceholderSession } from "./decorations";
import {
  extractFormulaQuery,
  getSyntaxDiagnostics,
  manualQueryAtCursor,
} from "./query-detector";
import type { FormulaQuery } from "./query-detector";
import type {
  FormulaPilotControllerHandle,
  FormulaPilotRuntime,
} from "./runtime";

const PAGE_SIZE = 7;

interface IdleState {
  readonly kind: "Idle";
}

interface CandidateState {
  readonly kind: "CandidateOpen";
  readonly query: FormulaQuery;
  readonly candidates: readonly CandidateDefinition[];
  readonly selectedIndex: number;
  readonly usageSnapshot: UsageSnapshot;
  readonly manual: boolean;
}

interface ModeState {
  readonly kind: "ModeSelect";
  readonly candidate: FunctionCandidateDefinition;
  readonly selectedMode: GuidedMode;
  readonly previous: CandidateState;
  readonly query: FormulaQuery;
}

interface GuidedState {
  readonly kind: "GuidedForm";
  readonly candidate: FunctionCandidateDefinition;
  readonly values: ParameterValues;
  readonly previousMode: ModeState;
  readonly query: FormulaQuery;
}

interface PlaceholderEditState {
  readonly kind: "PlaceholderEdit";
  readonly candidateId: string;
}

type ControllerState =
  | IdleState
  | CandidateState
  | ModeState
  | GuidedState
  | PlaceholderEditState;

const IDLE: IdleState = Object.freeze({ kind: "Idle" });

function isFunctionCandidate(candidate: CandidateDefinition): candidate is FunctionCandidateDefinition {
  return candidate.type === "function";
}

function isPrintableCharacter(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
}

export class FormulaPilotController implements FormulaPilotControllerHandle {
  private state: ControllerState = IDLE;
  private readonly surface: FormulaPilotSurface;
  private suppressedQuery: string | null = null;
  private lastWheelAt = 0;
  private compositionPending = false;
  private destroyed = false;
  private readonly outsidePointerHandler: (event: PointerEvent) => void;

  constructor(
    readonly view: EditorView,
    private readonly runtime: FormulaPilotRuntime,
  ) {
    this.surface = new FormulaPilotSurface(view, {
      onCandidateHover: (index) => this.highlightCandidate(index),
      onCandidateSelect: (index) => this.selectCandidate(index),
      onPage: (direction) => this.changePage(direction),
      onModeSelect: (mode) => this.selectMode(mode),
      onGuidedChange: (parameterId, value) => this.updateGuidedValue(parameterId, value),
      onGuidedSubmit: () => this.submitGuided(),
      onGuidedCancel: () => this.cancelGuided(),
    });
    this.surface.hide();
    this.outsidePointerHandler = (event) => {
      if (this.state.kind === "Idle" || this.surface.contains(event.target)) return;
      this.close(true);
    };
    this.view.dom.ownerDocument.addEventListener("pointerdown", this.outsidePointerHandler, true);
    this.runtime.registerController(this);
  }

  canManualOpen(): boolean {
    return manualQueryAtCursor(this.view.state) !== null;
  }

  getDebugSnapshot(): unknown {
    const selection = this.view.state.selection.main;
    return {
      state: this.state.kind,
      compositionPending: this.compositionPending,
      selection: { from: selection.from, to: selection.to },
      diagnostics: getSyntaxDiagnostics(this.view.state),
      extractedQuery: extractFormulaQuery(this.view.state),
    };
  }

  manualOpen(): boolean {
    const query = manualQueryAtCursor(this.view.state);
    if (!query) return false;
    const usageSnapshot = this.runtime.getUsageSnapshot();
    const candidates = query.query
      ? matchCandidates(query.query, CANDIDATE_CATALOG, usageSnapshot).map((result) => result.candidate)
      : topStructuredCandidates(CANDIDATE_CATALOG, usageSnapshot);
    this.openCandidateState({
      kind: "CandidateOpen",
      query,
      candidates,
      selectedIndex: 0,
      usageSnapshot,
      manual: true,
    });
    return true;
  }

  close(suppressCurrentQuery = false): void {
    if (this.destroyed) return;
    if (suppressCurrentQuery) {
      const query = this.currentQuery();
      this.suppressedQuery = query ? this.queryFingerprint(query) : null;
    }
    if (this.state.kind === "GuidedForm") dispatchGuidedHint(this.view, null);
    if (this.state.kind === "PlaceholderEdit") dispatchPlaceholderSession(this.view, null);
    this.state = IDLE;
    this.surface.hide();
    this.runtime.deactivate(this);
  }

  destroy(): void {
    if (this.destroyed) return;
    if (this.state.kind === "GuidedForm") dispatchGuidedHint(this.view, null);
    if (this.state.kind === "PlaceholderEdit") dispatchPlaceholderSession(this.view, null);
    this.destroyed = true;
    this.view.dom.ownerDocument.removeEventListener("pointerdown", this.outsidePointerHandler, true);
    this.surface.destroy();
    this.runtime.unregisterController(this);
  }

  update(update: ViewUpdate): void {
    if (this.destroyed) return;
    if (update.viewportChanged || update.geometryChanged) this.surface.reposition();

    if (this.state.kind === "PlaceholderEdit") {
      const placeholder = update.state.field(placeholderField);
      if (!placeholder || update.transactions.some((transaction) => transaction.isUserEvent("undo"))) {
        this.finishPlaceholderMode(false);
        return;
      }
      if (update.selectionSet && !this.selectionBelongsToPlaceholder(placeholder)) {
        this.finishPlaceholderMode(true, true);
      }
      return;
    }

    if ((this.view.composing || this.compositionPending) && this.state.kind !== "GuidedForm") {
      this.compositionPending = true;
      if (this.state.kind === "CandidateOpen" || this.state.kind === "ModeSelect") {
        this.state = IDLE;
        this.surface.hide();
        this.runtime.deactivate(this);
      }
      return;
    }

    if (this.state.kind === "ModeSelect" || this.state.kind === "GuidedForm") {
      if (update.docChanged) this.mapLockedQuery(update);
      return;
    }

    if (!update.docChanged && !update.selectionSet && this.state.kind !== "Idle") return;
    this.refreshCandidateQuery();
  }

  handleCompositionStart(): boolean {
    if (this.state.kind === "GuidedForm" || this.state.kind === "PlaceholderEdit") return false;
    this.compositionPending = true;
    if (this.state.kind === "CandidateOpen" || this.state.kind === "ModeSelect") {
      this.state = IDLE;
      this.surface.hide();
      this.runtime.deactivate(this);
    }
    return false;
  }

  handleCompositionEnd(): boolean {
    if (!this.compositionPending) return false;
    this.compositionPending = false;
    void Promise.resolve().then(() => {
      if (!this.destroyed && !this.view.composing) this.refreshCandidateQuery();
    });
    return false;
  }

  private refreshCandidateQuery(): void {
    if (this.state.kind !== "Idle" && this.state.kind !== "CandidateOpen") return;
    const query = extractFormulaQuery(this.view.state);
    if (!query) {
      if (this.state.kind === "CandidateOpen") this.close();
      return;
    }

    const fingerprint = this.queryFingerprint(query);
    if (this.suppressedQuery === fingerprint) return;
    if (this.suppressedQuery && this.suppressedQuery !== fingerprint) this.suppressedQuery = null;

    if (this.state.kind === "Idle") {
      const usageSnapshot = this.runtime.getUsageSnapshot();
      this.openCandidateState({
        kind: "CandidateOpen",
        query,
        candidates: matchCandidates(query.query, CANDIDATE_CATALOG, usageSnapshot).map(
          (result) => result.candidate,
        ),
        selectedIndex: 0,
        usageSnapshot,
        manual: false,
      });
      return;
    }

    if (this.state.kind === "CandidateOpen") {
      const candidates = matchCandidates(
        query.query,
        CANDIDATE_CATALOG,
        this.state.usageSnapshot,
      ).map((result) => result.candidate);
      this.state = {
        ...this.state,
        query,
        candidates,
        selectedIndex: Math.min(this.state.selectedIndex, Math.max(0, candidates.length - 1)),
      };
      this.renderCandidates();
    }
  }

  handleKeydown(event: KeyboardEvent): boolean {
    if (
      this.state.kind === "Idle" ||
      this.state.kind === "GuidedForm" ||
      event.defaultPrevented ||
      event.isComposing ||
      !this.runtime.isActive(this)
    ) {
      return false;
    }

    if (this.state.kind === "PlaceholderEdit") return this.handlePlaceholderKeydown(event);
    if (this.state.kind === "ModeSelect") return this.handleModeKeydown(event);
    return this.handleCandidateKeydown(event);
  }

  handleWheel(event: WheelEvent): boolean {
    if (this.state.kind !== "CandidateOpen" || !this.runtime.isActive(this)) return false;
    this.consume(event);
    const now = Date.now();
    if (now - this.lastWheelAt < 120) return true;
    this.lastWheelAt = now;
    this.changePage(event.deltaY < 0 ? -1 : 1);
    return true;
  }

  private handleCandidateKeydown(event: KeyboardEvent): boolean {
    if (this.state.kind !== "CandidateOpen") return false;
    const ownedRepeatKey =
      event.key === "Enter" ||
      event.key === "Tab" ||
      (/^[1-7]$/.test(event.key) && this.runtime.getPreferences().enableNumberShortcuts);
    if (event.repeat && ownedRepeatKey) {
      this.consume(event);
      return true;
    }

    if (/^[1-7]$/.test(event.key) && this.runtime.getPreferences().enableNumberShortcuts) {
      this.consume(event);
      const pageStart = Math.floor(this.state.selectedIndex / PAGE_SIZE) * PAGE_SIZE;
      const selected = pageStart + Number(event.key) - 1;
      if (selected < this.state.candidates.length) this.selectCandidate(selected);
      return true;
    }

    switch (event.key) {
      case "ArrowDown":
        this.consume(event);
        this.moveSelection(1);
        return true;
      case "ArrowUp":
        this.consume(event);
        this.moveSelection(-1);
        return true;
      case "PageDown":
        this.consume(event);
        this.changePage(1);
        return true;
      case "PageUp":
        this.consume(event);
        this.changePage(-1);
        return true;
      case "Enter":
      case "Tab":
        this.consume(event);
        this.selectCandidate(this.state.selectedIndex);
        return true;
      case "Escape":
        this.consume(event);
        this.close(true);
        return true;
      case "ArrowLeft":
      case "ArrowRight":
        this.close(true);
        return false;
      default:
        return false;
    }
  }

  private handleModeKeydown(event: KeyboardEvent): boolean {
    if (this.state.kind !== "ModeSelect") return false;
    if (event.repeat && (event.key === "1" || event.key === "2" || event.key === "Enter")) {
      this.consume(event);
      return true;
    }
    if (event.key === "1" || event.key === "2") {
      this.consume(event);
      this.selectMode(event.key === "1" ? "guided" : "direct");
      return true;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      this.consume(event);
      this.state = {
        ...this.state,
        selectedMode: this.state.selectedMode === "guided" ? "direct" : "guided",
      };
      this.renderMode();
      return true;
    }
    if (event.key === "Enter") {
      this.consume(event);
      this.selectMode(this.state.selectedMode);
      return true;
    }
    if (event.key === "Escape") {
      this.consume(event);
      const previous = this.state.previous;
      this.state = previous;
      this.view.focus();
      this.renderCandidates();
      return true;
    }
    if (isPrintableCharacter(event)) {
      this.state = IDLE;
      this.surface.hide();
      this.runtime.deactivate(this);
      return false;
    }
    return false;
  }

  private handlePlaceholderKeydown(event: KeyboardEvent): boolean {
    if (event.key === "Escape") {
      this.consume(event);
      this.finishPlaceholderMode();
      return true;
    }
    if (event.key !== "Tab") return false;
    this.consume(event);
    const session = this.view.state.field(placeholderField);
    if (!session) {
      this.finishPlaceholderMode();
      return true;
    }
    const nextIndex = event.shiftKey ? session.index - 1 : session.index + 1;
    if (nextIndex < 0) return true;
    if (nextIndex >= session.ranges.length) {
      this.view.dispatch({
        selection: EditorSelection.cursor(session.cursorEnd),
        effects: setPlaceholderSession.of(null),
        annotations: Transaction.addToHistory.of(false),
        scrollIntoView: true,
      });
      this.state = IDLE;
      this.runtime.deactivate(this);
      return true;
    }
    const range = session.ranges[nextIndex];
    if (!range) return true;
    this.view.dispatch({
      selection: EditorSelection.range(range.from, range.to),
      effects: setPlaceholderSession.of({ ...session, index: nextIndex }),
      annotations: Transaction.addToHistory.of(false),
      scrollIntoView: true,
    });
    return true;
  }

  private openCandidateState(state: CandidateState): void {
    this.runtime.activate(this);
    this.state = state;
    this.renderCandidates();
  }

  private renderCandidates(): void {
    if (this.state.kind !== "CandidateOpen") return;
    this.surface.renderCandidates({
      candidates: this.state.candidates,
      selectedIndex: this.state.selectedIndex,
      queryFrom: this.state.query.from,
      preferences: this.runtime.getPreferences(),
    });
  }

  private renderMode(): void {
    if (this.state.kind !== "ModeSelect") return;
    this.surface.renderMode(
      this.state.candidate,
      this.state.selectedMode,
      this.state.query.from,
      this.runtime.getPreferences(),
    );
  }

  private highlightCandidate(index: number): void {
    if (this.state.kind !== "CandidateOpen" || index === this.state.selectedIndex) return;
    if (index < 0 || index >= this.state.candidates.length) return;
    this.state = { ...this.state, selectedIndex: index };
    this.renderCandidates();
  }

  private moveSelection(delta: -1 | 1): void {
    if (this.state.kind !== "CandidateOpen" || this.state.candidates.length === 0) return;
    const selectedIndex = Math.max(
      0,
      Math.min(this.state.candidates.length - 1, this.state.selectedIndex + delta),
    );
    this.state = { ...this.state, selectedIndex };
    this.renderCandidates();
  }

  private changePage(direction: -1 | 1): void {
    if (this.state.kind !== "CandidateOpen" || this.state.candidates.length === 0) return;
    const currentPage = Math.floor(this.state.selectedIndex / PAGE_SIZE);
    const pageCount = Math.ceil(this.state.candidates.length / PAGE_SIZE);
    const nextPage = Math.max(0, Math.min(pageCount - 1, currentPage + direction));
    if (nextPage === currentPage) return;
    const offset = this.state.selectedIndex % PAGE_SIZE;
    const selectedIndex = Math.min(
      this.state.candidates.length - 1,
      nextPage * PAGE_SIZE + offset,
    );
    this.state = { ...this.state, selectedIndex };
    this.renderCandidates();
  }

  private selectCandidate(index: number): void {
    if (this.state.kind !== "CandidateOpen") return;
    const candidate = this.state.candidates[index];
    if (!candidate) return;
    if (isFunctionCandidate(candidate)) {
      const selectedMode =
        this.runtime.getLastMode(candidate.stableId) ?? this.runtime.getPreferences().defaultMode;
      this.state = {
        kind: "ModeSelect",
        candidate,
        selectedMode,
        previous: { ...this.state, selectedIndex: index },
        query: this.state.query,
      };
      this.renderMode();
      return;
    }
    this.insertGenerated(candidate.stableId, this.state.query, generateBasicFormula(candidate));
  }

  private selectMode(mode: GuidedMode): void {
    if (this.state.kind !== "ModeSelect") return;
    this.runtime.recordMode(this.state.candidate.stableId, mode);
    if (mode === "direct") {
      this.insertGenerated(
        this.state.candidate.stableId,
        this.state.query,
        generateDefaultStructuredFormula(this.state.candidate, true),
      );
      return;
    }
    const guided: GuidedState = {
      kind: "GuidedForm",
      candidate: this.state.candidate,
      values: getDefaultParameterValues(this.state.candidate),
      previousMode: this.state,
      query: this.state.query,
    };
    this.state = guided;
    dispatchGuidedHint(this.view, {
      from: guided.query.from,
      to: guided.query.to,
      text: buildGuidedHint(guided.candidate, guided.values),
    });
    this.surface.renderGuided(
      guided.candidate,
      guided.values,
      guided.query.from,
      this.runtime.getPreferences(),
    );
  }

  private updateGuidedValue(parameterId: string, nextValue: string): void {
    if (this.state.kind !== "GuidedForm") return;
    const values = { ...this.state.values, [parameterId]: nextValue };
    this.state = { ...this.state, values };
    dispatchGuidedHint(this.view, {
      from: this.state.query.from,
      to: this.state.query.to,
      text: buildGuidedHint(this.state.candidate, values),
    });
    this.surface.updateGuidedPreview(generateStructuredFormula(this.state.candidate, values).latex);
  }

  private submitGuided(): void {
    if (this.state.kind !== "GuidedForm") return;
    const issues = validateParameters(this.state.candidate, this.state.values);
    if (issues.length > 0) {
      this.surface.showValidationIssues(issues);
      return;
    }
    const candidate = this.state.candidate;
    const query = this.state.query;
    const formula = generateStructuredFormula(candidate, this.state.values);
    dispatchGuidedHint(this.view, null);
    this.insertGenerated(candidate.stableId, query, formula);
  }

  private cancelGuided(): void {
    if (this.state.kind !== "GuidedForm") return;
    dispatchGuidedHint(this.view, null);
    this.state = this.state.previousMode;
    this.view.focus();
    this.renderMode();
  }

  private insertGenerated(
    stableId: string,
    query: FormulaQuery,
    formula: GeneratedFormula,
  ): void {
    if (this.view.state.doc.sliceString(query.from, query.to) !== query.raw) {
      this.close();
      return;
    }
    const absoluteRanges = formula.placeholders.map((range) => ({
      ...range,
      from: query.from + range.from,
      to: query.from + range.to,
    }));
    const first = absoluteRanges[0];
    const selection = first
      ? EditorSelection.range(first.from, first.to)
      : EditorSelection.cursor(query.from + formula.cursorEnd);
    const transaction: TransactionSpec = {
      changes: { from: query.from, to: query.to, insert: formula.latex },
      selection,
      scrollIntoView: true,
      annotations: Transaction.userEvent.of("input.complete"),
    };
    // Leave the query-owned state before dispatching the replacement. CodeMirror
    // updates view plugins synchronously, so keeping ModeSelect/GuidedForm here
    // would make the replacement look like an external mutation of the locked
    // query and deactivate this controller before placeholder mode is installed.
    this.state = IDLE;
    this.view.dispatch(transaction);
    this.surface.hide();
    this.runtime.recordInsertion(stableId);
    if (absoluteRanges.length > 0) {
      this.state = { kind: "PlaceholderEdit", candidateId: stableId };
      this.runtime.activate(this);
      dispatchPlaceholderSession(this.view, {
        ranges: absoluteRanges,
        index: 0,
        cursorEnd: query.from + formula.cursorEnd,
      });
      this.view.focus();
    } else {
      this.state = IDLE;
      this.runtime.deactivate(this);
      this.view.focus();
    }
  }

  private mapLockedQuery(update: ViewUpdate): void {
    if (this.state.kind !== "ModeSelect" && this.state.kind !== "GuidedForm") return;
    const oldQuery = this.state.query;
    let from = oldQuery.from;
    let to = oldQuery.to;
    for (const transaction of update.transactions) {
      from = transaction.changes.mapPos(from, -1);
      to = transaction.changes.mapPos(to, 1);
    }
    if (update.state.doc.sliceString(from, to) !== oldQuery.raw) {
      this.closeFromUpdate(this.state.kind === "GuidedForm");
      return;
    }
    const query = { ...oldQuery, from, to };
    this.state = { ...this.state, query };
    // The StateEffect mapper already keeps the guided replacement aligned with
    // document changes. Dispatching another effect from a ViewPlugin update is
    // forbidden by CodeMirror and unnecessary here.
    this.surface.reposition(from);
  }

  private selectionBelongsToPlaceholder(session: PlaceholderSession): boolean {
    const range = session.ranges[session.index];
    if (!range) return false;
    const selection = this.view.state.selection.main;
    return selection.from >= range.from && selection.to <= range.to;
  }

  private finishPlaceholderMode(clearField = true, deferClear = false): void {
    if (this.state.kind !== "PlaceholderEdit") return;
    this.state = IDLE;
    this.runtime.deactivate(this);
    if (!clearField) return;
    if (deferClear) {
      void Promise.resolve().then(() => {
        if (!this.destroyed) dispatchPlaceholderSession(this.view, null);
      });
      return;
    }
    dispatchPlaceholderSession(this.view, null);
  }

  private closeFromUpdate(clearGuidedHint: boolean): void {
    this.state = IDLE;
    this.surface.hide();
    this.runtime.deactivate(this);
    if (!clearGuidedHint) return;
    void Promise.resolve().then(() => {
      if (!this.destroyed) dispatchGuidedHint(this.view, null);
    });
  }

  private currentQuery(): FormulaQuery | null {
    if (this.state.kind === "CandidateOpen" || this.state.kind === "ModeSelect" || this.state.kind === "GuidedForm") {
      return this.state.query;
    }
    return null;
  }

  private queryFingerprint(query: FormulaQuery): string {
    return `${query.from}:${query.to}:${query.raw}`;
  }

  private consume(event: KeyboardEvent | WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
}

class FormulaPilotViewPlugin {
  readonly controller: FormulaPilotController;

  constructor(view: EditorView, runtime: FormulaPilotRuntime) {
    this.controller = new FormulaPilotController(view, runtime);
  }

  update(update: ViewUpdate): void {
    this.controller.update(update);
  }

  destroy(): void {
    this.controller.destroy();
  }
}

export function createFormulaPilotEditorExtension(runtime: FormulaPilotRuntime): Extension {
  const controllerPlugin = ViewPlugin.define(
    (view) => new FormulaPilotViewPlugin(view, runtime),
    {
      eventHandlers: {
        keydown(event) {
          return this.controller.handleKeydown(event);
        },
        wheel(event) {
          return this.controller.handleWheel(event);
        },
        compositionstart() {
          return this.controller.handleCompositionStart();
        },
        compositionend() {
          return this.controller.handleCompositionEnd();
        },
      },
    },
  );
  // Obsidian installs its own Tab keymap. Highest precedence lets placeholder
  // navigation own Tab before the editor's indentation command prevents it.
  return [...formulaPilotStateExtensions, Prec.highest(controllerPlugin)];
}
