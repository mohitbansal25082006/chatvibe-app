import { User } from '@supabase/supabase-js';

// ========================================
// USER & PROFILE TYPES
// ========================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  full_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
}

// ========================================
// AUTH TYPES
// ========================================

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<string>;
}

// ========================================
// NAVIGATION TYPES
// ========================================

export type RootStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ProfileSetup: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Profile: undefined;
};

// ========================================
// ERROR TYPES
// ========================================

export interface AppError {
  message: string;
  code?: string;
}