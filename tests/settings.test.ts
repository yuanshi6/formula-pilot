import { describe, expect, it } from "vitest";
import {
  DEFAULT_DATA,
  loadFormulaPilotData,
  recordUsage,
} from "../src/core/settings";

describe("settings storage", () => {
  it("loads safe defaults for missing data", () => {
    expect(loadFormulaPilotData(null)).toEqual({
      data: structuredClone(DEFAULT_DATA),
      canPersist: true,
    });
  });

  it("migrates legacy flat preferences into schema version 1", () => {
    const loaded = loadFormulaPilotData({
      enableNumberShortcuts: false,
      showPreview: false,
      usage: { "command.lim": { usageCount: 4, lastUsedAt: 100 } },
    });
    expect(loaded.data.schemaVersion).toBe(1);
    expect(loaded.data.preferences.enableNumberShortcuts).toBe(false);
    expect(loaded.data.usage["command.lim"]?.usageCount).toBe(4);
  });

  it("does not permit overwriting an unknown higher schema", () => {
    const loaded = loadFormulaPilotData({ schemaVersion: 99, preferences: {} });
    expect(loaded.canPersist).toBe(false);
    expect(loaded.data).toEqual(structuredClone(DEFAULT_DATA));
  });

  it("caps usage at one million", () => {
    const usage = recordUsage(
      { candidate: { usageCount: 1_000_000, lastUsedAt: 1 } },
      "candidate",
      2,
    );
    expect(usage.candidate).toEqual({ usageCount: 1_000_000, lastUsedAt: 2 });
  });
});
