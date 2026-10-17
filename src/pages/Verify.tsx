import { useState, type FormEvent } from "react";
import { api } from "../api";
import { toE164 } from "../format";
import { go, query } from "../router";
import { useSession } from "../session";
import { Field, Notice, Redirect } from "../ui";

type Sent = { to: string; code?: string };

export default function Verify() {
  const { user, signIn } = useSession();
  const q = query(); const next = q.get("next") || "/"; const needPhone = q.get("need") === "phone";
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  if (!user) return <Redirect to={`/signin?next=${encodeURIComponent("/verify")}`} />;

  // What still needs proving: the phone when a loan needs it (or when one was given), otherwise the email.
  const phoneNow = user.phone ? (user.phoneVerified ? "" : user.phone) : "";
  const mode: "phone" | "email" | null = needPhone ? (user.phone && user.phoneVerified ? null : "phone") : phoneNow ? "phone" : user.email && !user.emailVerified ? "email" : null;
  if (!mode) return <Redirect to={next} />;
  const target = user.phone ? user.phone : toE164(phone);

  async function send() {
    setBusy(true); setErr("");
    try {
      if (mode === "email") { const r = await api.startEmail(); setSent({ to: r.to, code: r.codeSandbox }); }
      else { if (!/^\+\d{8,15}$/.test(target)) throw new Error("Enter a valid mobile number."); const r = await api.startVerify(target, user!.language || "en"); setSent({ to: r.to, code: r.codeSandbox }); }
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  async function check(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      if (mode === "email") signIn(await api.verifyEmail(code.trim()));
      else {
        const r = await api.checkVerify(target, code.trim());
        signIn(user!.phone ? await api.verifyPhone({ phone: target, verifiedAt: r.verifiedAt, receipt: r.receipt }) : await api.addPhone({ phone: target, verifiedAt: r.verifiedAt, receipt: r.receipt }));
      }
      go(next);
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  const email = mode === "email";
  return (
    <main className="page narrow">
      <h1 className="h1">{email ? "Confirm your email" : user.phone ? "Confirm your phone" : "Add your mobile number"}</h1>
      <p className="lede">{email
        ? <>We email a 6 digit code to <b>{user.email}</b>.</>
        : user.phone ? <>Lenders and the people who confirm your request need to know this number is really yours. We text a 6 digit code to <b>{user.phone}</b>.</>
          : "Loans are paid and followed up by mobile number, so we need yours before you borrow. We text it a 6 digit code."}</p>
      {!sent ? (
        <>
          {!email && !user.phone && <Field label="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="024 123 4567" required />}
          {err && <Notice kind="error">{err}</Notice>}
          <button className="btn" onClick={send} disabled={busy}>{busy ? "Sending" : email ? "Email me a code" : "Text me a code"}</button>
          {email && <p className="alt"><a href={`#/verify?need=phone&next=${encodeURIComponent(next)}`}>Use a mobile number instead</a></p>}
        </>
      ) : (
        <form onSubmit={check}>
          <Notice kind="ok">Code sent to {sent.to}. It works for 10 minutes.</Notice>
          {sent.code && <Notice>Test mode: {email ? "emails" : "texts"} are not live yet, so your code is <b>{sent.code}</b>.</Notice>}
          <Field label="Code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} required />
          {err && <Notice kind="error">{err}</Notice>}
          <button className="btn" disabled={busy || code.trim().length < 4}>{busy ? "Checking" : "Confirm"}</button>
          <button type="button" className="link" onClick={send} disabled={busy}>Send a new code</button>
        </form>
      )}
    </main>
  );
}
