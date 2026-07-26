import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library | EduMaster Greenhill Academy" },
      { name: "description", content: "Titles, borrowing and overdue returns. Manage library for Greenhill Academy inside EduMaster." },
      { property: "og:title", content: "Library | EduMaster" },
      { property: "og:description", content: "Titles, borrowing and overdue returns." },
    ],
  }),
  component: () => (
    <ModulePage
      title="Library"
      subtitle="Titles, borrowing and overdue returns."
      icon={Library}
      stats={[{"label":"Titles","value":"4,280"},{"label":"Copies out","value":"362"},{"label":"Overdue","value":"24"},{"label":"New this term","value":"118"}]}
      columns={["Title","Category","Copies","Borrower","Status"]}
      rows={[["Kigogo","Kiswahili Set Book","40","Grade 9A","Issued"],["Fasihi Simulizi","Kiswahili","25","Library","Available"],["Primary Maths Bk 7","Course book","120","Grade 7","Issued"],["Atlas of Kenya","Reference","15","Library","Available"]]}
    />
  ),
});
