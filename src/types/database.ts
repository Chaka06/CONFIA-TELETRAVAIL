export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          template: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          template: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          template?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          max_attempts: number
          purpose: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          max_attempts?: number
          purpose?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string
          created_at: string
          date_of_birth: string
          email: string
          email_verified_at: string | null
          first_name: string
          id: string
          last_login_at: string | null
          last_name: string
          phone_number: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          date_of_birth: string
          email: string
          email_verified_at?: string | null
          first_name: string
          id: string
          last_login_at?: string | null
          last_name: string
          phone_number: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          date_of_birth?: string
          email?: string
          email_verified_at?: string | null
          first_name?: string
          id?: string
          last_login_at?: string | null
          last_name?: string
          phone_number?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tontine_basket_instances: {
        Row: {
          basket_type_id: string
          created_at: string
          filled_at: string | null
          id: string
          member_count: number
          round_number: number
          round_started_on: string | null
          status: Database["public"]["Enums"]["basket_instance_status"]
        }
        Insert: {
          basket_type_id: string
          created_at?: string
          filled_at?: string | null
          id?: string
          member_count?: number
          round_number?: number
          round_started_on?: string | null
          status?: Database["public"]["Enums"]["basket_instance_status"]
        }
        Update: {
          basket_type_id?: string
          created_at?: string
          filled_at?: string | null
          id?: string
          member_count?: number
          round_number?: number
          round_started_on?: string | null
          status?: Database["public"]["Enums"]["basket_instance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tontine_basket_instances_basket_type_id_fkey"
            columns: ["basket_type_id"]
            isOneToOne: false
            referencedRelation: "tontine_basket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_basket_types: {
        Row: {
          capacity: number
          commission_rate: number
          contribution_amount: number
          contributions_per_round: number
          created_at: string
          id: string
          interval_days: number
          is_active: boolean
          label: string
          payout_amount: number | null
          round_length_days: number | null
        }
        Insert: {
          capacity?: number
          commission_rate?: number
          contribution_amount: number
          contributions_per_round?: number
          created_at?: string
          id?: string
          interval_days: number
          is_active?: boolean
          label: string
          payout_amount?: number | null
          round_length_days?: number | null
        }
        Update: {
          capacity?: number
          commission_rate?: number
          contribution_amount?: number
          contributions_per_round?: number
          created_at?: string
          id?: string
          interval_days?: number
          is_active?: boolean
          label?: string
          payout_amount?: number | null
          round_length_days?: number | null
        }
        Relationships: []
      }
      tontine_contributions: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          membership_id: string
          occurrence_number: number
          paid_at: string | null
          payment_provider: string
          provider_payload: Json
          provider_reference: string | null
          reminder_sent_at: string | null
          round_number: number
          status: Database["public"]["Enums"]["contribution_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          membership_id: string
          occurrence_number: number
          paid_at?: string | null
          payment_provider?: string
          provider_payload?: Json
          provider_reference?: string | null
          reminder_sent_at?: string | null
          round_number: number
          status?: Database["public"]["Enums"]["contribution_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          membership_id?: string
          occurrence_number?: number
          paid_at?: string | null
          payment_provider?: string
          provider_payload?: Json
          provider_reference?: string | null
          reminder_sent_at?: string | null
          round_number?: number
          status?: Database["public"]["Enums"]["contribution_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tontine_contributions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "tontine_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_memberships: {
        Row: {
          basket_instance_id: string
          id: string
          join_order: number
          joined_at: string
          paid_out_at: string | null
          removed_at: string | null
          status: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Insert: {
          basket_instance_id: string
          id?: string
          join_order: number
          joined_at?: string
          paid_out_at?: string | null
          removed_at?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Update: {
          basket_instance_id?: string
          id?: string
          join_order?: number
          joined_at?: string
          paid_out_at?: string | null
          removed_at?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_memberships_basket_instance_id_fkey"
            columns: ["basket_instance_id"]
            isOneToOne: false
            referencedRelation: "tontine_basket_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tontine_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_payouts: {
        Row: {
          amount: number
          basket_instance_id: string
          beneficiary_payment_method: string | null
          beneficiary_phone: string | null
          beneficiary_submitted_at: string | null
          beneficiary_token: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          membership_id: string
          provider_reference: string | null
          round_number: number
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount: number
          basket_instance_id: string
          beneficiary_payment_method?: string | null
          beneficiary_phone?: string | null
          beneficiary_submitted_at?: string | null
          beneficiary_token?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          membership_id: string
          provider_reference?: string | null
          round_number: number
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount?: number
          basket_instance_id?: string
          beneficiary_payment_method?: string | null
          beneficiary_phone?: string | null
          beneficiary_submitted_at?: string | null
          beneficiary_token?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          membership_id?: string
          provider_reference?: string | null
          round_number?: number
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tontine_payouts_basket_instance_id_fkey"
            columns: ["basket_instance_id"]
            isOneToOne: false
            referencedRelation: "tontine_basket_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tontine_payouts_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tontine_payouts_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "tontine_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          metadata: Json
          reference_id: string | null
          reference_table: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_table?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_table?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_confirm_payout: {
        Args: { p_payout_id: string; p_processed_by: string }
        Returns: {
          basket_instance_id: string
          basket_label: string
          email: string
          first_name: string
          user_id: string
        }[]
      }
      fn_cancel_failed_join: {
        Args: { p_contribution_id: string }
        Returns: undefined
      }
      fn_confirm_contribution: {
        Args: {
          p_contribution_id: string
          p_paid_amount: number
          p_provider_reference: string
        }
        Returns: {
          basket_instance_id: string
          basket_label: string
          became_full: boolean
          beneficiary_token: string
          capacity: number
          member_count: number
          payout_amount: number
          payout_id: string
          winner_email: string
          winner_first_name: string
          winner_user_id: string
        }[]
      }
      fn_daily_tontine_sweep: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      join_basket: {
        Args: { p_basket_type_id: string }
        Returns: {
          amount: number
          basket_instance_id: string
          contribution_id: string
          membership_id: string
        }[]
      }
      submit_payout_beneficiary_info: {
        Args: { p_payment_method: string; p_phone: string; p_token: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "banned"
      app_role: "user" | "admin" | "super_admin"
      basket_instance_status: "filling" | "active" | "paused" | "completed"
      contribution_status: "pending" | "paid" | "missed"
      membership_status:
        | "active"
        | "removed_missed_payment"
        | "paid_out_left"
        | "cycle_completed"
      notification_type:
        | "basket_joined"
        | "basket_full"
        | "contribution_due"
        | "contribution_confirmed"
        | "member_removed"
        | "spot_opened"
        | "payout_ready"
        | "payout_confirmed"
        | "account_alert"
        | "system"
      payment_status:
        | "pending"
        | "confirmed"
        | "failed"
        | "cancelled"
        | "expired"
      payout_status: "pending" | "beneficiary_info_submitted" | "paid"
      transaction_type: "contribution" | "payout" | "adjustment"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "suspended", "banned"],
      app_role: ["user", "admin", "super_admin"],
      basket_instance_status: ["filling", "active", "paused", "completed"],
      contribution_status: ["pending", "paid", "missed"],
      membership_status: [
        "active",
        "removed_missed_payment",
        "paid_out_left",
        "cycle_completed",
      ],
      notification_type: [
        "basket_joined",
        "basket_full",
        "contribution_due",
        "contribution_confirmed",
        "member_removed",
        "spot_opened",
        "payout_ready",
        "payout_confirmed",
        "account_alert",
        "system",
      ],
      payment_status: [
        "pending",
        "confirmed",
        "failed",
        "cancelled",
        "expired",
      ],
      payout_status: ["pending", "beneficiary_info_submitted", "paid"],
      transaction_type: ["contribution", "payout", "adjustment"],
    },
  },
} as const

