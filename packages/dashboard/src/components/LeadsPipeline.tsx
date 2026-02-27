import React from "react";
import { useQuery } from "../hooks/useQuery.js";

interface LeadRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  lead_score: number | null;
  created_at: string;
}

export function LeadsPipeline() {
  const { data: leads, loading, error } = useQuery<LeadRow[]>(async (db) => {
    if (!db) return [];
    const { data, error } = await db
      .from("leads")
      .select("id, email, first_name, last_name, status, lead_score, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  }, []);

  const all = leads ?? [];
  const stages = [
    { name: "New", count: all.filter((l) => l.status === "new").length, color: "#3b82f6" },
    { name: "Nurturing", count: all.filter((l) => l.status === "nurturing").length, color: "#f59e0b" },
    { name: "Qualified", count: all.filter((l) => l.status === "qualified").length, color: "#10b981" },
    { name: "Converted", count: all.filter((l) => l.status === "converted").length, color: "#6366f1" },
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

      {loading && (
        <div style={{ background: "white", borderRadius: "0.5rem", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center", color: "#6b7280" }}>
          Loading leads...
        </div>
      )}

      {error && (
        <div style={{ background: "white", borderRadius: "0.5rem", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center", color: "#6b7280" }}>
          <p>Connect your Supabase instance to see live lead data.</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.
          </p>
        </div>
      )}

      {!loading && !error && all.length > 0 && (
        <div style={{ background: "white", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "0.75rem" }}>Email</th>
                <th style={{ padding: "0.75rem" }}>Name</th>
                <th style={{ padding: "0.75rem" }}>Status</th>
                <th style={{ padding: "0.75rem" }}>Score</th>
                <th style={{ padding: "0.75rem" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {all.slice(0, 25).map((lead) => (
                <tr key={lead.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{lead.email}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "\u2014"}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: lead.status === "qualified" ? "#d1fae5" : lead.status === "nurturing" ? "#fef3c7" : lead.status === "converted" ? "#e0e7ff" : "#dbeafe",
                      color: lead.status === "qualified" ? "#065f46" : lead.status === "nurturing" ? "#92400e" : lead.status === "converted" ? "#3730a3" : "#1e40af",
                    }}>
                      {lead.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{lead.lead_score ?? "\u2014"}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && all.length === 0 && (
        <div style={{ background: "white", borderRadius: "0.5rem", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center", color: "#6b7280" }}>
          No leads yet. Generate a lead magnet and deploy a landing page to start collecting leads.
        </div>
      )}
    </div>
  );
}
