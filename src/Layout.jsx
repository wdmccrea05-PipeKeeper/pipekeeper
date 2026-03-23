import React from "react";

export default function Layout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#1a1410",
      }}
    >
      <main>{children}</main>
    </div>
  );
}