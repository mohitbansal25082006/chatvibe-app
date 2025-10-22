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

export interface BotPersonality {
  humor: number; // 0-100
  empathy: number; // 0-100
  creativity: number; // 0-100
  formality: number; // 0-100
}

export interface BotMemory {
  conversation_summary: string;
  user_preferences: Record<string, any>;
  important_dates: string[];
  learned_responses: string[];
}

export interface BotVoice {
  voice_id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  accent?: string;
}

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
  personality?: BotPersonality;
  background_story?: string;
  voice_settings?: BotVoice;
  avatar_style?: string;
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
  personality?: BotPersonality;
  background_story?: string;
  voice_settings?: BotVoice;
  avatar_style?: string;
}

export interface BotUpdate {
  name?: string;
  role?: string;
  tone?: string;
  emoji?: string;
  color?: string;
  description?: string;
  system_prompt?: string;
  personality?: BotPersonality;
  background_story?: string;
  voice_settings?: BotVoice;
  avatar_style?: string;
}

// ========================================
// CHAT TYPES
// ========================================

export interface MessageReaction {
  id: string;
  message_id: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

export interface MessageThread {
  id: string;
  parent_message_id: string;
  conversation_id: string;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  type: 'image' | 'document' | 'location' | 'voice';
  url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'bot';
  content: string;
  formatted_content?: string;
  thread_id?: string;
  parent_message_id?: string;
  created_at: string;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  feedback_score?: number; // -1 for thumbs down, 1 for thumbs up
}

export interface Conversation {
  id: string;
  user_id: string;
  bot_id: string;
  title?: string;
  summary?: string;
  last_mood?: string;
  created_at: string;
  updated_at: string;
  bot?: Bot;
}

export interface ChatSuggestion {
  id: string;
  text: string;
  category: 'question' | 'statement' | 'action';
}

export interface ChatContextType {
  bots: Bot[];
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  creatingBot: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  suggestions: ChatSuggestion[];
  loadingSuggestions: boolean;
  loadingSummary: boolean;
  summary: string | null;
  showSummary: boolean;
  setShowSummary: (show: boolean) => void;
  fetchBots: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<Message[]>;
  createBot: (bot: BotCreate) => Promise<void>;
  updateBot: (id: string, updates: BotUpdate) => Promise<void>;
  deleteBot: (id: string) => Promise<void>;
  createConversation: (botId: string) => Promise<string>;
  sendMessage: (conversationId: string, content: string, attachments?: MessageAttachment[]) => Promise<void>;
  clearChat: (conversationId: string) => Promise<void>;
  regenerateResponse: (conversationId: string) => Promise<void>;
  addMessageReaction: (messageId: string, emoji: string) => Promise<void>;
  removeMessageReaction: (messageId: string, emoji: string) => Promise<void>;
  createMessageThread: (messageId: string) => Promise<string>;
  submitFeedback: (messageId: string, score: number) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  speakText: (text: string, voiceId?: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
  generateSuggestions: (conversationId: string) => Promise<void>;
  searchMessages: (conversationId: string, query: string) => Promise<Message[]>;
  generateConversationSummary: (conversationId: string) => Promise<string>;
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
  MessageThread: { threadId: string; parentMessageId: string };
  VoiceSettings: undefined;
  AvatarCreation: { botId?: string };
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