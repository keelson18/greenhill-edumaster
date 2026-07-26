import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory | EduMaster Greenhill Academy" },
      { name: "description", content: "Assets, consumables and procurement requests. Manage inventory for Greenhill Academy inside EduMaster." },
      { property: "og:title", content: "Inventory | EduMaster" },
      { property: "og:description", content: "Assets, consumables and procurement requests." },
    ],
  }),
  component: () => (
    <ModulePage
      title="Inventory"
      subtitle="Assets, consumables and procurement requests."
      icon={Boxes}
      stats={[{"label":"Asset value","value":"KES 12.7M"},{"label":"Low stock items","value":"9"},{"label":"Open requisitions","value":"6"},{"label":"Suppliers","value":"23"}]}
      columns={["Item","Category","Quantity","Unit cost","Status"]}
      rows={[["Desks","Furniture","940","KES 4,200","In stock"],["Exercise books","Stationery","2,400","KES 45","Low stock"],["Lab reagents","Science","60","KES 1,150","In stock"],["Chalk boxes","Stationery","80","KES 320","Reorder"]]}
    />
  ),
});
