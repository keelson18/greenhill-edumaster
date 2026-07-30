import { Loader2, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTerm } from "@/lib/term-context";
import { useAuth } from "@/lib/auth-context";

/**
 * Shows the read-only state of a term and lets an administrator close or
 * reopen it. Marks entry and report-card generation respect this state, and
 * the database rejects mark changes for a locked term regardless of the UI.
 */
export function TermLockBar({
  termId,
  className,
}: {
  termId?: string;
  className?: string;
}) {
  const { term, isLocked, lockReason, lockTerm, unlockTerm, isUpdatingLock } = useTerm();
  const { isAdmin } = useAuth();
  const id = termId ?? term.id;
  const locked = isLocked(id);
  const reason = lockReason(id);

  async function toggleLock() {
    try {
      if (locked) {
        await unlockTerm(id);
        toast.success(`${term.label} reopened for editing`);
      } else {
        await lockTerm(id);
        toast.success(`${term.label} locked — marks are now read-only`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the term");
    }
  }


  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center",
        locked ? "border-warning/40 bg-warning/10" : "border-border/70 bg-card",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          locked ? "bg-warning/20 text-warning" : "bg-secondary text-secondary-foreground",
        )}
      >
        {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
      </span>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {term.label} is {locked ? "locked" : "open for editing"}
          <Badge variant="secondary" className="rounded-full text-[11px]">
            {term.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {locked
            ? reason === "closed"
              ? "This term has been closed. Marks and report cards are published records and cannot be changed."
              : "An administrator closed this term. Reopen it to amend marks or regenerate report cards."
            : "Marks can be captured and report cards regenerated until the term is closed."}
        </p>
      </div>
      <Button
        variant={locked ? "default" : "outline"}
        className="shrink-0"
        disabled={!isAdmin || isUpdatingLock}
        title={isAdmin ? undefined : "Only administrators can open or close a term"}
        onClick={toggleLock}
      >
        {isUpdatingLock ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
        ) : locked ? (
          <LockOpen className="mr-1.5 size-4" aria-hidden />
        ) : (
          <Lock className="mr-1.5 size-4" aria-hidden />
        )}
        {locked ? "Reopen term" : "Lock term"}
      </Button>
    </div>
  );
}
