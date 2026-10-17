import { useEffect, useState } from "react";
import { api, type History, type Loan } from "../api";
import { ghs, when } from "../format";
import { useSession } from "../session";
import { Notice, Spinner, lineColor, Redirect } from "../ui";

const LABEL: Record<string, string> = { needs_verification: "Waiting for confirmation", verified: "Ready to send", submitted: "With the lender", approved: "Approved", payee_paid: "Payee paid", repaying: "Repaying", closed: "Repaid", declined: "Not approved", cancelled: "Cancelled", expired: "Expired", defaulted: "Overdue" };
export const statusLabel = (s: string) => LABEL[s] || s;

function Item({ l, sub }: { l: Loan; sub?: string }) {
  return (
    <li><a href={`#/requests/${l.id}`} style={{ ["--line" as any]: lineColor(l.line) }}>
      <span className="spine" /><span className="txt"><b>{l.lineLabel}</b><small>{l.appNo} · {when(l.createdAt)}</small></span>
      <span className="rt"><b>{ghs(l.approvedAmount || l.amount)}</b><small>{sub || statusLabel(l.status)}</small></span>
    </a></li>
  );
}

export default function Requests() {
  const { user } = useSession();
  const [tab, setTab] = useState<"open" | "history">("open");
  const [loans, setLoans] = useState<Loan[] | null>(null); const [hist, setHist] = useState<History | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (user) { api.loans().then(setLoans).catch((e) => setErr(e.message)); api.history().then(setHist).catch((e) => setErr(e.message)); } }, [user?._id]);
  if (!user) return <Redirect to={"/signin?next=%2Frequests"} />;
  const awarded = new Set((hist?.items || []).map((h) => h.id));
  const open = (loans || []).filter((l) => !awarded.has(l.id));
  return (
    <main className="page">
      <h1 className="h1">Your requests</h1>
      <div className="seg" role="tablist" aria-label="Requests">
        <button role="tab" aria-selected={tab === "open"} className={tab === "open" ? "on" : ""} onClick={() => setTab("open")}>Open and recent</button>
        <button role="tab" aria-selected={tab === "history"} className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>History{hist && hist.totals.count ? ` (${hist.totals.count})` : ""}</button>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {!loans && !err && <Spinner />}
      {tab === "open" && loans && open.length === 0 && <div className="empty"><p>No open requests.</p><a className="btn" href="#/">Ask for a loan</a></div>}
      {tab === "open" && open.length > 0 && <ul className="reqs">{open.map((l) => <Item key={l.id} l={l} />)}</ul>}
      {tab === "history" && hist && (hist.items.length === 0
        ? <div className="empty"><p>Loans you have been awarded will be listed here.</p></div>
        : <>
          <dl className="totals"><div><dt>Borrowed</dt><dd>{ghs(hist.totals.borrowed)}</dd></div><div><dt>Repaid</dt><dd>{ghs(hist.totals.repaid)}</dd></div><div><dt>Fully repaid</dt><dd>{hist.totals.closed} of {hist.totals.count}</dd></div></dl>
          <ul className="reqs">{hist.items.map((l) => <Item key={l.id} l={l} sub={l.status === "closed" ? `Fully repaid` : `${statusLabel(l.status)} · repaid ${ghs(l.repaid)}`} />)}</ul>
        </>)}
    </main>
  );
}
