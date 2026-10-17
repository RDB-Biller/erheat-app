import { useEffect, useState, type FormEvent } from "react";
import { api, type AuthOptions } from "../api";
import { LANGS, confirmed, toE164 } from "../format";
import { go, query } from "../router";
import { useSession } from "../session";
import { Field, Logo, Notice } from "../ui";

export default function Auth({ mode }: { mode: "signin" | "signup" }) {
  const { signIn } = useSession();
  const next = query().get("next") || "/";
  const [opts, setOpts] = useState<AuthOptions>({ requirePhone: false, emailSignup: true });
  const [f, setF] = useState({ first_name: "", last_name: "", phone: "", email: "", identifier: "", password: "", language: "en" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { api.authOptions().then(setOpts).catch(() => { /* older Biller: phone only */ setOpts({ requirePhone: true, emailSignup: false }); }); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      let identifier = f.identifier.includes("@") ? f.identifier.trim() : toE164(f.identifier);
      if (mode === "signup") {
        const phone = f.phone.trim() ? toE164(f.phone) : ""; const email = opts.emailSignup ? f.email.trim() : "";
        if (opts.requirePhone && !phone) throw new Error("Enter your mobile number.");
        if (!phone && !email) throw new Error("Enter a mobile number or an email address.");
        await api.register({ first_name: f.first_name, last_name: f.last_name, password: f.password, language: f.language, ...(phone ? { phone } : {}), ...(email ? { email } : {}) });
        identifier = phone || email;
      }
      const u = await api.login({ identifier, password: f.password });
      signIn(u);
      go(confirmed(u) ? next : `/verify?next=${encodeURIComponent(next)}`);
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  const up = mode === "signup";
  return (
    <main className="page narrow">
      <Logo />
      <h1 className="h1">{up ? "Create your account" : "Welcome back"}</h1>
      <p className="lede">{up ? "One account for ER HEAT. If you already use TrimesterSave, sign in with the same details." : "Sign in with your mobile number or email."}</p>
      <form onSubmit={submit} noValidate>
        {up && <><Field label="First name" value={f.first_name} onChange={set("first_name")} autoComplete="given-name" required /><Field label="Last name" value={f.last_name} onChange={set("last_name")} autoComplete="family-name" required /></>}
        {up ? <>
          <Field label={opts.requirePhone ? "Mobile number" : "Mobile number (optional if you use email)"} value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="024 123 4567" hint="Ghana numbers work without the +233." required={opts.requirePhone} />
          {opts.emailSignup && <Field label="Email address (optional if you use a mobile number)" type="email" value={f.email} onChange={set("email")} autoComplete="email" hint="You can open your account with email only. You will add a mobile number before you borrow." />}
        </> : <Field label="Mobile number or email" value={f.identifier} onChange={set("identifier")} autoComplete="username" placeholder="024 123 4567 or you@mail.com" required />}
        <Field label="Password" type="password" value={f.password} onChange={set("password")} autoComplete={up ? "new-password" : "current-password"} hint={up ? "At least 6 characters." : undefined} required />
        {up && <div className="field"><label htmlFor="lang">Language for our texts to you</label><select id="lang" value={f.language} onChange={set("language")}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></div>}
        {err && <Notice kind="error">{err}</Notice>}
        <button className="btn" disabled={busy}>{busy ? "Please wait" : up ? "Create account" : "Sign in"}</button>
      </form>
      <p className="alt">{up ? <>Already have an account? <a href={`#/signin?next=${encodeURIComponent(next)}`}>Sign in</a></> : <>New here? <a href={`#/signup?next=${encodeURIComponent(next)}`}>Create an account</a></>}</p>
    </main>
  );
}
