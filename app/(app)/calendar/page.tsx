import { Suspense } from "react";
import { getCalendarEventsForWeek } from "@/lib/db";
import { CalendarView } from "@/components/calendar-view";
import { TourSpotlight } from "@/components/tour-spotlight";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function CalendarPage({ searchParams }: Props) {
  const { month } = await searchParams;

  // Pin "today" to MYT regardless of server timezone
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [ty, tm] = todayStr.split("-").map(Number);

  let year: number, monthNum: number;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    [year, monthNum] = month.split("-").map(Number);
  } else {
    year = ty;
    monthNum = tm;
  }

  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const monthStart = new Date(year, monthNum - 1, 1);
  const monthEnd = new Date(year, monthNum, 0); // last day of month

  const events = await getCalendarEventsForWeek(toISO(monthStart), toISO(monthEnd));

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-10">
      <CalendarView
        events={events}
        monthISO={`${year}-${String(monthNum).padStart(2, "0")}`}
      />
      <Suspense fallback={null}>
        <TourSpotlight
          step="calendar"
          stepNumber={3}
          targetId="tour-add-event"
          title="Schedule your first appointment"
          body="Tap the highlighted button to add a viewing, meeting, or follow-up to your calendar."
        />
      </Suspense>
    </div>
  );
}
