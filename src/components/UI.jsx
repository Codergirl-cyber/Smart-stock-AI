/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Premium Spring Config
export const springConfig = { type: "spring", stiffness: 260, damping: 26 };

export const Card = ({ children, className = "", onClick, ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={springConfig}
    whileHover={onClick ? { backgroundColor: "var(--surface-hover)" } : {}}
    onClick={onClick}
    className={`card ${className}`}
    style={{
      background: "var(--surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      padding: "var(--space-6)",
      cursor: onClick ? "pointer" : "default",
      boxShadow: "var(--shadow-sm)",
      transition: "all 0.3s ease",
      ...props.style
    }}
  >
    {children}
  </motion.div>
);

export const Button = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
  const variants = {
    primary: { background: "var(--accent)", color: "#fff", border: "1px solid rgba(38, 48, 24, 0.22)" },
    secondary: { background: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" },
    ghost: { background: "transparent", color: "var(--text-secondary)", border: "none" },
    danger: { background: "var(--surface)", color: "var(--error)", border: "1px solid rgba(155, 63, 53, 0.32)" }
  };

  const sizes = {
    sm: { padding: "6px 12px", fontSize: "12px" },
    md: { padding: "8px 16px", fontSize: "13px" },
    lg: { padding: "10px 20px", fontSize: "14px" }
  };

  const hoverVariants = {
    primary: "var(--accent-hover)",
    secondary: "var(--surface-hover)",
    ghost: "transparent",
    danger: "transparent"
  };

  return (
    <motion.button
      whileHover={{ backgroundColor: hoverVariants[variant] }}
      whileTap={{ scale: 0.98 }}
      transition={springConfig}
      className={`btn ${className}`}
      style={{
        ...variants[variant],
        ...sizes[size],
        borderRadius: "var(--radius-sm)",
        fontWeight: "650",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: variant === "primary" ? "0 12px 24px rgba(70, 84, 45, 0.18)" : "none",
        transition: "all 0.3s ease",
        ...props.style
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const Badge = ({ children, status = "success" }) => {
  const styles = {
    success: { color: "var(--success)", bg: "var(--accent-soft)" },
    warning: { color: "var(--warning)", bg: "var(--warm-soft)" },
    error: { color: "var(--error)", bg: "#f8e9e5" },
    neutral: { color: "var(--text-secondary)", bg: "var(--surface-hover)" }
  };

  return (
    <motion.span 
      layout
      style={{
        background: styles[status].bg,
        color: styles[status].color,
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "600",
        display: "inline-block"
      }}
    >
      {children}
    </motion.span>
  );
};

export const Skeleton = ({ width, height, circle, className = "" }) => (
  <div 
    className={`skeleton ${className}`} 
    style={{ 
      width: width || "100%", 
      height: height || "20px", 
      background: "var(--border-subtle)",
      borderRadius: circle ? "50%" : "2px" 
    }} 
  />
);

export const Input = ({ label, ...props }) => (
  <div style={{ width: "100%" }}>
    {label && (
      <label style={{ 
        display: "block", 
        fontSize: "12px", 
        fontWeight: "500", 
        color: "var(--text-secondary)", 
        marginBottom: "6px",
      }}>
        {label}
      </label>
    )}
    <motion.input 
      {...props}
      whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 3px rgba(95, 111, 63, 0.12)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ 
        width: "100%", 
        background: "var(--surface)", 
        border: "1px solid var(--border)", 
        borderRadius: "var(--radius-sm)", 
        padding: "8px 12px", 
        color: "var(--text-primary)", 
        outline: "none",
        fontSize: "14px",
        ...props.style
      }}
    />
  </div>
);

export const CountUp = ({ end, duration = 1, prefix = "", suffix = "", delay = 0 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let timeoutId;
    let intervalId;

    const runCount = async () => {
      await Promise.resolve();

      if (!end || end === 0) {
        setCount(0);
        return;
      }

      timeoutId = window.setTimeout(() => {
        let current = 0;
        const frameCount = duration * 60; // 60fps
        const increment = end / frameCount;

        intervalId = window.setInterval(() => {
          current += increment;
          if (current >= end) {
            setCount(Math.floor(end));
            window.clearInterval(intervalId);
          } else {
            setCount(Math.floor(current));
          }
        }, 1000 / 60);
      }, delay * 1000);
    };

    runCount();

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [end, duration, delay]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};
