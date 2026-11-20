export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export type SocialLink = { label: string; url: string }
export type BookingSource = 'marketplace' | 'photographer_link'
export type BookingEmailKind =
  | 'client_booked'
  | 'photographer_booked'
  | 'client_confirmed'
  | 'reminder_48h'
  | 'reminder_day'
export type ReviewRemovalReason = 'personal_data' | 'abuse'
export type WeeklyAvailability = Partial<Record<Weekday, { start: string; end: string }>>

export const PHOTOGRAPHER_SPECIALTIES = [
  'Natural light',
  'Editorial',
  'Drone',
  'Studio',
  'Documentary',
] as const

export const PAYMENT_METHODS = ['stripe', 'cash'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

// Superseded by payment_method + requires_deposit (2026-10); the column stays
// in the DB for old rows but the app no longer reads or writes it.
type DepositPolicy = 'deposit_50' | 'cash_on_session'

export const SIGNUP_SOURCES = ['instagram', 'email', 'web', 'referido'] as const
export type SignupSrc = (typeof SIGNUP_SOURCES)[number]

export const LEAD_PRIORIDADES = ['A', 'B', 'C'] as const
export type LeadPrioridad = (typeof LEAD_PRIORIDADES)[number]

export const LEAD_ESTADOS = [
  'encontrado',
  'contactado',
  'respondio',
  'cuenta_creada',
  'perfil_completo',
  'no_contactar',
] as const
export type LeadEstado = (typeof LEAD_ESTADOS)[number]

export type PhotographerProfileStatus = 'draft' | 'claimed'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'photographer' | 'client'
          full_name: string | null
          email: string | null
          signup_src: SignupSrc | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'photographer' | 'client'
          full_name?: string | null
          email?: string | null
          signup_src?: SignupSrc | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'photographer' | 'client'
          full_name?: string | null
          email?: string | null
          signup_src?: SignupSrc | null
          created_at?: string
        }
        Relationships: []
      }
      photographer_profiles: {
        Row: {
          id: string
          user_id: string | null
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
          payment_method: PaymentMethod | null
          requires_deposit: boolean | null
          has_signed_contract: boolean
          contract_signed_at: string | null
          terms_version: string | null
          terms_accepted_at: string | null
          ref_code: string
          status: PhotographerProfileStatus
          invite_token: string | null
          invite_expires_at: string | null
          lead_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
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
          payment_method?: PaymentMethod | null
          requires_deposit?: boolean | null
          has_signed_contract?: boolean
          contract_signed_at?: string | null
          status?: PhotographerProfileStatus
          invite_token?: string | null
          invite_expires_at?: string | null
          lead_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
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
          payment_method?: PaymentMethod | null
          requires_deposit?: boolean | null
          has_signed_contract?: boolean
          contract_signed_at?: string | null
          status?: PhotographerProfileStatus
          invite_token?: string | null
          invite_expires_at?: string | null
          lead_id?: string | null
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
          source: BookingSource
          client_booked_notified_at: string | null
          photographer_booked_notified_at: string | null
          client_confirmed_notified_at: string | null
          package_id: string | null
          package_name: string | null
          package_price: number | null
          responded_at: string | null
          delivered_at: string | null
          reminder_48h_sent_at: string | null
          reminder_day_sent_at: string | null
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
          delivered_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          nombre: string
          instagram_handle: string | null
          website: string | null
          contact_email: string | null
          zona: string | null
          fuente: string | null
          prioridad: LeadPrioridad | null
          motivo_encaje: string | null
          estado: LeadEstado
          borrador_mensaje: string | null
          notas: string | null
          created_at: string
          contacted_at: string | null
        }
        Insert: {
          id?: string
          nombre: string
          instagram_handle?: string | null
          website?: string | null
          contact_email?: string | null
          zona?: string | null
          fuente?: string | null
          prioridad?: LeadPrioridad | null
          motivo_encaje?: string | null
          estado?: LeadEstado
          borrador_mensaje?: string | null
          notas?: string | null
          created_at?: string
          contacted_at?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          instagram_handle?: string | null
          website?: string | null
          contact_email?: string | null
          zona?: string | null
          fuente?: string | null
          prioridad?: LeadPrioridad | null
          motivo_encaje?: string | null
          estado?: LeadEstado
          borrador_mensaje?: string | null
          notas?: string | null
          created_at?: string
          contacted_at?: string | null
        }
        Relationships: []
      }
      photographer_packages: {
        Row: {
          id: string
          photographer_id: string
          name: string
          duration_minutes: number
          included_photos: number
          delivery_days: number
          price: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          name: string
          duration_minutes: number
          included_photos: number
          delivery_days: number
          price: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          duration_minutes?: number
          included_photos?: number
          delivery_days?: number
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      favorites: {
        Row: { user_id: string; photographer_id: string; created_at: string }
        Insert: { user_id: string; photographer_id: string; created_at?: string }
        Update: { [_ in never]: never }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          photographer_id: string
          client_id: string
          rating: number
          body: string | null
          created_at: string
          removed_at: string | null
          removed_reason: ReviewRemovalReason | null
        }
        Insert: { [_ in never]: never }
        Update: { [_ in never]: never }
        Relationships: []
      }
      booking_messages: {
        Row: {
          id: string
          booking_id: string | null
          conversation_id: string
          sender_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          conversation_id: string
          sender_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          conversation_id?: string
          sender_id?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          client_id: string
          photographer_id: string
          created_by: string | null
          created_at: string
          client_last_read_at: string | null
          photographer_last_read_at: string | null
          client_last_notified_at: string | null
          photographer_last_notified_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          photographer_id: string
          created_by?: string | null
          created_at?: string
          client_last_read_at?: string | null
          photographer_last_read_at?: string | null
          client_last_notified_at?: string | null
          photographer_last_notified_at?: string | null
        }
        Update: {
          [_ in never]: never
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_slot: {
        Args: { p_slot_id: string; p_ref_code?: string | null; p_package_id?: string | null }
        Returns: {
          id: string
          slot_id: string
          client_id: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          created_at: string
          source: BookingSource
        }
      }
      claim_booking_email: {
        Args: { p_booking_id: string; p_kind: BookingEmailKind }
        Returns: {
          recipient_email: string | null
          recipient_name: string | null
          client_name: string | null
          photographer_name: string | null
          date: string
          start_time: string
          end_time: string
          base_price: number | null
          price_max: number | null
          payment_terms: string | null
        }[]
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
      sign_photographer_contract: {
        Args: { [_ in never]: never }
        Returns: undefined
      }
      get_photographer_invite: {
        Args: { p_token: string }
        Returns: { display_name: string | null; state: 'valid' | 'expired' }[]
      }
      claim_photographer_invite: {
        Args: { p_token: string }
        Returns: undefined
      }
      public_reviews: {
        Args: { p_photographer_id: string }
        Returns: {
          id: string
          rating: number
          body: string | null
          created_at: string
          client_first_name: string | null
        }[]
      }
      public_packages: {
        Args: { p_photographer_id: string }
        Returns: {
          id: string
          name: string
          duration_minutes: number
          included_photos: number
          delivery_days: number
          price: number
          sort_order: number
        }[]
      }
      public_photographer_cards: {
        Args: { [_ in never]: never }
        Returns: {
          photographer_id: string
          cover_image_url: string | null
          rating_avg: number | null
          review_count: number
          response_hours: number | null
          min_package_price: number | null
        }[]
      }
      submit_review: {
        Args: { p_booking_id: string; p_rating: number; p_body?: string | null }
        Returns: Database['public']['Tables']['reviews']['Row']
      }
      remove_review: {
        Args: { p_review_id: string; p_reason: ReviewRemovalReason; p_admin_email: string }
        Returns: undefined
      }
      due_booking_reminders: {
        Args: { p_kind: 'reminder_48h' | 'reminder_day' }
        Returns: { booking_id: string }[]
      }
      public_photographers: {
        Args: { p_id?: string | null }
        Returns: {
          id: string
          display_name: string | null
          bio: string | null
          city: string | null
          specialty: string | null
          specialty_other: string | null
          base_price: number | null
          price_max: number | null
          session_duration_minutes: number | null
          instagram_url: string | null
          social_links: SocialLink[]
          weekly_availability: WeeklyAvailability
        }[]
      }
      public_open_slots: {
        Args: { p_photographer_id?: string | null }
        Returns: {
          id: string
          photographer_id: string
          date: string
          start_time: string
          end_time: string
        }[]
      }
      public_portfolio: {
        Args: { p_photographer_id: string }
        Returns: {
          id: string
          image_url: string
          caption: string | null
          sort_order: number
        }[]
      }
      accept_photographer_terms: {
        Args: { p_version: string }
        Returns: undefined
      }
      start_conversation: {
        Args: { p_photographer_id: string }
        Returns: string
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      claim_message_notification: {
        Args: { p_message_id: string; p_sender_id: string }
        Returns: {
          recipient_email: string | null
          recipient_name: string | null
          recipient_role: 'client' | 'photographer'
          sender_name: string | null
          conversation_id: string
        }[]
      }
      refresh_weekly_slots: {
        Args: { [_ in never]: never }
        Returns: undefined
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
export type BookingMessage = Database['public']['Tables']['booking_messages']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type PhotographerPackage = Database['public']['Tables']['photographer_packages']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
