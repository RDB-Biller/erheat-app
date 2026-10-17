import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onSessionExpired, setToken, type User } from "./api";

const KEY = "erheat.session.v1";
const read = (): { token: string; user: User } | null => { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const write = (v: unknown) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* private mode */ } };

type Ctx = { user: User | null; signIn: (u: User) => void; signOut: () => void; refresh: () => Promise<void> };
const S = createContext<Ctx>({ user: null, signIn: () => {}, signOut: () => {}, refresh: async () => {} });
export const useSession = () => useContext(S);

export function SessionProvider({ children }: { children: ReactNode }) {
  const saved = useMemo(read, []);
  if (saved) setToken(saved.token);
  const [user, setUser] = useState<User | null>(saved ? saved.user : null);

  const signIn = useCallback((u: User) => {
    const t = u.tokens && u.tokens[0] && u.tokens[0].token; if (!t) return;
    const { tokens, ...rest } = u; setToken(t); setUser(rest as User); write({ token: t, user: rest });
  }, []);
  const signOut = useCallback(() => { setToken(""); setUser(null); write(null); }, []);
  const refresh = useCallback(async () => {
    try {
      const { user: fresh } = await api.me(); setUser(fresh);
      const s = read(); if (s) write({ token: s.token, user: fresh });
    } catch { /* offline: keep the cached user */ }
  }, []);
  useEffect(() => { onSessionExpired(signOut); }, [signOut]);
  useEffect(() => { if (saved) void refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <S.Provider value={{ user, signIn, signOut, refresh }}>{children}</S.Provider>;
}
