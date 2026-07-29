import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CURRENT_TERM_ID, TERMS, getTerm, type Term } from "@/lib/edumaster-data";

/**
 * Term locking policy.
 * A term is locked when it has been closed (either by the school calendar or
 * explicitly by an administrator). Locked terms are read-only: marks cannot be
 * edited and report cards are treated as published records.
 */
export type LockReason = "closed" | "manual" | null;

type TermContextValue = {
  termId: string;
  term: Term;
  setTermId: (id: string) => void;
  terms: Term[];
  /** True when the given (or active) term is read-only. */
  isLocked: (id?: string) => boolean;
  lockReason: (id?: string) => LockReason;
  lockTerm: (id: string) => void;
  unlockTerm: (id: string) => void;
};

const TermContext = createContext<TermContextValue | null>(null);

const STORAGE_KEY = "edumaster.termId";
const LOCK_STORAGE_KEY = "edumaster.termLocks";

type LockOverrides = Record<string, boolean>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — locking stays in-memory for this session */
  }
}

export function TermProvider({ children }: { children: ReactNode }) {
  const [termId, setTermIdState] = useState<string>(CURRENT_TERM_ID);
  const [overrides, setOverrides] = useState<LockOverrides>({});

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && TERMS.some((t) => t.id === saved)) setTermIdState(saved);
    setOverrides(readJson<LockOverrides>(LOCK_STORAGE_KEY, {}));
  }, []);

  const lockReason = useCallback(
    (id?: string): LockReason => {
      const target = id ?? termId;
      if (target in overrides) return overrides[target] ? "manual" : null;
      return getTerm(target).status === "Closed" ? "closed" : null;
    },
    [overrides, termId],
  );

  const setOverride = useCallback((id: string, locked: boolean) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: locked };
      writeJson(LOCK_STORAGE_KEY, next);
      return next;
    });
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
      isLocked: (id?: string) => lockReason(id) !== null,
      lockReason,
      lockTerm: (id: string) => setOverride(id, true),
      unlockTerm: (id: string) => setOverride(id, false),
    }),
    [termId, lockReason, setOverride],
  );

  return <TermContext.Provider value={value}>{children}</TermContext.Provider>;
}

export function useTerm() {
  const ctx = useContext(TermContext);
  if (!ctx) throw new Error("useTerm must be used within TermProvider");
  return ctx;
}
