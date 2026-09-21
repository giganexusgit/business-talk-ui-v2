// Auth Types
export interface User {
  id: string
  email: string
  username?: string
  name?: string
  phone?: string
  avatar?: string
  profession?: string
  company?: string
  bio?: string
  about?: string
  skills?: string[]
  experience?: string
  location?: string
  role_id: string
  is_banned?: boolean
  is_shadow_banned?: boolean
  account_type?: 'professional' | 'business'
  business_name?: string
  business_logo?: string
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  // token: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  /** True when the user is banned. They can login but cannot perform actions. */
  isRestricted: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  username: string
  password: string
  phone_number?: string
}

export interface CompleteProfileRequest {
  full_name: string
  profession?: string
  company?: string
  bio?: string
  about?: string
  skills?: string[]
  experience?: string
  location?: string
  avatar?: string
}

// Post Types
export interface Post {
  id: string
  user_id: string
  content: string
  image?: string
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  author?: User
  liked?: boolean
}

// Message Types
export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  image?: string
  created_at: string
  is_read: boolean
}

export interface Conversation {
  id: string
  participant_id: string
  last_message?: Message
  updated_at: string
  participant?: User
}

// Notification Types
export interface Notification {
  id: string
  user_id: string
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention'
  title: string
  message: string
  action_url?: string
  is_read: boolean
  created_at: string
}

// Group Types
export interface Group {
  id: string
  name: string
  description?: string
  avatar?: string
  members_count: number
  created_by: string
  created_at: string
  is_member?: boolean
}

// Blog Types
export interface Blog {
  id: string
  user_id: string
  title: string
  content: string
  excerpt?: string
  cover_image?: string
  likes_count: number
  views_count: number
  created_at: string
  updated_at: string
  author?: User
  liked?: boolean
}

// Admin Types
export interface AdminStats {
  total_users: number
  total_posts: number
  total_revenue: number
  active_users: number
  growth_rate: number
}

export interface Report {
  id: string
  type: 'user' | 'post' | 'comment' | 'message'
  reported_by: string
  content_id: string
  reason: string
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  created_at: string
  updated_at: string
}

export interface Advertisement {
  id: string
  title: string
  description?: string
  image: string
  link: string
  status: 'active' | 'inactive'
  impressions: number
  clicks: number
  created_at: string
  updated_at: string
}
