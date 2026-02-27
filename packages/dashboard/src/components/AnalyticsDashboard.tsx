import React from "react";
import { useQuery } from "../hooks/useQuery.js";

export function AnalyticsDashboard() {
  const { data: leadStats } = useQuery<{ total: number; avgScore: number; converted: number }>(async (db) => {
    if (!db) return { total: 0, avgScore: 0, converted: 0 };
    const { data: leads } = await db
      .from("leads")
      .select("lead_score, status");
    if (!leads) return { total: 0, avgScore: 0, converted: 0 };

    const total = leads.length;
    const scores = leads.filter((l) => l.lead_score != null).map((l) => l.lead_score as number);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const converted = leads.filter((l) => l.status === "converted").length;

    return { total, avgScore, converted };
  }, []);

  const { data: channelData } = useQuery<Array<{ channel: string; count: number }>>(async (db) => {
    if (!db) return [];
    const { data: leads } = await db
      .from("leads")
      .select("source_channel");
    if (!leads) return [];

    const counts = new Map<string, number>();
    for (const lead of leads) {
      const ch = (lead.source_channel as string) ?? "unknown";
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const { data: recentInteractions } = useQuery<Array<{ type: string; count: number }>>(async (db) => {
    if (!db) return [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await db
      .from("interactions")
      .select("type")
      .gte("timestamp", thirtyDaysAgo);
    if (!data) return [];

    const counts = new Map<string, number>();
    for (const row of data) {
      counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const stats = leadStats ?? { total: 0, avgScore: 0, converted: 0 };
  const convRate = stats.total > 0 ? `${((stats.converted / stats.total) * 100).toFixed(1)}%` : "\u2014";

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Analytics
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Leads", value: stats.total },
          { label: "Avg Lead Score", value: stats.avgScore },
          { label: "Conversion Rate", value: convRate },
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
        <div style={{ background: "white", borderRadius: "0.5rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Channel Performance</h3>
          {(channelData ?? []).length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              No channel data yet. Data populates after leads start arriving.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.5rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280" }}>Channel</th>
                  <th style={{ padding: "0.5rem", textAlign: "right", fontSize: "0.75rem", color: "#6b7280" }}>Leads</th>
                  <th style={{ padding: "0.5rem", textAlign: "right", fontSize: "0.75rem", color: "#6b7280" }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {(channelData ?? []).map((ch) => (
                  <tr key={ch.channel} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.5rem", fontSize: "0.875rem" }}>{ch.channel.replace("_", " ")}</td>
                    <td style={{ padding: "0.5rem", fontSize: "0.875rem", textAlign: "right" }}>{ch.count}</td>
                    <td style={{ padding: "0.5rem", fontSize: "0.875rem", textAlign: "right", color: "#6b7280" }}>
                      {stats.total > 0 ? `${((ch.count / stats.total) * 100).toFixed(0)}%` : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ background: "white", borderRadius: "0.5rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Interactions (30d)</h3>
          {(recentInteractions ?? []).length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              No interaction data yet.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {(recentInteractions ?? []).slice(0, 8).map((i) => (
                <li key={i.type} style={{ display: "flex", justifyContent: "space-between", padding: "0.375rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.875rem" }}>
                  <span>{i.type.replace(/_/g, " ")}</span>
                  <span style={{ fontWeight: 600 }}>{i.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
