import React from "react";

export default function Layout({ children }) {
  // Safe env access (never throws)
  const stripeKey = (typeof import !== "undefined" && import.meta?.env?.VITE_STRIPE_KEY) || "";

  return (
    <div className="app-layout">
      {/* Main Content */}
      <main className="layout-content">
        {children}
      </main>
    </div>
  );
}