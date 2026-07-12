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
      cycle_tiers: {
        Row: {
          completed_at: string | null
          cycle_id: string
          id: string
          missions_completed_count: number
          status: Database["public"]["Enums"]["tier_status"]
          tier_number: number
          unlocked_at: string | null
        }
        Insert: {
          completed_at?: string | null
          cycle_id: string
          id?: string
          missions_completed_count?: number
          status?: Database["public"]["Enums"]["tier_status"]
          tier_number: number
          unlocked_at?: string | null
        }
        Update: {
          completed_at?: string | null
          cycle_id?: string
          id?: string
          missions_completed_count?: number
          status?: Database["public"]["Enums"]["tier_status"]
          tier_number?: number
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_tiers_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "mission_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_tiers_tier_number_fkey"
            columns: ["tier_number"]
            isOneToOne: false
            referencedRelation: "tier_definitions"
            referencedColumns: ["tier_number"]
          },
        ]
      }
      deposits: {
        Row: {
          amount: number
          confirmed_at: string | null
          cycle_tier_id: string
          failed_reason: string | null
          id: string
          initiated_at: string
          payment_provider: string
          provider_payload: Json
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          cycle_tier_id: string
          failed_reason?: string | null
          id?: string
          initiated_at?: string
          payment_provider?: string
          provider_payload?: Json
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          cycle_tier_id?: string
          failed_reason?: string | null
          id?: string
          initiated_at?: string
          payment_provider?: string
          provider_payload?: Json
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_cycle_tier_id_fkey"
            columns: ["cycle_tier_id"]
            isOneToOne: false
            referencedRelation: "cycle_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
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
      mission_assignments: {
        Row: {
          assigned_at: string
          content_hash: string | null
          cycle_id: string
          expected_answer: Json
          expires_at: string | null
          id: string
          reward_amount: number
          slot_number: number
          status: Database["public"]["Enums"]["mission_assignment_status"]
          submission_data: Json | null
          submitted_at: string | null
          template_id: string
          tier_number: number
          user_id: string
          validated_at: string | null
          variant_content: Json
          variant_seed: string
        }
        Insert: {
          assigned_at?: string
          content_hash?: string | null
          cycle_id: string
          expected_answer: Json
          expires_at?: string | null
          id?: string
          reward_amount: number
          slot_number: number
          status?: Database["public"]["Enums"]["mission_assignment_status"]
          submission_data?: Json | null
          submitted_at?: string | null
          template_id: string
          tier_number: number
          user_id: string
          validated_at?: string | null
          variant_content: Json
          variant_seed: string
        }
        Update: {
          assigned_at?: string
          content_hash?: string | null
          cycle_id?: string
          expected_answer?: Json
          expires_at?: string | null
          id?: string
          reward_amount?: number
          slot_number?: number
          status?: Database["public"]["Enums"]["mission_assignment_status"]
          submission_data?: Json | null
          submitted_at?: string | null
          template_id?: string
          tier_number?: number
          user_id?: string
          validated_at?: string | null
          variant_content?: Json
          variant_seed?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_assignments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "mission_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_cycles: {
        Row: {
          completed_at: string | null
          current_tier: number
          cycle_number: number
          id: string
          started_at: string
          status: Database["public"]["Enums"]["cycle_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_tier?: number
          cycle_number: number
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["cycle_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_tier?: number
          cycle_number?: number
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["cycle_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          estimated_duration_seconds: number
          generator_key: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          estimated_duration_seconds?: number
          generator_key: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          estimated_duration_seconds?: number
          generator_key?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
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
          referral_code: string
          referred_by: string | null
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
          referral_code: string
          referred_by?: string | null
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
          referral_code?: string
          referred_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          amount: number
          created_at: string
          cycle_id: string
          id: string
          referee_id: string
          referrer_id: string
          status: string
          trigger_type: Database["public"]["Enums"]["referral_commission_trigger"]
        }
        Insert: {
          amount: number
          created_at?: string
          cycle_id: string
          id?: string
          referee_id: string
          referrer_id: string
          status?: string
          trigger_type: Database["public"]["Enums"]["referral_commission_trigger"]
        }
        Update: {
          amount?: number
          created_at?: string
          cycle_id?: string
          id?: string
          referee_id?: string
          referrer_id?: string
          status?: string
          trigger_type?: Database["public"]["Enums"]["referral_commission_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "mission_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_definitions: {
        Row: {
          label: string
          mission_reward_amount: number
          missions_per_tier: number
          required_deposit_amount: number
          tier_number: number
        }
        Insert: {
          label: string
          mission_reward_amount: number
          missions_per_tier?: number
          required_deposit_amount: number
          tier_number: number
        }
        Update: {
          label?: string
          mission_reward_amount?: number
          missions_per_tier?: number
          required_deposit_amount?: number
          tier_number?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
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
          balance_after: number
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
          balance_after?: number
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
      wallets: {
        Row: {
          balance: number
          lifetime_deposited: number
          lifetime_mission_earnings: number
          lifetime_referral_earnings: number
          lifetime_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          lifetime_deposited?: number
          lifetime_mission_earnings?: number
          lifetime_referral_earnings?: number
          lifetime_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          lifetime_deposited?: number
          lifetime_mission_earnings?: number
          lifetime_referral_earnings?: number
          lifetime_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_rights: {
        Row: {
          cap_amount: number
          granted_at: string
          id: string
          source_cycle_id: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          cap_amount?: number
          granted_at?: string
          id?: string
          source_cycle_id: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          cap_amount?: number
          granted_at?: string
          id?: string
          source_cycle_id?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_rights_source_cycle_id_fkey"
            columns: ["source_cycle_id"]
            isOneToOne: true
            referencedRelation: "mission_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_rights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          destination_details: Json
          destination_provider: string
          id: string
          is_unrestricted: boolean
          processed_at: string | null
          processed_by: string | null
          provider_reference: string | null
          rejected_reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
          withdrawal_right_id: string | null
        }
        Insert: {
          amount: number
          destination_details: Json
          destination_provider?: string
          id?: string
          is_unrestricted?: boolean
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          rejected_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
          withdrawal_right_id?: string | null
        }
        Update: {
          amount?: number
          destination_details?: Json
          destination_provider?: string
          id?: string
          is_unrestricted?: boolean
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          rejected_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
          withdrawal_right_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_withdrawal_right_id_fkey"
            columns: ["withdrawal_right_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_rights"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_withdrawal: {
        Args: {
          p_processed_by?: string
          p_provider_reference: string
          p_withdrawal_id: string
        }
        Returns: undefined
      }
      admin_reject_withdrawal: {
        Args: {
          p_processed_by?: string
          p_reason: string
          p_withdrawal_id: string
        }
        Returns: undefined
      }
      confirm_deposit: {
        Args: {
          p_deposit_id: string
          p_provider_payload?: Json
          p_provider_reference: string
        }
        Returns: undefined
      }
      fail_deposit: {
        Args: { p_deposit_id: string; p_reason: string }
        Returns: undefined
      }
      finalize_withdrawal_payout: {
        Args: {
          p_approved: boolean
          p_provider_reference?: string
          p_reason?: string
          p_withdrawal_id: string
        }
        Returns: undefined
      }
      fmt_fcfa: { Args: { p_amount: number }; Returns: string }
      fn_apply_wallet_delta: {
        Args: {
          p_delta: number
          p_description: string
          p_metadata?: Json
          p_reference_id: string
          p_reference_table: string
          p_type: Database["public"]["Enums"]["transaction_type"]
          p_user_id: string
        }
        Returns: number
      }
      fn_finalize_mission_assignment: {
        Args: { p_approved: boolean; p_assignment_id: string }
        Returns: undefined
      }
      fn_generate_analyse_texte: { Args: never; Returns: Json }
      fn_generate_classification: { Args: never; Returns: Json }
      fn_generate_one_mission: {
        Args: { p_cycle_tier_id: string; p_slot_number: number }
        Returns: undefined
      }
      fn_generate_questionnaire: { Args: never; Returns: Json }
      fn_generate_redaction_contrainte: { Args: never; Returns: Json }
      fn_generate_test_logique: { Args: never; Returns: Json }
      fn_generate_tier_missions: {
        Args: { p_cycle_tier_id: string }
        Returns: undefined
      }
      fn_generate_validation_contenu: { Args: never; Returns: Json }
      fn_generate_verification_info: { Args: never; Returns: Json }
      fn_grade_classification: {
        Args: { p_expected: Json; p_submission: Json }
        Returns: boolean
      }
      fn_grade_redaction_contrainte: {
        Args: { p_expected: Json; p_submission: Json }
        Returns: boolean
      }
      fn_start_new_cycle: {
        Args: { p_cycle_number: number; p_user_id: string }
        Returns: string
      }
      generate_referral_code: { Args: never; Returns: string }
      initiate_deposit: {
        Args: { p_cycle_tier_id: string }
        Returns: {
          amount: number
          confirmed_at: string | null
          cycle_tier_id: string
          failed_reason: string | null
          id: string
          initiated_at: string
          payment_provider: string
          provider_payload: Json
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "deposits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      request_withdrawal: {
        Args: { p_amount: number; p_destination_details: Json }
        Returns: {
          amount: number
          destination_details: Json
          destination_provider: string
          id: string
          is_unrestricted: boolean
          processed_at: string | null
          processed_by: string | null
          provider_reference: string | null
          rejected_reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
          withdrawal_right_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_mission_assignment: {
        Args: { p_assignment_id: string; p_submission_data: Json }
        Returns: Json
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "banned"
      app_role: "user" | "admin" | "super_admin"
      cycle_status: "in_progress" | "completed" | "abandoned"
      mission_assignment_status:
        | "assigned"
        | "submitted"
        | "validated"
        | "rejected"
        | "expired"
      notification_type:
        | "deposit_confirmed"
        | "deposit_failed"
        | "withdrawal_approved"
        | "withdrawal_rejected"
        | "mission_validated"
        | "mission_rejected"
        | "tier_unlocked"
        | "cycle_completed"
        | "referral_commission_credited"
        | "account_alert"
        | "system"
      payment_status:
        | "pending"
        | "confirmed"
        | "failed"
        | "cancelled"
        | "expired"
      referral_commission_trigger: "tier_2_validated" | "tier_4_validated"
      tier_status:
        | "locked"
        | "awaiting_deposit"
        | "deposit_processing"
        | "in_progress"
        | "completed"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "mission_reward"
        | "referral_commission"
        | "adjustment"
      withdrawal_status:
        | "pending"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled"
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
      cycle_status: ["in_progress", "completed", "abandoned"],
      mission_assignment_status: [
        "assigned",
        "submitted",
        "validated",
        "rejected",
        "expired",
      ],
      notification_type: [
        "deposit_confirmed",
        "deposit_failed",
        "withdrawal_approved",
        "withdrawal_rejected",
        "mission_validated",
        "mission_rejected",
        "tier_unlocked",
        "cycle_completed",
        "referral_commission_credited",
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
      referral_commission_trigger: ["tier_2_validated", "tier_4_validated"],
      tier_status: [
        "locked",
        "awaiting_deposit",
        "deposit_processing",
        "in_progress",
        "completed",
      ],
      transaction_type: [
        "deposit",
        "withdrawal",
        "mission_reward",
        "referral_commission",
        "adjustment",
      ],
      withdrawal_status: [
        "pending",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const

