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
  billId: string; facilityId: string; save: boolean; other: boolean; makeDefault: boolean;
};
const blank: Form = { amount: "", purpose: "", evidence: {}, payeeName: "", payeePhone: "", same: true, vName: "", vPhone: "", cName: "", cPhone: "", vLang: "en", billId: "", facilityId: "", save: true, other: false, makeDefault: false };

export default function Apply({ lineKey }: { lineKey: string }) {
  const { user } = useSession();
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(blank);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  const [prof, setProf] = useState<Profile | null>(null);
  const [pending, setPending] = useState<Pending[]>([]); const [facs, setFacs] = useState<Facility[]>([]);
  useEffect(() => { if (user) api.catalogue().then(setCat).catch((e) => setErr(e.message)); }, [user?._id]);
  useEffect(() => {
    if (!user) return;
    api.profile().then(setProf).catch(() => setProf({ lines: {}, updatedAt: null }));
    if (lineKey === "health") { api.pending().then((r) => setPending(r.items)).catch(() => {}); api.facilities().then(setFacs).catch(() => {}); }
  }, [user?._id]);
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
  const saved = prof?.lines[line.key];
  const hasSaved = !!saved && (Object.keys(saved.evidence).length > 0 || !!saved.payee);
  const useSaved = hasSaved && !f.other && !fromBill;       // the person chooses, per request, between what is on file and something different
  const ev: Record<string, string> = useSaved ? { ...saved!.evidence, ...f.evidence } : f.evidence;
  const askFields = line.fields.filter((fl) => !(useSaved && saved!.evidence[fl.key]));
  const savedPayee = useSaved ? saved!.payee : undefined;
  const steps = fromBill ? ["Amount", "Review"] : ["Amount", ...(askFields.length ? ["Details"] : []), ...(fromFacility || savedPayee ? [] : ["People"]), "Review"];
  function pickMode(mode: "saved" | "other") { setF((p) => ({ ...p, billId: "", facilityId: "", other: mode === "other", amount: p.billId ? "" : p.amount, purpose: p.billId ? "" : p.purpose, evidence: {} })); }
  const onFile = hasSaved ? line.fields.filter((fl) => saved!.evidence[fl.key]).map((fl) => `${fl.label.replace(" (optional)", "")}: ${saved!.evidence[fl.key]}`).concat(saved!.payee ? [`${line.payeeLabel}: ${saved!.payee.name}`] : []).join(" · ") : "";
  function pickBill(b: Pending | null) {
    if (!b) return pickMode(hasSaved ? "saved" : "other");
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
    if (cur === "Details") for (const fl of askFields) if (fl.required && !String(ev[fl.key] || "").trim()) return `${fl.label} is needed.`;
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
    const payee = fromBill || fromFacility ? undefined : savedPayee ? { name: savedPayee.name, phone: savedPayee.phone } : { name: f.payeeName.trim(), phone: toE164(f.payeePhone) };
    const verifier = !payee ? undefined : savedPayee ? (saved!.verifier || payee) : f.same ? payee : { name: f.vName.trim(), phone: toE164(f.vPhone) };
    try {
      const loan = await api.apply({
        line: line!.key, amount: Number(f.amount), purpose: f.purpose.trim(), ...(payee ? { payee, verifier } : {}), ...(fromBill ? { billId: f.billId } : fromFacility ? { facilityId: f.facilityId } : {}), verifierLang: f.vLang, lang: user!.language || "en",
        evidence: Object.fromEntries(Object.entries(ev).filter(([, v]) => String(v).trim() !== "")),
        ...(line!.coVerifierLabel && f.cPhone.trim() ? { coVerifier: { name: f.cName.trim(), phone: toE164(f.cPhone) } } : {}),
      });
      if (!fromBill && ((!hasSaved && f.save) || (hasSaved && f.other && f.makeDefault))) {
        const evidence = Object.fromEntries(Object.entries(ev).filter(([k, v]) => STABLE.includes(k) && String(v).trim() !== ""));
        const keep = payee || saved?.payee;
        void api.saveProfile({ [line!.key]: { evidence, ...(keep ? { payee: keep, verifier: verifier || keep } : {}) } }).catch(() => {});
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
          {(pending.length > 0 || hasSaved) && <div className="pick" role="radiogroup" aria-label="Which details should we use?">
            {pending.length > 0 && <p className="hint"><b>Waiting for you at your hospital or clinic.</b> Choose one and we fill in the rest. Nothing to type.</p>}
            {pending.map((b) => <label key={b.billId}><input type="radio" name="src" checked={f.billId === b.billId} onChange={() => pickBill(b)} /><span><b>{b.facility.name}: {ghs(b.billTotal)}</b><small>{b.note}{b.insureCreditNo ? ` · InsureCredit ${b.insureCreditNo}` : ""}</small></span></label>)}
            {hasSaved && <label><input type="radio" name="src" checked={!f.billId && !f.other} onChange={() => pickMode("saved")} /><span><b>Use the details on file</b><small>{onFile}</small></span></label>}
            <label><input type="radio" name="src" checked={!f.billId && (f.other || !hasSaved)} onChange={() => pickMode("other")} /><span><b>{hasSaved ? "Different details for this request" : "Something else"}</b><small>{hasSaved ? "Your profile stays as it is" : "Enter the details yourself"}</small></span></label>
          </div>}
          <Field label="How much do you need? (GHS)" type="number" inputMode="decimal" min={line.min} max={line.cap} value={f.amount} onChange={(e) => set("amount", e.target.value)} hint={`Between ${ghs(line.min)} and ${ghs(line.cap)}.`} required />
          <Field label="What is it for?" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} maxLength={200} placeholder="A few words" required />
        </>}
        {cur === "Details" && line.key === "health" && facs.length > 0 && <div className="field"><label htmlFor="fac">Hospital, clinic or pharmacy on the Biller</label>
          <select id="fac" value={f.facilityId} onChange={(e) => pickFacility(e.target.value)}><option value="">Not listed: I will type it</option>{facs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          {fromFacility && <p className="hint">We text {fac!.name} to confirm. You do not need their number.</p>}</div>}
        {cur === "Details" && askFields.filter((fl) => !(fromFacility && fl.key === "facility")).map((fl) => (
          <Field key={fl.key} label={fl.label} type={fl.type} inputMode={fl.type === "number" ? "decimal" : undefined} value={ev[fl.key] || ""} onChange={(e) => setEv(fl.key, e.target.value)} required={!!fl.required} />
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
          {line.fields.filter((fl) => ev[fl.key]).map((fl) => <div key={fl.key}><dt>{fl.label}</dt><dd>{ev[fl.key]}</dd></div>)}
          {fromBill || fromFacility ? <><dt>{line.payeeLabel}</dt><dd>{fac ? fac.name : ev.facility}</dd></> : savedPayee ? <><dt>{line.payeeLabel}</dt><dd>{savedPayee.name} (on file)</dd></> : <><dt>{line.payeeLabel}</dt><dd>{f.payeeName}, {f.payeePhone}</dd></>}
          {fromBill ? <><dt>Confirmed by</dt><dd>The bill your facility already filed. No text needed.</dd></> : fromFacility ? <><dt>Confirms by phone</dt><dd>{fac!.name}</dd></> : savedPayee ? <><dt>Confirms by phone</dt><dd>{savedPayee.name} (on file)</dd></> : <><dt>Confirms by phone</dt><dd>{f.same ? `${f.payeeName} (same person)` : `${f.vName}, ${f.vPhone}`}{line.coVerifierLabel && f.cPhone.trim() ? `, and ${f.cName || "co-tenant"} ${f.cPhone}` : ""}</dd></>}
        </dl>}
        {cur === "Review" && <Notice>{fromBill ? "Your facility's bill already confirms this. Next you agree and we send it to the lender." : "We text them now. Nothing goes to the lender until they confirm and you agree."}</Notice>}
        {cur === "Review" && !fromBill && !hasSaved && <label className="check"><input type="checkbox" checked={f.save} onChange={(e) => set("save", e.target.checked)} /> Save these details to my profile for next time</label>}
        {cur === "Review" && !fromBill && hasSaved && f.other && <label className="check"><input type="checkbox" checked={f.makeDefault} onChange={(e) => set("makeDefault", e.target.checked)} /> Make these my new details on file (otherwise this request only)</label>}
        {err && <Notice kind="error">{err}</Notice>}
        <button className="btn" disabled={busy}>{cur === "Review" ? (busy ? "Sending" : fromBill ? "Continue" : "Send for confirmation") : "Continue"}</button>
      </form>
    </main>
  );
}
