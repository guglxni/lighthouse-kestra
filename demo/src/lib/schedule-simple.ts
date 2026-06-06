/** Human-friendly schedule picker → 5-field UTC cron for Kestra topic YAML. */

export type RunFrequency = "daily" | "weekdays" | "weekly";

export type RunWhen = {
  frequency: RunFrequency;
  hour: number;
  minute: number;
};

/** Multiple run times per day for the same topic. */
export type RunSchedule = {
  frequency: RunFrequency;
  times: { hour: number; minute: number }[];
};

export const RUN_FREQUENCIES: { id: RunFrequency; label: string }[] = [
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays (Mon–Fri)" },
  { id: "weekly", label: "Weekly on Monday" },
];

export function clampHour(h: number): number {
  return Math.min(23, Math.max(0, Math.floor(h)));
}

export function clampMinute(m: number): number {
  return Math.min(59, Math.max(0, Math.floor(m)));
}

export function formatTimeUtc(hour: number, minute: number): string {
  const h = clampHour(hour);
  const m = clampMinute(minute);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period} UTC (${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")})`;
}

export function cronFromRunWhen(w: RunWhen): string {
  const m = clampMinute(w.minute);
  const h = clampHour(w.hour);
  if (w.frequency === "weekdays") return `${m} ${h} * * 1-5`;
  if (w.frequency === "weekly") return `${m} ${h} * * 1`;
  return `${m} ${h} * * *`;
}

export function cronsFromRunSchedule(schedule: RunSchedule): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of schedule.times) {
    const cron = cronFromRunWhen({ frequency: schedule.frequency, hour: t.hour, minute: t.minute });
    if (!seen.has(cron)) {
      seen.add(cron);
      out.push(cron);
    }
  }
  return out.length ? out : [cronFromRunWhen({ frequency: schedule.frequency, hour: 9, minute: 0 })];
}

export function describeRunWhen(w: RunWhen): string {
  const freq = RUN_FREQUENCIES.find((f) => f.id === w.frequency)?.label ?? w.frequency;
  return `${freq} at ${formatTimeUtc(w.hour, w.minute)} · cron \`${cronFromRunWhen(w)}\``;
}

export function describeRunSchedule(schedule: RunSchedule): string {
  const freq = RUN_FREQUENCIES.find((f) => f.id === schedule.frequency)?.label ?? schedule.frequency;
  const crons = cronsFromRunSchedule(schedule);
  const times = schedule.times.map((t) => formatTimeUtc(t.hour, t.minute)).join(", ");
  return `${freq} at ${times} · ${crons.length} run${crons.length === 1 ? "" : "s"}: ${crons.map((c) => `\`${c}\``).join(", ")}`;
}

export function parseRunWhenFromCron(cron: string): RunWhen | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const minute = Number(parts[0]);
  const hour = Number(parts[1]);
  const dow = parts[4];
  if (!Number.isInteger(minute) || !Number.isInteger(hour)) return null;
  let frequency: RunFrequency = "daily";
  if (dow === "1-5") frequency = "weekdays";
  else if (dow === "1") frequency = "weekly";
  else if (dow !== "*") return null;
  return { frequency, hour, minute };
}

export const DEFAULT_RUN_WHEN: RunWhen = { frequency: "daily", hour: 9, minute: 0 };

export const DEFAULT_RUN_SCHEDULE: RunSchedule = {
  frequency: "daily",
  times: [{ hour: 9, minute: 0 }],
};

export function runWhenToSchedule(w: RunWhen): RunSchedule {
  return { frequency: w.frequency, times: [{ hour: w.hour, minute: w.minute }] };
}
