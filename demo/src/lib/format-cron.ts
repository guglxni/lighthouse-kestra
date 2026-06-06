/**
 * Turn a 5-field cron string (minute hour dom month dow) into plain English.
 * Lighthouse topic profiles use standard cron, e.g. "30 8 * * *" → daily 8:30 AM.
 */
export function formatCronSchedule(cron: string | undefined): string {
  if (!cron?.trim()) return "On demand";

  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;

  const [minute, hour, dom, month, dow] = parts;

  if (dom !== "*" || month !== "*") {
    return `Scheduled (${cron})`;
  }

  const time = formatClock(hour, minute);
  if (dow === "*") return `Daily at ${time}`;
  if (dow === "1-5") return `Weekdays at ${time}`;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowLabel =
    dow.includes(",") || dow.includes("-")
      ? `on selected days (${dow})`
      : `on ${dayNames[Number(dow)] ?? dow}`;

  return `Weekly ${dowLabel} at ${time}`;
}

function formatClock(hour: string, minute: string): string {
  const h = Number(hour);
  const m = Number(minute);
  if (Number.isNaN(h) || Number.isNaN(m)) return `${hour}:${minute}`;

  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, "0");
  return `${h12}:${mm} ${period} UTC`;
}
