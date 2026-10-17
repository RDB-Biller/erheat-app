import { useState, type FormEvent } from "react";
import { api } from "../api";
import { go, query } from "../router";
import { useSession } from "../session";
import { Field, Notice, Redirect } from "../ui";

export default function Verify() {
  const { user, signIn } = useSession();
  const next = query().get("next") || "/";
  const [sent, setSent] = useState<{ to: string; code?: string } | null>(null);
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  if (!user) return <Redirect to={`/signin?next=${encodeURIComponent("/verify")}`} />;
  if (user.phoneVerified) return <Redirect to={next} />;

  async function send() {
    setBusy(true); setErr("");
    try { const r = await api.startVerify(user!.phone, user!.language || "en"); setSent({ to: r.to, code: r.codeSandbox }); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  async function check(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await api.checkVerify(user!.phone, code.trim());
      signIn(await api.verifyPhone({ phone: user!.phone, verifiedAt: r.verifiedAt, receipt: r.receipt }));
      go(next);
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <main className="page narrow">
      <h1 className="h1">Confirm your phone</h1>
      <p className="lede">Lenders and the people who confirm your request need to know this number is really yours. We text a 6 digit code to <b>{user.phone}</b>.</p>
      {!sent ? (
        <>
          {err && <Notice kind="error">{err}</Notice>}
          <button className="btn" onClick={send} disabled={busy}>{busy ? "Sending" : "Text me a code"}</button>
        </>
      ) : (
        <form onSubmit={check}>
          <Notice kind="ok">Code sent to {sent.to}. It works for 10 minutes.</Notice>
          {sent.code && <Notice>Test mode: texts are not live yet, so your code is <b>{sent.code}</b>.</Notice>}
          <Field label="Code from the text" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} required />
          {err && <Notice kind="error">{err}</Notice>}
          <button className="btn" disabled={busy || code.trim().length < 4}>{busy ? "Checking" : "Confirm phone"}</button>
          <button type="button" className="link" onClick={send} disabled={busy}>Send a new code</button>
        </form>
      )}
    </main>
  );
}
