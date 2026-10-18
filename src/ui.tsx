import { useEffect, useId } from "react";
import type { ReactNode, InputHTMLAttributes } from "react";
import { STAGES, stageIndex, ENDED } from "./format";
import { useRoute } from "./router";

export const LINE_COLOR: Record<string, string> = { energy: "#E9A100", rent: "#2F6FDE", health: "#D8365B", education: "#7A4FD6", agriculture: "#2E8B4F", transport: "#0E8E91" };
export const lineColor = (k: string) => LINE_COLOR[k] || "#0F1D2B";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export function Icon({ name, size = 26 }: { name: string; size?: number }) {
  const d: Record<string, ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></>,
    heart: <><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" /><path d="M12 10.5v4M10 12.5h4" /></>,
    school: <><path d="M2.5 9 12 4.5 21.5 9 12 13.5z" /><path d="M6.5 11.3V16c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7v-4.7" /><path d="M21.5 9v5" /></>,
    bolt: <path d="M13.5 3 5.5 13.5H12L10.5 21l8-10.5H12z" />,
    leaf: <><path d="M5 19c0-8 5-13.5 14.5-14.5C19 14 13.5 19 5 19z" /><path d="M5 19c2-4 5-7 9-9" /></>,
    bus: <><rect x="4.5" y="4" width="15" height="13" rx="3" /><path d="M4.5 11h15M8 20v-3M16 20v-3" /><circle cx="8.5" cy="14" r=".6" /><circle cx="15.5" cy="14" r=".6" /></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r=".8" /><circle cx="4" cy="12" r=".8" /><circle cx="4" cy="18" r=".8" /></>,
    shield: <><path d="M12 3 5 6v5.5c0 4.3 3 7.6 7 9.5 4-1.9 7-5.2 7-9.5V6z" /><path d="m9 12 2.3 2.3L15.5 10" /></>,
    user: <><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c.8-3.6 3.7-5.4 7-5.4s6.2 1.8 7 5.4" /></>,
    back: <path d="M15 5 8 12l7 7" />,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    phone: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
    flame: <path d="M12 3c.6 3.4 5.5 5.7 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.1-3.8 2.3-5 .1 2.2 1 3.3 2.2 3.7C10 9.7 10.8 6.4 12 3z" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...P}>{d[name] || d.flame}</svg>;
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="logo" aria-label="ER HEAT">
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.7 3.8 6 6.3 6 12.2a6 6 0 0 1-12 0c0-2.7 1.2-4.2 2.6-5.5.1 2.4 1 3.6 2.4 4C10.2 9.3 11 5.7 12 2z" fill="#F04A23" /><path d="M12 12.5c.5 1.7 2.6 2.7 2.6 4.7a2.6 2.6 0 0 1-5.2 0c0-1.2.6-2 1.2-2.6 0 .9.5 1.4 1 1.6-.3-1.3-.1-2.4.4-3.7z" fill="#FFC93C" /></svg>
      <b style={{ color: light ? "#fff" : "var(--ink)" }}>ER HEAT</b>
    </span>
  );
}

export function Field({ label, hint, error, ...p }: { label: string; hint?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...p} aria-invalid={!!error} aria-describedby={hint ? id + "_h" : undefined} />
      {hint && <p className="hint" id={id + "_h"}>{hint}</p>}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}

const SUPPORT = (typeof window !== "undefined" && (window as any).__ERHEAT__ && (window as any).__ERHEAT__.support) || "ekforson@hnnworld.com";

