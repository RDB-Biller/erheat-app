import { useState } from "react";
import type { Currency } from "./api";
import { useCurrency } from "./currency";
import { useSession } from "./session";

/** Show amounts in: GHS | USD | Other. The first sign-in asks which of GHS and USD should be the default. */
export function CurrencyBar() {
  const { list, code, setCode } = useCurrency();
  const [open, setOpen] = useState(false); const [q, setQ] = useState("");
  if (!list) return null;
  const mainCodes = list.main.map((m) => m.code); const onOther = !mainCodes.includes(code);
  const t = q.trim().toLowerCase();
  const rows = list.other.filter((c) => !t || [c.code, c.name, c.region].some((v) => v.toLowerCase().includes(t)));
  const groups: { title: string; items: Currency[] }[] = [];
  for (const r of rows) { const title = r.region === "Nigeria" || r.region === "East Africa" ? (r.region === "Nigeria" ? "Nigeria and East Africa" : "Nigeria and East Africa") : r.region; const g = groups.find((x) => x.title === title); if (g) g.items.push(r); else groups.push({ title, items: [r] }); }
  return (
    <div className="curbar">
      <span className="curlabel" id="cur-l">Show amounts in</span>
      <div className="seg small" role="group" aria-labelledby="cur-l">
        {list.main.map((m) => <button key={m.code} className={code === m.code ? "on" : ""} aria-pressed={code === m.code} onClick={() => { setCode(m.code); setOpen(false); }}>{m.code}</button>)}
        <button className={onOther || open ? "on" : ""} aria-expanded={open} onClick={() => setOpen(!open)}>{onOther ? code : "Other"}</button>
      </div>
      {open && <div className="curpanel" role="dialog" aria-label="Other currencies">
        <input className="cursearch" placeholder="Search a currency or country" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search currencies" />
        <div className="curlist">{groups.map((g) => <div key={g.title}><h3>{g.title}</h3>{g.items.map((c) => <button key={c.code} className={code === c.code ? "on" : ""} onClick={() => { setCode(c.code); setOpen(false); setQ(""); }}><b>{c.code}</b> <span>{c.name}</span><small>{c.symbol}</small></button>)}</div>)}
          {!groups.length && <p className="hint">No currency matches.</p>}</div>
        <p className="hint">{list.note} {list.rates.indicative ? "Rates are indicative." : list.rates.asOf ? `Rates as of ${list.rates.asOf}.` : ""}</p>
      </div>}
    </div>
  );
}

/** Asked once, the first time someone signs in: which of the two main currencies should be their default. */
export function DefaultCurrencyPrompt() {
  const { user } = useSession(); const { list, setDefault } = useCurrency();
  const [pick, setPick] = useState(""); const [skipped, setSkipped] = useState(() => { try { return sessionStorage.getItem("erheat.cur.skip") === "1"; } catch { return false; } });
  if (!user || user.currency || !list || skipped) return null;
  const choice = pick || list.defaultCurrency;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dc-h"><div className="modal-card">
      <h2 id="dc-h">Which currency should we show first?</h2>
      <p>Tick one. You can switch any time, and other currencies are under <b>Other</b>. Loans are always paid out and repaid in GHS.</p>
      {list.main.map((m) => <label key={m.code} className="check big"><input type="checkbox" checked={choice === m.code} onChange={() => setPick(m.code)} /> <b>{m.code}</b> {m.name}</label>)}
      <button className="btn" onClick={async () => { await setDefault(choice); }}>Save my choice</button>
      <button className="link" onClick={() => { try { sessionStorage.setItem("erheat.cur.skip", "1"); } catch { /* */ } setSkipped(true); }}>Ask me later</button>
    </div></div>
  );
}
