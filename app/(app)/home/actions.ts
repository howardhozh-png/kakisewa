"use server";

import { getExpandedDashboardStats } from "@/lib/db";

export async function fetchExpandedStats(rangeMonths: number) {
  return getExpandedDashboardStats(rangeMonths);
}
