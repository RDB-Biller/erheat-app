import { useState } from "react";
import { api, BILLER } from "../api";
import { LANGS } from "../format";
import { go } from "../router";
import { useSession } from "../session";
import { Notice, Redirect } from "../ui";
import { useCurrency } from "../currency";

export default function Me() {
  const { user, signOut, refresh } = useSession();
  const { list: cl, code: curCode, setDefault } = useCurrency();
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  if (!user) return <Redirect to={"/signin?next=%2Fme"} />;
  async function setLang(code: string) { setErr(""); setMsg(""); try { await api.updateLanguage(code); await refresh(); setMsg("Language saved."); } catch (x: any) { setErr(x.message); } }
  return (
    <main className="page">
      <h1 className="h1">{user.first_name} {user.last_name}</h1>
      <p className="lede">
        {user.phone ? <>{user.phone} · {user.phoneVerified ? "phone confirmed" : <a href="#/verify?need=phone&next=%2Fme">confirm your phone</a>}</> : <>No mobile number yet · <a href="#/verify?need=phone&next=%2Fme">add and confirm it</a> (needed before you borrow)</>}
        {user.email && <><br />{user.email} · {user.emailVerified ? "email confirmed" : <a href="#/verify?next=%2Fme">confirm your email</a>}</>}
      </p>
      {msg && <Notice kind="ok">{msg}</Notice>}{err && <Notice kind="error">{err}</Notice>}
      <div className="field"><label htmlFor="ml">Language for our texts to you</label><select id="ml" value={user.language || "en"} onChange={(e) => setLang(e.target.value)}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></div>
      {cl && <div className="field"><label htmlFor="mc">Currency I see first</label><select id="mc" value={user.currency || curCode} onChange={async (e) => { await setDefault(e.target.value); setMsg("Currency saved."); }}>
        <optgroup label="Main">{cl.main.map((c) => <option key={c.code} value={c.code}>{c.code}: {c.name}</option>)}</optgroup>
        <optgroup label="Other">{cl.other.map((c) => <option key={c.code} value={c.code}>{c.code}: {c.name}</option>)}</optgroup></select><p className="hint">Loans are paid out and repaid in GHS. Other currencies are shown beside the GHS amount, as an approximate guide.</p></div>}
      <div className="soft"><p><b>Complete your profile</b></p><p>Save your meter number, landlord or school once, so every request is filled in for you. Optional.</p><a className="btn ghostdark" href="#/profile">Complete or update your profile</a></div>
      <h2>For sellers and vendors</h2>
      <p>If a customer shows you an ER HEAT voucher, redeem it here before you hand over goods or services.</p>
      <a className="btn ghostdark" href={`${BILLER}/erheat/redeem`}>Redeem a voucher</a>
      <button className="link danger" onClick={() => { signOut(); go("/"); }}>Sign out</button>
    </main>
  );
}
