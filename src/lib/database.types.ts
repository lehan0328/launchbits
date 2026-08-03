export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      github_check_runs: {
        Row: {
          check_run_id: number | null
          created_at: string | null
          id: string
          launch_id: string
          pr_number: number
          repo_full_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          check_run_id?: number | null
          created_at?: string | null
          id?: string
          launch_id: string
          pr_number: number
          repo_full_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          check_run_id?: number | null
          created_at?: string | null
          id?: string
          launch_id?: string
          pr_number?: number
          repo_full_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "github_check_runs_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_artifacts: {
        Row: {
          artifact_type: string
          id: string
          launch_id: string
          reference_id: string
          title: string | null
          url: string | null
        }
        Insert: {
          artifact_type: string
          id?: string
          launch_id: string
          reference_id: string
          title?: string | null
          url?: string | null
        }
        Update: {
          artifact_type?: string
          id?: string
          launch_id?: string
          reference_id?: string
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_artifacts_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_events: {
        Row: {
          event_type: string
          field_changed: string | null
          id: string
          launch_id: string
          launch_version: number
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          performed_at: string
          performed_by: string | null
          performed_by_name: string | null
        }
        Insert: {
          event_type: string
          field_changed?: string | null
          id?: string
          launch_id: string
          launch_version: number
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
          performed_by_name?: string | null
        }
        Update: {
          event_type?: string
          field_changed?: string | null
          id?: string
          launch_id?: string
          launch_version?: number
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
          performed_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_events_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_owners: {
        Row: {
          is_primary: boolean
          launch_id: string
          user_id: string
        }
        Insert: {
          is_primary?: boolean
          launch_id: string
          user_id: string
        }
        Update: {
          is_primary?: boolean
          launch_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_owners_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_owners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_reviews: {
        Row: {
          access_restricted: boolean
          fyi_allowed: boolean
          id: string
          launch_id: string
          notes: string | null
          owner_approval_disallowed: boolean
          review_definition_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          slo_breached: boolean
          slo_due_at: string | null
          slo_started_at: string | null
          status: Database["public"]["Enums"]["review_status"]
          trigger_reason: string | null
        }
        Insert: {
          access_restricted?: boolean
          fyi_allowed?: boolean
          id?: string
          launch_id: string
          notes?: string | null
          owner_approval_disallowed?: boolean
          review_definition_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          slo_breached?: boolean
          slo_due_at?: string | null
          slo_started_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          trigger_reason?: string | null
        }
        Update: {
          access_restricted?: boolean
          fyi_allowed?: boolean
          id?: string
          launch_id?: string
          notes?: string | null
          owner_approval_disallowed?: boolean
          review_definition_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          slo_breached?: boolean
          slo_due_at?: string | null
          slo_started_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          trigger_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_reviews_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_reviews_review_definition_id_fkey"
            columns: ["review_definition_id"]
            isOneToOne: false
            referencedRelation: "review_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          launch_id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          launch_id: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          launch_id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_subscriptions_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      launches: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          display_id: number
          github_pr_number: number | null
          github_repo: string | null
          hard_deadline: boolean
          id: string
          launch_justification: string | null
          name: string
          org_id: string
          q_ai_model_scope: string | null
          q_auth_secrets: string[] | null
          q_automated_decisions: boolean | null
          q_consent_mechanism: string | null
          q_data_classes: string[] | null
          q_deletion_controls: string | null
          q_external_sharing: string[] | null
          q_input_parsing: string[] | null
          q_network_exposure: string[] | null
          q_processing_purpose: string[] | null
          q_retention_ttl: string | null
          q_target_population: string[] | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["launch_status"]
          target_date: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          display_id?: number
          github_pr_number?: number | null
          github_repo?: string | null
          hard_deadline?: boolean
          id?: string
          launch_justification?: string | null
          name: string
          org_id: string
          q_ai_model_scope?: string | null
          q_auth_secrets?: string[] | null
          q_automated_decisions?: boolean | null
          q_consent_mechanism?: string | null
          q_data_classes?: string[] | null
          q_deletion_controls?: string | null
          q_external_sharing?: string[] | null
          q_input_parsing?: string[] | null
          q_network_exposure?: string[] | null
          q_processing_purpose?: string[] | null
          q_retention_ttl?: string | null
          q_target_population?: string[] | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["launch_status"]
          target_date?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          display_id?: number
          github_pr_number?: number | null
          github_repo?: string | null
          hard_deadline?: boolean
          id?: string
          launch_justification?: string | null
          name?: string
          org_id?: string
          q_ai_model_scope?: string | null
          q_auth_secrets?: string[] | null
          q_automated_decisions?: boolean | null
          q_consent_mechanism?: string | null
          q_data_classes?: string[] | null
          q_deletion_controls?: string | null
          q_external_sharing?: string[] | null
          q_input_parsing?: string[] | null
          q_network_exposure?: string[] | null
          q_processing_purpose?: string[] | null
          q_retention_ttl?: string | null
          q_target_population?: string[] | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["launch_status"]
          target_date?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "launches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          email_from_address: string | null
          email_resend_api_key_encrypted: string | null
          github_app_installation_id: number | null
          id: string
          name: string
          policy_rules: string
          slack_bot_token_encrypted: string | null
          slack_team_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_from_address?: string | null
          email_resend_api_key_encrypted?: string | null
          github_app_installation_id?: number | null
          id?: string
          name: string
          policy_rules?: string
          slack_bot_token_encrypted?: string | null
          slack_team_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_from_address?: string | null
          email_resend_api_key_encrypted?: string | null
          github_app_installation_id?: number | null
          id?: string
          name?: string
          policy_rules?: string
          slack_bot_token_encrypted?: string | null
          slack_team_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      review_definitions: {
        Row: {
          access_restricted: boolean
          description: string | null
          escalation_slack_channel: string | null
          fyi_allowed: boolean
          id: string
          label: string
          org_id: string
          owner_approval_disallowed: boolean
          review_type: Database["public"]["Enums"]["review_type"]
          reviewer_emails: string[] | null
          reviewer_slack_channel: string | null
          slo_business_days_only: boolean
          slo_days: number
        }
        Insert: {
          access_restricted?: boolean
          description?: string | null
          escalation_slack_channel?: string | null
          fyi_allowed?: boolean
          id?: string
          label: string
          org_id: string
          owner_approval_disallowed?: boolean
          review_type: Database["public"]["Enums"]["review_type"]
          reviewer_emails?: string[] | null
          reviewer_slack_channel?: string | null
          slo_business_days_only?: boolean
          slo_days?: number
        }
        Update: {
          access_restricted?: boolean
          description?: string | null
          escalation_slack_channel?: string | null
          fyi_allowed?: boolean
          id?: string
          label?: string
          org_id?: string
          owner_approval_disallowed?: boolean
          review_type?: Database["public"]["Enums"]["review_type"]
          reviewer_emails?: string[] | null
          reviewer_slack_channel?: string | null
          slo_business_days_only?: boolean
          slo_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_definitions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_messages: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          launch_id: string
          message_ts: string
          message_type: string
          org_id: string
          review_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          launch_id: string
          message_ts: string
          message_type: string
          org_id: string
          review_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          launch_id?: string
          message_ts?: string
          message_type?: string
          org_id?: string
          review_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_messages_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_messages_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "launch_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          org_id: string
          role: string
          slack_user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          email: string
          id?: string
          org_id: string
          role?: string
          slack_user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          org_id?: string
          role?: string
          slack_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_org_id: { Args: never; Returns: string }
    }
    Enums: {
      launch_status:
        | "DRAFT"
        | "IN_REVIEW"
        | "APPROVED"
        | "LAUNCHED"
        | "LAUNCHED_WITH_EXCEPTION"
        | "CANCELLED"
      review_status:
        | "NOT_REQUIRED"
        | "FYI"
        | "PENDING_REVIEW"
        | "IN_PROGRESS"
        | "NEEDS_WORK"
        | "APPROVED"
        | "DENIED"
      review_type:
        | "PRIVACY"
        | "SECURITY"
        | "LEGAL"
        | "ENGINEERING_LEAD"
        | "CUSTOM"
      risk_level: "LOW" | "MEDIUM" | "HIGH"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      launch_status: [
        "DRAFT",
        "IN_REVIEW",
        "APPROVED",
        "LAUNCHED",
        "LAUNCHED_WITH_EXCEPTION",
        "CANCELLED",
      ],
      review_status: [
        "NOT_REQUIRED",
        "FYI",
        "PENDING_REVIEW",
        "IN_PROGRESS",
        "NEEDS_WORK",
        "APPROVED",
        "DENIED",
      ],
      review_type: [
        "PRIVACY",
        "SECURITY",
        "LEGAL",
        "ENGINEERING_LEAD",
        "CUSTOM",
      ],
      risk_level: ["LOW", "MEDIUM", "HIGH"],
    },
  },
} as const
