import { getCalendarEventsForWeek } from "@/lib/db";
import { CalendarView } from "@/components/calendar-view";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ week?: string }>;
}

export default async function CalendarPage({ searchParams }: Props) {
  const { week } = await searchParams;

  // week param is "YYYY-MM-DD" for Monday of the viewed week
  // Use MYT (UTC+8) for "today" — Vercel runs in UTC so new Date() would show yesterday for Malaysians before 8 AM
  const nowMYT = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const weekStart = getWeekStart(week ? new Date(week + "T00:00:00") : nowMYT);
  const weekEnd   = new Date(weekStart.getTime() + 6 * 86400000);

  const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  const events = await getCalendarEventsForWeek(toISO(weekStart), toISO(weekEnd));

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-10">
      <CalendarView events={events} weekStartISO={toISO(weekStart)} />
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
