"use server";

import { getExpandedDashboardStats, getUpcomingCalendarEvents, getCalendarEventsForMonth } from "@/lib/db";

export async function fetchExpandedStats(rangeMonths: number, startMonth?: string) {
  return getExpandedDashboardStats(rangeMonths, startMonth);
}

export async function fetchUpcomingEvents() {
  return getUpcomingCalendarEvents(20);
}

export async function fetchCalendarMonth(yearMonth: string) {
  return getCalendarEventsForMonth(yearMonth);
}
