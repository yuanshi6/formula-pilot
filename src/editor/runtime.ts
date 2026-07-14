import type { EditorView } from "@codemirror/view";
import type {
  FormulaPilotPreferences,
  FormulaPilotData,
} from "../core/settings";
import type { GuidedMode, UsageSnapshot } from "../core/types";

export interface FormulaPilotControllerHandle {
  readonly view: EditorView;
  close(): void;
  canManualOpen(): boolean;
  manualOpen(): boolean;
  getDebugSnapshot(): unknown;
}

export interface FormulaPilotRuntime {
  getPreferences(): FormulaPilotPreferences;
  getUsageSnapshot(): UsageSnapshot;
  getLastMode(stableId: string): GuidedMode | undefined;
  recordInsertion(stableId: string): void;
  recordMode(stableId: string, mode: GuidedMode): void;
  registerController(controller: FormulaPilotControllerHandle): void;
  unregisterController(controller: FormulaPilotControllerHandle): void;
  getController(view: EditorView): FormulaPilotControllerHandle | undefined;
  activate(controller: FormulaPilotControllerHandle): void;
  deactivate(controller: FormulaPilotControllerHandle): void;
  isActive(controller: FormulaPilotControllerHandle): boolean;
  getData(): FormulaPilotData;
}
