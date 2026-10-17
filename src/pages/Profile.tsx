import { useEffect, useState, type FormEvent } from "react";
import { api, type Catalogue, type Profile as P, type ProfileLine } from "../api";
import { toE164 } from "../format";
import { useSession } from "../session";
import { Field, Icon, Notice, Spinner, lineColor, Redirect } from "../ui";

// Details that stay the same from one emergency to the next. Amounts, dates and "what is it for" are asked at the time.
export const STABLE = ["address", "monthlyRent", "facility", "insureCreditNo", "school", "student", "reference", "kind", "route"];

export default function Profile() {
  const { user } = useSession();
  const [cat, setCat] = useState<Catalogue | null>(null); const [prof, setProf] = useState<P | null>(null);
  const [ev, setEv] = useState<Record<string, Record<string, string>>>({}); const [pay, setPay] = useState<Record<string, { name: string; phone: string }>>({});
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    Promise.all([api.catalogue(), api.profile()]).then(([c, p]) => {
      setCat(c); setProf(p);
      setEv(Object.fromEntries(Object.entries(p.lines).map(([k, v]) => [k, v.evidence || {}])));
      setPay(Object.fromEntries(Object.entries(p.lines).filter(([, v]) => v.payee).map(([k, v]) => [k, v.payee!])));
    }).catch((e) => setErr(e.message));
  }, [user?._id]);
  if (!user) return <Redirect to={"/signin?next=%2Fprofile"} />;
  if (!cat || !prof) return <main className="page">{err ? <Notice kind="error">{err}</Notice> : <Spinner />}</main>;
  const lines = cat.lines.filter((l) => l.enabled);

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(""); setMsg("");
    const out: Record<string, ProfileLine | null> = {};
    for (const l of lines) {
      const evidence = Object.fromEntries(Object.entries(ev[l.key] || {}).filter(([k, v]) => STABLE.includes(k) && String(v).trim() !== ""));
      const p = pay[l.key]; const person = p && (p.name.trim() || p.phone.trim()) ? { name: p.name.trim(), phone: toE164(p.phone) } : undefined;
      out[l.key] = Object.keys(evidence).length || person ? { evidence, ...(person ? { payee: person, verifier: person } : {}) } : null;
    }
    try { const saved = await api.saveProfile(out); setProf(saved); setMsg("Saved. Your details will be filled in for you next time."); } catch (x: any) { setErr(x.message); }
    setBusy(false);
  }

  return (
    <main className="page narrow">
      <h1 className="h1">Your profile</h1>
      <p className="lede">Optional. Add what you already know now, such as your meter number or your landlord, so an emergency takes a minute instead of ten. You can skip any of it, and change it any time.</p>
      <form onSubmit={save}>
        {lines.map((l) => {
          const fs = l.fields.filter((f) => STABLE.includes(f.key));
          return (
            <fieldset key={l.key} style={{ ["--line" as any]: lineColor(l.key) }}>
              <legend><span style={{ color: lineColor(l.key) }}><Icon name={l.icon} size={18} /></span> {l.short}</legend>
              {fs.map((f) => <Field key={f.key} label={f.label.replace(" (optional)", "")} type={f.type === "number" ? "number" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} value={(ev[l.key] || {})[f.key] || ""} onChange={(e) => setEv((p) => ({ ...p, [l.key]: { ...(p[l.key] || {}), [f.key]: e.target.value } }))} />)}
              {l.key !== "health" && <>
                <Field label={`${l.payeeLabel}: name`} value={(pay[l.key] || { name: "" }).name} onChange={(e) => setPay((p) => ({ ...p, [l.key]: { name: e.target.value, phone: (p[l.key] || { phone: "" }).phone } }))} />
                <Field label={`${l.payeeLabel}: mobile number`} inputMode="tel" value={(pay[l.key] || { phone: "" }).phone} onChange={(e) => setPay((p) => ({ ...p, [l.key]: { name: (p[l.key] || { name: "" }).name, phone: e.target.value } }))} />
              </>}
              {l.key === "health" && <p className="hint">Hospitals and clinics on the Biller are listed for you when you ask, and any bill waiting for you is filled in automatically.</p>}
            </fieldset>
          );
        })}
        {msg && <Notice kind="ok">{msg}</Notice>}{err && <Notice kind="error">{err}</Notice>}
        <button className="btn" disabled={busy}>{busy ? "Saving" : "Save profile"}</button>
      </form>
    </main>
  );
}
