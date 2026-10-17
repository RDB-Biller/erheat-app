import { useEffect, useState } from "react";

const parse = () => (window.location.hash.replace(/^#/, "") || "/").split("?")[0];
export function useRoute(): string {
  const [r, setR] = useState(parse());
  useEffect(() => { const f = () => { setR(parse()); window.scrollTo(0, 0); }; window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return r;
}
export const go = (path: string) => { window.location.hash = path; };
export const query = (): URLSearchParams => new URLSearchParams((window.location.hash.split("?")[1]) || "");
