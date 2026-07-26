import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { ModulePage } from "@/components/ModulePage";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable | EduMaster Greenhill Academy" },
      { name: "description", content: "Lesson scheduling across PP1 to Grade 9 streams. Manage timetable for Greenhill Academy inside EduMaster." },
      { property: "og:title", content: "Timetable | EduMaster" },
      { property: "og:description", content: "Lesson scheduling across PP1 to Grade 9 streams." },
    ],
  }),
  component: () => (
    <ModulePage
      title="Timetable"
      subtitle="Lesson scheduling across PP1 to Grade 9 streams."
      icon={CalendarDays}
      stats={[{"label":"Streams","value":"27"},{"label":"Lessons/day","value":"8"},{"label":"Clashes","value":"0"},{"label":"Rooms","value":"31"}]}
      columns={["Time","Monday","Tuesday","Wednesday","Status"]}
      rows={[["08:00 - 08:40","Mathematics","English","Kiswahili","Published"],["08:40 - 09:20","Integrated Science","Mathematics","Social Studies","Published"],["09:20 - 10:00","English","CRE","Mathematics","Published"],["10:20 - 11:00","Creative Arts","Integrated Science","English","Draft"]]}
    />
  ),
});
