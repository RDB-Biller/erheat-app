import { useEffect, useState, type FormEvent } from "react";
import { api, type Catalogue, type Facility, type Pending, type Profile } from "../api";
import { STABLE } from "./Profile";
import { LANGS, ghs, toE164 } from "../format";
import { go } from "../router";
import { useSession } from "../session";
import { Field, Icon, Notice, Spinner, lineColor, Redirect } from "../ui";

type Form = {
  amount: string; purpose: string; evidence: Record<string, string>;
  payeeName: string; payeePhone: string; same: boolean; vName: string; vPhone: string; cName: string; cPhone: string; vLang: string;
  billId: string; facilityId: string; save: boolean;
};
const blank: Form = { amount: "", purpose: "", evidence: {}, payeeName: "", payeePhone: "", same: true, vName: "", vPhone: "", cName: "", cPhone: "", vLang: "en", billId: "", facilityId: "", save: true };

export default function Apply({ lineKey }: { lineKey: string }) {
  const { user } = useSession();
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(blank);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  const [prof, setProf] = useState<Profile | null>(null);
  const [pending, setPending] = useState<Pending[]>([]); const [facs, setFacs] = useState<Facility[]>([]);
  const [filled, setFilled] = useState(false);
  useEffect(() => { if (user) api.catalogue().then(setCat).catch((e) => setErr(e.message)); }, [user?._id]);
  useEffect(() => {
    if (!user) return;
    api.profile().then(setProf).catch(() => setProf({ lines: {}, updatedAt: null }));
    if (lineKey === "health") { api.pending().then((r) => setPending(r.items)).catch(() => {}); api.facilities().then(setFacs).catch(() => {}); }
  }, [user?._id]);
  // Saved details fill the form once. Nothing here is required: the person can still change every field.
  useEffect(() => {
    if (!prof || filled) return; setFilled(true);
    const p = prof.lines[lineKey]; if (!p) return;
    setF((x) => ({ ...x, evidence: { ...p.evidence, ...x.evidence }, ...(p.payee ? { payeeName: p.payee.name, payeePhone: p.payee.phone, same: !p.verifier || p.verifier.phone === p.payee.phone } : {}), ...(p.verifier && p.payee && p.verifier.phone !== p.payee.phone ? { vName: p.verifier.name, vPhone: p.verifier.phone } : {}) }));
  }, [prof]);
  if (!user) return <Redirect to={`/signin?next=${encodeURIComponent("/apply/" + lineKey)}`} />;
  if (cat && (!user.phone || (cat.requireVerifiedPhone && !user.phoneVerified))) return <Redirect to={`/verify?need=phone&next=${encodeURIComponent("/apply/" + lineKey)}`} />;
  if (!cat) return <main className="page">{err ? <Notice kind="error">{err}</Notice> : <Spinner />}</main>;
  const line = cat.lines.find((l) => l.key === lineKey);
  if (!line) return <main className="page"><Notice kind="error">That loan type does not exist.</Notice><a href="#/">Back to loans</a></main>;
  if (!line.enabled) return <main className="page"><Notice>{line.label} loans are opening soon.</Notice><a href="#/">Back to loans</a></main>;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const setEv = (k: string, v: string) => setF((p) => ({ ...p, evidence: { ...p.evidence, [k]: v } }));
  const fac = facs.find((x) => x.id === f.facilityId);
  const fromBill = !!f.billId; const fromFacility = !!fac && fac.canConfirm;
  const steps = fromBill ? ["Amount", "Review"] : ["Amount", ...(line.fields.length ? ["Details"] : []), ...(fromFacility ? [] : ["People"]), "Review"];
  const fromProfile = !!prof && !!prof.lines[line.key];
  function pickBill(b: Pending | null) {
    if (!b) return setF((p) => ({ ...p, billId: "", amount: "", purpose: "", evidence: { ...(prof?.lines[line.key]?.evidence || {}) } }));
    setF((p) => ({ ...p, billId: b.billId, facilityId: b.facility.id, amount: String(Math.min(b.amount, line.cap)), purpose: b.note, evidence: { facility: b.facility.name, insureCreditNo: b.insureCreditNo, note: b.note } }));
  }
  function pickFacility(id: string) {
    const x = facs.find((y) => y.id === id);
    setF((p) => ({ ...p, facilityId: id, evidence: { ...p.evidence, facility: x ? x.name : p.evidence.facility || "" } }));
  }
  const cur = steps[step];

  function problem(): string {
    if (cur === "Amount") {
      if (fromBill) { const b = pending.find((x) => x.billId === f.billId); if (b && Number(f.amount) > b.billTotal) return `Your bill is ${ghs(b.billTotal)}. The loan cannot be more than that.`; }
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
    const payee = fromBill || fromFacility ? undefined : { name: f.payeeName.trim(), phone: toE164(f.payeePhone) };
    const verifier = !payee ? undefined : f.same ? payee : { name: f.vName.trim(), phone: toE164(f.vPhone) };
    try {
      const loan = await api.apply({
        line: line!.key, amount: Number(f.amount), purpose: f.purpose.trim(), ...(payee ? { payee, verifier } : {}), ...(fromBill ? { billId: f.billId } : fromFacility ? { facilityId: f.facilityId } : {}), verifierLang: f.vLang, lang: user!.language || "en",
        evidence: Object.fromEntries(Object.entries(f.evidence).filter(([, v]) => String(v).trim() !== "")),
        ...(line!.coVerifierLabel && f.cPhone.trim() ? { coVerifier: { name: f.cName.trim(), phone: toE164(f.cPhone) } } : {}),
      });
      if (f.save && !fromBill && (payee || Object.keys(f.evidence).length)) {
        const evidence = Object.fromEntries(Object.entries(f.evidence).filter(([k, v]) => STABLE.includes(k) && String(v).trim() !== ""));
        const keepPayee = payee && prof?.lines[line!.key]?.payee ? prof.lines[line!.key].payee : payee;
        void api.saveProfile({ [line!.key]: { evidence: { ...(prof?.lines[line!.key]?.evidence || {}), ...evidence }, ...(keepPayee ? { payee: keepPayee, verifier: verifier || keepPayee } : {}) } }).catch(() => {});
      }
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
          {line.key === "health" && pending.length > 0 && <div className="pick" role="radiogroup" aria-label="From your Biller records">
            <p className="hint"><b>Waiting for you at your hospital or clinic.</b> Choose one and we fill in the rest. Nothing to type.</p>
            {pending.map((b) => <label key={b.billId}><input type="radio" name="bill" checked={f.billId === b.billId} onChange={() => pickBill(b)} /><span><b>{b.facility.name}: {ghs(b.billTotal)}</b><small>{b.note}{b.insureCreditNo ? ` · InsureCredit ${b.insureCreditNo}` : ""}</small></span></label>)}
            <label><input type="radio" name="bill" checked={!f.billId} onChange={() => pickBill(null)} /><span><b>Something else</b><small>Enter the details yourself</small></span></label>
          </div>}
          {fromProfile && !fromBill && <p className="hint">Details you saved in your profile are filled in. You can change them.</p>}
          <Field label="How much do you need? (GHS)" type="number" inputMode="decimal" min={line.min} max={line.cap} value={f.amount} onChange={(e) => set("amount", e.target.value)} hint={`Between ${ghs(line.min)} and ${ghs(line.cap)}.`} required />
          <Field label="What is it for?" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} maxLength={200} placeholder="A few words" required />
        </>}
        {cur === "Details" && line.key === "health" && facs.length > 0 && <div className="field"><label htmlFor="fac">Hospital, clinic or pharmacy on the Biller</label>
          <select id="fac" value={f.facilityId} onChange={(e) => pickFacility(e.target.value)}><option value="">Not listed: I will type it</option>{facs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          {fromFacility && <p className="hint">We text {fac!.name} to confirm. You do not need their number.</p>}</div>}
        {cur === "Details" && line.fields.filter((fl) => !(fromFacility && fl.key === "facility")).map((fl) => (
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
          {fromBill || fromFacility ? <><dt>{line.payeeLabel}</dt><dd>{fac ? fac.name : f.evidence.facility}</dd></> : <><dt>{line.payeeLabel}</dt><dd>{f.payeeName}, {f.payeePhone}</dd></>}
          {fromBill ? <><dt>Confirmed by</dt><dd>The bill your facility already filed. No text needed.</dd></> : fromFacility ? <><dt>Confirms by phone</dt><dd>{fac!.name}</dd></> : <><dt>Confirms by phone</dt><dd>{f.same ? `${f.payeeName} (same person)` : `${f.vName}, ${f.vPhone}`}{line.coVerifierLabel && f.cPhone.trim() ? `, and ${f.cName || "co-tenant"} ${f.cPhone}` : ""}</dd></>}
        </dl>}
        {cur === "Review" && <Notice>{fromBill ? "Your facility's bill already confirms this. Next you agree and we send it to the lender." : "We text them now. Nothing goes to the lender until they confirm and you agree."}</Notice>}
        {cur === "Review" && !fromBill && <label className="check"><input type="checkbox" checked={f.save} onChange={(e) => set("save", e.target.checked)} /> Save these details to my profile for next time</label>}
        {err && <Notice kind="error">{err}</Notice>}
        <button className="btn" disabled={busy}>{cur === "Review" ? (busy ? "Sending" : fromBill ? "Continue" : "Send for confirmation") : "Continue"}</button>
      </form>
    </main>
  );
}
