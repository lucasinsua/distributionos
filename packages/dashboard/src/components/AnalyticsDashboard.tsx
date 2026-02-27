import React from "react";

export function AnalyticsDashboard() {
  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Analytics
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Leads", value: 0 },
          { label: "Avg Lead Score", value: 0 },
          { label: "Conversion Rate", value: "—" },
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
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{item.value}</div>
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
          <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Channel Performance</h3>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            ROI comparison across SEO, social, community, cold email, and paid channels.
            Data populates after campaigns are running.
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
          <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Optimization Recommendations</h3>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            AI-powered recommendations for resource reallocation will appear here
            after sufficient data collection.
          </p>
        </div>
      </div>
    </div>
  );
}
