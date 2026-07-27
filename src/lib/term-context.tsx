import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CURRENT_TERM_ID, TERMS, getTerm, type Term } from "@/lib/edumaster-data";

type TermContextValue = {
  termId: string;
  term: Term;
  setTermId: (id: string) => void;
  terms: Term[];
};

const TermContext = createContext<TermContextValue | null>(null);

const STORAGE_KEY = "edumaster.termId";

export function TermProvider({ children }: { children: ReactNode }) {
  const [termId, setTermIdState] = useState<string>(CURRENT_TERM_ID);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && TERMS.some((t) => t.id === saved)) setTermIdState(saved);
  }, []);

  const value = useMemo<TermContextValue>(
    () => ({
      termId,
      term: getTerm(termId),
      terms: TERMS,
      setTermId: (id: string) => {
        setTermIdState(id);
        try {
          window.localStorage.setItem(STORAGE_KEY, id);
        } catch {
          /* ignore */
        }
      },
    }),
    [termId],
  );

  return <TermContext.Provider value={value}>{children}</TermContext.Provider>;
}

export function useTerm() {
  const ctx = useContext(TermContext);
  if (!ctx) throw new Error("useTerm must be used within TermProvider");
  return ctx;
}
