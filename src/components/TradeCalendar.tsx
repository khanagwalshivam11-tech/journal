import React, { useState, useMemo } from "react";
import { Trade } from "../types";

interface Props {
  trades: Trade[];
  onSelectDate: (dateStr: string) => void;
  onAddTradeForDate: (dateStr: string) => void;
}

const fmtMoney = (n: number) =>
  (n < 0 ? "-" : "+") +
  "$" +
  Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const TradeCalendar: React.FC<Props> = ({
  trades,
  onSelectDate,
  onAddTradeForDate,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayMonth = () => {
    setCurrentDate(new Date());
  };

  // Compute daily totals for current trades
  const dailyPnL = useMemo(() => {
    const map: Record<
      string,
      { pnl: number; count: number; trades: Trade[] }
    > = {};

    trades.forEach((t) => {
      const dateStr = t.date; // "YYYY-MM-DD"
      if (!map[dateStr]) {
        map[dateStr] = { pnl: 0, count: 0, trades: [] };
      }
      map[dateStr].pnl += t.pnl || 0;
      map[dateStr].count += 1;
      map[dateStr].trades.push(t);
    });

    return map;
  }, [trades]);

  // Calendar days generation
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  const monthName = currentDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Calculate monthly stats
  const monthStats = useMemo(() => {
    let winDays = 0;
    let lossDays = 0;
    let totalPnL = 0;
    let monthTradeCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      if (dailyPnL[dayStr]) {
        const { pnl, count } = dailyPnL[dayStr];
        totalPnL += pnl;
        monthTradeCount += count;
        if (pnl > 0) winDays++;
        else if (pnl < 0) lossDays++;
      }
    }

    const winRateDays =
      winDays + lossDays > 0
        ? Math.round((winDays / (winDays + lossDays)) * 100)
        : 0;

    return { winDays, lossDays, totalPnL, monthTradeCount, winRateDays };
  }, [dailyPnL, year, month, daysInMonth]);

  // Generate calendar grid cells
  const calendarCells = [];

  // Blank cells for alignment before 1st of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    calendarCells.push({
      day,
      dateStr,
      data: dailyPnL[dateStr] || null,
    });
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="tj-card" style={{ marginBottom: "20px" }}>
      {/* Calendar Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3
            className="tj-display"
            style={{ fontSize: "16px", margin: 0, color: "#fff" }}
          >
            Trading Calendar
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "#9ca3af",
              marginTop: "2px",
            }}
          >
            Green days = Profit • Red days = Loss • Click any box to view or log
          </p>
        </div>

        {/* Monthly Summary Badges & Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#16161a",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #1f2937",
              fontSize: "12px",
            }}
          >
            <span style={{ color: "#10b981", fontWeight: 600 }}>
              {monthStats.winDays}W
            </span>
            <span style={{ color: "#9ca3af" }}>-</span>
            <span style={{ color: "#f87171", fontWeight: 600 }}>
              {monthStats.lossDays}L
            </span>
            <span style={{ color: "#9ca3af", marginLeft: "4px" }}>
              ({monthStats.winRateDays}% days)
            </span>
            <span style={{ color: "#374151" }}>|</span>
            <span
              className="tj-mono"
              style={{
                fontWeight: 700,
                color: monthStats.totalPnL >= 0 ? "#10b981" : "#f87171",
              }}
            >
              {monthStats.totalPnL >= 0 ? "+" : ""}
              ${monthStats.totalPnL.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={prevMonth}
              className="tj-btn tj-btn-ghost tj-focus-visible"
              style={{ padding: "6px 10px", fontSize: "12px" }}
              title="Previous Month"
            >
              ◀
            </button>
            <button
              onClick={todayMonth}
              className="tj-btn tj-btn-ghost tj-focus-visible"
              style={{ padding: "6px 10px", fontSize: "12px" }}
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="tj-btn tj-btn-ghost tj-focus-visible"
              style={{ padding: "6px 10px", fontSize: "12px" }}
              title="Next Month"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: "15px",
          marginBottom: "12px",
          color: "#fff",
        }}
      >
        {monthName}
      </div>

      {/* Calendar Weekday Labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "6px",
          marginBottom: "6px",
          textAlign: "center",
          fontSize: "11px",
          fontWeight: 600,
          color: "#9ca3af",
          textTransform: "uppercase",
        }}
      >
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "6px",
        }}
      >
        {calendarCells.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={`empty_${idx}`}
                style={{
                  minHeight: "70px",
                  background: "rgba(255,255,255,0.01)",
                  borderRadius: "8px",
                  border: "1px dashed rgba(255,255,255,0.04)",
                }}
              />
            );
          }

          const { day, dateStr, data } = cell;
          const isToday = dateStr === todayStr;
          const hasTrades = !!data;
          const pnl = data?.pnl || 0;

          // Box styling based on profit / loss
          let boxBg = "#16161a";
          let boxBorder = "1px solid #1f2937";
          let textColor = "#e5e7eb";

          if (hasTrades) {
            if (pnl > 0) {
              boxBg = "rgba(16, 185, 129, 0.18)";
              boxBorder = "1.5px solid #10b981";
              textColor = "#10b981";
            } else if (pnl < 0) {
              boxBg = "rgba(248, 113, 113, 0.18)";
              boxBorder = "1.5px solid #f87171";
              textColor = "#f87171";
            } else {
              boxBg = "rgba(99, 102, 241, 0.15)";
              boxBorder = "1.5px solid #6366f1";
              textColor = "#818cf8";
            }
          }

          return (
            <div
              key={dateStr}
              onClick={() => {
                if (hasTrades) {
                  onSelectDate(dateStr);
                } else {
                  onAddTradeForDate(dateStr);
                }
              }}
              style={{
                minHeight: "72px",
                borderRadius: "8px",
                background: boxBg,
                border: isToday ? "2px solid #6366f1" : boxBorder,
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "transform 0.12s ease, box-shadow 0.12s ease",
                position: "relative",
              }}
              className="tj-row tj-focus-visible"
              title={
                hasTrades
                  ? `${dateStr}: ${data.count} trade(s), P/L: ${fmtMoney(pnl)}`
                  : `${dateStr}: Click to log trade`
              }
            >
              {/* Day number & Today badge */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: isToday ? 800 : 600,
                    color: isToday ? "#818cf8" : "#9ca3af",
                  }}
                >
                  {day}
                </span>

                {isToday && (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      background: "#6366f1",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    TODAY
                  </span>
                )}
              </div>

              {/* Trade PnL & Trade count */}
              {hasTrades ? (
                <div style={{ marginTop: "4px" }}>
                  <div
                    className="tj-mono"
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: textColor,
                    }}
                  >
                    {fmtMoney(pnl)}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#9ca3af",
                      marginTop: "1px",
                    }}
                  >
                    {data.count} trade{data.count > 1 ? "s" : ""}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#4b5563",
                    textAlign: "right",
                  }}
                >
                  + log
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
