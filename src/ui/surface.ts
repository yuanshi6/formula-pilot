import type { EditorView } from "@codemirror/view";
import { finishRenderMath, renderMath } from "obsidian";
import type { FormulaPilotPreferences } from "../core/settings";
import { generateDefaultStructuredFormula, generateStructuredFormula } from "../core/templates";
import type {
  CandidateDefinition,
  FunctionCandidateDefinition,
  GeneratedFormula,
  GuidedMode,
  ParameterValues,
  ValidationIssue,
} from "../core/types";

const PAGE_SIZE = 7;

export interface SurfaceCallbacks {
  readonly onCandidateHover: (index: number) => void;
  readonly onCandidateSelect: (index: number) => void;
  readonly onPage: (direction: -1 | 1) => void;
  readonly onModeSelect: (mode: GuidedMode) => void;
  readonly onGuidedChange: (parameterId: string, value: string) => void;
  readonly onGuidedSubmit: () => void;
  readonly onGuidedCancel: () => void;
}

export interface CandidateSurfaceState {
  readonly candidates: readonly CandidateDefinition[];
  readonly selectedIndex: number;
  readonly queryFrom: number;
  readonly preferences: FormulaPilotPreferences;
}

interface PreviewDetails {
  readonly candidate: CandidateDefinition;
  readonly formula: GeneratedFormula;
}

interface PositionMeasure {
  readonly left: number;
  readonly top: number;
  readonly availableHeight: number;
  readonly previewBelow: boolean;
  readonly compact: boolean;
}

let surfaceSequence = 0;

export class FormulaPilotSurface {
  private readonly document: Document;
  private readonly root: HTMLDivElement;
  private readonly id: string;
  private readonly previewCache = new Map<string, HTMLElement>();
  private readonly controls = new Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>();
  private readonly errorElements = new Map<string, HTMLDivElement>();
  private previewGeneration = 0;
  private anchorPosition = 0;

  constructor(
    private readonly view: EditorView,
    private readonly callbacks: SurfaceCallbacks,
  ) {
    this.document = view.dom.ownerDocument;
    this.id = `formula-pilot-surface-${surfaceSequence += 1}`;
    this.root = this.document.createElement("div");
    this.root.id = this.id;
    this.root.className = "formula-pilot-surface";
    this.root.setAttribute("data-formula-pilot-surface", "true");
    this.document.body.append(this.root);
  }

  contains(target: EventTarget | null): boolean {
    return target instanceof this.document.defaultView!.Node && this.root.contains(target);
  }

  destroy(): void {
    this.previewGeneration += 1;
    this.root.remove();
    this.previewCache.clear();
    this.controls.clear();
    this.errorElements.clear();
  }

  hide(): void {
    this.previewGeneration += 1;
    this.root.replaceChildren();
    this.root.className = "formula-pilot-surface is-hidden";
  }

  reposition(anchorPosition = this.anchorPosition): void {
    this.anchorPosition = anchorPosition;
    this.view.requestMeasure<PositionMeasure | null>({
      key: this,
      read: () => {
        const coordinates = this.view.coordsAtPos(this.anchorPosition);
        if (!coordinates) return null;
        const viewportWidth = this.document.documentElement.clientWidth;
        const viewportHeight = this.document.documentElement.clientHeight;
        const margin = 8;
        const gap = 6;
        const bounds = this.root.getBoundingClientRect();
        const previewBelow = viewportWidth < 720 || coordinates.left + bounds.width + margin > viewportWidth;
        const left = Math.max(
          margin,
          Math.min(coordinates.left, viewportWidth - bounds.width - margin),
        );
        const below = coordinates.bottom + gap;
        const above = coordinates.top - bounds.height - gap;
        const fitsBelow = below + bounds.height + margin <= viewportHeight;
        const fitsAbove = above >= margin;
        const top = fitsBelow ? below : fitsAbove ? above : margin;
        return {
          left,
          top,
          availableHeight: Math.max(160, viewportHeight - top - margin),
          previewBelow,
          compact: !fitsBelow && !fitsAbove,
        };
      },
      write: (measure) => {
        if (!measure) return;
        this.root.classList.toggle("is-preview-below", measure.previewBelow);
        this.root.classList.toggle("is-compact", measure.compact);
        this.root.style.setProperty("--formula-pilot-left", `${Math.round(measure.left)}px`);
        this.root.style.setProperty("--formula-pilot-top", `${Math.round(measure.top)}px`);
        this.root.style.setProperty(
          "--formula-pilot-max-height",
          `${Math.round(measure.availableHeight)}px`,
        );
      },
    });
  }

