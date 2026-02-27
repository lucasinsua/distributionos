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
        Insert: {
          id?: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          company_id?: string | null;
          role?: string | null;
          source_channel: string;
          source_campaign?: string | null;
          lead_score?: number;
          fit_score?: number;
          intent_score?: number;
          engagement_score?: number;
          status?: string;
          assigned_saas_product_id?: string | null;
          enrichment_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          company_id?: string | null;
          role?: string | null;
          source_channel?: string;
          source_campaign?: string | null;
          lead_score?: number;
          fit_score?: number;
          intent_score?: number;
          engagement_score?: number;
          status?: string;
          assigned_saas_product_id?: string | null;
          enrichment_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_assigned_saas_product_id_fkey";
            columns: ["assigned_saas_product_id"];
            isOneToOne: false;
            referencedRelation: "saas_products";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          name: string;
          domain?: string | null;
          industry?: string | null;
          employee_count?: number | null;
          tech_stack?: string[];
          funding_stage?: string | null;
          annual_revenue_est?: number | null;
          enrichment_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          domain?: string | null;
          industry?: string | null;
          employee_count?: number | null;
          tech_stack?: string[];
          funding_stage?: string | null;
          annual_revenue_est?: number | null;
          enrichment_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          domain?: string | null;
          icp_criteria?: Record<string, unknown>;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          domain?: string | null;
          icp_criteria?: Record<string, unknown>;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          title: string;
          type: string;
          topic: string;
          description?: string | null;
          target_saas_product_id: string;
          landing_page_url?: string | null;
          conversion_rate?: number;
          total_signups?: number;
          status?: string;
          content_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: string;
          topic?: string;
          description?: string | null;
          target_saas_product_id?: string;
          landing_page_url?: string | null;
          conversion_rate?: number;
          total_signups?: number;
          status?: string;
          content_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_magnets_target_saas_product_id_fkey";
            columns: ["target_saas_product_id"];
            isOneToOne: false;
            referencedRelation: "saas_products";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          name: string;
          type: string;
          channel: string;
          lead_magnet_id?: string | null;
          saas_product_id?: string | null;
          status?: string;
          metrics?: Record<string, unknown> | null;
          config?: Record<string, unknown> | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          channel?: string;
          lead_magnet_id?: string | null;
          saas_product_id?: string | null;
          status?: string;
          metrics?: Record<string, unknown> | null;
          config?: Record<string, unknown> | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_lead_magnet_id_fkey";
            columns: ["lead_magnet_id"];
            isOneToOne: false;
            referencedRelation: "lead_magnets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_saas_product_id_fkey";
            columns: ["saas_product_id"];
            isOneToOne: false;
            referencedRelation: "saas_products";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          lead_id: string;
          type: string;
          metadata?: Record<string, unknown> | null;
          campaign_id?: string | null;
          content_id?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          type?: string;
          metadata?: Record<string, unknown> | null;
          campaign_id?: string | null;
          content_id?: string | null;
          timestamp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interactions_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_interactions_content";
            columns: ["content_id"];
            isOneToOne: false;
            referencedRelation: "content";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          name: string;
          type: string;
          saas_product_id?: string | null;
          lead_magnet_id?: string | null;
          steps?: Record<string, unknown>[];
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          saas_product_id?: string | null;
          lead_magnet_id?: string | null;
          steps?: Record<string, unknown>[];
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_sequences_saas_product_id_fkey";
            columns: ["saas_product_id"];
            isOneToOne: false;
            referencedRelation: "saas_products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_sequences_lead_magnet_id_fkey";
            columns: ["lead_magnet_id"];
            isOneToOne: false;
            referencedRelation: "lead_magnets";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          type: string;
          title?: string | null;
          body: string;
          platform: string;
          url?: string | null;
          saas_product_id?: string | null;
          campaign_id?: string | null;
          performance_metrics?: Record<string, unknown> | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string | null;
          body?: string;
          platform?: string;
          url?: string | null;
          saas_product_id?: string | null;
          campaign_id?: string | null;
          performance_metrics?: Record<string, unknown> | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_saas_product_id_fkey";
            columns: ["saas_product_id"];
            isOneToOne: false;
            referencedRelation: "saas_products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          topic: string;
          description: string;
          source: string;
          source_url?: string | null;
          frequency_score?: number;
          recency_score?: number;
          alignment_score?: number;
          composite_score?: number;
          saas_product_id?: string | null;
          cluster_id?: string | null;
          raw_signals?: Record<string, unknown>[];
          created_at?: string;
        };
        Update: {
          id?: string;
          topic?: string;
          description?: string;
          source?: string;
          source_url?: string | null;
          frequency_score?: number;
          recency_score?: number;
          alignment_score?: number;
          composite_score?: number;
          saas_product_id?: string | null;
          cluster_id?: string | null;
          raw_signals?: Record<string, unknown>[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pain_points_saas_product_id_fkey";
            columns: ["saas_product_id"];
            isOneToOne: false;
            referencedRelation: "saas_products";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icp_criteria?: Record<string, unknown>;
          sources?: string[];
          total_prospects?: number;
          status?: string;
          saas_product_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icp_criteria?: Record<string, unknown>;
          sources?: string[];
          total_prospects?: number;
          status?: string;
          saas_product_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prospect_lists_saas_product_id_fkey";
            columns: ["saas_product_id"];
            isOneToOne: false;
            referencedRelation: "saas_products";
            referencedColumns: ["id"];
          },
        ];
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
        Insert: {
          id?: string;
          type: string;
          source: string;
          source_url?: string | null;
          content: string;
          entity_name?: string | null;
          entity_domain?: string | null;
          relevance_score?: number;
          keywords_matched?: string[];
          processed?: boolean;
          lead_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          source?: string;
          source_url?: string | null;
          content?: string;
          entity_name?: string | null;
          entity_domain?: string | null;
          relevance_score?: number;
          keywords_matched?: string[];
          processed?: boolean;
          lead_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "signals_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
