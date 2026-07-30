import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";

export const Route = createFileRoute("/_authenticated/homework")({
  head: () => ({
    meta: [
      { title: "Homework | EduMaster Greenhill Academy" },
      { name: "description", content: "Assignments issued, submitted and graded. Manage homework for Greenhill Academy inside EduMaster." },
      { property: "og:title", content: "Homework | EduMaster" },
      { property: "og:description", content: "Assignments issued, submitted and graded." },
    ],
  }),
  component: () => (
    <ModulePage
      title="Homework"
      subtitle="Assignments issued, submitted and graded."
      icon={BookOpen}
      stats={[{"label":"Active assignments","value":"38"},{"label":"Submitted","value":"612"},{"label":"Overdue","value":"47"},{"label":"Graded","value":"78%"}]}
      columns={["Assignment","Grade","Subject","Due","Status"]}
      rows={[["Fractions worksheet 4","Grade 7","Mathematics","28 Jul","Open"],["Insha: Mazingira","Grade 6","Kiswahili","27 Jul","Grading"],["Plant cell drawing","Grade 8","Integrated Science","30 Jul","Open"],["Reading comprehension","Grade 4","English","25 Jul","Closed"]]}
    />
  ),
});
