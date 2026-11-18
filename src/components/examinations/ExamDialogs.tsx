import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GRADE_SCOPE_LABEL } from "@/config/app.config";
import { createExam, createSubject } from "@/lib/api/school.functions";

export function NewSubjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const mutation = useMutation({
    mutationFn: () =>
      createSubject({ data: { code, name, sortOrder: Number(sortOrder) || 0 } }),
    onSuccess: (subject) => {
      toast.success(`${subject.name} added`);
      onCreated();
      onOpenChange(false);
      setCode("");
      setName("");
      setSortOrder("0");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New subject</DialogTitle>
          <DialogDescription>
            Subjects appear as columns in marks entry and on every report card.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RME"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Display order</Label>
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Religious & Moral Education"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Adding\u2026" : "Add subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewExamDialog({
  open,
  onOpenChange,
  termCode,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termCode: string;
  onCreated: (id: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);

  const mutation = useMutation({
    mutationFn: () =>
      createExam({
        data: { termCode, name, gradeScope: GRADE_SCOPE_LABEL, startsOn, endsOn },
      }),
    onSuccess: (result) => {
      toast.success("Examination created");
      onCreated(result.id);
      onOpenChange(false);
      setName("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New examination</DialogTitle>
          <DialogDescription>
            Creates a draft assessment for the selected term across {GRADE_SCOPE_LABEL}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="End of Term Examination"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Starts on</Label>
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ends on</Label>
              <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || name.length < 3}>
            {mutation.isPending ? "Creating…" : "Create examination"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
