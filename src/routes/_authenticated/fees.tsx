import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";

export const Route = createFileRoute("/_authenticated/fees")({
  head: () => ({
    meta: [
      { title: "Fees & Finance | EduMaster Greenhill Academy" },
      { name: "description", content: "Invoicing, M-Pesa reconciliation and arrears tracking in KES. Manage fees & finance for Greenhill Academy inside EduMaster." },
      { property: "og:title", content: "Fees & Finance | EduMaster" },
      { property: "og:description", content: "Invoicing, M-Pesa reconciliation and arrears tracking in KES." },
    ],
  }),
  component: () => (
    <ModulePage
      title="Fees & Finance"
      subtitle="Invoicing, M-Pesa reconciliation and arrears tracking in KES."
      icon={Wallet}
      stats={[{"label":"Collected (term)","value":"KES 18.4M"},{"label":"Outstanding","value":"KES 5.2M"},{"label":"Invoices raised","value":"847"},{"label":"Collection rate","value":"78%"}]}
      columns={["Invoice","Student","Grade","Amount","Status"]}
      rows={[["INV-20411","Brian Kamau Otieno","Grade 7","KES 23,500","Paid"],["INV-20412","Faith Njeri Mwangi","Grade 5","KES 19,000","Partial"],["INV-20413","Collins Wafula Barasa","Grade 9","KES 26,500","Overdue"],["INV-20414","Mercy Atieno Owino","PP2","KES 12,000","Paid"]]}
    />
  ),
});
