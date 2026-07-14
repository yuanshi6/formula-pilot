import { EditorView } from "@codemirror/view";
import { Notice, Plugin } from "obsidian";
import type { Editor } from "obsidian";
import { createFormulaPilotEditorExtension } from "./editor/controller";
import type {
  FormulaPilotControllerHandle,
  FormulaPilotRuntime,
} from "./editor/runtime";
import {
  DEFAULT_DATA,
  loadFormulaPilotData,
  recordUsage,
} from "./core/settings";
import type {
  FormulaPilotData,
  FormulaPilotPreferences,
} from "./core/settings";
import type { GuidedMode, UsageSnapshot } from "./core/types";
import { FormulaPilotSettingTab } from "./settings-tab";

interface EditorWithCodeMirror extends Editor {
  readonly cm?: unknown;
}

export default class FormulaPilotPlugin extends Plugin implements FormulaPilotRuntime {
  private data: FormulaPilotData = structuredClone(DEFAULT_DATA);
  private canPersist = true;
  private readonly controllers = new Map<EditorView, FormulaPilotControllerHandle>();
  private activeController: FormulaPilotControllerHandle | undefined;
  private saveTimer: number | undefined;

  override async onload(): Promise<void> {
    const loaded = loadFormulaPilotData(await this.loadData());
    this.data = loaded.data;
    this.canPersist = loaded.canPersist;

    this.registerEditorExtension(createFormulaPilotEditorExtension(this));
    this.addSettingTab(new FormulaPilotSettingTab(this.app, this));
    this.addCommand({
      id: "open-formula-menu",
      name: "Open formula menu",
      editorCheckCallback: (checking, editor) => {
        const controller = this.controllerFromEditor(editor);
        if (!controller || !controller.canManualOpen()) return false;
        if (!checking) controller.manualOpen();
        return true;
      },
    });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.activeController?.close();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.activeController?.close();
      }),
    );

    if (!this.canPersist) {
      new Notice("Formula Pilot 检测到更高版本的设置数据，已使用安全默认值且不会覆盖原数据。");
    }
  }

  override onunload(): void {
    for (const controller of this.controllers.values()) controller.close();
    this.controllers.clear();
    this.activeController = undefined;
    this.flushScheduledSave();
  }

  getPreferences(): FormulaPilotPreferences {
    return this.data.preferences;
  }

  getUsageSnapshot(): UsageSnapshot {
    return this.data.preferences.trackUsage ? structuredClone(this.data.usage) : {};
  }

  getLastMode(stableId: string): GuidedMode | undefined {
    return this.data.lastModeByTemplateId[stableId];
  }

  getData(): FormulaPilotData {
    return this.data;
  }

  updatePreferences(patch: Partial<FormulaPilotPreferences>): void {
    this.data = {
      ...this.data,
      preferences: { ...this.data.preferences, ...patch },
    };
    this.scheduleSave();
    this.activeController?.close();
  }

  recordInsertion(stableId: string): void {
    if (!this.data.preferences.trackUsage) return;
    this.data = { ...this.data, usage: recordUsage(this.data.usage, stableId) };
    this.scheduleSave();
  }

  recordMode(stableId: string, mode: GuidedMode): void {
    this.data = {
      ...this.data,
      lastModeByTemplateId: { ...this.data.lastModeByTemplateId, [stableId]: mode },
    };
    this.scheduleSave();
  }

  async clearUsageHistory(): Promise<void> {
    this.data = { ...this.data, usage: {}, lastModeByTemplateId: {} };
    if (this.canPersist) await this.saveData(this.data);
    this.activeController?.close();
  }

  registerController(controller: FormulaPilotControllerHandle): void {
    this.controllers.set(controller.view, controller);
  }

  unregisterController(controller: FormulaPilotControllerHandle): void {
    this.controllers.delete(controller.view);
    if (this.activeController === controller) this.activeController = undefined;
  }

  getController(view: EditorView): FormulaPilotControllerHandle | undefined {
    return this.controllers.get(view);
  }

  activate(controller: FormulaPilotControllerHandle): void {
    if (this.activeController && this.activeController !== controller) this.activeController.close();
    this.activeController = controller;
  }

  deactivate(controller: FormulaPilotControllerHandle): void {
    if (this.activeController === controller) this.activeController = undefined;
  }

  isActive(controller: FormulaPilotControllerHandle): boolean {
    return this.activeController === controller;
  }

  private controllerFromEditor(editor: Editor): FormulaPilotControllerHandle | undefined {
    const codeMirror = (editor as EditorWithCodeMirror).cm;
    return codeMirror instanceof EditorView ? this.controllers.get(codeMirror) : undefined;
  }

  private scheduleSave(): void {
    if (!this.canPersist) return;
    const timerWindow = this.app.workspace.containerEl.ownerDocument.defaultView;
    if (!timerWindow) return;
    if (this.saveTimer !== undefined) timerWindow.clearTimeout(this.saveTimer);
    this.saveTimer = timerWindow.setTimeout(() => {
      this.saveTimer = undefined;
      void this.saveData(this.data);
    }, 500);
  }

  private flushScheduledSave(): void {
    if (!this.canPersist || this.saveTimer === undefined) return;
    const timerWindow = this.app.workspace.containerEl.ownerDocument.defaultView;
    timerWindow?.clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    void this.saveData(this.data);
  }
}
