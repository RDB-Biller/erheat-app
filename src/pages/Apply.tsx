import { useEffect, useState, type FormEvent } from "react";
import { api, type Catalogue, type Line } from "../api";
import { LANGS, ghs, toE164 } from "../format";
import { go } from "../router";
import { useSession } from "../session";
import { Field, Icon, Notice, Spinner, lineColor, Redirect } from "../ui";

type Form = {
  amount: string; purpose: string; evidence: Record<string, string>;
  payeeName: string; payeePhone: string; same: boolean; vName: string; vPhone: string; cName: string; cPhone: string; vLang: string;
};
const blank: Form = { amount: "", purpose: "", evidence: {}, payeeName: "", payeePhone: "", same: true, vName: "", vPhone: "", cName: "", cPhone: "", vLang: "en" };

export default function Apply({ lineKey }: { lineKey: string }) {
  const { user } = useSession();
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(blank);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) api.catalogue().then(setCat).catch((e) => setErr(e.message)); }, [user?._id]);
  if (!user) return <Redirect to={`/signin?next=${encodeURIComponent("/apply/" + lineKey)}`} />;
  if (cat && (!user.phone || (cat.requireVerifiedPhone && !user.phoneVerified))) return <Redirect to={`/verify?need=phone&next=${encodeURIComponent("/apply/" + lineKey)}`} />;
  if (!cat) return <main className="page">{err ? <Notice kind="error">{err}</Notice> : <Spinner />}</main>;
  const line = cat.lines.find((l) => l.key === lineKey);
  if (!line) return <main className="page"><Notice kind="error">That loan type does not exist.</Notice><a href="#/">Back to loans</a></main>;
  if (!line.enabled) return <main className="page"><Notice>{line.label} loans are opening soon.</Notice><a href="#/">Back to loans</a></main>;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const setEv = (k: string, v: string) => setF((p) => ({ ...p, evidence: { ...p.evidence, [k]: v } }));
  const steps = ["Amount", ...(line.fields.length ? ["Details"] : []), "People", "Review"];
  const cur = steps[step];

  function problem(): string {
    if (cur === "Amount") {
      const a = Number(f.amount);
      if (!(a >= line!.min)) return `The smallest amount is ${ghs(line!.min)}.`;
      if (a > line!.cap) return `Your limit for ${line!.label} is ${ghs(line!.cap)}.${cat!.passport?.level === "new" ? " It rises as you repay." : ""}`;
      if (!f.purpose.trim()) return "Say in a few words what the money is for.";
    }
    if (cur === "Details") for (const fl of line!.fields) if (fl.required && !String(f.evidence[fl.key] || "").trim()) return `${fl.label} is needed.`;
    if (cur === "People") {
      if (!f.payeeName.trim() || !f.payeePhone.trim()) return `Enter the name and phone number of the ${line!.payeeLabel.toLowerCase()}.`;
      if (!f.same && (!f.vName.trim() || !f.vPhone.trim())) return `Enter the name and phone number of the ${line!.verifierLabel.toLowerCase()}.`;
    }
    return "";
  }
  function advance(e: FormEvent) {
    e.preventDefault(); const p = problem(); setErr(p); if (!p) setStep(step + 1);
  }
  async function send() {
    setBusy(true); setErr("");
    const payee = { name: f.payeeName.trim(), phone: toE164(f.payeePhone) };
    const verifier = f.same ? payee : { name: f.vName.trim(), phone: toE164(f.vPhone) };
    try {
      const loan = await api.apply({
        line: line!.key, amount: Number(f.amount), purpose: f.purpose.trim(), payee, verifier, verifierLang: f.vLang, lang: user!.language || "en",
        evidence: Object.fromEntries(Object.entries(f.evidence).filter(([, v]) => String(v).trim() !== "")),
        ...(line!.coVerifierLabel && f.cPhone.trim() ? { coVerifier: { name: f.cName.trim(), phone: toE164(f.cPhone) } } : {}),
      });
      go(`/requests/${loan.id}`);
    } catch (x: any) { setErr(x.message); setBusy(false); }
  }

  return (
    <main className="page narrow" style={{ ["--line" as any]: lineColor(line.key) }}>
      <button className="back" onClick={() => (step ? setStep(step - 1) : go("/"))}><Icon name="back" size={20} /> {step ? "Back" : "All loans"}</button>
      <div className="linehead"><span className="ico" style={{ color: lineColor(line.key) }}><Icon name={line.icon} /></span><div><h1 className="h1">{line.label}</h1><p className="trust">{line.trust}</p></div></div>
      <p className="stepper" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((s, i) => <span key={s} className={i === step ? "on" : i < step ? "past" : ""}>{s}</span>)}</p>

      <form onSubmit={cur === "Review" ? (e) => { e.preventDefault(); void send(); } : advance} noValidate>
        {cur === "Amount" && <>
          <Field label="How much do you need? (GHS)" type="number" inputMode="decimal" min={line.min} max={line.cap} value={f.amount} onChange={(e) => set("amount", e.target.value)} hint={`Between ${ghs(line.min)} and ${ghs(line.cap)}.`} required />
          <Field label="What is it for?" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} maxLength={200} placeholder="A few words" required />
        </>}
        {cur === "Details" && line.fields.map((fl) => (
          <Field key={fl.key} label={fl.label} type={fl.type} inputMode={fl.type === "number" ? "decimal" : undefined} value={f.evidence[fl.key] || ""} onChange={(e) => setEv(fl.key, e.target.value)} required={!!fl.required} />
        ))}
        {cur === "People" && <>
          <fieldset><legend>{line.payeeLabel}</legend>
            <p className="hint">{line.voucher ? "You get a voucher for this seller. They redeem it, you never hold cash." : "If approved, the lender pays this person or place directly."}</p>
            <Field label="Name" value={f.payeeName} onChange={(e) => set("payeeName", e.target.value)} required />
            <Field label="Mobile number" value={f.payeePhone} onChange={(e) => set("payeePhone", e.target.value)} inputMode="tel" placeholder="024 123 4567" required />
          </fieldset>
          <label className="check"><input type="checkbox" checked={f.same} onChange={(e) => set("same", e.target.checked)} /> The same person confirms this request ({line.verifierLabel.toLowerCase()})</label>
          {!f.same && <fieldset><legend>{line.verifierLabel}</legend>
            <Field label="Name" value={f.vName} onChange={(e) => set("vName", e.target.value)} required />
            <Field label="Mobile number" value={f.vPhone} onChange={(e) => set("vPhone", e.target.value)} inputMode="tel" required />
          </fieldset>}
          {line.coVerifierLabel && <fieldset><legend>{line.coVerifierLabel}</legend>
            <p className="hint">A second person who can confirm makes your request stronger.</p>
            <Field label="Name" value={f.cName} onChange={(e) => set("cName", e.target.value)} />
            <Field label="Mobile number" value={f.cPhone} onChange={(e) => set("cPhone", e.target.value)} inputMode="tel" />
          </fieldset>}
          <div className="field"><label htmlFor="vl">Language for the text we send them</label><select id="vl" value={f.vLang} onChange={(e) => set("vLang", e.target.value)}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></div>
        </>}
        {cur === "Review" && <dl className="review">
          <dt>Loan</dt><dd>{line.label}: {ghs(Number(f.amount))}</dd>
          <dt>For</dt><dd>{f.purpose}</dd>
          {line.fields.filter((fl) => f.evidence[fl.key]).map((fl) => <div key={fl.key}><dt>{fl.label}</dt><dd>{f.evidence[fl.key]}</dd></div>)}
          <dt>{line.payeeLabel}</dt><dd>{f.payeeName}, {f.payeePhone}</dd>
          <dt>Confirms by phone</dt><dd>{f.same ? `${f.payeeName} (same person)` : `${f.vName}, ${f.vPhone}`}{line.coVerifierLabel && f.cPhone.trim() ? `, and ${f.cName || "co-tenant"} ${f.cPhone}` : ""}</dd>
        </dl>}
        {cur === "Review" && <Notice>We text them now. Nothing goes to the lender until they confirm and you agree.</Notice>}
        {err && <Notice kind="error">{err}</Notice>}
        <button className="btn" disabled={busy}>{cur === "Review" ? (busy ? "Sending" : "Send for confirmation") : "Continue"}</button>
      </form>
    </main>
  );
}