  renderCandidates(state: CandidateSurfaceState): void {
    this.anchorPosition = state.queryFrom;
    this.controls.clear();
    this.errorElements.clear();
    this.root.className = [
      "formula-pilot-surface",
      `is-font-${state.preferences.candidateFontSize}`,
      state.preferences.showPreview ? "has-preview" : "without-preview",
    ].join(" ");
    this.root.replaceChildren();

    const shell = this.createElement("div", "formula-pilot-candidate-shell");
    const listColumn = this.createElement("div", "formula-pilot-list-column");
    const list = this.createElement("div", "formula-pilot-candidate-list");
    list.id = `${this.id}-listbox`;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "公式候选");

    if (state.candidates.length === 0) {
      const empty = this.createElement("div", "formula-pilot-empty");
      empty.textContent = "没有匹配项，继续输入或按 Esc 关闭。";
      list.append(empty);
    } else {
      const page = Math.floor(state.selectedIndex / PAGE_SIZE);
      const start = page * PAGE_SIZE;
      const visible = state.candidates.slice(start, start + PAGE_SIZE);
      for (const [visibleIndex, candidate] of visible.entries()) {
        const absoluteIndex = start + visibleIndex;
        const selected = absoluteIndex === state.selectedIndex;
        const row = this.createElement(
          "div",
          `formula-pilot-candidate-row${selected ? " is-selected" : ""}`,
        );
        row.id = `${this.id}-option-${absoluteIndex}`;
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", String(selected));
        row.addEventListener("pointerenter", () => this.callbacks.onCandidateHover(absoluteIndex));
        row.addEventListener("pointerdown", (event) => event.preventDefault());
        row.addEventListener("click", () => this.callbacks.onCandidateSelect(absoluteIndex));

        const key = this.createElement("span", "formula-pilot-keycap");
        key.textContent = String(visibleIndex + 1);
        const identity = this.createElement("span", "formula-pilot-candidate-identity");
        const name = this.createElement("span", "formula-pilot-candidate-name");
        name.textContent = candidate.chineseName;
        const command = this.createElement("code", "formula-pilot-candidate-command");
        command.textContent = `\\${candidate.canonicalTrigger}`;
        identity.append(name, command);
        const type = this.createElement("span", "formula-pilot-type-label");
        type.textContent = candidate.type;
        row.append(key, identity, type);
        list.append(row);
      }

      const footer = this.createElement("div", "formula-pilot-page-footer");
      const range = this.createElement("span", "formula-pilot-page-range");
      range.textContent = `${start + 1}–${Math.min(start + PAGE_SIZE, state.candidates.length)} / ${state.candidates.length}`;
      const controls = this.createElement("span", "formula-pilot-page-controls");
      const previous = this.pageButton("上一页", -1, start === 0);
      const next = this.pageButton(
        "下一页",
        1,
        start + PAGE_SIZE >= state.candidates.length,
      );
      controls.append(previous, next);
      footer.append(range, controls);
      listColumn.append(list, footer);
    }

    if (!listColumn.contains(list)) listColumn.append(list);
    shell.append(listColumn);

    if (state.preferences.showPreview && state.candidates.length > 0) {
      const candidate = state.candidates[state.selectedIndex] ?? state.candidates[0];
      if (candidate) {
        const preview = this.createPreviewPanel(candidate);
        shell.append(preview.panel);
        this.renderFormula(preview.math, preview.formula.latex);
      }
    }

