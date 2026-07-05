// Per-user settings: tunable knobs stored one row per (user, key) in
// `settings`. Anything not set in the DB falls back to the compiled-in default
// below, so the app works the same whether or not a row exists. Ported from
// Email-wrapper's app_settings with the tenancy flipped: settings are the
// user's own rows behind RLS, not global admin state.
//
// To add a setting: add a SettingDef here and read it where it's used. The
// (future) Config page renders SETTING_DEFS automatically.

import { createClient } from "@/lib/supabase/server";

export type SettingKey =
  | "waiting.aging_days"
  | "focus.top_count"
  | "chief.model";

export type SettingDef = {
  key: SettingKey;
  label: string;
  description: string;
  default: string;
  /** Render as a single-line input instead of a textarea. */
  singleLine?: boolean;
  /** Textarea rows hint (longer prompts want more). */
  rows?: number;
  placeholder?: string;
};

// Phase 2 carries only the structural knobs; the Chief prompts arrive with the
// Chief loop (Phase 3) and the config blobs (instructions / voice / about) live
// in the KB, not here.
export const SETTING_DEFS: SettingDef[] = [
  {
    key: "waiting.aging_days",
    label: "Waiting-on — aging threshold (days)",
    description:
      "How many days someone can stay quiet before their dot on the Waiting-on strip turns copper. Green = they moved, gray = quiet, copper = aging.",
    default: "6",
    singleLine: true,
    placeholder: "6",
  },
  {
    key: "focus.top_count",
    label: "Home — ranked tasks shown",
    description:
      "How many top-ranked tasks the Home focus view surfaces above the fold.",
    default: "3",
    singleLine: true,
    placeholder: "3",
  },
  {
    key: "chief.model",
    label: "Chief — model",
    description:
      "The Claude model Chief runs on. Leave at the default unless you have a reason to change it.",
    default: "claude-opus-4-8",
    singleLine: true,
    placeholder: "claude-opus-4-8",
  },
];

export type AppSettings = Record<SettingKey, string>;

const DEFAULTS = Object.fromEntries(
  SETTING_DEFS.map((d) => [d.key, d.default]),
) as AppSettings;

const VALID_KEYS = new Set<string>(SETTING_DEFS.map((d) => d.key));

/** All settings, with the user's DB overrides layered over the defaults. */
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) {
    // Best-effort: never break the app because a settings read failed.
    console.error("Failed to load settings:", error.message);
    return { ...DEFAULTS };
  }
  const merged: AppSettings = { ...DEFAULTS };
  for (const row of (data ?? []) as { key: string; value: string }[]) {
    if (VALID_KEYS.has(row.key)) merged[row.key as SettingKey] = row.value;
  }
  return merged;
}

/** A single setting value (override or default). */
export async function getSetting(key: SettingKey): Promise<string> {
  return (await getAppSettings())[key];
}

/** A numeric setting, falling back to its default when unparseable. */
export async function getNumericSetting(key: SettingKey): Promise<number> {
  const raw = await getSetting(key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number(DEFAULTS[key]);
}

/** Upsert one or more settings for the signed-in user. Unknown keys ignored. */
export async function saveAppSettings(
  updates: Partial<Record<SettingKey, string>>,
  userId: string,
): Promise<void> {
  const supabase = await createClient();
  const rows = Object.entries(updates)
    .filter(([key]) => VALID_KEYS.has(key))
    .map(([key, value]) => ({ user_id: userId, key, value: value ?? "" }));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from("settings")
    .upsert(rows, { onConflict: "user_id,key" });
  if (error) throw new Error(error.message);
}
