import { useState, type FormEvent } from "react";
import { api } from "../api";
import { LANGS, toE164 } from "../format";
import { go, query } from "../router";
import { useSession } from "../session";
import { Field, Logo, Notice } from "../ui";

export default function Auth({ mode }: { mode: "signin" | "signup" }) {
  const { signIn } = useSession();
  const next = query().get("next") || "/";
  const [f, setF] = useState({ first_name: "", last_name: "", phone: "", password: "", language: "en" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const phone = toE164(f.phone);
      if (mode === "signup") await api.register({ ...f, phone });
      const u = await api.login({ phone, password: f.password });
      signIn(u);
      go(u.phoneVerified ? next : `/verify?next=${encodeURIComponent(next)}`);
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  const up = mode === "signup";
  return (
    <main className="page narrow">
      <Logo />
      <h1 className="h1">{up ? "Create your account" : "Welcome back"}</h1>
      <p className="lede">{up ? "One account for ER HEAT. If you already use TrimesterSave, sign in with the same phone number and password." : "Sign in with your phone number."}</p>
      <form onSubmit={submit} noValidate>
        {up && <><Field label="First name" value={f.first_name} onChange={set("first_name")} autoComplete="given-name" required /><Field label="Last name" value={f.last_name} onChange={set("last_name")} autoComplete="family-name" required /></>}
        <Field label="Mobile number" value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="024 123 4567" hint="Ghana numbers work without the +233." required />
        <Field label="Password" type="password" value={f.password} onChange={set("password")} autoComplete={up ? "new-password" : "current-password"} hint={up ? "At least 6 characters." : undefined} required />
        {up && <div className="field"><label htmlFor="lang">Language for our texts to you</label><select id="lang" value={f.language} onChange={set("language")}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></div>}
        {err && <Notice kind="error">{err}</Notice>}
        <button className="btn" disabled={busy}>{busy ? "Please wait" : up ? "Create account" : "Sign in"}</button>
      </form>
      <p className="alt">{up ? <>Already have an account? <a href={`#/signin?next=${encodeURIComponent(next)}`}>Sign in</a></> : <>New here? <a href={`#/signup?next=${encodeURIComponent(next)}`}>Create an account</a></>}</p>
    </main>
  );
}
