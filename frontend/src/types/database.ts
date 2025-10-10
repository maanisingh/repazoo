export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analysis_results: {
        Row: {
          analysis_type: string
          created_at: string
          execution_time_ms: number
          id: string
          input_data: Json
          model_used: string
          output_data: Json
          purpose: string
          twitter_account_id: string
          user_id: string
        }
        Insert: {
          analysis_type: string
          created_at?: string
          execution_time_ms: number
          id?: string
          input_data: Json
          model_used: string
          output_data: Json
          purpose: string
          twitter_account_id: string
          user_id: string
        }
        Update: {
          analysis_type?: string
          created_at?: string
          execution_time_ms?: number
          id?: string
          input_data?: Json
          model_used?: string
          output_data?: Json
          purpose?: string
          twitter_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_twitter_account_id_fkey"
            columns: ["twitter_account_id"]
            isOneToOne: false
            referencedRelation: "twitter_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          method: string
          response_time_ms: number
          status_code: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          method: string
          response_time_ms: number
          status_code: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          method?: string
          response_time_ms?: number
          status_code?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mention_engagements: {
        Row: {
          bookmark_count: number | null
          created_at: string | null
          engagement_score: number | null
          growth_rate: number | null
          id: string
          like_count: number | null
          mention_id: string
          quote_count: number | null
          recorded_at: string | null
          reply_count: number | null
          retweet_count: number | null
          view_count: number | null
          viral_coefficient: number | null
        }
        Insert: {
          bookmark_count?: number | null
          created_at?: string | null
          engagement_score?: number | null
          growth_rate?: number | null
          id?: string
          like_count?: number | null
          mention_id: string
          quote_count?: number | null
          recorded_at?: string | null
          reply_count?: number | null
          retweet_count?: number | null
          view_count?: number | null
          viral_coefficient?: number | null
        }
        Update: {
          bookmark_count?: number | null
          created_at?: string | null
          engagement_score?: number | null
          growth_rate?: number | null
          id?: string
          like_count?: number | null
          mention_id?: string
          quote_count?: number | null
          recorded_at?: string | null
          reply_count?: number | null
          retweet_count?: number | null
          view_count?: number | null
          viral_coefficient?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mention_engagements_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "twitter_mentions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mention_engagements_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "v_high_risk_mentions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mention_engagements_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "v_recent_mentions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions_scan_history: {
        Row: {
          api_calls_made: number | null
          created_at: string | null
          end_time: string | null
          error_code: string | null
          error_message: string | null
          id: string
          max_results: number | null
          mentions_found: number | null
          new_mentions: number | null
          query_used: string | null
          rate_limit_remaining: number | null
          rate_limit_reset_at: string | null
          scan_type: string
          start_time: string | null
          status: string
          updated_at: string | null
          updated_mentions: number | null
          user_id: string
        }
        Insert: {
          api_calls_made?: number | null
          created_at?: string | null
          end_time?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          max_results?: number | null
          mentions_found?: number | null
          new_mentions?: number | null
          query_used?: string | null
          rate_limit_remaining?: number | null
          rate_limit_reset_at?: string | null
          scan_type?: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
          updated_mentions?: number | null
          user_id: string
        }
        Update: {
          api_calls_made?: number | null
          created_at?: string | null
          end_time?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          max_results?: number | null
          mentions_found?: number | null
          new_mentions?: number | null
          query_used?: string | null
          rate_limit_remaining?: number | null
          rate_limit_reset_at?: string | null
          scan_type?: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
          updated_mentions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_scan_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_temp_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          oauth_token: string
          oauth_token_secret: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          oauth_token: string
          oauth_token_secret: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          oauth_token?: string
          oauth_token_secret?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tweet_media: {
        Row: {
          alt_text: string | null
          cdn_url: string | null
          created_at: string | null
          display_order: number | null
          download_status: string | null
          duration_ms: number | null
          file_size_bytes: number | null
          height: number | null
          id: string
          local_path: string | null
          media_key: string
          media_type: string
          media_url: string
          mention_id: string
          mime_type: string | null
          preview_image_url: string | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          cdn_url?: string | null
          created_at?: string | null
          display_order?: number | null
          download_status?: string | null
          duration_ms?: number | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          local_path?: string | null
          media_key: string
          media_type: string
          media_url: string
          mention_id: string
          mime_type?: string | null
          preview_image_url?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          cdn_url?: string | null
          created_at?: string | null
          display_order?: number | null
          download_status?: string | null
          duration_ms?: number | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          local_path?: string | null
          media_key?: string
          media_type?: string
          media_url?: string
          mention_id?: string
          mime_type?: string | null
          preview_image_url?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tweet_media_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "twitter_mentions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tweet_media_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "v_high_risk_mentions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tweet_media_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "v_recent_mentions"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_accounts: {
        Row: {
          access_token_encrypted: string
          connected_at: string
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          refresh_token_encrypted: string | null
          scopes: string[]
          token_expires_at: string
          twitter_user_id: string
          twitter_username: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[]
          token_expires_at: string
          twitter_user_id: string
          twitter_username: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[]
          token_expires_at?: string
          twitter_user_id?: string
          twitter_username?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twitter_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_credentials: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_type: string | null
          twitter_display_name: string | null
          twitter_user_id: string | null
          twitter_username: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_type?: string | null
          twitter_display_name?: string | null
          twitter_user_id?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_type?: string | null
          twitter_display_name?: string | null
          twitter_user_id?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twitter_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_mentions: {
        Row: {
          analysis_completed_at: string | null
          analysis_status: string | null
          author_display_name: string | null
          author_followers_count: number | null
          author_id: string
          author_profile_image_url: string | null
          author_username: string
          author_verified: boolean | null
          bookmark_count: number | null
          conversation_id: string | null
          created_at: string | null
          engagement_score: number | null
          engagement_velocity: number | null
          entities: Json | null
          has_media: boolean | null
          id: string
          in_reply_to_user_id: string | null
          is_quote: boolean | null
          is_retweet: boolean | null
          like_count: number | null
          media_count: number | null
          media_types: Json | null
          media_urls: Json | null
          quote_count: number | null
          reply_count: number | null
          retweet_count: number | null
          risk_level: string | null
          risk_score: number | null
          sentiment: string | null
          sentiment_score: number | null
          topics: Json | null
          tweet_created_at: string | null
          tweet_id: string
          tweet_language: string | null
          tweet_text: string
          tweet_url: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
          viral_coefficient: number | null
        }
        Insert: {
          analysis_completed_at?: string | null
          analysis_status?: string | null
          author_display_name?: string | null
          author_followers_count?: number | null
          author_id: string
          author_profile_image_url?: string | null
          author_username: string
          author_verified?: boolean | null
          bookmark_count?: number | null
          conversation_id?: string | null
          created_at?: string | null
          engagement_score?: number | null
          engagement_velocity?: number | null
          entities?: Json | null
          has_media?: boolean | null
          id?: string
          in_reply_to_user_id?: string | null
          is_quote?: boolean | null
          is_retweet?: boolean | null
          like_count?: number | null
          media_count?: number | null
          media_types?: Json | null
          media_urls?: Json | null
          quote_count?: number | null
          reply_count?: number | null
          retweet_count?: number | null
          risk_level?: string | null
          risk_score?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          topics?: Json | null
          tweet_created_at?: string | null
          tweet_id: string
          tweet_language?: string | null
          tweet_text: string
          tweet_url?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
          viral_coefficient?: number | null
        }
        Update: {
          analysis_completed_at?: string | null
          analysis_status?: string | null
          author_display_name?: string | null
          author_followers_count?: number | null
          author_id?: string
          author_profile_image_url?: string | null
          author_username?: string
          author_verified?: boolean | null
          bookmark_count?: number | null
          conversation_id?: string | null
          created_at?: string | null
          engagement_score?: number | null
          engagement_velocity?: number | null
          entities?: Json | null
          has_media?: boolean | null
          id?: string
          in_reply_to_user_id?: string | null
          is_quote?: boolean | null
          is_retweet?: boolean | null
          like_count?: number | null
          media_count?: number | null
          media_types?: Json | null
          media_urls?: Json | null
          quote_count?: number | null
          reply_count?: number | null
          retweet_count?: number | null
          risk_level?: string | null
          risk_score?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          topics?: Json | null
          tweet_created_at?: string | null
          tweet_id?: string
          tweet_language?: string | null
          tweet_text?: string
          tweet_url?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
          viral_coefficient?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "twitter_mentions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          purpose: string | null
          purpose_category: string | null
          twitter_handle: string | null
          twitter_oauth_secret: string | null
          twitter_oauth_token: string | null
          twitter_user_id: string | null
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          purpose?: string | null
          purpose_category?: string | null
          twitter_handle?: string | null
          twitter_oauth_secret?: string | null
          twitter_oauth_token?: string | null
          twitter_user_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          purpose?: string | null
          purpose_category?: string | null
          twitter_handle?: string | null
          twitter_oauth_secret?: string | null
          twitter_oauth_token?: string | null
          twitter_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_high_risk_mentions: {
        Row: {
          author_username: string | null
          email: string | null
          engagement_score: number | null
          id: string | null
          risk_level: string | null
          risk_score: number | null
          sentiment: string | null
          tweet_created_at: string | null
          tweet_id: string | null
          tweet_text: string | null
          user_display_name: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twitter_mentions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_recent_mentions: {
        Row: {
          author_display_name: string | null
          author_username: string | null
          author_verified: boolean | null
          created_at: string | null
          email: string | null
          engagement_score: number | null
          id: string | null
          risk_level: string | null
          sentiment: string | null
          total_engagement: number | null
          tweet_created_at: string | null
          tweet_id: string | null
          tweet_text: string | null
          user_display_name: string | null
          user_id: string | null
          viral_coefficient: number | null
        }
        Relationships: [
          {
            foreignKeyName: "twitter_mentions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      armor: {
        Args: { "": string }
        Returns: string
      }
      dearmor: {
        Args: { "": string }
        Returns: string
      }
      gen_random_bytes: {
        Args: { "": number }
        Returns: string
      }
      gen_random_uuid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gen_salt: {
        Args: { "": string }
        Returns: string
      }
      get_mention_with_media: {
        Args: { p_mention_id: string }
        Returns: {
          author_display_name: string
          author_username: string
          media: Json
          mention_id: string
          tweet_id: string
          tweet_text: string
        }[]
      }
      get_trending_mentions: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          author_username: string
          created_at: string
          engagement_score: number
          mention_id: string
          total_engagement: number
          tweet_id: string
          tweet_text: string
          viral_coefficient: number
        }[]
      }
      get_user_mention_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_engagement_score: number
          most_recent_mention: string
          risk_critical: number
          risk_high: number
          risk_low: number
          risk_medium: number
          sentiment_negative: number
          sentiment_neutral: number
          sentiment_positive: number
          total_engagement: number
          total_mentions: number
          viral_mentions: number
        }[]
      }
      get_user_mentions_with_media: {
        Args: {
          p_has_media?: boolean
          p_limit?: number
          p_offset?: number
          p_risk_level?: string
          p_sentiment?: string
          p_user_id: string
        }
        Returns: {
          author_display_name: string
          author_profile_image_url: string
          author_username: string
          author_verified: boolean
          created_at: string
          engagement_score: number
          id: string
          like_count: number
          media: Json
          quote_count: number
          reply_count: number
          retweet_count: number
          risk_level: string
          risk_score: number
          sentiment: string
          sentiment_score: number
          tweet_created_at: string
          tweet_id: string
          tweet_text: string
          tweet_url: string
          view_count: number
        }[]
      }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgp_key_id: {
        Args: { "": string }
        Returns: string
      }
      upsert_mention: {
        Args: {
          p_author_display_name: string
          p_author_id: string
          p_author_username: string
          p_engagement_score?: number
          p_like_count?: number
          p_quote_count?: number
          p_reply_count?: number
          p_retweet_count?: number
          p_tweet_created_at: string
          p_tweet_id: string
          p_tweet_text: string
          p_user_id: string
          p_view_count?: number
        }
        Returns: string
      }
      uuid_generate_v1: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v1mc: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v3: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_generate_v4: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v5: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_nil: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_dns: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_oid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_url: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_x500: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

