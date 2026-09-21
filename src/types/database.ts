export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export type SocialLink = { label: string; url: string }
export type WeeklyAvailability = Partial<Record<Weekday, { start: string; end: string }>>

export const PHOTOGRAPHER_SPECIALTIES = [
  'Natural light',
  'Editorial',
  'Drone',
  'Studio',
  'Documentary',
] as const

export const DEPOSIT_POLICIES = ['deposit_50', 'cash_on_session'] as const
export type DepositPolicy = (typeof DEPOSIT_POLICIES)[number]

export const DEPOSIT_POLICY_LABELS: Record<DepositPolicy, string> = {
  deposit_50: '50% deposit via Stripe, rest in cash after the session',
  cash_on_session: 'Full payment in cash after the session',
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'photographer' | 'client'
          full_name: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'photographer' | 'client'
          full_name?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'photographer' | 'client'
          full_name?: string | null
          email?: string | null
          created_at?: string
        }
        Relationships: []
      }
      photographer_profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          bio: string | null
          city: string | null
          base_price: number | null
          price_max: number | null
          session_duration_minutes: number | null
          specialty: string | null
          specialty_other: string | null
          instagram_url: string | null
          social_links: SocialLink[]
          weekly_availability: WeeklyAvailability
          payment_link: string | null
          payment_terms: string | null
          deposit_policy: DepositPolicy | null
          has_signed_contract: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          bio?: string | null
          city?: string | null
          base_price?: number | null
          price_max?: number | null
          session_duration_minutes?: number | null
          specialty?: string | null
          specialty_other?: string | null
          instagram_url?: string | null
          social_links?: SocialLink[]
          weekly_availability?: WeeklyAvailability
          payment_link?: string | null
          payment_terms?: string | null
          deposit_policy?: DepositPolicy | null
          has_signed_contract?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          bio?: string | null
          city?: string | null
          base_price?: number | null
          price_max?: number | null
          session_duration_minutes?: number | null
          specialty?: string | null
          specialty_other?: string | null
          instagram_url?: string | null
          social_links?: SocialLink[]
          weekly_availability?: WeeklyAvailability
          payment_link?: string | null
          payment_terms?: string | null
          deposit_policy?: DepositPolicy | null
          has_signed_contract?: boolean
          created_at?: string
        }
        Relationships: []
      }
      portfolio_photos: {
        Row: {
          id: string
          photographer_id: string
          image_url: string
          caption: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          photographer_id: string
          image_url: string
          caption?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          photographer_id?: string
          image_url?: string
          caption?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          id: string
          photographer_id: string
          date: string
          start_time: string
          end_time: string
          is_booked: boolean
        }
        Insert: {
          id?: string
          photographer_id: string
          date: string
          start_time: string
          end_time: string
          is_booked?: boolean
        }
        Update: {
          id?: string
          photographer_id?: string
          date?: string
          start_time?: string
          end_time?: string
          is_booked?: boolean
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          slot_id: string
          client_id: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          created_at: string
          deposit_amount: number | null
          deposit_paid_at: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          balance_amount: number | null
          balance_paid_at: string | null
          balance_checkout_session_id: string | null
          balance_payment_intent_id: string | null
          deposit_refunded_at: string | null
          deposit_refund_id: string | null
          payment_status: 'pending' | 'paid'
        }
        Insert: {
          id?: string
          slot_id: string
          client_id: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          created_at?: string
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          balance_amount?: number | null
          balance_paid_at?: string | null
          balance_checkout_session_id?: string | null
          balance_payment_intent_id?: string | null
          deposit_refunded_at?: string | null
          deposit_refund_id?: string | null
          payment_status?: 'pending' | 'paid'
        }
        Update: {
          id?: string
          slot_id?: string
          client_id?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          created_at?: string
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          balance_amount?: number | null
          balance_paid_at?: string | null
          balance_checkout_session_id?: string | null
          balance_payment_intent_id?: string | null
          deposit_refunded_at?: string | null
          deposit_refund_id?: string | null
          payment_status?: 'pending' | 'paid'
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_slot: {
        Args: { p_slot_id: string }
        Returns: {
          id: string
          slot_id: string
          client_id: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          created_at: string
        }
      }
      finalize_paid_booking: {
        Args: {
          p_slot_id: string
          p_client_id: string
          p_deposit_amount: number
          p_balance_amount: number
          p_stripe_checkout_session_id: string
          p_stripe_payment_intent_id: string
        }
        Returns: {
          id: string
          slot_id: string
          client_id: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          created_at: string
        }
      }
      finalize_balance_payment: {
        Args: {
          p_booking_id: string
          p_stripe_checkout_session_id: string
          p_stripe_payment_intent_id: string
        }
        Returns: {
          id: string
          slot_id: string
          client_id: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          created_at: string
        }
      }
    }
    Enums: {
      user_role: 'photographer' | 'client'
      booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type UserRole = Database['public']['Enums']['user_role']
export type BookingStatus = Database['public']['Enums']['booking_status']
export type PaymentStatus = 'pending' | 'paid'
export type PhotographerProfile = Database['public']['Tables']['photographer_profiles']['Row']
export type PortfolioPhoto = Database['public']['Tables']['portfolio_photos']['Row']
export type AvailabilitySlot = Database['public']['Tables']['availability_slots']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
