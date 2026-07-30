import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";

export const Route = createFileRoute("/_authenticated/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll & HR | EduMaster Greenhill Academy" },
      { name: "description", content: "Staff salaries, statutory deductions and leave. Manage payroll & hr for Greenhill Academy inside EduMaster." },
      { property: "og:title", content: "Payroll & HR | EduMaster" },
      { property: "og:description", content: "Staff salaries, statutory deductions and leave." },
    ],
  }),
  component: () => (
    <ModulePage
      title="Payroll & HR"
      subtitle="Staff salaries, statutory deductions and leave."
      icon={Briefcase}
      stats={[{"label":"Monthly payroll","value":"KES 4.1M"},{"label":"Staff on payroll","value":"72"},{"label":"NSSF/NHIF filed","value":"Yes"},{"label":"Pending leave","value":"5"}]}
      columns={["Staff","Role","Gross","Net","Status"]}
      rows={[["Mr. Peter Otieno","Teacher","KES 62,000","KES 51,340","Processed"],["Mrs. Grace Wanjiru","Teacher","KES 58,500","KES 48,700","Processed"],["Mr. Samuel Kilonzo","Bursar","KES 74,000","KES 60,120","Processed"],["Ms. Rose Chebet","Matron","KES 32,000","KES 28,940","Pending"]]}
    />
  ),
});
