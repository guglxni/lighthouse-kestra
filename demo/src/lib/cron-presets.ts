/** Lighthouse topic schedules — 5-field cron (minute hour dom month dow), UTC. */

export type CronPreset = {
  id: string;
  label: string;
  cron: string;
  hint: string;
};

export const CRON_PRESETS: CronPreset[] = [
  { id: "daily-6", label: "Daily 6:00 AM UTC", cron: "0 6 * * *", hint: "Early morning digest" },
  { id: "daily-8", label: "Daily 8:00 AM UTC", cron: "0 8 * * *", hint: "Default for agentic-eng" },
  { id: "daily-830", label: "Daily 8:30 AM UTC", cron: "30 8 * * *", hint: "Default for solana-zk" },
  { id: "daily-9", label: "Daily 9:00 AM UTC", cron: "0 9 * * *", hint: "Default for indie-saas" },
  { id: "daily-930", label: "Daily 9:30 AM UTC", cron: "30 9 * * *", hint: "Default for data-eng-ai" },
  { id: "weekdays-8", label: "Weekdays 8:00 AM UTC", cron: "0 8 * * 1-5", hint: "Mon–Fri only" },
  { id: "weekly-mon-8", label: "Weekly Monday 8:00 AM UTC", cron: "0 8 * * 1", hint: "Once per week" },
];

const CRON_RE = /^(\*|[0-5]?\d)(\/\d+)? (\*|[01]?\d|2[0-3])(\/\d+)? (\*|[1-9]|[12]\d|3[01])(\/\d+)? (\*|[1-9]|1[0-2])(\/\d+)? (\*|[0-6]|7)(\/\d+)?$/;

export function isValidCron(expr: string): boolean {
  return CRON_RE.test(expr.trim());
}

export function resolveSchedule(presetId: string, customCron: string): { cron: string; error?: string } {
  if (presetId === "custom") {
    const c = customCron.trim();
    if (!c) return { cron: "0 8 * * *", error: "Enter a cron expression or pick a preset." };
    if (!isValidCron(c)) return { cron: c, error: "Invalid cron — use 5 fields: minute hour dom month dow" };
    return { cron: c };
  }
  const preset = CRON_PRESETS.find((p) => p.id === presetId);
  return { cron: preset?.cron ?? "0 8 * * *" };
}

/** Inject or replace schedule key in generated topic YAML. */
export function applyScheduleToYaml(yaml: string, cron: string): string {
  return applySchedulesToYaml(yaml, [cron]);
}

/** Primary schedule + optional additional daily run times (Kestra can bind multiple triggers). */
export function applySchedulesToYaml(yaml: string, crons: string[]): string {
  const unique = [...new Set(crons.map((c) => c.trim()).filter(Boolean))];
  const primary = unique[0] ?? "0 8 * * *";
  const quoted = `"${primary}"`;
  let out = yaml;
  if (/^schedule:\s/m.test(out)) {
    out = out.replace(/^schedule:\s.*$/m, `schedule: ${quoted}`);
  } else if (/^name:\s.*$/m.test(out)) {
    out = out.replace(/^(name:\s.*)$/m, `$1\nschedule: ${quoted}`);
  } else {
    out = `schedule: ${quoted}\n${out}`;
  }
  if (unique.length > 1) {
    const block = unique.map((c) => `  - "${c}"`).join("\n");
    if (/^schedules:\s*\n/m.test(out)) {
      out = out.replace(/^schedules:\s*\n(?:[ \t]+-[^\n]*\n)*/m, `schedules:\n${block}\n`);
    } else {
      out = out.replace(/^schedule:\s.*$/m, (line) => `${line}\nschedules:\n${block}`);
    }
  } else if (/^schedules:\s*\n/m.test(out)) {
    out = out.replace(/^schedules:\s*\n(?:[ \t]+-[^\n]*\n)*/m, "");
  }
  return out;
}
