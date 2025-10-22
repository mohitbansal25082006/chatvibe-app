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
// BOT TYPES
// ========================================

export interface Bot {
  id: string;
  user_id: string;
  name: string;
  role: string;
  tone: string;
  emoji: string;
  color: string;
  description?: string;
  system_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface BotCreate {
  name: string;
  role: string;
  tone: string;
  emoji: string;
  color: string;
  description?: string;
  system_prompt?: string;
}

export interface BotUpdate {
  name?: string;
  role?: string;
  tone?: string;
  emoji?: string;
  color?: string;
  description?: string;
  system_prompt?: string;
}

// ========================================
// CHAT TYPES
// ========================================

export interface Conversation {
  id: string;
  user_id: string;
  bot_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  bot?: Bot;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'bot';
  content: string;
  created_at: string;
}

export interface ChatContextType {
  bots: Bot[];
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  creatingBot: boolean;
  fetchBots: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<Message[]>; // Changed this line
  createBot: (bot: BotCreate) => Promise<void>;
  updateBot: (id: string, updates: BotUpdate) => Promise<void>;
  deleteBot: (id: string) => Promise<void>;
  createConversation: (botId: string) => Promise<string>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  clearChat: (conversationId: string) => Promise<void>;
  regenerateResponse: (conversationId: string) => Promise<void>;
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
  BotCreation: undefined;
  BotEdit: { botId: string };
  Chat: { conversationId: string; botId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Bots: undefined;
  Profile: undefined;
};

// ========================================
// ERROR TYPES
// ========================================

export interface AppError {
  message: string;
  code?: string;
}