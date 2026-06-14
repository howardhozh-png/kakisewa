"use server";

import { getExpandedDashboardStats, getUpcomingCalendarEvents } from "@/lib/db";

export async function fetchExpandedStats(rangeMonths: number) {
  return getExpandedDashboardStats(rangeMonths);
}

export async function fetchUpcomingEvents() {
  return getUpcomingCalendarEvents(20);
}
