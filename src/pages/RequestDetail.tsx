import { useCallback, useEffect, useState } from "react";
import { api, type Catalogue, type Loan } from "../api";
import { daysLeft, ENDED, ghs, when } from "../format";
import { go } from "../router";
import { useSession } from "../session";
import { HeatStrip, Notice, Spinner, lineColor, Redirect } from "../ui";
import { statusLabel } from "./Requests";

const DONE = ["closed", ...ENDED];

export default function RequestDetail({ id }: { id: string }) {
  const { user } = useSession();
  const [loan, setLoan] = useState<Loan | null>(null); const [cat, setCat] = useState<Catalogue | null>(null);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [agree, setAgree] = useState(false);

  const load = useCallback(() => api.loan(id).then(setLoan).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { if (!user) return; void load(); api.catalogue().then(setCat).catch(() => {}); }, [user?._id, load]);
  useEffect(() => { if (!loan || DONE.includes(loan.status)) return; const t = setInterval(load, 20000); return () => clearInterval(t); }, [loan?.status, load]);
  if (!user) return <Redirect to={`/signin?next=${encodeURIComponent("/requests/" + id)}`} />;
  if (!loan) return <main className="page"><a className="back" href="#/requests">Your requests</a>{err ? <Notice kind="error">{err}</Notice> : <Spinner />}</main>;

  async function act(fn: () => Promise<Loan>, ok: string) { setBusy(true); setErr(""); setMsg(""); try { setLoan(await fn()); setMsg(ok); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } }
  const pending = loan.verifiers.filter((v) => v.status === "pending");
  const repaid = loan.repayments.reduce((s, r) => s + r.amount, 0);
  const ended = ENDED.includes(loan.status);

  return (
    <main className="page" style={{ ["--line" as any]: lineColor(loan.line) }}>
      <a className="back" href="#/requests">Your requests</a>
      <div className="reqhead"><span className="spine" /><div><h1 className="h1">{loan.lineLabel}: {ghs(loan.approvedAmount || loan.amount)}</h1><p className="meta">{loan.appNo} · started {when(loan.createdAt)}</p></div></div>
      <p className={`status ${ended ? "bad" : ""}`}><span className="sr">{statusLabel(loan.status)}. </span>{loan.nextStep}</p>
      {loan.verifiedAmount && loan.verifiedAmount < loan.amount && <Notice>The person who confirmed gave a lower amount: {ghs(loan.verifiedAmount)}.</Notice>}
      {err && <Notice kind="error">{err}</Notice>}{msg && <Notice kind="ok">{msg}</Notice>}

      <HeatStrip status={loan.status} verifierLabels={pending.map((v) => v.label.toLowerCase())} />

      {loan.voucher && <section className="voucher" aria-label="Your voucher">
        <p>Your voucher code</p><b>{loan.voucher.code}</b>
        <small>{loan.voucher.note} Valid until {when(loan.voucher.expiresAt)}.</small>
      </section>}

      {loan.status === "verified" && cat && <section className="consent">
        <h2>Agree and send</h2>
        <p>{cat.consentText}</p>
        <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree</label>
        <button className="btn" disabled={!agree || busy} onClick={() => act(() => api.consent(loan.id, true), "Sent to the lender.")}>{busy ? "Sending" : "Send to the lender"}</button>
      </section>}

      <section aria-labelledby="who"><h2 id="who">People on this request</h2>
        <ul className="people">
          <li><b>{loan.payee.name}</b><small>Gets paid · {loan.payee.phone}</small></li>
          {loan.verifiers.map((v) => (
            <li key={v.id}><b>{v.name || v.label}</b><small>{v.label} · {v.phone}</small>
              <span className={`pill ${v.status}`}>{v.status === "pending" ? "Waiting" : v.status === "confirmed" ? "Confirmed" : "Declined"}</span>
              {v.status === "pending" && loan.status === "needs_verification" && <button className="link" disabled={busy} onClick={() => act(() => api.resend(loan.id, v.id), `Text sent again to ${v.name || v.label}.`)}>Send the text again</button>}
            </li>))}
        </ul>
        {loan.status === "needs_verification" && <p className="hint">This request expires in {daysLeft(loan.expiresAt)} days if nobody confirms.</p>}
      </section>

      {loan.repayments.length > 0 && <section><h2>Repayments</h2><p>Repaid so far: <b>{ghs(repaid)}</b></p><ul className="plain">{loan.repayments.map((r, i) => <li key={i}>{when(r.at)}: {ghs(r.amount)}</li>)}</ul></section>}

      {["needs_verification", "verified"].includes(loan.status) && <button className="link danger" disabled={busy} onClick={() => { if (confirm("Cancel this request?")) void act(() => api.cancel(loan.id), "Request cancelled."); }}>Cancel this request</button>}
    </main>
  );
}
