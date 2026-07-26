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
    PostgrestVersion: "14.5"
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
      device_tokens: {
        Row: {
          created_at: string
          fcm_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fcm_token: string
          id?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fcm_token?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        Relationships: []
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
      formule_configs: {
        Row: {
          capacity: number
          commission_bps: number
          draw_delay_hours: number
          formule_amount: number
          mode: Database["public"]["Enums"]["panier_mode"]
          updated_at: string
        }
        Insert: {
          capacity: number
          commission_bps: number
          draw_delay_hours?: number
          formule_amount: number
          mode: Database["public"]["Enums"]["panier_mode"]
          updated_at?: string
        }
        Update: {
          capacity?: number
          commission_bps?: number
          draw_delay_hours?: number
          formule_amount?: number
          mode?: Database["public"]["Enums"]["panier_mode"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          payload: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      panier_memberships: {
        Row: {
          amount_paid: number | null
          checkout_url: string | null
          created_at: string
          geniuspay_reference: string | null
          id: string
          joined_at: string
          joined_in_cycle: number
          panier_id: string
          status: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          checkout_url?: string | null
          created_at?: string
          geniuspay_reference?: string | null
          id?: string
          joined_at?: string
          joined_in_cycle: number
          panier_id: string
          status?: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          checkout_url?: string | null
          created_at?: string
          geniuspay_reference?: string | null
          id?: string
          joined_at?: string
          joined_in_cycle?: number
          panier_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panier_memberships_panier_id_fkey"
            columns: ["panier_id"]
            isOneToOne: false
            referencedRelation: "my_paniers"
            referencedColumns: ["panier_id"]
          },
          {
            foreignKeyName: "panier_memberships_panier_id_fkey"
            columns: ["panier_id"]
            isOneToOne: false
            referencedRelation: "paniers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panier_memberships_panier_id_fkey"
            columns: ["panier_id"]
            isOneToOne: false
            referencedRelation: "paniers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      paniers: {
        Row: {
          capacity: number
          created_at: string
          cycle_index: number
          draw_at: string | null
          filled_at: string | null
          formule_amount: number
          id: string
          member_count: number
          mode: Database["public"]["Enums"]["panier_mode"]
        }
        Insert: {
          capacity: number
          created_at?: string
          cycle_index?: number
          draw_at?: string | null
          filled_at?: string | null
          formule_amount: number
          id?: string
          member_count?: number
          mode: Database["public"]["Enums"]["panier_mode"]
        }
        Update: {
          capacity?: number
          created_at?: string
          cycle_index?: number
          draw_at?: string | null
          filled_at?: string | null
          formule_amount?: number
          id?: string
          member_count?: number
          mode?: Database["public"]["Enums"]["panier_mode"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_paniers_formule"
            columns: ["mode", "formule_amount"]
            isOneToOne: true
            referencedRelation: "formule_configs"
            referencedColumns: ["mode", "formule_amount"]
          },
        ]
      }
      payout_claims: {
        Row: {
          admin_note: string | null
          id: string
          membership_id: string
          mobile_money_number: string
          mobile_money_provider: Database["public"]["Enums"]["mobile_money_provider"]
          paid_at: string | null
          status: Database["public"]["Enums"]["payout_claim_status"]
          submitted_at: string
        }
        Insert: {
          admin_note?: string | null
          id?: string
          membership_id: string
          mobile_money_number: string
          mobile_money_provider: Database["public"]["Enums"]["mobile_money_provider"]
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payout_claim_status"]
          submitted_at?: string
        }
        Update: {
          admin_note?: string | null
          id?: string
          membership_id?: string
          mobile_money_number?: string
          mobile_money_provider?: Database["public"]["Enums"]["mobile_money_provider"]
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payout_claim_status"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_claims_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "my_paniers"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "payout_claims_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "panier_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string
          city: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          birth_date: string
          city: string
          created_at?: string
          first_name: string
          id: string
          last_name: string
          phone: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          birth_date?: string
          city?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      my_paniers: {
        Row: {
          capacity: number | null
          checkout_url: string | null
          display_status: string | null
          draw_at: string | null
          filled_at: string | null
          formule_amount: number | null
          gain_net_amount: number | null
          joined_at: string | null
          joined_in_cycle: number | null
          member_count: number | null
          membership_id: string | null
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          mode: Database["public"]["Enums"]["panier_mode"] | null
          panier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_paniers_formule"
            columns: ["mode", "formule_amount"]
            isOneToOne: true
            referencedRelation: "formule_configs"
            referencedColumns: ["mode", "formule_amount"]
          },
        ]
      }
      paniers_public: {
        Row: {
          capacity: number | null
          draw_at: string | null
          filled_at: string | null
          formule_amount: number | null
          gain_net_amount: number | null
          id: string | null
          member_count: number | null
          mode: Database["public"]["Enums"]["panier_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_paniers_formule"
            columns: ["mode", "formule_amount"]
            isOneToOne: true
            referencedRelation: "formule_configs"
            referencedColumns: ["mode", "formule_amount"]
          },
        ]
      }
    }
    Functions: {
      fn_claim_signup_otp_attempt: {
        Args: { p_code_id: string }
        Returns: {
          attempts: number
          code_hash: string
          expires_at: string
          max_attempts: number
        }[]
      }
      get_geniuspay_secrets: {
        Args: never
        Returns: {
          name: string
          secret: string
        }[]
      }
      get_panier_detail: { Args: { p_panier_id: string }; Returns: Json }
      run_scheduled_panier_draws: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
      membership_status:
        | "pending_payment"
        | "active"
        | "won_pending_claim"
        | "won_pending_payout"
        | "paid_out"
        | "lost"
        | "payment_failed"
      mobile_money_provider:
        | "orange_money"
        | "wave"
        | "mtn_money"
        | "moov_money"
      panier_mode: "normal" | "rush"
      payout_claim_status: "submitted" | "paid"
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
      app_role: ["user", "admin", "super_admin"],
      membership_status: [
        "pending_payment",
        "active",
        "won_pending_claim",
        "won_pending_payout",
        "paid_out",
        "lost",
        "payment_failed",
      ],
      mobile_money_provider: [
        "orange_money",
        "wave",
        "mtn_money",
        "moov_money",
      ],
      panier_mode: ["normal", "rush"],
      payout_claim_status: ["submitted", "paid"],
    },
  },
} as const
