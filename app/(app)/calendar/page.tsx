import { getCalendarEventsForWeek } from "@/lib/db";
import { CalendarView } from "@/components/calendar-view";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ week?: string }>;
}

export default async function CalendarPage({ searchParams }: Props) {
  const { week } = await searchParams;

  // Pin "today" to MYT date regardless of server's local timezone
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const nowMYT = new Date(ty, tm - 1, td);
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
