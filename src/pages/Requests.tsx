import { useEffect, useState } from "react";
import { api, type Loan } from "../api";
import { ghs, when } from "../format";
import { go } from "../router";
import { useSession } from "../session";
import { Notice, Spinner, lineColor, Redirect } from "../ui";

const LABEL: Record<string, string> = { needs_verification: "Waiting for confirmation", verified: "Ready to send", submitted: "With the lender", approved: "Approved", payee_paid: "Payee paid", repaying: "Repaying", closed: "Repaid", declined: "Not approved", cancelled: "Cancelled", expired: "Expired", defaulted: "Overdue" };
export const statusLabel = (s: string) => LABEL[s] || s;

export default function Requests() {
  const { user } = useSession();
  const [loans, setLoans] = useState<Loan[] | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (user) api.loans().then(setLoans).catch((e) => setErr(e.message)); }, [user?._id]);
  if (!user) return <Redirect to={"/signin?next=%2Frequests"} />;
  return (
    <main className="page">
      <h1 className="h1">Your requests</h1>
      {err && <Notice kind="error">{err}</Notice>}
      {!loans && !err && <Spinner />}
      {loans && loans.length === 0 && <div className="empty"><p>No requests yet.</p><a className="btn" href="#/">Ask for a loan</a></div>}
      {loans && loans.length > 0 && <ul className="reqs">{loans.map((l) => (
        <li key={l.id}><a href={`#/requests/${l.id}`} style={{ ["--line" as any]: lineColor(l.line) }}>
          <span className="spine" /><span className="txt"><b>{l.lineLabel}</b><small>{l.appNo} · {when(l.createdAt)}</small></span>
          <span className="rt"><b>{ghs(l.approvedAmount || l.amount)}</b><small>{statusLabel(l.status)}</small></span>
        </a></li>))}</ul>}
    </main>
  );
}
