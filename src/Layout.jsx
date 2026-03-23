import React from "react";

export default function Layout({ children }) {
  return (
    <div
      className="app-root"
      style={{
        minHeight: "100vh",
        backgroundColor: "#1a1410",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}