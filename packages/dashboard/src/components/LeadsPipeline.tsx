import React from "react";

interface PipelineStage {
  name: string;
  count: number;
  color: string;
}

export function LeadsPipeline() {
  // In production: fetches from Supabase in real-time
  const stages: PipelineStage[] = [
    { name: "New", count: 0, color: "#3b82f6" },
    { name: "Nurturing", count: 0, color: "#f59e0b" },
    { name: "Qualified", count: 0, color: "#10b981" },
    { name: "Converted", count: 0, color: "#6366f1" },
  ];

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Lead Pipeline
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {stages.map((stage) => (
          <div
            key={stage.name}
            style={{
              background: "white",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              borderTop: `4px solid ${stage.color}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
              {stage.name}
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{stage.count}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: "0.5rem",
          padding: "2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        <p>Connect your Supabase instance to see live lead data.</p>
        <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
          Set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.
        </p>
      </div>
    </div>
  );
}
