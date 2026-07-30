import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_DEFAULTS } from "@/config/app.config";
import { listTerms, setTermLock } from "@/lib/api/school.functions";
import type { TermDTO } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

/**
 * Term locking policy.
 * A term is locked when an administrator has closed it. Locked terms are
 * read-only: the database rejects any mark change for that term, and the UI
 * mirrors that state. `closed` means the calendar has moved past the term.
 */
export type LockReason = "closed" | "manual" | null;

export interface TermContextValue {
  termId: string;
  term: TermDTO;
  terms: TermDTO[];
  setTermId: (id: string) => void;
  isLoading: boolean;
  isLocked: (id?: string) => boolean;
  lockReason: (id?: string) => LockReason;
  lockTerm: (id: string) => Promise<void>;
  unlockTerm: (id: string) => Promise<void>;
  /** True while a lock change is in flight. */
  isUpdatingLock: boolean;
}

const TermContext = createContext<TermContextValue | null>(null);

const STORAGE_KEY = "edumaster.termId";

const PLACEHOLDER_TERM: TermDTO = {
  id: "",
  uuid: "",
  label: "Loading term…",
  short: "—",
  year: new Date().getFullYear(),
  startsOn: "",
  endsOn: "",
  window: "",
  status: "Current",
  isLocked: false,
};

export const termsQueryKey = ["terms"] as const;

export function TermProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: terms = [], isLoading } = useQuery({
    queryKey: termsQueryKey,
    queryFn: () => listTerms(),
    enabled: Boolean(session),
    staleTime: QUERY_DEFAULTS.referenceStaleTimeMs,
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setSelectedId(saved);
    } catch {
      /* storage unavailable — selection stays in memory for this session */
    }
  }, []);

  const activeTerm = useMemo(() => {
    if (terms.length === 0) return PLACEHOLDER_TERM;
    return (
      terms.find((t) => t.id === selectedId) ??
      terms.find((t) => t.status === "Current") ??
      terms[terms.length - 1]
    );
  }, [terms, selectedId]);

  const setTermId = useCallback((id: string) => {
    setSelectedId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const lockMutation = useMutation({
    mutationFn: (input: { termCode: string; locked: boolean }) => setTermLock({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: termsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["marksheet"] });
    },
  });

  const lockReason = useCallback(
    (id?: string): LockReason => {
      const target = terms.find((t) => t.id === (id ?? activeTerm.id));
      if (!target) return null;
      if (!target.isLocked) return null;
      return target.status === "Closed" ? "closed" : "manual";
    },
    [terms, activeTerm.id],
  );

  const value = useMemo<TermContextValue>(
    () => ({
      termId: activeTerm.id,
      term: activeTerm,
      terms,
      setTermId,
      isLoading,
      isLocked: (id?: string) =>
        Boolean(terms.find((t) => t.id === (id ?? activeTerm.id))?.isLocked),
      lockReason,
      lockTerm: async (id: string) => {
        await lockMutation.mutateAsync({ termCode: id, locked: true });
      },
      unlockTerm: async (id: string) => {
        await lockMutation.mutateAsync({ termCode: id, locked: false });
      },
      isUpdatingLock: lockMutation.isPending,
    }),
    [activeTerm, terms, setTermId, isLoading, lockReason, lockMutation],
  );

  return <TermContext.Provider value={value}>{children}</TermContext.Provider>;
}

export function useTerm() {
  const ctx = useContext(TermContext);
  if (!ctx) throw new Error("useTerm must be used within TermProvider");
  return ctx;
}
