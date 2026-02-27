import React from "react";

export function ContentOverview() {
  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Content Overview
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Lead Magnets", count: 0, sub: "Active" },
          { label: "SEO Articles", count: 0, sub: "Published" },
          { label: "Social Posts", count: 0, sub: "Scheduled" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "white",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{item.label}</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{item.count}</div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div
          style={{
            background: "white",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Pending Review</h3>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Community replies and social posts awaiting human approval will appear here.
          </p>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Recent Lead Magnets</h3>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Generated lead magnets and their performance metrics will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
