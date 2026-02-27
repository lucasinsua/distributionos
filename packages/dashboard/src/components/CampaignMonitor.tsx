import React from "react";
import { useQuery } from "../hooks/useQuery.js";

interface CampaignRow {
  id: string;
  name: string;
  type: string;
  channel: string;
  status: string;
  metrics: { impressions?: number; clicks?: number; conversions?: number } | null;
  started_at: string | null;
  created_at: string;
}

export function CampaignMonitor() {
  const { data: campaigns } = useQuery<CampaignRow[]>(async (db) => {
    if (!db) return [];
    const { data } = await db
      .from("campaigns")
      .select("id, name, type, channel, status, metrics, started_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  }, []);

  const all = campaigns ?? [];
  const active = all.filter((c) => c.status === "active");
  const totalSent = all.reduce((sum, c) => sum + ((c.metrics as Record<string, number> | null)?.impressions ?? 0), 0);
  const totalReplies = all.reduce((sum, c) => sum + ((c.metrics as Record<string, number> | null)?.clicks ?? 0), 0);
  const replyRate = totalSent > 0 ? `${((totalReplies / totalSent) * 100).toFixed(1)}%` : "\u2014";

  const stats = [
    { label: "Active Campaigns", count: active.length },
    { label: "Emails Sent", count: totalSent },
    { label: "Reply Rate", count: replyRate },
    { label: "Total Campaigns", count: all.length },
  ];

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Campaign Monitor
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map((item) => (
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

      <div style={{ background: "white", borderRadius: "0.5rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
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
            {all.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                  No campaigns yet. Create one using the mcp-outreach tools.
                </td>
              </tr>
            ) : (
              all.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{c.name}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{c.type}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{c.channel}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: c.status === "active" ? "#d1fae5" : c.status === "completed" ? "#e0e7ff" : "#f3f4f6",
                      color: c.status === "active" ? "#065f46" : c.status === "completed" ? "#3730a3" : "#6b7280",
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    {(c.metrics as Record<string, number> | null)?.impressions ?? 0}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    {(c.metrics as Record<string, number> | null)?.clicks ?? 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
