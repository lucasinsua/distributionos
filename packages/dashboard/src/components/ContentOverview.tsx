import React from "react";
import { useQuery } from "../hooks/useQuery.js";

interface ContentRow {
  id: string;
  type: string;
  title: string;
  platform: string;
  status: string;
  created_at: string;
}

interface LeadMagnetRow {
  id: string;
  title: string;
  type: string;
  topic: string;
  status: string;
  landing_page_url: string | null;
  created_at: string;
}

export function ContentOverview() {
  const { data: content } = useQuery<ContentRow[]>(async (db) => {
    if (!db) return [];
    const { data } = await db
      .from("content")
      .select("id, type, title, platform, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  }, []);

  const { data: magnets } = useQuery<LeadMagnetRow[]>(async (db) => {
    if (!db) return [];
    const { data } = await db
      .from("lead_magnets")
      .select("id, title, type, topic, status, landing_page_url, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  }, []);

  const all = content ?? [];
  const allMagnets = magnets ?? [];
  const pending = all.filter((c) => c.status === "pending_review");

  const stats = [
    { label: "Lead Magnets", count: allMagnets.length, sub: `${allMagnets.filter((m) => m.status === "active").length} Active` },
    { label: "SEO Articles", count: all.filter((c) => c.type === "article").length, sub: `${all.filter((c) => c.type === "article" && c.status === "published").length} Published` },
    { label: "Social Posts", count: all.filter((c) => c.type === "social_post").length, sub: `${all.filter((c) => c.type === "social_post" && c.status === "draft").length} Drafts` },
  ];

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Content Overview
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
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
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ background: "white", borderRadius: "0.5rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Pending Review ({pending.length})</h3>
          {pending.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              No content awaiting review.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {pending.slice(0, 5).map((c) => (
                <li key={c.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.875rem" }}>
                  <strong>{c.title}</strong>
                  <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>{c.platform}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ background: "white", borderRadius: "0.5rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Recent Lead Magnets</h3>
          {allMagnets.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              No lead magnets created yet. Use mcp-content to generate one.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {allMagnets.slice(0, 5).map((m) => (
                <li key={m.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.875rem" }}>
                  <strong>{m.title}</strong>
                  <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>{m.type.replace("_", " ")}</span>
                  <span style={{
                    marginLeft: "0.5rem",
                    padding: "0.125rem 0.375rem",
                    borderRadius: "9999px",
                    fontSize: "0.7rem",
                    background: m.status === "active" ? "#d1fae5" : "#f3f4f6",
                    color: m.status === "active" ? "#065f46" : "#6b7280",
                  }}>
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
