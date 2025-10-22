-- ============================================
-- ChatVibe Complete Database Schema
-- ============================================

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
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
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
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
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
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- PART 2: Bot & Chat System Tables
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
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON public.bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_personality ON public.bots USING GIN (personality);
CREATE INDEX IF NOT EXISTS idx_bots_voice_settings ON public.bots USING GIN (voice_settings);

-- Enable Row Level Security (RLS)
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bots
DROP POLICY IF EXISTS "Users can view own bots" ON public.bots;
CREATE POLICY "Users can view own bots" 
ON public.bots FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own bots" ON public.bots;
CREATE POLICY "Users can create own bots" 
ON public.bots FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bots" ON public.bots;
CREATE POLICY "Users can update own bots" 
ON public.bots FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bots" ON public.bots;
CREATE POLICY "Users can delete own bots" 
ON public.bots FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at on bots
DROP TRIGGER IF EXISTS set_bots_updated_at ON public.bots;
CREATE TRIGGER set_bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Conversations table (chat sessions)
-- ============================================
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_bot_id ON public.conversations(bot_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" 
ON public.conversations FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own conversations" ON public.conversations;
CREATE POLICY "Users can create own conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" 
ON public.conversations FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" 
ON public.conversations FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at on conversations
DROP TRIGGER IF EXISTS set_conversations_updated_at ON public.conversations;
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Message threads table (must be created before messages)
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_threads_conversation_id ON public.message_threads(conversation_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message threads
DROP POLICY IF EXISTS "Users can view message threads" ON public.message_threads;
CREATE POLICY "Users can view message threads" 
ON public.message_threads FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create message threads" ON public.message_threads;
CREATE POLICY "Users can create message threads" 
ON public.message_threads FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- ============================================
-- Messages table (individual messages)
-- ============================================
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON public.messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create own messages" ON public.messages;
CREATE POLICY "Users can create own messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" 
ON public.messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" 
ON public.messages FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Add parent_message_id to message_threads after messages table is created
ALTER TABLE public.message_threads 
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE;

-- Create index for parent_message_id in message_threads
CREATE INDEX IF NOT EXISTS idx_message_threads_parent_message_id ON public.message_threads(parent_message_id);

-- ============================================
-- Message reactions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message reactions
DROP POLICY IF EXISTS "Users can view message reactions" ON public.message_reactions;
CREATE POLICY "Users can view message reactions" 
ON public.message_reactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_id AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create message reactions" ON public.message_reactions;
CREATE POLICY "Users can create message reactions" 
ON public.message_reactions FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_id AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete own message reactions" ON public.message_reactions;
CREATE POLICY "Users can delete own message reactions" 
ON public.message_reactions FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- Message attachments table
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'document', 'location', 'voice')),
  url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_type ON public.message_attachments(type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message attachments
DROP POLICY IF EXISTS "Users can view message attachments" ON public.message_attachments;
CREATE POLICY "Users can view message attachments" 
ON public.message_attachments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_id AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create message attachments" ON public.message_attachments;
CREATE POLICY "Users can create message attachments" 
ON public.message_attachments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_id AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete message attachments" ON public.message_attachments;
CREATE POLICY "Users can delete message attachments" 
ON public.message_attachments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE m.id = message_id AND c.user_id = auth.uid()
  )
);

-- ============================================
-- Bot memory table
-- ============================================
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bot_memories_bot_id ON public.bot_memories(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_memories_user_id ON public.bot_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_memories_user_preferences ON public.bot_memories USING GIN (user_preferences);

-- Enable Row Level Security (RLS)
ALTER TABLE public.bot_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bot memories
DROP POLICY IF EXISTS "Users can view own bot memories" ON public.bot_memories;
CREATE POLICY "Users can view own bot memories" 
ON public.bot_memories FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own bot memories" ON public.bot_memories;
CREATE POLICY "Users can create own bot memories" 
ON public.bot_memories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bot memories" ON public.bot_memories;
CREATE POLICY "Users can update own bot memories" 
ON public.bot_memories FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bot memories" ON public.bot_memories;
CREATE POLICY "Users can delete own bot memories" 
ON public.bot_memories FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at on bot_memories
DROP TRIGGER IF EXISTS set_bot_memories_updated_at ON public.bot_memories;
CREATE TRIGGER set_bot_memories_updated_at
  BEFORE UPDATE ON public.bot_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Storage Bucket for Attachments
-- ============================================

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments bucket
DROP POLICY IF EXISTS "Users can view their own attachments" ON storage.objects;
CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can upload their own attachments" ON storage.objects;
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- Grant Permissions
-- ============================================
GRANT ALL ON public.bots TO anon, authenticated;
GRANT ALL ON public.conversations TO anon, authenticated;
GRANT ALL ON public.messages TO anon, authenticated;
GRANT ALL ON public.message_threads TO anon, authenticated;
GRANT ALL ON public.message_reactions TO anon, authenticated;
GRANT ALL ON public.message_attachments TO anon, authenticated;
GRANT ALL ON public.bot_memories TO anon, authenticated;

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get conversation with bot details
CREATE OR REPLACE FUNCTION get_conversation_with_bot(conversation_id_param UUID)
RETURNS TABLE (
  conversation_id UUID,
  conversation_title TEXT,
  conversation_summary TEXT,
  bot_id UUID,
  bot_name TEXT,
  bot_emoji TEXT,
  bot_color TEXT,
  bot_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    c.title as conversation_title,
    c.summary as conversation_summary,
    b.id as bot_id,
    b.name as bot_name,
    b.emoji as bot_emoji,
    b.color as bot_color,
    b.role as bot_role
  FROM public.conversations c
  JOIN public.bots b ON c.bot_id = b.id
  WHERE c.id = conversation_id_param AND c.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get messages with reactions
CREATE OR REPLACE FUNCTION get_messages_with_reactions(conversation_id_param UUID)
RETURNS TABLE (
  message_id UUID,
  content TEXT,
  sender TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  parent_message_id UUID,
  feedback_score INTEGER,
  reactions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.content,
    m.sender,
    m.created_at,
    m.parent_message_id,
    m.feedback_score,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'emoji', mr.emoji,
          'user_id', mr.user_id,
          'created_at', mr.created_at
        )
      ) FILTER (WHERE mr.id IS NOT NULL),
      '[]'::jsonb
    ) as reactions
  FROM public.messages m
  LEFT JOIN public.message_reactions mr ON m.id = mr.message_id
  WHERE m.conversation_id = conversation_id_param
  GROUP BY m.id, m.content, m.sender, m.created_at, m.parent_message_id, m.feedback_score
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Indexes for Full-Text Search
-- ============================================

-- Create full-text search index on message content
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON public.messages 
USING gin(to_tsvector('english', content));

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE public.profiles IS 'User profiles linked to authentication';
COMMENT ON TABLE public.bots IS 'AI bot configurations created by users';
COMMENT ON TABLE public.conversations IS 'Chat sessions between users and bots';
COMMENT ON TABLE public.messages IS 'Individual messages in conversations with threading and feedback support';
COMMENT ON TABLE public.message_threads IS 'Threading structure for message replies';
COMMENT ON TABLE public.message_reactions IS 'Emoji reactions to messages';
COMMENT ON TABLE public.message_attachments IS 'File attachments for messages (images, documents, voice, location)';
COMMENT ON TABLE public.bot_memories IS 'Long-term memory storage for bots to remember user preferences and context';

-- ============================================
-- End of Schema
-- ============================================