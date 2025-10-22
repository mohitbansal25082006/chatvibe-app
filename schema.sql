-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 1: Authentication & Profile Tables
-- ============================================

-- Profiles table (stores user info after auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- ============================================
-- Storage Bucket for Profile Images
-- ============================================

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- PART 2: Bot & Chat System Tables (Advanced)
-- ============================================

-- Bots table (stores bot metadata)
CREATE TABLE IF NOT EXISTS public.bots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  tone TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  personality JSONB DEFAULT '{}',
  background_story TEXT,
  voice_settings JSONB DEFAULT '{}',
  avatar_style TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bots_personality ON public.bots USING GIN (personality);
CREATE INDEX IF NOT EXISTS idx_bots_voice_settings ON public.bots USING GIN (voice_settings);

-- Enable Row Level Security (RLS)
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bots
-- Users can view their own bots
CREATE POLICY "Users can view own bots" 
ON public.bots FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own bots
CREATE POLICY "Users can create own bots" 
ON public.bots FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own bots
CREATE POLICY "Users can update own bots" 
ON public.bots FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own bots
CREATE POLICY "Users can delete own bots" 
ON public.bots FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at on bots
CREATE TRIGGER set_bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Conversations table (chat sessions)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  summary TEXT,
  last_mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bot_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Users can view their own conversations
CREATE POLICY "Users can view own conversations" 
ON public.conversations FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations" 
ON public.conversations FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations" 
ON public.conversations FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at on conversations
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Messages table (individual messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
  content TEXT NOT NULL,
  formatted_content TEXT,
  thread_id UUID REFERENCES public.message_threads(id) ON DELETE SET NULL,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  feedback_score INTEGER CHECK (feedback_score IN (-1, 0, 1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
-- Users can view messages in their own conversations
CREATE POLICY "Users can view own messages" 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Users can create messages in their own conversations
CREATE POLICY "Users can create own messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Users can update messages in their own conversations
CREATE POLICY "Users can update own messages" 
ON public.messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Users can delete messages in their own conversations
CREATE POLICY "Users can delete own messages" 
ON public.messages FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Message threads table
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message threads
CREATE POLICY "Users can view own message threads" 
ON public.message_threads FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Users can create message threads in their own conversations
CREATE POLICY "Users can create own message threads" 
ON public.message_threads FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message reactions
CREATE POLICY "Users can view own message reactions" 
ON public.message_reactions FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create message reactions
CREATE POLICY "Users can create own message reactions" 
ON public.message_reactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own message reactions
CREATE POLICY "Users can delete own message reactions" 
ON public.message_reactions FOR DELETE 
USING (auth.uid() = user_id);

-- Message attachments table
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'document', 'location', 'voice')),
  url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message attachments
-- Users can view attachments in their own conversations
CREATE POLICY "Users can view own message attachments" 
ON public.message_attachments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = message_id
    WHERE m.conversation_id = message_id AND c.user_id = auth.uid()
  )
);

-- Users can create attachments in their own conversations
CREATE POLICY "Users can create own message attachments" 
ON public.message_attachments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = message_id
    WHERE m.conversation_id = message_id AND c.user_id = auth.uid()
  )
);

-- Bot memory table
CREATE TABLE IF NOT EXISTS public.bot_memories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_summary TEXT,
  user_preferences JSONB DEFAULT '{}',
  important_dates TEXT[] DEFAULT '{}',
  learned_responses TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.bot_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bot memories
-- Users can view their own bot memories
CREATE POLICY "Users can view own bot memories" 
ON public.bot_memories FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own bot memories
CREATE POLICY "Users can create own bot memories" 
ON public.bot_memories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own bot memories
CREATE POLICY "Users can update own bot memories" 
ON public.bot_memories FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own bot memories
CREATE POLICY "Users can delete own bot memories" 
ON public.bot_memories FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at on bot_memories
CREATE TRIGGER set_bot_memories_updated_at
  BEFORE UPDATE ON public.bot_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.bots TO anon, authenticated;
GRANT ALL ON public.conversations TO anon, authenticated;
GRANT ALL ON public.messages TO anon, authenticated;
GRANT ALL ON public.message_threads TO anon, authenticated;
GRANT ALL ON public.message_reactions TO anon, authenticated;
GRANT ALL ON public.message_attachments TO anon, authenticated;
GRANT ALL ON public.bot_memories TO anon, authenticated;