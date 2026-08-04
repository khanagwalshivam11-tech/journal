import React from "react";

interface Props {
  imageUrl: string;
  symbol: string;
  date: string;
  direction: string;
  pnl?: number;
  onClose: () => void;
}

export const TradeScreenshotModal: React.FC<Props> = ({
  imageUrl,
  symbol,
  date,
  direction,
  pnl,
  onClose,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "92vw",
          maxHeight: "90vh",
          backgroundColor: "#111114",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid #1f2937",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0d0d0f",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#e5e7eb" }}>
              {symbol} Chart Screenshot
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: direction === "long" ? "rgba(16,185,129,0.15)" : "rgba(248,113,113,0.15)",
                color: direction === "long" ? "#10b981" : "#f87171",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {direction}
            </span>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{date}</span>
            {pnl !== undefined && (
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: pnl >= 0 ? "#10b981" : "#f87171",
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                {pnl >= 0 ? "+" : ""}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="tj-focus-visible"
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: "18px",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Image Container */}
        <div
          style={{
            overflow: "auto",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#08080a",
            maxHeight: "calc(85vh - 60px)",
          }}
        >
          <img
            src={imageUrl}
            alt={`${symbol} trade setup`}
            style={{
              maxWidth: "100%",
              maxHeight: "75vh",
              objectFit: "contain",
              borderRadius: "6px",
            }}
          />
        </div>
      </div>
    </div>
  );
};
