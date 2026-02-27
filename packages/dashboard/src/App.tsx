import React, { useState } from "react";
import { LeadsPipeline } from "./components/LeadsPipeline.js";
import { ContentOverview } from "./components/ContentOverview.js";
import { CampaignMonitor } from "./components/CampaignMonitor.js";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard.js";

type Tab = "pipeline" | "content" | "campaigns" | "analytics";

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("pipeline");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f9fafb" }}>
      <header
        style={{
          background: "#111827",
          color: "white",
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Prospecting Engine</h1>
        <nav style={{ display: "flex", gap: "1rem" }}>
          {(["pipeline", "content", "campaigns", "analytics"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#4f46e5" : "transparent",
                color: "white",
                border: "1px solid " + (activeTab === tab ? "#4f46e5" : "#374151"),
                borderRadius: "0.375rem",
                padding: "0.5rem 1rem",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        {activeTab === "pipeline" && <LeadsPipeline />}
        {activeTab === "content" && <ContentOverview />}
        {activeTab === "campaigns" && <CampaignMonitor />}
        {activeTab === "analytics" && <AnalyticsDashboard />}
      </main>
    </div>
  );
}
