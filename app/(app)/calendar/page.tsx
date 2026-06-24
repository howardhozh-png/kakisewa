import { Suspense } from "react";
import { getCalendarEventsForWeek, getCalendarEventsForMonth } from "@/lib/db";
import { CalendarView } from "@/components/calendar-view";
import { TourSpotlight } from "@/components/tour-spotlight";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ week?: string; view?: string; month?: string }>;
}

export default async function CalendarPage({ searchParams }: Props) {
  const { week, view, month } = await searchParams;

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const nowMYT = new Date(ty, tm - 1, td);

  const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const currentMonth = todayStr.slice(0, 7); // "YYYY-MM"

  const isMonthly = view === "monthly";

  if (isMonthly) {
    const activeMonth = month ?? currentMonth;
    const events = await getCalendarEventsForMonth(activeMonth);
    return (
      <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-10">
        <CalendarView events={events} weekStartISO={toISO(nowMYT)} view="monthly" activeMonth={activeMonth} />
        <Suspense fallback={null}>
          <TourSpotlight step="calendar" stepNumber={3} targetId="tour-add-event"
            title="Schedule your first appointment"
            body="Tap the highlighted button to add a viewing, meeting, or follow-up to your calendar." />
        </Suspense>
      </div>
    );
  }

  const weekStart = getWeekStart(week ? new Date(week + "T00:00:00") : nowMYT);
  const weekEnd   = new Date(weekStart.getTime() + 6 * 86400000);
  const events = await getCalendarEventsForWeek(toISO(weekStart), toISO(weekEnd));

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-10">
      <CalendarView events={events} weekStartISO={toISO(weekStart)} view="weekly" activeMonth={currentMonth} />
      <Suspense fallback={null}>
        <TourSpotlight step="calendar" stepNumber={3} targetId="tour-add-event"
          title="Schedule your first appointment"
          body="Tap the highlighted button to add a viewing, meeting, or follow-up to your calendar." />
      </Suspense>
    </div>
  );
}

function getWeekStart(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
