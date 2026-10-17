import { useEffect, useState } from "react";
import { api, type Catalogue, type Line } from "../api";
import { ghs } from "../format";
import { useSession } from "../session";
import { Icon, Logo, Notice, Spinner, lineColor } from "../ui";

function Row({ l }: { l: Line }) {
  const live = l.enabled;
  const body = (
    <>
      <span className="spine" style={{ background: lineColor(l.key) }} />
      <span className="ico" style={{ color: lineColor(l.key) }}><Icon name={l.icon} /></span>
      <span className="txt"><b>{l.short}</b><small>{l.trust}</small></span>
      <span className="cap">{live ? <>up to<br /><b>{ghs(l.cap)}</b></> : <em>Opening soon</em>}</span>
    </>
  );
  return live ? <a className="lrow" href={`#/apply/${l.key}`}>{body}</a> : <div className="lrow off" aria-disabled="true">{body}</div>;
}

export default function Home() {
  const { user } = useSession();
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { let on = true; api.catalogue().then((c) => on && setCat(c)).catch((e) => on && setErr(e.message)); return () => { on = false; }; }, [user?._id]);
  return (
    <>
      <header className="hero">
        <Logo light />
        <h1>What is the emergency?</h1>
        <p>Pick what it is for. The person who knows about it confirms by phone, and the money goes straight to them. Never to you.</p>
        {!user && <a className="ghost" href="#/signin">Sign in or create an account</a>}
        {user && cat?.passport && <p className="limit">Your limit now: <b>{ghs(cat.passport.ceiling)}</b></p>}
      </header>
      <main className="page">
        {err && <Notice kind="error">{err}</Notice>}
        {!cat && !err && <Spinner />}
        {cat && !cat.enabled && <Notice>ER HEAT is not open yet. You can look around, and we will tell you here when requests open.</Notice>}
        {cat && <div className="lines" role="list">{cat.lines.map((l) => <div role="listitem" key={l.key}><Row l={l} /></div>)}</div>}
        <section className="how" aria-labelledby="how-h">
          <h2 id="how-h">How a request works</h2>
          <p>You tell us the amount and who it is for. We text that person to confirm. When everyone has confirmed, you agree and we send your request to the lender. If it is approved, the lender pays them directly.</p>
          <p>Every repayment builds your Trust Passport, and your limit goes up.</p>
        </section>
      </main>
    </>
  );
}
