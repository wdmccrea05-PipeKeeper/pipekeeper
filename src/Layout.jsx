import React from "react";

export default function Layout({ children }) {
  return (
    <div
      className="app-layout"
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 20% 20%, rgba(120, 72, 32, 0.25), transparent 40%), radial-gradient(circle at 80% 80%, rgba(120, 72, 32, 0.15), transparent 40%), linear-gradient(135deg, #120e0b 0%, #1f1712 50%, #120e0b 100%)",
      }}
    >
      {/* Main Content */}
      <main className="layout-content">
        {children}
      </main>
    </div>
  );
}