/** No dead ends: wherever an error shows, it also says where to go next. */
function nextSteps(route: string, message: string): { label: string; href?: string; reload?: boolean }[] {
  const out: { label: string; href?: string; reload?: boolean }[] = [];
  const expired = /session|sign in|signed in|token|expired|log in/i.test(message);
  const notFound = /not found|does not exist|no such/i.test(message);
  if (expired && route !== "/signin") out.push({ label: "Sign in again", href: "#/signin" });
  if (route === "/signin") out.push({ label: "Create an account", href: "#/signup" }, { label: "Verify your phone", href: "#/verify" });
  else if (route === "/signup") out.push({ label: "Already have an account? Sign in", href: "#/signin" });
  else if (route === "/verify") out.push({ label: "Start again from sign-up", href: "#/signup" }, { label: "Sign in", href: "#/signin" });
  else if (route.startsWith("/apply/")) out.push({ label: "Back to loans", href: "#/" }, { label: "Your requests", href: "#/requests" });
  else if (route.startsWith("/requests/")) out.push({ label: "Your requests", href: "#/requests" }, { label: "Ask for a new loan", href: "#/" });
  else if (route === "/requests") out.push({ label: "Ask for a loan", href: "#/" });
  else if (route === "/passport" || route === "/profile" || route === "/me") out.push({ label: "Back to home", href: "#/" }, { label: "Sign in", href: "#/signin" });
  else out.push({ label: "Back to home", href: "#/" }, { label: "Create an account", href: "#/signup" });
  if (notFound && !out.some((o) => o.href === "#/")) out.push({ label: "Back to home", href: "#/" });
  out.push({ label: "Try again", reload: true }, { label: "Get help", href: `mailto:${SUPPORT}?subject=ER%20HEAT%20help` });
  const seen = new Set<string>(); return out.filter((o) => { const k = o.href || "reload"; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 4);
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  const route = useRoute();
  const text = typeof children === "string" ? children : Array.isArray(children) ? children.filter((c) => typeof c === "string").join(" ") : "";
  return (
    <div className={`notice ${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
      {kind === "error" && (
        <p className="next"><b>What to do next:</b>{" "}
          {nextSteps(route, text).map((o, i) => (
            <span key={i}>{i > 0 && <span aria-hidden="true"> · </span>}
              {o.reload ? <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>{o.label}</a> : <a href={o.href}>{o.label}</a>}</span>
          ))}
        </p>
      )}
    </div>
  );
}
export const Spinner = ({ label = "Loading" }: { label?: string }) => <div className="spin" role="status" aria-label={label}><i /><i /><i /></div>;

/** The signature element: a thermometer for a request's journey. It fills with flame as the Biller moves the request on. */
export function HeatStrip({ status, verifierLabels }: { status: string; verifierLabels?: string[] }) {
  const idx = stageIndex(status);
  const ended = ENDED.includes(status);
  return (
    <ol className={`heat ${ended ? "ended" : ""}`} aria-label="Where your request is">
      {STAGES.map((s, i) => {
        const done = !ended && i < idx; const here = !ended && i === idx;
        return (
          <li key={s.key} className={done ? "done" : here ? "here" : ""} aria-current={here ? "step" : undefined}>
            <span className="bulb">{done ? <Icon name="check" size={14} /> : null}</span>
            <span className="t">{s.label}</span>
            {here && s.key === "named" && verifierLabels && verifierLabels.length > 0 && <span className="sub">Waiting for {verifierLabels.join(" and ")}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function Tabs({ route }: { route: string }) {
  const t = [{ to: "/", icon: "flame", label: "Loans", on: route === "/" || route.startsWith("/apply") }, { to: "/requests", icon: "list", label: "Requests", on: route.startsWith("/requests") }, { to: "/passport", icon: "shield", label: "Passport", on: route === "/passport" }, { to: "/me", icon: "user", label: "Me", on: route === "/me" }];
  return (
    <nav className="tabs" aria-label="Main">
      {t.map((x) => <a key={x.to} href={`#${x.to}`} className={x.on ? "on" : ""} aria-current={x.on ? "page" : undefined}><Icon name={x.icon} size={22} /><span>{x.label}</span></a>)}
    </nav>
  );
}

export function Redirect({ to }: { to: string }) {
  useEffect(() => { window.location.replace(`#${to}`); }, [to]);
  return null;
}
