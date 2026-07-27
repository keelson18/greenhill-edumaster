import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTerm } from "@/lib/term-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TermSelect({ className }: { className?: string }) {
  const { termId, setTermId, terms } = useTerm();
  return (
    <Select value={termId} onValueChange={setTermId}>
      <SelectTrigger
        className={cn("h-9 w-[215px] rounded-full bg-card", className)}
        aria-label="Academic term"
      >
        <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {terms.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            <span className="flex w-full items-center gap-2">
              <span>{t.label}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t.status}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
