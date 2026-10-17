// The only file that talks to the Biller. No lending rules live here: the app shows what the Biller returns.
declare const __BILLER_URL__: string;
// Runtime setting (served by server.mjs from the ERHEAT_BILLER_URL variable) wins over the build-time default.
const runtime = (typeof window !== "undefined" && (window as any).__ERHEAT__ && (window as any).__ERHEAT__.biller) || "";
export const BILLER: string = String(runtime || __BILLER_URL__).replace(/\/$/, "");
export const BILLER_HOST = BILLER.replace(/^https?:\/\//, "");

export type Field = { key: string; label: string; type: "text" | "number" | "date"; required?: boolean };
export type Line = {
  key: string; label: string; short: string; icon: string; enabled: boolean; comingSoon: boolean;
  min: number; cap: number; verifierLabel: string; coVerifierLabel: string; payeeLabel: string; trust: string; voucher: boolean; fields: Field[];
};
export type Passport = { level: "new" | "trusted" | "preferred"; ceiling: number; verifiedRequests: number; repaid: number; defaults: number; open: number; next: string };
export type Catalogue = { enabled: boolean; requireVerifiedPhone: boolean; hardCap: number; passport: Passport | null; consentText: string; lines: Line[] };
export type Verifier = { id: string; label: string; name: string; phone: string; status: "pending" | "confirmed" | "declined" };
export type Loan = {
  id: string; appNo: string; line: string; lineLabel: string; status: string; amount: number; verifiedAmount: number | null; approvedAmount: number | null;
  payee: { name: string; phone: string }; verifiers: Verifier[]; nextStep: string;
  voucher: { code: string; expiresAt: string; note: string } | null; evidence: Record<string, string | number>;
  createdAt: string; expiresAt: string; history: { at: string; type: string }[]; repayments: { at: string; amount: number }[];
};
export type AuthOptions = { requirePhone: boolean; emailSignup: boolean };
export type User = { _id: string; first_name: string; last_name: string; phone?: string; email?: string; phoneVerified: boolean; emailVerified?: boolean; language?: string; tokens?: { token: string }[] };

export class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }
let token = "";
export const setToken = (t: string) => { token = t; };
let onExpired: () => void = () => {};
export const onSessionExpired = (f: () => void) => { onExpired = f; };

async function call<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BILLER + path, {
      method: init.method || (init.body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", ...(init.auth !== false && token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(`Could not reach ${BILLER_HOST}. Check your data or Wi-Fi and try again. If it keeps happening, tell support which server this says.`, 0);
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  if (res.status === 401 && token && !path.includes("/login")) onExpired();
  if (!res.ok) throw new ApiError((data && (data.error || data.message)) || "Something went wrong. Please try again.", res.status);
  return (data && "result" in data ? data.result : data) as T;
}

const PA = "/patient-api/v1/patient";
export const api = {
  catalogue: () => call<Catalogue>("/erheat/api/lines"),
  passport: () => call<Passport>("/erheat/api/passport"),
  loans: () => call<Loan[]>("/erheat/api/apps"),
  loan: (id: string) => call<Loan>(`/erheat/api/apps/${id}`),
  apply: (body: unknown) => call<Loan>("/erheat/api/apply", { body }),
  consent: (id: string, agree: boolean) => call<Loan>(`/erheat/api/apps/${id}/consent`, { body: { agree } }),
  cancel: (id: string) => call<Loan>(`/erheat/api/apps/${id}/cancel`, { method: "POST", body: {} }),
  resend: (id: string, vid: string) => call<Loan>(`/erheat/api/apps/${id}/resend/${vid}`, { method: "POST", body: {} }),

  authOptions: () => call<AuthOptions>(`${PA}/auth_options`, { auth: false }),
  register: (b: { first_name: string; last_name: string; phone?: string; email?: string; password: string; language: string }) => call<User>(`${PA}/register`, { body: { ...b, source: "erheat" }, auth: false }),
  login: (b: { identifier: string; password: string }) => call<User>(`${PA}/login`, { body: b, auth: false }),
  me: () => call<{ user: User }>(`${PA}/me`),
  updateLanguage: (language: string) => call<{ user: User }>(`${PA}/update`, { method: "PATCH", body: { language } }),
  startVerify: (phone: string, lang: string) => call<{ sent: boolean; sandbox?: boolean; to: string; expiresInMinutes: number; codeSandbox?: string }>("/savings/api/verify/start", { body: { phone, lang }, auth: false }),
  checkVerify: (phone: string, code: string) => call<{ verifiedAt: string; receipt: string }>("/savings/api/verify/check", { body: { phone, code }, auth: false }),
  startEmail: () => call<{ sent: boolean; to: string; codeSandbox?: string; alreadyVerified?: boolean }>(`${PA}/email/start`, { method: "POST", body: {} }),
  verifyEmail: (code: string) => call<User>(`${PA}/verify_email`, { method: "PATCH", body: { code } }),
  addPhone: (b: { phone: string; verifiedAt: string; receipt: string }) => call<User>(`${PA}/add_phone`, { method: "PATCH", body: b }),
  verifyPhone: (b: { phone: string; verifiedAt: string; receipt: string }) => call<User>(`${PA}/verify_phone`, { method: "PATCH", body: b, auth: false }),
};
