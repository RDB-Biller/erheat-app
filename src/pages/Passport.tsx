import { useEffect, useState } from "react";
import { api, type Passport as P } from "../api";
import { ghs } from "../format";
import { go } from "../router";
import { useSession } from "../session";
import { Notice, Spinner, Redirect } from "../ui";

const LEVELS: { key: P["level"]; name: string }[] = [{ key: "new", name: "New" }, { key: "trusted", name: "Trusted" }, { key: "preferred", name: "Preferred" }];

export default function Passport() {
  const { user } = useSession();
  const [p, setP] = useState<P | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (user) api.passport().then(setP).catch((e) => setErr(e.message)); }, [user?._id]);
  if (!user) return <Redirect to={"/signin?next=%2Fpassport"} />;
  const at = p ? LEVELS.findIndex((l) => l.key === p.level) : 0;
  return (
    <main className="page">
      <h1 className="h1">Trust Passport</h1>
      <p className="lede">Every request that is confirmed and every loan you repay raises your limit. It goes with your phone number.</p>
      {err && <Notice kind="error">{err}</Notice>}{!p && !err && <Spinner />}
      {p && <>
        <div className="gauge" role="img" aria-label={`Level ${LEVELS[at].name}`}>
          <div className="mercury" style={{ height: `${((at + 1) / LEVELS.length) * 100}%` }} />
          <ol>{[...LEVELS].reverse().map((l, i) => { const idx = LEVELS.length - 1 - i; return <li key={l.key} className={idx === at ? "here" : idx < at ? "past" : ""}><b>{l.name}</b>{idx === at && <small>You are here. Limit {ghs(p.ceiling)}</small>}</li>; })}</ol>
        </div>
        <p className="status">{p.next}</p>
        <dl className="stats"><div><dt>Requests confirmed</dt><dd>{p.verifiedRequests}</dd></div><div><dt>Loans repaid</dt><dd>{p.repaid}</dd></div><div><dt>Open now</dt><dd>{p.open}</dd></div></dl>
        {p.defaults > 0 && <Notice kind="error">You have an overdue loan. Repaying it is the way back up.</Notice>}
      </>}
    </main>
  );
}
