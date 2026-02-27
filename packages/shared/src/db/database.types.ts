export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          company_id: string | null;
          role: string | null;
          source_channel: string;
          source_campaign: string | null;
          lead_score: number;
          fit_score: number;
          intent_score: number;
          engagement_score: number;
          status: string;
          assigned_saas_product_id: string | null;
          enrichment_data: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["leads"]["Row"],
          "id" | "created_at" | "updated_at" | "lead_score" | "fit_score" | "intent_score" | "engagement_score"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          lead_score?: number;
          fit_score?: number;
          intent_score?: number;
          engagement_score?: number;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
      companies: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          industry: string | null;
          employee_count: number | null;
          tech_stack: string[];
          funding_stage: string | null;
          annual_revenue_est: number | null;
          enrichment_data: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["companies"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
      };
      saas_products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          domain: string | null;
          icp_criteria: Record<string, unknown>;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["saas_products"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["saas_products"]["Insert"]>;
      };
      lead_magnets: {
        Row: {
          id: string;
          title: string;
          type: string;
          topic: string;
          description: string | null;
          target_saas_product_id: string;
          landing_page_url: string | null;
          conversion_rate: number;
          total_signups: number;
          status: string;
          content_data: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["lead_magnets"]["Row"],
          "id" | "created_at" | "updated_at" | "conversion_rate" | "total_signups"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          conversion_rate?: number;
          total_signups?: number;
        };
        Update: Partial<Database["public"]["Tables"]["lead_magnets"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          type: string;
          channel: string;
          lead_magnet_id: string | null;
          saas_product_id: string | null;
          status: string;
          metrics: Record<string, unknown> | null;
          config: Record<string, unknown> | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["campaigns"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
      };
      interactions: {
        Row: {
          id: string;
          lead_id: string;
          type: string;
          metadata: Record<string, unknown> | null;
          campaign_id: string | null;
          content_id: string | null;
          timestamp: string;
        };
        Insert: Omit<Database["public"]["Tables"]["interactions"]["Row"], "id"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["interactions"]["Insert"]>;
      };
      email_sequences: {
        Row: {
          id: string;
          name: string;
          type: string;
          saas_product_id: string | null;
          lead_magnet_id: string | null;
          steps: Record<string, unknown>[];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["email_sequences"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_sequences"]["Insert"]>;
      };
      content: {
        Row: {
          id: string;
          type: string;
          title: string | null;
          body: string;
          platform: string;
          url: string | null;
          saas_product_id: string | null;
          campaign_id: string | null;
          performance_metrics: Record<string, unknown> | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["content"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["content"]["Insert"]>;
      };
      pain_points: {
        Row: {
          id: string;
          topic: string;
          description: string;
          source: string;
          source_url: string | null;
          frequency_score: number;
          recency_score: number;
          alignment_score: number;
          composite_score: number;
          saas_product_id: string | null;
          cluster_id: string | null;
          raw_signals: Record<string, unknown>[];
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pain_points"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pain_points"]["Insert"]>;
      };
      prospect_lists: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icp_criteria: Record<string, unknown>;
          sources: string[];
          total_prospects: number;
          status: string;
          saas_product_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["prospect_lists"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["prospect_lists"]["Insert"]>;
      };
      signals: {
        Row: {
          id: string;
          type: string;
          source: string;
          source_url: string | null;
          content: string;
          entity_name: string | null;
          entity_domain: string | null;
          relevance_score: number;
          keywords_matched: string[];
          processed: boolean;
          lead_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["signals"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["signals"]["Insert"]>;
      };
    };
  };
}
