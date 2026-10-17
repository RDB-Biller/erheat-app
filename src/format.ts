export const ghs = (n: number | null | undefined) => (n == null ? "" : `GHS ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`);
export const when = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return iso; } };
export const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400000));
/** Ghana-friendly: 024 123 4567 -> +233241234567. Anything starting with + is left alone for the Biller to validate. */
export function toE164(raw: string): string {
  const s = raw.replace(/[\s().-]/g, "");
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return "+" + s.slice(2);
  if (/^0\d{9}$/.test(s)) return "+233" + s.slice(1);
  if (/^233\d{9}$/.test(s)) return "+" + s;
  return s;
}
export const LANGS: { code: string; name: string }[] = [
  { code: "en", name: "English" }, { code: "tw", name: "Twi" }, { code: "gaa", name: "Ga" }, { code: "ha", name: "Hausa" }, { code: "yo", name: "Yorùbá" }, { code: "fr", name: "Français" }, { code: "sw", name: "Kiswahili" },
];
// Order of a request's life. The Biller owns the state names; this only chooses how to draw them.
export const STAGES: { key: string; label: string; statuses: string[] }[] = [
  { key: "named", label: "Confirmations", statuses: ["needs_verification"] },
  { key: "ready", label: "Ready to send", statuses: ["verified"] },
  { key: "lender", label: "With the lender", statuses: ["submitted"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "paid", label: "Payee paid", statuses: ["payee_paid", "repaying"] },
  { key: "repaid", label: "Repaid", statuses: ["closed"] },
];
export const stageIndex = (status: string) => STAGES.findIndex((s) => s.statuses.includes(status));
export const ENDED = ["declined", "cancelled", "expired", "defaulted"];

/** An account is confirmed once either its phone or its email has been proved. */
export const confirmed = (u: { phone?: string; phoneVerified?: boolean; email?: string; emailVerified?: boolean }) => (!!u.phone && !!u.phoneVerified) || (!!u.email && !!u.emailVerified);
