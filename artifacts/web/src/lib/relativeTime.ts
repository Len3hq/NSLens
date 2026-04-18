// Human-friendly date formatting for post timestamps:
// "just now", "5m ago", "3h ago", "Today at 14:32", "Yesterday at 09:10",
// "Tuesday", or "12 Mar" / "12 Mar 2024" for older dates.
export function relativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 0) return "just now";
  if (diffSec < 45) return "just now";

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHrSameDay = Math.round(diffSec / 3600);
  // Same calendar day → "Today at HH:MM" once we cross 8h, otherwise "Xh ago".
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    if (diffHrSameDay < 8) return `${diffHrSameDay}h ago`;
    return `Today at ${formatTime(date)}`;
  }

  // Yesterday?
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return `Yesterday at ${formatTime(date)}`;
  }

  const diffDay = Math.floor((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (diffDay < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Long, exact date for tooltips/title attributes.
export function fullDateTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
