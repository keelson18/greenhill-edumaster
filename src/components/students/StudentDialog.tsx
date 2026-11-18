import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GHANA_REGIONS, GRADE_LEVELS, STREAMS, type GradeLevel } from "@/config/app.config";
import type { StudentDTO } from "@/lib/api/types";

export const STATUSES = ["Active", "Suspended", "Transferred"] as const;

export type FormState = {
  fullName: string;
  admissionNo: string;
  gesId: string;
  gradeLevel: GradeLevel;
  stream: string;
  gender: "Male" | "Female";
  guardianName: string;
  guardianPhone: string;
  dateOfBirth: string;
  region: string;
  district: string;
  town: string;
  ghanaPostGps: string;
  status: (typeof STATUSES)[number];
  feeBilled: string;
};

export const EMPTY_FORM: FormState = {
  fullName: "",
  admissionNo: "",
  gesId: "",
  gradeLevel: GRADE_LEVELS[0],
  stream: STREAMS[0],
  gender: "Male",
  guardianName: "",
  guardianPhone: "",
  dateOfBirth: "",
  region: "",
  district: "",
  town: "",
  ghanaPostGps: "",
  status: "Active",
  feeBilled: "0",
};

export function toForm(student: StudentDTO): FormState {
  return {
    fullName: student.fullName,
    admissionNo: student.admissionNo,
    gesId: student.gesId,
    gradeLevel: student.gradeLevel,
    stream: student.stream,
    gender: student.gender,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    dateOfBirth: student.dateOfBirth ?? "",
    region: student.region ?? "",
    district: student.district ?? "",
    town: student.town ?? "",
    ghanaPostGps: student.ghanaPostGps ?? "",
    status: student.status,
    feeBilled: String(student.feeBilled),
  };
}

export function StudentDialog({ dialogOpen, setDialogOpen, editing, form, setForm, saving, onSave }: {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editing: StudentDTO | null;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  saving: boolean;
  onSave: () => void;
}) {
  return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit learner" : "Admit a learner"}</DialogTitle>
            <DialogDescription>
              GES ID, guardian phone and Ghana Post GPS are validated before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field label="Admission number">
              <Input
                value={form.admissionNo}
                onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
              />
            </Field>
            <Field label="GES ID">
              <Input
                value={form.gesId}
                onChange={(e) => setForm({ ...form, gesId: e.target.value })}
                placeholder="GES-0012345"
              />
            </Field>
            <Field label="Class">
              <Select
                value={form.gradeLevel}
                onValueChange={(v) => setForm({ ...form, gradeLevel: v as GradeLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Stream">
              <Select value={form.stream} onValueChange={(v) => setForm({ ...form, stream: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STREAMS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Gender">
              <Select
                value={form.gender}
                onValueChange={(v) => setForm({ ...form, gender: v as "Male" | "Female" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Guardian name">
              <Input
                value={form.guardianName}
                onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
              />
            </Field>
            <Field label="Guardian phone">
              <Input
                value={form.guardianPhone}
                onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                placeholder="+233 24 512 3390"
              />
            </Field>
            <Field label="Date of birth">
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              />
            </Field>
            <Field label="Region">
              <Select
                value={form.region || "none"}
                onValueChange={(v) => setForm({ ...form, region: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not stated</SelectItem>
                  {GHANA_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="District">
              <Input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </Field>
            <Field label="Town">
              <Input value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} />
            </Field>
            <Field label="Ghana Post GPS">
              <Input
                value={form.ghanaPostGps}
                onChange={(e) => setForm({ ...form, ghanaPostGps: e.target.value })}
                placeholder="GA-183-4471"
              />
            </Field>
            <Field label="Fee billed (GHS)">
              <Input
                type="number"
                min={0}
                value={form.feeBilled}
                onChange={(e) => setForm({ ...form, feeBilled: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as (typeof STATUSES)[number] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => onSave()}
              disabled={saving}
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Admit learner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
