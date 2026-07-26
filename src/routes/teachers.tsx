import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";

export const Route = createFileRoute("/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers | EduMaster Greenhill Academy" },
      { name: "description", content: "Staff establishment, subject allocation and TSC records. Manage teachers for Greenhill Academy inside EduMaster." },
      { property: "og:title", content: "Teachers | EduMaster" },
      { property: "og:description", content: "Staff establishment, subject allocation and TSC records." },
    ],
  }),
  component: () => (
    <ModulePage
      title="Teachers"
      subtitle="Staff establishment, subject allocation and TSC records."
      icon={Users}
      stats={[{"label":"Teaching staff","value":"54"},{"label":"TSC registered","value":"48"},{"label":"On leave","value":"3"},{"label":"Avg. lessons/week","value":"26"}]}
      columns={["Teacher","TSC No","Subjects","Classes","Status"]}
      rows={[["Mr. Peter Otieno","TSC/442901","Integrated Science, Maths","Grade 7A, 8B","Active"],["Mrs. Grace Wanjiru","TSC/398112","English, CRE","Grade 5A, 6A","Active"],["Mr. Kelvin Kiptoo","TSC/511204","Mathematics","Grade 9A, 9B","Active"],["Ms. Mercy Achieng","TSC/470335","Kiswahili","Grade 4A, 4B","On leave"]]}
    />
  ),
});
