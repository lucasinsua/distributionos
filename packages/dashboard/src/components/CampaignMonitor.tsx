import React from "react";

export function CampaignMonitor() {
  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Campaign Monitor
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Active Campaigns", count: 0 },
          { label: "Emails Sent (Today)", count: 0 },
          { label: "Reply Rate", count: "—" },
          { label: "Domains Warming", count: 0 },
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
          </div>
        ))}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Campaign List</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "0.75rem" }}>Name</th>
              <th style={{ padding: "0.75rem" }}>Type</th>
              <th style={{ padding: "0.75rem" }}>Channel</th>
              <th style={{ padding: "0.75rem" }}>Status</th>
              <th style={{ padding: "0.75rem" }}>Sent</th>
              <th style={{ padding: "0.75rem" }}>Replies</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                No campaigns yet. Create one using the mcp-outreach tools.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
