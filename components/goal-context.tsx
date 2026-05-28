"use client";

import { createContext, useContext, useState } from "react";

interface GoalCtx {
  liveMonthlyGoal: number;
  setLiveMonthlyGoal: (n: number) => void;
}

const GoalContext = createContext<GoalCtx>({ liveMonthlyGoal: 0, setLiveMonthlyGoal: () => {} });

export function GoalProvider({ initial, children }: { initial: number; children: React.ReactNode }) {
  const [liveMonthlyGoal, setLiveMonthlyGoal] = useState(initial);
  return (
    <GoalContext.Provider value={{ liveMonthlyGoal, setLiveMonthlyGoal }}>
      {children}
    </GoalContext.Provider>
  );
}

export function useGoal() {
  return useContext(GoalContext);
}
