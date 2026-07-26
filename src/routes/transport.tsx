import { createFileRoute } from "@tanstack/react-router";
import { Bus } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";

export const Route = createFileRoute("/transport")({
  head: () => ({
    meta: [
      { title: "Transport | EduMaster Greenhill Academy" },
      { name: "description", content: "Routes, buses and learner pick-up points. Manage transport for Greenhill Academy inside EduMaster." },
      { property: "og:title", content: "Transport | EduMaster" },
      { property: "og:description", content: "Routes, buses and learner pick-up points." },
    ],
  }),
  component: () => (
    <ModulePage
      title="Transport"
      subtitle="Routes, buses and learner pick-up points."
      icon={Bus}
      stats={[{"label":"Buses","value":"7"},{"label":"Routes","value":"9"},{"label":"Learners ferried","value":"318"},{"label":"Service due","value":"2"}]}
      columns={["Route","Bus","Driver","Learners","Status"]}
      rows={[["Ruiru - Kamakis","KBX 442Q","J. Mwangi","52","Active"],["Kikuyu - Dagoretti","KCA 118P","S. Kirui","47","Active"],["Thika Road","KDD 900L","P. Omondi","61","Service due"],["Ngong - Karen","KBZ 771T","D. Muthoni","38","Active"]]}
    />
  ),
});
