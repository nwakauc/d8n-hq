const SECURITY_EVENT_LABELS: Record<string, string> = {
  "auth.password_login.failed": "Failed password login",
  "auth.password.login.failed": "Failed password login",
  "auth.login.failed": "Failed login",
  "auth.admin.login": "New admin login",
  "auth.admin_login": "New admin login",
  "profile.photo.moderated": "Profile photo moderated",
  "profile.photo_moderated": "Profile photo moderated",
  "moderation.photo.reviewed": "Photo moderation decision",
};

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Founder-facing security alert label. Raw event type stays available for tooltips. */
export function humanizeSecurityEvent(eventType: string): string {
  const known = SECURITY_EVENT_LABELS[eventType];
  if (known) return known;

  const normalized = eventType
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return titleCaseWords(normalized);
}
