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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      email_log: {
        Row: {
          email_type: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          email_type: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          email_type?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          id: string
          reading_id: string | null
          sent_at: string
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          reading_id?: string | null
          sent_at?: string
          type: string
          user_id: string
        }
        Update: {
          id?: string
          reading_id?: string | null
          sent_at?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "readings"
            referencedColumns: ["id"]
          },
        ]
      }
      outcomes: {
        Row: {
          confidence_level: string | null
          consent_to_share: boolean
          created_at: string
          domain: string | null
          followed: string
          id: string
          memory_context: Json | null
          mode: string | null
          outcome_sentiment: string | null
          outcome_text: string | null
          quality_score: number | null
          reading_id: string
          third_way_text: string | null
          time_to_outcome: number | null
          transit_context: Json | null
          user_id: string
        }
        Insert: {
          confidence_level?: string | null
          consent_to_share?: boolean
          created_at?: string
          domain?: string | null
          followed: string
          id?: string
          memory_context?: Json | null
          mode?: string | null
          outcome_sentiment?: string | null
          outcome_text?: string | null
          quality_score?: number | null
          reading_id: string
          third_way_text?: string | null
          time_to_outcome?: number | null
          transit_context?: Json | null
          user_id: string
        }
        Update: {
          confidence_level?: string | null
          consent_to_share?: boolean
          created_at?: string
          domain?: string | null
          followed?: string
          id?: string
          memory_context?: Json | null
          mode?: string | null
          outcome_sentiment?: string | null
          outcome_text?: string | null
          quality_score?: number | null
          reading_id?: string
          third_way_text?: string | null
          time_to_outcome?: number | null
          transit_context?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "readings"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioner_clients: {
        Row: {
          birth_date: string | null
          birth_place: string | null
          birth_time: string | null
          client_email: string | null
          client_name: string
          created_at: string
          id: string
          notes: string | null
          practitioner_id: string
        }
        Insert: {
          birth_date?: string | null
          birth_place?: string | null
          birth_time?: string | null
          client_email?: string | null
          client_name: string
          created_at?: string
          id?: string
          notes?: string | null
          practitioner_id: string
        }
        Update: {
          birth_date?: string | null
          birth_place?: string | null
          birth_time?: string | null
          client_email?: string | null
          client_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          practitioner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_clients_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioner_readings: {
        Row: {
          client_id: string
          created_at: string
          domain: string
          id: string
          practitioner_id: string
          question: string
          reading_json: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          domain: string
          id?: string
          practitioner_id: string
          question: string
          reading_json: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          domain?: string
          id?: string
          practitioner_id?: string
          question?: string
          reading_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_readings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "practitioner_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_readings_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioners: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          id: string
          subscription_tier: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          subscription_tier?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          subscription_tier?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          birth_place: string | null
          birth_time: string | null
          consent_accepted: boolean
          consent_date: string | null
          consent_prompt_dismissed: boolean
          created_at: string
          id: string
          referral_code: string
          stripe_customer_id: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          birth_place?: string | null
          birth_time?: string | null
          consent_accepted?: boolean
          consent_date?: string | null
          consent_prompt_dismissed?: boolean
          created_at?: string
          id?: string
          referral_code?: string
          stripe_customer_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          birth_place?: string | null
          birth_time?: string | null
          consent_accepted?: boolean
          consent_date?: string | null
          consent_prompt_dismissed?: boolean
          created_at?: string
          id?: string
          referral_code?: string
          stripe_customer_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      readings: {
        Row: {
          confidence_level: string | null
          created_at: string
          domain: string
          id: string
          journal_prompt: string | null
          mode: string | null
          question: string
          reading_text: string | null
          third_way_text: string | null
          user_id: string
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string
          domain: string
          id?: string
          journal_prompt?: string | null
          mode?: string | null
          question: string
          reading_text?: string | null
          third_way_text?: string | null
          user_id: string
        }
        Update: {
          confidence_level?: string | null
          created_at?: string
          domain?: string
          id?: string
          journal_prompt?: string | null
          mode?: string | null
          question?: string
          reading_text?: string | null
          third_way_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_user_id: string
          reward_granted: boolean
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id: string
          reward_granted?: boolean
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string
          reward_granted?: boolean
          status?: string
        }
        Relationships: []
      }
      transit_cache: {
        Row: {
          date: string
          expires_at: string
          generated_at: string
          id: string
          linked_domain: string | null
          moon_phase: string
          traffic_light: string
          transit_detail: string
          transit_headline: string
          user_id: string
        }
        Insert: {
          date: string
          expires_at?: string
          generated_at?: string
          id?: string
          linked_domain?: string | null
          moon_phase: string
          traffic_light: string
          transit_detail: string
          transit_headline: string
          user_id: string
        }
        Update: {
          date?: string
          expires_at?: string
          generated_at?: string
          id?: string
          linked_domain?: string | null
          moon_phase?: string
          traffic_light?: string
          transit_detail?: string
          transit_headline?: string
          user_id?: string
        }
        Relationships: []
      }
      user_memory: {
        Row: {
          created_at: string
          frequency: number
          id: string
          last_seen_at: string
          memory_type: string
          memory_value: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frequency?: number
          id?: string
          last_seen_at?: string
          memory_type: string
          memory_value: string
          user_id: string
        }
        Update: {
          created_at?: string
          frequency?: number
          id?: string
          last_seen_at?: string
          memory_type?: string
          memory_value?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      high_quality_readings: {
        Row: {
          created_at: string | null
          domain: string | null
          followed: string | null
          outcome_id: string | null
          outcome_sentiment: string | null
          quality_score: number | null
          reading_id: string | null
          time_to_outcome: number | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          followed?: string | null
          outcome_id?: string | null
          outcome_sentiment?: string | null
          quality_score?: number | null
          reading_id?: string | null
          time_to_outcome?: number | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          followed?: string | null
          outcome_id?: string | null
          outcome_sentiment?: string | null
          quality_score?: number | null
          reading_id?: string | null
          time_to_outcome?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "readings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_ready_outcomes: {
        Row: {
          birth_date: string | null
          birth_place: string | null
          confidence_level: string | null
          domain: string | null
          followed: string | null
          memory_context: Json | null
          mode: string | null
          outcome_id: string | null
          outcome_sentiment: string | null
          question_summary: string | null
          reading_id: string | null
          third_way_text: string | null
          time_to_outcome: number | null
          transit_context: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "readings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_monthly_reading_count: {
        Args: { p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      subscription_tier: "free" | "mirror" | "mirror_pro" | "practitioner"
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
      subscription_tier: ["free", "mirror", "mirror_pro", "practitioner"],
    },
  },
} as const
