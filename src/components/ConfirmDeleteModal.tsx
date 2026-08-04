import React from "react";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onCancel}
    >
      <div
        className="tj-card"
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#111115",
          border: "1px solid #1f2937",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          padding: "22px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(248, 113, 113, 0.15)",
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div>
            <h3 className="tj-display" style={{ fontSize: "17px", margin: 0, color: "#fff", fontWeight: 700 }}>
              {title}
            </h3>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>Confirmation required</span>
          </div>
        </div>

        <p style={{ fontSize: "13.5px", color: "#d1d5db", margin: "0 0 20px 0", lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            className="tj-btn tj-btn-ghost tj-focus-visible"
            style={{ fontSize: "13px" }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="tj-btn tj-focus-visible"
            style={{
              fontSize: "13px",
              background: "#dc2626",
              color: "#ffffff",
              border: "1px solid #ef4444",
              fontWeight: 600,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
