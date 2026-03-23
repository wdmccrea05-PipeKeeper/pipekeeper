import React from "react";

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      {/* Main Content */}
      <main className="layout-content">
        {children}
      </main>
    </div>
  );
}