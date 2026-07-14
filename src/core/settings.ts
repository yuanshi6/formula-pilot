import type { GuidedMode, UsageEntry, UsageSnapshot } from "./types";

export const SETTINGS_SCHEMA_VERSION = 1;

export type CandidateFontSize = "small" | "default" | "large";

export interface FormulaPilotPreferences {
  readonly enableNumberShortcuts: boolean;
  readonly showPreview: boolean;
  readonly trackUsage: boolean;
  readonly candidateFontSize: CandidateFontSize;
  readonly defaultMode: GuidedMode;
  readonly debug: boolean;
}

export interface FormulaPilotData {
  readonly schemaVersion: 1;
  readonly preferences: FormulaPilotPreferences;
  readonly usage: UsageSnapshot;
  readonly lastModeByTemplateId: Readonly<Record<string, GuidedMode>>;
}

export interface LoadedFormulaPilotData {
  readonly data: FormulaPilotData;
  readonly canPersist: boolean;
}

export const DEFAULT_PREFERENCES: FormulaPilotPreferences = Object.freeze({
  enableNumberShortcuts: true,
  showPreview: true,
  trackUsage: true,
  candidateFontSize: "default",
  defaultMode: "guided",
  debug: false,
});

export const DEFAULT_DATA: FormulaPilotData = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  preferences: DEFAULT_PREFERENCES,
  usage: Object.freeze({}),
  lastModeByTemplateId: Object.freeze({}),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

function readPreferences(raw: unknown): FormulaPilotPreferences {
  if (!isRecord(raw)) return { ...DEFAULT_PREFERENCES };
  const font = raw.candidateFontSize;
  const mode = raw.defaultMode;
  return {
    enableNumberShortcuts: readBoolean(raw.enableNumberShortcuts, true),
    showPreview: readBoolean(raw.showPreview, true),
    trackUsage: readBoolean(raw.trackUsage, true),
    candidateFontSize: font === "small" || font === "large" ? font : "default",
    defaultMode: mode === "direct" ? "direct" : "guided",
    debug: readBoolean(raw.debug, false),
  };
}

function readUsage(raw: unknown): UsageSnapshot {
  if (!isRecord(raw)) return {};
  const usage: Record<string, UsageEntry> = {};
  for (const [stableId, entry] of Object.entries(raw)) {
    if (!isRecord(entry)) continue;
    const usageCount = typeof entry.usageCount === "number" ? entry.usageCount : 0;
    const lastUsedAt = typeof entry.lastUsedAt === "number" ? entry.lastUsedAt : 0;
    usage[stableId] = {
      usageCount: Math.min(1_000_000, Math.max(0, Math.floor(usageCount))),
      lastUsedAt: Math.max(0, Math.floor(lastUsedAt)),
    };
  }
  return usage;
}

function readModes(raw: unknown): Readonly<Record<string, GuidedMode>> {
  if (!isRecord(raw)) return {};
  const modes: Record<string, GuidedMode> = {};
  for (const [stableId, mode] of Object.entries(raw)) {
    if (mode === "guided" || mode === "direct") modes[stableId] = mode;
  }
  return modes;
}

export function loadFormulaPilotData(raw: unknown): LoadedFormulaPilotData {
  if (!isRecord(raw)) return { data: structuredClone(DEFAULT_DATA), canPersist: true };
  const schemaVersion = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
  if (schemaVersion > SETTINGS_SCHEMA_VERSION) {
    return { data: structuredClone(DEFAULT_DATA), canPersist: false };
  }
  return {
    data: {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      preferences: readPreferences(raw.preferences ?? raw),
      usage: readUsage(raw.usage),
      lastModeByTemplateId: readModes(raw.lastModeByTemplateId),
    },
    canPersist: true,
  };
}

export function recordUsage(
  usage: UsageSnapshot,
  stableId: string,
  now = Date.now(),
): UsageSnapshot {
  const current = usage[stableId];
  return {
    ...usage,
    [stableId]: {
      usageCount: Math.min(1_000_000, (current?.usageCount ?? 0) + 1),
      lastUsedAt: now,
    },
  };
}