    this.root.append(shell);
    this.reposition();
  }

  renderMode(
    candidate: FunctionCandidateDefinition,
    selectedMode: GuidedMode,
    queryFrom: number,
    preferences: FormulaPilotPreferences,
  ): void {
    this.anchorPosition = queryFrom;
    this.root.className = `formula-pilot-surface is-mode is-font-${preferences.candidateFontSize}`;
    this.root.replaceChildren();
    const panel = this.createElement("div", "formula-pilot-mode-panel");
    const header = this.createElement("div", "formula-pilot-mode-header");
    const title = this.createElement("span", "formula-pilot-mode-title");
    title.textContent = candidate.englishName;
    const subtitle = this.createElement("span", "formula-pilot-mode-subtitle");
    subtitle.textContent = candidate.chineseName;
    header.append(title, subtitle);
    panel.append(header);

    const modes: readonly { mode: GuidedMode; key: string; label: string; type: string }[] = [
      { mode: "guided", key: "1", label: "自动填充", type: "function" },
      { mode: "direct", key: "2", label: "直接插入", type: "command" },
    ];
    for (const item of modes) {
      const selected = item.mode === selectedMode;
      const row = this.createElement("div", `formula-pilot-mode-row${selected ? " is-selected" : ""}`);
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(selected));
      row.addEventListener("pointerdown", (event) => event.preventDefault());
      row.addEventListener("click", () => this.callbacks.onModeSelect(item.mode));
      const key = this.createElement("span", "formula-pilot-keycap");
      key.textContent = item.key;
      const label = this.createElement("span", "formula-pilot-mode-label");
      label.textContent = item.label;
      const type = this.createElement("span", "formula-pilot-type-label");
      type.textContent = item.type;
      row.append(key, label, type);
      panel.append(row);
    }
    const help = this.createElement("div", "formula-pilot-mode-help");
    help.textContent = "Enter 确认 · Esc 返回";
    panel.append(help);
    this.root.append(panel);
    this.reposition();
  }

  renderGuided(
    candidate: FunctionCandidateDefinition,
    values: ParameterValues,
    queryFrom: number,
    preferences: FormulaPilotPreferences,
  ): void {
    this.anchorPosition = queryFrom;
    this.root.className = `formula-pilot-surface is-guided is-font-${preferences.candidateFontSize}`;
    this.root.replaceChildren();
    this.controls.clear();
    this.errorElements.clear();

    const panel = this.createElement("div", "formula-pilot-guided-panel");
    const header = this.createElement("div", "formula-pilot-guided-header");
    const title = this.createElement("span", "formula-pilot-guided-title");
    title.textContent = candidate.englishName;
    const type = this.createElement("span", "formula-pilot-type-label");
    type.textContent = "function";
    header.append(title, type);
    panel.append(header);

    const fields = this.createElement("div", "formula-pilot-fields");
    for (const [index, parameter] of candidate.parameters.entries()) {
      const field = this.createElement("div", "formula-pilot-field");
      field.dataset.parameterId = parameter.id;
      const label = this.createElement("label", "formula-pilot-field-label");
      const inputId = `${this.id}-field-${parameter.id}`;
      label.htmlFor = inputId;
      label.textContent = parameter.label;

      let control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (parameter.input === "enum") {
        const select = this.document.createElement("select");
        for (const option of parameter.options ?? []) {
          const element = this.document.createElement("option");
          element.value = option.value;
          element.textContent = option.label;
          select.append(element);
        }
        select.value = values[parameter.id] ?? parameter.defaultValue;
        control = select;
      } else if (parameter.input === "multiline-text") {
        const textarea = this.document.createElement("textarea");
        textarea.value = values[parameter.id] ?? parameter.defaultValue;
        textarea.autocomplete = "off";
        textarea.spellcheck = false;
        textarea.rows = 3;
        textarea.wrap = "soft";
        control = textarea;
      } else {
        const input = this.document.createElement("input");
        input.type = parameter.input === "positive-integer" ? "text" : "text";
        input.inputMode = parameter.input === "positive-integer" ? "numeric" : "text";
        input.value = values[parameter.id] ?? parameter.defaultValue;
        input.autocomplete = "off";
        input.spellcheck = false;
        control = input;
      }
      control.id = inputId;
      control.className = "formula-pilot-field-control";
      control.dataset.fieldIndex = String(index);
      control.addEventListener("input", () => {
        this.clearValidationIssue(parameter.id);
        this.callbacks.onGuidedChange(parameter.id, control.value);
      });
      control.addEventListener("change", () => {
        this.clearValidationIssue(parameter.id);
        this.callbacks.onGuidedChange(parameter.id, control.value);
      });
      control.addEventListener("keydown", (event) =>
        this.handleFormKeydown(
          event as KeyboardEvent,
          index,
          control instanceof this.document.defaultView!.HTMLTextAreaElement,
        ),
      );
      this.controls.set(parameter.id, control);

      const error = this.createElement("div", "formula-pilot-field-error");
      error.id = `${inputId}-error`;
      error.setAttribute("role", "alert");
      this.errorElements.set(parameter.id, error);
      field.append(label, control, error);
      fields.append(field);
    }
    panel.append(fields);

    const preview = this.createElement("div", "formula-pilot-guided-preview");
    const previewLabel = this.createElement("div", "formula-pilot-guided-preview-label");
    previewLabel.textContent = "预览";
    const previewMath = this.createElement("div", "formula-pilot-preview-math");
    previewMath.dataset.guidedPreview = "true";
    preview.append(previewLabel, previewMath);
    panel.append(preview);

    const help = this.createElement("div", "formula-pilot-guided-help");
    help.textContent = "Enter 下一项 · Cmd/Ctrl+Enter 插入 · Esc 返回";
    panel.append(help);
    this.root.append(panel);
    this.updateGuidedPreview(generateStructuredFormula(candidate, values).latex);
    this.reposition();
    this.focusField(0, true);
  }

  updateGuidedPreview(latex: string): void {
    const preview = this.root.querySelector<HTMLElement>("[data-guided-preview='true']");
    if (preview) this.renderFormula(preview, latex);
    this.reposition();
  }

  showValidationIssues(issues: readonly ValidationIssue[]): void {
    for (const issue of issues) {
      const control = this.controls.get(issue.parameterId);
      const error = this.errorElements.get(issue.parameterId);
      control?.classList.add("has-error");
      control?.setAttribute("aria-invalid", "true");
      if (error) error.textContent = issue.message;
    }
    const first = issues[0];
    if (first) this.controls.get(first.parameterId)?.focus();
    this.reposition();
  }

  private clearValidationIssue(parameterId: string): void {
    const control = this.controls.get(parameterId);
    control?.classList.remove("has-error");
    control?.removeAttribute("aria-invalid");
    const error = this.errorElements.get(parameterId);
    if (error) error.textContent = "";
  }

  private handleFormKeydown(event: KeyboardEvent, index: number, multiline: boolean): void {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.callbacks.onGuidedCancel();
      return;
    }
    if (event.key === "Enter") {
      if (multiline && !event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.metaKey || event.ctrlKey || index === this.controls.size - 1) {
        this.callbacks.onGuidedSubmit();
      } else {
        this.focusField(index + 1, true);
      }
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      const next = event.shiftKey ? index - 1 : index + 1;
      this.focusField((next + this.controls.size) % this.controls.size, true);
    }
  }

  private focusField(index: number, selectText: boolean): void {
    const control = [...this.controls.values()][index];
    if (!control) return;
    control.focus();
    if (
      selectText &&
      (control instanceof this.document.defaultView!.HTMLInputElement ||
        control instanceof this.document.defaultView!.HTMLTextAreaElement)
    ) {
      control.select();
    }
  }

  private createPreviewPanel(candidate: CandidateDefinition): PreviewDetails & { panel: HTMLDivElement; math: HTMLDivElement } {
    const formula = candidate.type === "function"
      ? generateDefaultStructuredFormula(candidate)
      : { latex: candidate.insertText, placeholders: [], cursorEnd: candidate.insertText.length };
    const panel = this.createElement("div", "formula-pilot-preview-panel");
    const eyebrow = this.createElement("div", "formula-pilot-preview-eyebrow");
    eyebrow.textContent = `${candidate.category} · ${candidate.type}`;
    const math = this.createElement("div", "formula-pilot-preview-math");
    const sourceLabel = this.createElement("div", "formula-pilot-preview-label");
    sourceLabel.textContent = "完整 LaTeX";
    const source = this.createElement("code", "formula-pilot-preview-source");
    source.textContent = formula.latex;
    const description = this.createElement("p", "formula-pilot-preview-description");
    description.textContent = candidate.description;
    panel.append(eyebrow, math, sourceLabel, source, description);
    if (candidate.type === "function") {
      const order = this.createElement("div", "formula-pilot-parameter-order");
      order.textContent = candidate.parameters.map((parameter) => parameter.label).join(" → ");
      panel.append(order);
    }
    return { panel, math, candidate, formula };
  }

  private renderFormula(container: HTMLElement, latex: string): void {
    const request = this.previewGeneration += 1;
    container.replaceChildren();
    const pending = this.createElement("span", "formula-pilot-preview-pending");
    pending.textContent = "正在渲染…";
    container.append(pending);

    void Promise.resolve().then(() => {
      if (request !== this.previewGeneration || !container.isConnected) return;
      try {
        const cached = this.previewCache.get(latex);
        let rendered: HTMLElement;
        if (cached) {
          this.previewCache.delete(latex);
          this.previewCache.set(latex, cached);
          rendered = cached.cloneNode(true) as HTMLElement;
        } else {
          rendered = renderMath(latex, true);
          void finishRenderMath();
          this.previewCache.set(latex, rendered.cloneNode(true) as HTMLElement);
          const oldest = this.previewCache.keys().next().value;
          if (this.previewCache.size > 64 && oldest) this.previewCache.delete(oldest);
        }
        if (request !== this.previewGeneration || !container.isConnected) return;
        container.replaceChildren(rendered);
      } catch {
        const fallback = this.createElement("div", "formula-pilot-preview-failed");
        const message = this.createElement("span", "formula-pilot-preview-failed-message");
        message.textContent = "暂时无法渲染";
        const source = this.createElement("code", "formula-pilot-preview-failed-source");
        source.textContent = latex;
        fallback.append(message, source);
        container.replaceChildren(fallback);
      }
    });
  }

  private pageButton(label: string, direction: -1 | 1, disabled: boolean): HTMLButtonElement {
    const button = this.document.createElement("button");
    button.className = "formula-pilot-page-button";
    button.type = "button";
    button.disabled = disabled;
    button.setAttribute("aria-label", label);
    button.textContent = direction === -1 ? "‹" : "›";
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => this.callbacks.onPage(direction));
    return button;
  }

  private createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
  ): HTMLElementTagNameMap[K] {
    const element = this.document.createElement(tag);
    element.className = className;
    return element;
  }
}
