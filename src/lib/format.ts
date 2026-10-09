import { format, parseISO, differenceInMinutes, isValid } from "date-fns";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export const monthKey = (date = new Date()) => format(date, "yyyy-MM");

export function formatDate(value: string | null | undefined, pattern = "dd MMM yyyy") {
  if (!value) return "—";
  const d = value.length <= 10 ? parseISO(value) : new Date(value);
  return isValid(d) ? format(d, pattern) : "—";
}

export function formatDay(value: string | null | undefined) {
  return formatDate(value, "EEEE");
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return isValid(d) ? format(d, "hh:mm a") : "—";
}

/** "09:00:00" -> "09:00 AM" */
export function formatClock(value: string | null | undefined) {
  if (!value) return "—";
  const [h = "0", m = "0"] = value.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return format(d, "hh:mm a");
}

export function formatDateTime(value: string | null | undefined) {
  return formatDate(value, "dd MMM, hh:mm a");
}

export function workedHours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn) return "—";
  if (!checkOut) return "In progress";
  const mins = differenceInMinutes(new Date(checkOut), new Date(checkIn));
  if (mins < 0) return "—";
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

export function minutesBetween(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return 0;
  return Math.max(0, differenceInMinutes(new Date(checkOut), new Date(checkIn)));
}

export function formatRange(start: string, end: string) {
  if (start === end) return formatDate(start);
  const s = parseISO(start);
  const e = parseISO(end);
  if (format(s, "MM yyyy") === format(e, "MM yyyy")) {
    return `${format(s, "dd")}–${format(e, "dd MMM yyyy")}`;
  }
  return `${format(s, "dd MMM")} – ${format(e, "dd MMM yyyy")}`;
}

export const statusLabels: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  on_leave: "On Leave",
  holiday: "Holiday",
  half_day: "Half Day",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  active: "Active",
  inactive: "Inactive",
};

export const labelFor = (status: string) => statusLabels[status] ?? status;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
