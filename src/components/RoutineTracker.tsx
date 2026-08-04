import React, { useState, useEffect, useMemo } from "react";
import { Routine, RoutineLog } from "../types";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

const ROUTINES_KEY = "tj_routines_v1";
const ROUTINE_LOGS_KEY = "tj_routine_logs_v1";

const DEFAULT_ROUTINES: Routine[] = [
  { id: "r_boxing", title: "Boxing & Martial Arts", category: "workout", iconName: "🥊", targetPerWeek: 5, createdAt: "2026-01-01" },
  { id: "r_gym", title: "Gym & Strength Training", category: "workout", iconName: "🏋️", targetPerWeek: 5, createdAt: "2026-01-01" },
  { id: "r_study", title: "Focus Study Session (2h+)", category: "study", iconName: "📚", targetPerWeek: 6, createdAt: "2026-01-01" },
  { id: "r_trading", title: "Chart Review & Backtesting", category: "trading", iconName: "📈", targetPerWeek: 5, createdAt: "2026-01-01" },
  { id: "r_mindset", title: "Mindset & Daily Reflection", category: "mindset", iconName: "🧘", targetPerWeek: 7, createdAt: "2026-01-01" },
  { id: "r_sleep", title: "8 Hours Quality Sleep", category: "health", iconName: "🌙", targetPerWeek: 7, createdAt: "2026-01-01" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  workout: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "#f59e0b" },
  study: { bg: "rgba(99, 102, 241, 0.15)", text: "#818cf8", border: "#6366f1" },
  trading: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "#10b981" },
  mindset: { bg: "rgba(236, 72, 153, 0.15)", text: "#f472b6", border: "#ec4899" },
  health: { bg: "rgba(14, 165, 233, 0.15)", text: "#38bdf8", border: "#0ea5e9" },
  other: { bg: "rgba(156, 163, 175, 0.15)", text: "#9ca3af", border: "#6b7280" },
};

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDateDisplay(dateStr: string) {
  const today = getTodayStr();
  if (dateStr === today) return "Today";
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getPastDays(count: number): string[] {
  const list: string[] = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

export const RoutineTracker: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<Record<string, boolean>>({}); // key: "date_routineId"
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [loaded, setLoaded] = useState(false);

  // New routine modal/form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Routine["category"]>("workout");
  const [newIcon, setNewIcon] = useState("⚡");
  const [newTarget, setNewTarget] = useState("7");

  // Load from LocalStorage
  useEffect(() => {
    try {
      const savedR = localStorage.getItem(ROUTINES_KEY);
      if (savedR) {
        setRoutines(JSON.parse(savedR));
      } else {
        setRoutines(DEFAULT_ROUTINES);
      }

      const savedL = localStorage.getItem(ROUTINE_LOGS_KEY);
      if (savedL) {
        setLogs(JSON.parse(savedL));
      }
    } catch (e) {
      console.error("Failed to load routine data", e);
      setRoutines(DEFAULT_ROUTINES);
    }
    setLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
    } catch (e) {
      console.error("Error saving routines", e);
    }
  }, [routines, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(ROUTINE_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error("Error saving routine logs", e);
    }
  }, [logs, loaded]);

  // Toggle routine status for selected date
  const toggleRoutine = (routineId: string) => {
    const key = `${selectedDate}_${routineId}`;
    setLogs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Add a custom routine
  const handleAddRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const item: Routine = {
      id: "r_" + Math.random().toString(36).slice(2, 9),
      title: newTitle.trim(),
      category: newCategory,
      iconName: newIcon.trim() || "📌",
      targetPerWeek: parseInt(newTarget) || 7,
      createdAt: getTodayStr(),
    };
    setRoutines((prev) => [...prev, item]);
    setNewTitle("");
    setShowAddModal(false);
  };

  const promptDeleteRoutine = (routine: Routine) => {
    setRoutineToDelete(routine);
  };

  // Calculations for Streaks and Completion Rates
  const past30Days = useMemo(() => getPastDays(30), []);
  const past7Days = useMemo(() => getPastDays(7), []);

  // Streak calculator per routine
  const routineStreaks = useMemo(() => {
    const today = getTodayStr();
    const streaks: Record<string, { current: number; best: number }> = {};

    routines.forEach((r) => {
      let current = 0;
      let best = 0;
      let temp = 0;

      // Check backwards starting today
      let checkDate = new Date();
      let isTodayChecked = !!logs[`${today}_${r.id}`];
      
      // If today is not checked yet, start counting from yesterday for current streak
      if (!isTodayChecked) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // Calculate current streak
      while (true) {
        const dStr = checkDate.toISOString().slice(0, 10);
        if (logs[`${dStr}_${r.id}`]) {
          current++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Calculate best streak over past 60 days
      const days = getPastDays(60);
      days.forEach((d) => {
        if (logs[`${d}_${r.id}`]) {
          temp++;
          if (temp > best) best = temp;
        } else {
          temp = 0;
        }
      });

      streaks[r.id] = { current, best: Math.max(best, current) };
    });

    return streaks;
  }, [routines, logs]);

  // Overall Daily Completion Stats for Graphs
  const dailyStats = useMemo(() => {
    return past30Days.map((dateStr) => {
      if (routines.length === 0) return { date: dateStr, pct: 0, completedCount: 0, total: 0 };
      let completedCount = 0;
      routines.forEach((r) => {
        if (logs[`${dateStr}_${r.id}`]) completedCount++;
      });
      const pct = Math.round((completedCount / routines.length) * 100);
      return {
        date: dateStr,
        pct,
        completedCount,
        total: routines.length,
      };
    });
  }, [past30Days, routines, logs]);

  // Today's summary
  const todayCompletedCount = useMemo(() => {
    return routines.filter((r) => !!logs[`${selectedDate}_${r.id}`]).length;
  }, [routines, logs, selectedDate]);

  const todayPct = routines.length > 0 ? Math.round((todayCompletedCount / routines.length) * 100) : 0;

  // Category breakdown stats
  const categoryStats = useMemo(() => {
    const counts: Record<string, { totalChecked: number; totalRoutines: number }> = {};
    routines.forEach((r) => {
      if (!counts[r.category]) {
        counts[r.category] = { totalChecked: 0, totalRoutines: 0 };
      }
      counts[r.category].totalRoutines++;
      // sum ticks in last 30 days
      past30Days.forEach((d) => {
        if (logs[`${d}_${r.id}`]) {
          counts[r.category].totalChecked++;
        }
      });
    });
    return Object.entries(counts).map(([cat, val]) => ({
      category: cat,
      ticks: val.totalChecked,
      count: val.totalRoutines,
    }));
  }, [routines, logs, past30Days]);

  if (!loaded) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner & Quick Controls */}
      <div
        className="tj-card"
        style={{
          background: "linear-gradient(135deg, #111114 0%, #16161f 100%)",
          border: "1px solid #1f2937",
          padding: "24px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 className="tj-display" style={{ fontSize: "22px", margin: 0, fontWeight: 700, color: "#fff" }}>
              Daily Routine & Habit Tracker
            </h2>
            <span
              style={{
                fontSize: "12px",
                padding: "3px 10px",
                borderRadius: "20px",
                background: "rgba(99, 102, 241, 0.15)",
                color: "#818cf8",
                fontWeight: 600,
                border: "1px solid rgba(99, 102, 241, 0.3)",
              }}
            >
              {todayPct}% Done {selectedDate === getTodayStr() ? "Today" : ""}
            </span>
          </div>
          <p style={{ color: "#9ca3af", fontSize: "13.5px", marginTop: "6px", marginBottom: 0 }}>
            Stay disciplined with boxing, workouts, studies, and trading routines.
          </p>
        </div>

        <button
          className="tj-btn tj-btn-primary tj-focus-visible"
          onClick={() => setShowAddModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span>＋</span> Add Custom Routine
        </button>
      </div>

      {/* Date Selector Strip (Past 7 Days + Custom Date Picker) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="tj-label" style={{ margin: 0 }}>
            Select Date to Track:
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>Custom Date:</span>
            <input
              type="date"
              className="tj-input"
              style={{ width: "auto", padding: "4px 8px", fontSize: "12px" }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {past7Days.map((dStr) => {
            const isSelected = dStr === selectedDate;
            const isToday = dStr === getTodayStr();

            // Calculate ticks for this date
            const dateTicks = routines.filter((r) => !!logs[`${dStr}_${r.id}`]).length;
            const datePct = routines.length > 0 ? Math.round((dateTicks / routines.length) * 100) : 0;

            return (
              <button
                key={dStr}
                onClick={() => setSelectedDate(dStr)}
                className="tj-focus-visible"
                style={{
                  flex: "1 0 100px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: isSelected ? "1.5px solid #6366f1" : "1px solid #1f2937",
                  background: isSelected ? "rgba(99, 102, 241, 0.15)" : "#111114",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: isSelected ? "#818cf8" : "#9ca3af",
                  }}
                >
                  {isToday ? "Today" : new Date(dStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span className="tj-mono" style={{ fontSize: "13px", fontWeight: 700, color: isSelected ? "#fff" : "#e5e7eb" }}>
                  {new Date(dStr + "T00:00:00").toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: datePct >= 80 ? "#10b981" : datePct >= 40 ? "#f59e0b" : datePct > 0 ? "#6366f1" : "#374151",
                    }}
                  />
                  <span style={{ fontSize: "10px", color: "#9ca3af" }}>{dateTicks}/{routines.length}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Routine Checklists Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {routines.map((r) => {
          const isChecked = !!logs[`${selectedDate}_${r.id}`];
          const catStyle = CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other;
          const streakInfo = routineStreaks[r.id] || { current: 0, best: 0 };

          return (
            <div
              key={r.id}
              className="tj-card"
              onClick={() => toggleRoutine(r.id)}
              style={{
                cursor: "pointer",
                border: isChecked ? `1.5px solid ${catStyle.border}` : "1px solid #1f2937",
                background: isChecked ? catStyle.bg : "#111114",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {/* Interactive Checkbox */}
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      border: isChecked ? `2px solid ${catStyle.border}` : "2px solid #374151",
                      background: isChecked ? catStyle.border : "#16161a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: 700,
                      flexShrink: 0,
                      transition: "transform 0.1s ease",
                    }}
                  >
                    {isChecked ? "✓" : ""}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "18px" }}>{r.iconName}</span>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: isChecked ? "#fff" : "#e5e7eb" }}>
                        {r.title}
                      </h4>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: catStyle.text,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {r.category}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    promptDeleteRoutine(r);
                  }}
                  title="Remove Routine"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "4px",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Footer info: Streak & Target */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  fontSize: "12px",
                  color: "#9ca3af",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>🔥 Streak:</span>
                  <strong className="tj-mono" style={{ color: streakInfo.current > 0 ? "#f59e0b" : "#9ca3af" }}>
                    {streakInfo.current} {streakInfo.current === 1 ? "day" : "days"}
                  </strong>
                </div>

                <span className="tj-mono" style={{ fontSize: "11px" }}>
                  Target: {r.targetPerWeek || 7}x/wk
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Report & Analytics Graphs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
        {/* Graph 1: 30-Day Completion Trend */}
        <div className="tj-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
            <div>
              <h3 className="tj-display" style={{ fontSize: "16px", margin: 0, color: "#fff" }}>
                30-Day Completion Trend
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>Daily habit execution percentage</p>
            </div>
            <span className="tj-mono" style={{ fontSize: "14px", fontWeight: 700, color: "#818cf8" }}>
              {Math.round(dailyStats.reduce((acc, d) => acc + d.pct, 0) / (dailyStats.length || 1))}% Avg
            </span>
          </div>

          <DailyTrendChart data={dailyStats} />
        </div>

        {/* Graph 2: Category Breakdown */}
        <div className="tj-card">
          <div style={{ marginBottom: "16px" }}>
            <h3 className="tj-display" style={{ fontSize: "16px", margin: 0, color: "#fff" }}>
              Category Breakdown (Past 30 Days)
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>Total completed ticks by activity type</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {categoryStats.map((item) => {
              const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;
              const maxTicks = Math.max(...categoryStats.map((c) => c.ticks), 1);
              const barWidthPct = Math.round((item.ticks / maxTicks) * 100);

              return (
                <div key={item.category} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ fontWeight: 600, color: catStyle.text, textTransform: "capitalize" }}>
                      {item.category} ({item.count} routine{item.count > 1 ? "s" : ""})
                    </span>
                    <span className="tj-mono" style={{ color: "#e5e7eb" }}>
                      {item.ticks} ticks
                    </span>
                  </div>
                  <div style={{ height: "8px", background: "#1f2937", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${barWidthPct}%`,
                        background: catStyle.border,
                        borderRadius: "4px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Consistency Heatmap */}
      <div className="tj-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
          <h3 className="tj-display" style={{ fontSize: "15px", margin: 0, color: "#fff" }}>
            Consistency Heatmap (Last 30 Days)
          </h3>
          <span style={{ fontSize: "11px", color: "#9ca3af" }}>Darker = Higher Completion %</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(32px, 1fr))", gap: "8px" }}>
          {dailyStats.map((d) => {
            let bg = "#1f2937";
            if (d.pct >= 90) bg = "#10b981";
            else if (d.pct >= 60) bg = "#059669";
            else if (d.pct >= 30) bg = "#047857";
            else if (d.pct > 0) bg = "rgba(99, 102, 241, 0.4)";

            return (
              <div
                key={d.date}
                title={`${d.date}: ${d.pct}% (${d.completedCount}/${d.total})`}
                onClick={() => setSelectedDate(d.date)}
                style={{
                  height: "36px",
                  borderRadius: "6px",
                  background: bg,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: d.date === selectedDate ? "2px solid #fff" : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <span className="tj-mono" style={{ fontSize: "10px", fontWeight: 700, color: "#fff" }}>
                  {new Date(d.date + "T00:00:00").getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal to Add Custom Routine */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={handleAddRoutine}
            className="tj-card"
            style={{ width: "100%", maxWidth: "440px", background: "#111114" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 className="tj-display" style={{ fontSize: "18px", margin: 0 }}>
                Add Custom Routine
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="tj-label">Routine Title</label>
                <input
                  className="tj-input"
                  placeholder="e.g., Heavy Bag Boxing, Spanish Study, Evening Stretch"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="tj-label">Category</label>
                  <select
                    className="tj-input"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Routine["category"])}
                  >
                    <option value="workout">Workout / Boxing</option>
                    <option value="study">Study / Skill</option>
                    <option value="trading">Trading / Market</option>
                    <option value="mindset">Mindset / Journal</option>
                    <option value="health">Health / Sleep</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="tj-label">Icon / Emoji</label>
                  <input
                    className="tj-input"
                    placeholder="🥊"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="tj-label">Target Days Per Week</label>
                <select className="tj-input" value={newTarget} onChange={(e) => setNewTarget(e.target.value)}>
                  <option value="7">7 days / week (Daily)</option>
                  <option value="6">6 days / week</option>
                  <option value="5">5 days / week (Weekdays)</option>
                  <option value="4">4 days / week</option>
                  <option value="3">3 days / week</option>
                  <option value="2">2 days / week</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button type="submit" className="tj-btn tj-btn-primary tj-focus-visible" style={{ flex: 1 }}>
                  Create Routine
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="tj-btn tj-btn-ghost tj-focus-visible"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation modal before removing a routine */}
      <ConfirmDeleteModal
        isOpen={!!routineToDelete}
        title="Remove Routine"
        message={
          routineToDelete
            ? `Are you sure you want to remove '${routineToDelete.title}'? Your past completions for this routine will remain recorded in history.`
            : ""
        }
        confirmText="Remove Routine"
        onConfirm={() => {
          if (routineToDelete) {
            setRoutines((prev) => prev.filter((r) => r.id !== routineToDelete.id));
            setRoutineToDelete(null);
          }
        }}
        onCancel={() => setRoutineToDelete(null)}
      />
    </div>
  );
};

// Subcomponent: Daily Trend Chart
function DailyTrendChart({ data }: { data: Array<{ date: string; pct: number }> }) {
  const w = 600;
  const h = 180;
  const pad = { l: 30, r: 15, t: 10, b: 25 };

  if (!data.length) return null;

  const points = data.map((d, i) => {
    const x = pad.l + (i / Math.max(data.length - 1, 1)) * (w - pad.l - pad.r);
    const y = pad.t + (1 - d.pct / 100) * (h - pad.t - pad.b);
    return { x, y, pct: d.pct, date: d.date };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${h - pad.b} L ${points[0].x} ${h - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "200px" }}>
      <defs>
        <linearGradient id="routineTrendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid Lines */}
      {[0, 50, 100].map((v) => {
        const y = pad.t + (1 - v / 100) * (h - pad.t - pad.b);
        return (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#1f2937" strokeDasharray="3 3" />
            <text x={pad.l - 6} y={y + 3} fontSize="9" fill="#9ca3af" textAnchor="end" fontFamily="IBM Plex Mono">
              {v}%
            </text>
          </g>
        );
      })}

      {/* Area and Line */}
      <path d={areaD} fill="url(#routineTrendGrad)" />
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.pct > 0 ? "3" : "2"} fill={p.pct >= 80 ? "#10b981" : "#6366f1"}>
          <title>{`${p.date}: ${p.pct}%`}</title>
        </circle>
      ))}
    </svg>
  );
}
