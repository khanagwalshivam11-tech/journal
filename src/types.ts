export interface Trade {
  id: string;
  accountId: string;
  date: string;
  symbol: string;
  direction: "long" | "short";
  entry: number;
  exit: number;
  qty: number;
  stop?: number | null;
  takeProfit?: number | null;
  fees?: number;
  strategies: string[];
  session: string;
  notes: string;
  imageUrl?: string; // Screenshot data URL or image link
  pnl?: number;
  r?: number | null;
  plannedR?: number | null;
  strategy?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  startingBalance: number;
  ddlPct?: number | null;
  maxDlPct?: number | null;
  profitTargetPct?: number | null;
  maxDlBasis?: string;
  phase?: string;
}

export interface Routine {
  id: string;
  title: string;
  category: "workout" | "study" | "mindset" | "health" | "trading" | "other";
  iconName?: string;
  color?: string;
  targetPerWeek?: number; // default 7 days/week
  createdAt: string;
}

export interface RoutineLog {
  // key format "date_routineId", e.g. "2026-07-31_r1"
  date: string; // "YYYY-MM-DD"
  routineId: string;
  completed: boolean;
  notes?: string;
}
