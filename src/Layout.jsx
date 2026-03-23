import React from "react";

export default function Layout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#1a1410",
        background:
          "radial-gradient(circle at 20% 20%, rgba(120,72,32,0.2), transparent 40%), " +
          "linear-gradient(135deg, #120e0b 0%, #1f1712 50%, #120e0b 100%)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <main
        style={{
          flex: 1,
          maxWidth: "1600px",
          width: "100%",
          margin: "0 auto",
          padding: "24px 16px",
        }}
      >
        {children}
      </main>
    </div>
  );
}