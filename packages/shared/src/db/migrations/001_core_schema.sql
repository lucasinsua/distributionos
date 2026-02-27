-- ============================================================
-- Prospecting Engine — Core Schema Migration
-- ============================================================
-- Covers all tables defined in the system architecture document.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── SaaS Products ──────────────────────────────────────────
CREATE TABLE saas_products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  domain        TEXT,
  icp_criteria  JSONB NOT NULL DEFAULT '{}',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saas_products_slug ON saas_products(slug);
CREATE INDEX idx_saas_products_active ON saas_products(active);

-- ── Companies ──────────────────────────────────────────────
CREATE TABLE companies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  domain              TEXT,
  industry            TEXT,
  employee_count      INTEGER,
  tech_stack          TEXT[] NOT NULL DEFAULT '{}',
  funding_stage       TEXT,
  annual_revenue_est  NUMERIC,
  enrichment_data     JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_companies_domain ON companies(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_companies_industry ON companies(industry);

-- ── Leads ──────────────────────────────────────────────────
CREATE TABLE leads (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                    TEXT NOT NULL UNIQUE,
  first_name               TEXT,
  last_name                TEXT,
  company_id               UUID REFERENCES companies(id) ON DELETE SET NULL,
  role                     TEXT,
  source_channel           TEXT NOT NULL,
  source_campaign          TEXT,
  lead_score               INTEGER NOT NULL DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  fit_score                INTEGER NOT NULL DEFAULT 0 CHECK (fit_score BETWEEN 0 AND 40),
  intent_score             INTEGER NOT NULL DEFAULT 0 CHECK (intent_score BETWEEN 0 AND 35),
  engagement_score         INTEGER NOT NULL DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 25),
  status                   TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','nurturing','qualified','converted','lost')),
  assigned_saas_product_id UUID REFERENCES saas_products(id) ON DELETE SET NULL,
  enrichment_data          JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_leads_assigned_product ON leads(assigned_saas_product_id);
CREATE INDEX idx_leads_source_channel ON leads(source_channel);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- ── Lead Magnets ───────────────────────────────────────────
CREATE TABLE lead_magnets (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                   TEXT NOT NULL,
  type                    TEXT NOT NULL CHECK (type IN ('email_course','pdf_guide','interactive_tool','template_pack','mini_saas')),
  topic                   TEXT NOT NULL,
  description             TEXT,
  target_saas_product_id  UUID NOT NULL REFERENCES saas_products(id) ON DELETE CASCADE,
  landing_page_url        TEXT,
  conversion_rate         NUMERIC NOT NULL DEFAULT 0 CHECK (conversion_rate BETWEEN 0 AND 1),
  total_signups           INTEGER NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  content_data            JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_magnets_product ON lead_magnets(target_saas_product_id);
CREATE INDEX idx_lead_magnets_status ON lead_magnets(status);
CREATE INDEX idx_lead_magnets_type ON lead_magnets(type);

-- ── Campaigns ──────────────────────────────────────────────
CREATE TABLE campaigns (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('cold','seo','social','community','paid')),
  channel           TEXT NOT NULL,
  lead_magnet_id    UUID REFERENCES lead_magnets(id) ON DELETE SET NULL,
  saas_product_id   UUID REFERENCES saas_products(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','paused','completed','cancelled')),
  metrics           JSONB,
  config            JSONB,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_type ON campaigns(type);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_product ON campaigns(saas_product_id);

-- ── Email Sequences ────────────────────────────────────────
CREATE TABLE email_sequences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('cold','nurture','course')),
  saas_product_id   UUID REFERENCES saas_products(id) ON DELETE SET NULL,
  lead_magnet_id    UUID REFERENCES lead_magnets(id) ON DELETE SET NULL,
  steps             JSONB NOT NULL DEFAULT '[]',
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_sequences_type ON email_sequences(type);
CREATE INDEX idx_email_sequences_active ON email_sequences(active);

-- ── Interactions ───────────────────────────────────────────
CREATE TABLE interactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  metadata      JSONB,
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  content_id    UUID, -- FK added after content table
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interactions_lead ON interactions(lead_id);
CREATE INDEX idx_interactions_type ON interactions(type);
CREATE INDEX idx_interactions_campaign ON interactions(campaign_id);
CREATE INDEX idx_interactions_timestamp ON interactions(timestamp DESC);

-- ── Content ────────────────────────────────────────────────
CREATE TABLE content (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                  TEXT NOT NULL CHECK (type IN ('article','social_post','community_reply','email_copy','landing_page')),
  title                 TEXT,
  body                  TEXT NOT NULL,
  platform              TEXT NOT NULL,
  url                   TEXT,
  saas_product_id       UUID REFERENCES saas_products(id) ON DELETE SET NULL,
  campaign_id           UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  performance_metrics   JSONB,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','published','archived')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_platform ON content(platform);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_product ON content(saas_product_id);

-- Add FK from interactions to content now that the table exists
ALTER TABLE interactions
  ADD CONSTRAINT fk_interactions_content
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE SET NULL;

-- ── Pain Points ────────────────────────────────────────────
CREATE TABLE pain_points (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic             TEXT NOT NULL,
  description       TEXT NOT NULL,
  source            TEXT NOT NULL,
  source_url        TEXT,
  frequency_score   INTEGER NOT NULL DEFAULT 0 CHECK (frequency_score BETWEEN 0 AND 100),
  recency_score     INTEGER NOT NULL DEFAULT 0 CHECK (recency_score BETWEEN 0 AND 100),
  alignment_score   INTEGER NOT NULL DEFAULT 0 CHECK (alignment_score BETWEEN 0 AND 100),
  composite_score   INTEGER NOT NULL DEFAULT 0 CHECK (composite_score BETWEEN 0 AND 100),
  saas_product_id   UUID REFERENCES saas_products(id) ON DELETE SET NULL,
  cluster_id        TEXT,
  raw_signals       JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pain_points_score ON pain_points(composite_score DESC);
CREATE INDEX idx_pain_points_product ON pain_points(saas_product_id);
CREATE INDEX idx_pain_points_cluster ON pain_points(cluster_id);

-- ── Prospect Lists ─────────────────────────────────────────
CREATE TABLE prospect_lists (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT,
  icp_criteria      JSONB NOT NULL DEFAULT '{}',
  sources           TEXT[] NOT NULL DEFAULT '{}',
  total_prospects   INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'building' CHECK (status IN ('building','ready','in_use','exhausted')),
  saas_product_id   UUID REFERENCES saas_products(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_lists_status ON prospect_lists(status);
CREATE INDEX idx_prospect_lists_product ON prospect_lists(saas_product_id);

-- ── Signals (buying signals & monitoring) ──────────────────
CREATE TABLE signals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type              TEXT NOT NULL,
  source            TEXT NOT NULL,
  source_url        TEXT,
  content           TEXT NOT NULL,
  entity_name       TEXT,
  entity_domain     TEXT,
  relevance_score   INTEGER NOT NULL DEFAULT 0 CHECK (relevance_score BETWEEN 0 AND 100),
  keywords_matched  TEXT[] NOT NULL DEFAULT '{}',
  processed         BOOLEAN NOT NULL DEFAULT false,
  lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signals_type ON signals(type);
CREATE INDEX idx_signals_processed ON signals(processed);
CREATE INDEX idx_signals_relevance ON signals(relevance_score DESC);
CREATE INDEX idx_signals_entity ON signals(entity_domain);

-- ── Updated-at triggers ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_saas_products_updated_at
  BEFORE UPDATE ON saas_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_lead_magnets_updated_at
  BEFORE UPDATE ON lead_magnets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_email_sequences_updated_at
  BEFORE UPDATE ON email_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_content_updated_at
  BEFORE UPDATE ON content FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_prospect_lists_updated_at
  BEFORE UPDATE ON prospect_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security (enabled, policies added per-app) ───
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

-- Service-role bypass policies (for MCP servers using service role key)
CREATE POLICY "Service role full access" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON saas_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON lead_magnets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON email_sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON content FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON pain_points FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON prospect_lists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON signals FOR ALL USING (true) WITH CHECK (true);
