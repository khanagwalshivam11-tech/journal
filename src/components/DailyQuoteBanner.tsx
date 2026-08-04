import React, { useState, useEffect } from "react";
import { getDailyQuote, MOTIVATIONAL_QUOTES, Quote } from "../data/quotes";

export const DailyQuoteBanner: React.FC = () => {
  const [currentQuote, setCurrentQuote] = useState<Quote>(() => getDailyQuote());
  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Sync daily quote when date changes
  useEffect(() => {
    setCurrentQuote(getDailyQuote());
  }, []);

  const handleNextQuote = () => {
    setIsRotating(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
      setCurrentQuote(MOTIVATIONAL_QUOTES[randomIndex]);
      setIsRotating(false);
    }, 120);
  };

  const handleCopyQuote = () => {
    const textToCopy = `"${currentQuote.text}" — ${currentQuote.author}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getCategoryBadge = (cat: Quote["category"]) => {
    switch (cat) {
      case "devotional":
        return { label: "Divine Wisdom & Bhagavad Gita", icon: "🪔", color: "#fb923c", bg: "rgba(251, 146, 60, 0.15)" };
      case "boxing":
        return { label: "Boxing & Combat Mindset", icon: "🥊", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
      case "trading":
        return { label: "Trading Mastery", icon: "📈", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" };
      case "mindset":
        return { label: "Inner Strength", icon: "🧘", color: "#ec4899", bg: "rgba(236, 72, 153, 0.15)" };
      case "discipline":
      default:
        return { label: "Relentless Discipline", icon: "⚡", color: "#818cf8", bg: "rgba(99, 102, 241, 0.15)" };
    }
  };

  const badge = getCategoryBadge(currentQuote.category);

  return (
    <div
      className="tj-card"
      style={{
        marginBottom: "20px",
        background: "linear-gradient(135deg, #111115 0%, #171722 100%)",
        border: "1px solid #1f2937",
        padding: "18px 22px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Background Subtle Accent Glow */}
      <div
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "140px",
          height: "140px",
          borderRadius: "50%",
          background: badge.color,
          opacity: 0.08,
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "11px",
              padding: "3px 10px",
              borderRadius: "20px",
              background: badge.bg,
              color: badge.color,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              border: `1px solid ${badge.color}33`,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span>{badge.icon}</span> Daily Motivation • {badge.label}
          </span>
          <span style={{ fontSize: "11px", color: "#6b7280", fontFamily: "IBM Plex Mono, monospace" }}>
            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Controls: Next quote & Copy */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleCopyQuote}
            className="tj-btn tj-btn-ghost tj-focus-visible"
            style={{ padding: "4px 10px", fontSize: "11px", color: copied ? "#10b981" : "#9ca3af" }}
            title="Copy Quote"
          >
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>

          <button
            onClick={handleNextQuote}
            className="tj-btn tj-btn-ghost tj-focus-visible"
            style={{
              padding: "4px 10px",
              fontSize: "11px",
              color: "#818cf8",
              border: "1px solid rgba(129, 140, 248, 0.3)",
              background: "rgba(99, 102, 241, 0.1)",
            }}
            title="Get Another Quote"
          >
            🔄 New Quote
          </button>
        </div>
      </div>

      {/* Quote Text & Author */}
      <div
        style={{
          opacity: isRotating ? 0.3 : 1,
          transition: "opacity 0.15s ease-in-out",
          paddingLeft: "10px",
          borderLeft: `3px solid ${badge.color}`,
          marginTop: "6px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 500,
            color: "#f3f4f6",
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          "{currentQuote.text}"
        </p>
        <span
          style={{
            display: "inline-block",
            marginTop: "6px",
            fontSize: "12.5px",
            fontWeight: 700,
            color: badge.color,
            letterSpacing: "0.02em",
          }}
        >
          — {currentQuote.author}
        </span>
      </div>
    </div>
  );
};
