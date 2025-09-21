import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      mentions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          content: string
          url: string
          source: string
          source_type: 'NEWS_WEBSITE' | 'SOCIAL_MEDIA' | 'FORUM' | 'BLOG' | 'REVIEW'
          author: string | null
          published_at: string | null
          sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | null
          sentiment_score: number | null
          keywords: string[] | null
          person_name: string
          company: string | null
          job_title: string | null
          scraped_by: string
          raw_data: any
          status: 'NEW' | 'REVIEWED' | 'ACTIONED'
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          content: string
          url: string
          source: string
          source_type: 'NEWS_WEBSITE' | 'SOCIAL_MEDIA' | 'FORUM' | 'BLOG' | 'REVIEW'
          author?: string | null
          published_at?: string | null
          sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | null
          sentiment_score?: number | null
          keywords?: string[] | null
          person_name: string
          company?: string | null
          job_title?: string | null
          scraped_by: string
          raw_data?: any
          status?: 'NEW' | 'REVIEWED' | 'ACTIONED'
        }
      }
      scraping_jobs: {
        Row: {
          id: string
          created_at: string
          person_name: string
          company: string | null
          job_title: string | null
          search_queries: string[]
          status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
          started_at: string | null
          completed_at: string | null
          mentions_found: number
          error_message: string | null
          n8n_workflow_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          person_name: string
          company?: string | null
          job_title?: string | null
          search_queries: string[]
          status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
          started_at?: string | null
          completed_at?: string | null
          mentions_found?: number
          error_message?: string | null
          n8n_workflow_id?: string | null
        }
      }
      monitoring_sources: {
        Row: {
          id: string
          created_at: string
          name: string
          url: string
          type: 'NEWS_WEBSITE' | 'SOCIAL_MEDIA' | 'FORUM' | 'BLOG' | 'REVIEW'
          is_active: boolean
          scrape_frequency: 'HOURLY' | 'DAILY' | 'WEEKLY'
          last_scraped_at: string | null
          config: any
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          url: string
          type: 'NEWS_WEBSITE' | 'SOCIAL_MEDIA' | 'FORUM' | 'BLOG' | 'REVIEW'
          is_active?: boolean
          scrape_frequency?: 'HOURLY' | 'DAILY' | 'WEEKLY'
          last_scraped_at?: string | null
          config?: any
        }
      }
    }
  }
}