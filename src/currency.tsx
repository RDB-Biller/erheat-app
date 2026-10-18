import { createContext, Fragment, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Currency, type CurrencyList } from "./api";
import { setCurView, type CurView } from "./format";
import { useSession } from "./session";

const KEY = "erheat.currency.v1";
const read = () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } };
const write = (c: string) => { try { localStorage.setItem(KEY, c); } catch { /* private mode */ } };

type Ctx = { list: CurrencyList | null; code: string; setCode: (c: string) => void; setDefault: (c: string) => Promise<void>; find: (c: string) => Currency | undefined };
const C = createContext<Ctx>({ list: null, code: "GHS", setCode: () => {}, setDefault: async () => {}, find: () => undefined });
export const useCurrency = () => useContext(C);

/** Which currency is on screen: what the person last picked here, else their saved default, else the platform default. */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, refresh } = useSession();
  const [list, setList] = useState<CurrencyList | null>(null);
  const [picked, setPicked] = useState(read());
  useEffect(() => { api.currencies().then(setList).catch(() => setList(null)); }, []);
  const find = (c: string) => (list ? [...list.main, ...list.other].find((x) => x.code === c) : undefined);
  const code = (picked && find(picked) ? picked : user?.currency && find(user.currency) ? user.currency : list?.defaultCurrency) || "GHS";
  const v = useMemo<CurView | null>(() => {
    if (!list || code === "GHS") return null; const cur = find(code); const per = list.rates.perUSD; if (!cur || !per.GHS || !per[code]) return null;
    return { code, symbol: cur.symbol, decimals: cur.decimals, rate: per[code] / per.GHS };
  }, [list, code]); // eslint-disable-line react-hooks/exhaustive-deps
  setCurView(v); // set before children render so every amount on screen uses it
  const setCode = (c: string) => { write(c); setPicked(c); };
  const setDefault = async (c: string) => { write(c); setPicked(c); if (user) { try { await api.updateCurrency(c); await refresh(); } catch { /* keep the local choice */ } } };
  // Remount the screens when the currency changes so every amount is redrawn.
  return <C.Provider value={{ list, code, setCode, setDefault, find }}><Fragment key={code}>{children}</Fragment></C.Provider>;
}
