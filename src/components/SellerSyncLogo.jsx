import React from "react";

export default function SellerSyncLogo({
  size = 28,
  variant = "default", // default | compact
  className = "",
}) {
  const iconSize = Math.max(14, Math.round(size * 0.5));
  const textSize = variant === "compact" ? 14 : Math.max(15, Math.round(size * 0.56));

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        userSelect: "none",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 12px 28px rgba(99,102,241,0.28)",
        }}
      >
        {/* Purple checkmark icon */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          style={{ display: "block" }}
        >
          <path
            d="M20 6L9 17L4 12"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <span
        style={{
          fontWeight: 900,
          fontSize: textSize,
          letterSpacing: "-0.4px",
          color: "#111",
        }}
      >
        SellerSync
      </span>
    </div>
  );
}

