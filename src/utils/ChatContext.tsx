import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { 
  Bot, 
  BotCreate, 
  BotUpdate, 
  Conversation, 
  Message, 
  ChatContextType 
} from '../types';
import { generateBotResponse } from '../services/openai';
import { Alert } from 'react-native';

// ========================================
// CREATE CONTEXT
// ========================================

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ========================================
// PROVIDER COMPONENT
// ========================================

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBot, setCreatingBot] = useState(false);

  // ========================================
  // FETCH BOTS
  // ========================================
  
  const fetchBots = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error: any) {
      console.error('Error fetching bots:', error);
      Alert.alert('Error', 'Failed to load bots');
    }
  };

  // ========================================
  // FETCH CONVERSATIONS
  // ========================================
  
  const fetchConversations = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          bot:bot_id(*)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    }
  };

  // ========================================
  // FETCH MESSAGES
  // ========================================
  
const fetchMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    setMessages(data || []);
    return data || [];
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    Alert.alert('Error', 'Failed to load messages');
    return [];
  }
};

  // ========================================
  // CREATE BOT
  // ========================================
  
  const createBot = async (botData: BotCreate): Promise<void> => {
    try {
      setCreatingBot(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Create bot
      const { data, error } = await supabase
        .from('bots')
        .insert({
          ...botData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setBots(prev => [data, ...prev]);
      
      Alert.alert('Success', 'Bot created successfully!');
    } catch (error: any) {
      console.error('Error creating bot:', error);
      Alert.alert('Error', error.message || 'Failed to create bot');
    } finally {
      setCreatingBot(false);
    }
  };

  // ========================================
  // UPDATE BOT
  // ========================================
  
  const updateBot = async (id: string, updates: BotUpdate): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('bots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setBots(prev => prev.map(bot => bot.id === id ? data : bot));
      
      Alert.alert('Success', 'Bot updated successfully!');
    } catch (error: any) {
      console.error('Error updating bot:', error);
      Alert.alert('Error', error.message || 'Failed to update bot');
    }
  };

  // ========================================
  // DELETE BOT
  // ========================================
  
  const deleteBot = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setBots(prev => prev.filter(bot => bot.id !== id));
      
      Alert.alert('Success', 'Bot deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting bot:', error);
      Alert.alert('Error', error.message || 'Failed to delete bot');
    }
  };

  // ========================================
  // CREATE CONVERSATION
  // ========================================
  
  const createConversation = async (botId: string): Promise<string> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('bot_id', botId)
        .maybeSingle();
      
      if (existingConv) {
        return existingConv.id;
      }
      
      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          bot_id: botId,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setConversations(prev => [data, ...prev]);
      
      return data.id;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', error.message || 'Failed to create conversation');
      throw error;
    }
  };

  // ========================================
  // SEND MESSAGE
  // ========================================
  
  const sendMessage = async (conversationId: string, content: string): Promise<void> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Get conversation with bot details
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          bot:bot_id(*)
        `)
        .eq('id', conversationId)
        .single();
      
      if (convError || !conversation?.bot) throw convError || new Error('Conversation not found');
      
      // Add user message
      const { data: userMessage, error: userMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: 'user',
          content,
        })
        .select()
        .single();
      
      if (userMsgError) throw userMsgError;
      
      // Update local messages
      setMessages(prev => [...prev, userMessage]);
      
      // Get recent messages for context
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Generate bot response
      const botResponse = await generateBotResponse(
        conversation.bot,
        recentMessages?.reverse() || []
      );
      
      // Add bot message
      const { data: botMessage, error: botMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: 'bot',
          content: botResponse,
        })
        .select()
        .single();
      
      if (botMsgError) throw botMsgError;
      
      // Update local messages
      setMessages(prev => [...prev, botMessage]);
      
      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      // Update conversations list
      fetchConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
    }
  };

  // ========================================
  // CLEAR CHAT
  // ========================================
  
  const clearChat = async (conversationId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (error) throw error;
      
      // Update local state
      setMessages([]);
      
      Alert.alert('Success', 'Chat cleared successfully!');
    } catch (error: any) {
      console.error('Error clearing chat:', error);
      Alert.alert('Error', error.message || 'Failed to clear chat');
    }
  };

  // ========================================
  // REGENERATE RESPONSE
  // ========================================
  
  const regenerateResponse = async (conversationId: string): Promise<void> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Get conversation with bot details
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          bot:bot_id(*)
        `)
        .eq('id', conversationId)
        .single();
      
      if (convError || !conversation?.bot) throw convError || new Error('Conversation not found');
      
      // Get messages
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });
      
      if (!allMessages || allMessages.length === 0) {
        Alert.alert('Info', 'No messages to regenerate from');
        return;
      }
      
      // Remove the last bot message if it exists
      if (allMessages[0].sender === 'bot') {
        await supabase
          .from('messages')
          .delete()
          .eq('id', allMessages[0].id);
        
        // Update local state
        setMessages(prev => prev.slice(0, -1));
      }
      
      // Get recent messages for context (excluding the removed bot message)
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Generate new bot response
      const botResponse = await generateBotResponse(
        conversation.bot,
        recentMessages?.reverse() || []
      );
      
      // Add new bot message
      const { data: botMessage, error: botMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: 'bot',
          content: botResponse,
        })
        .select()
        .single();
      
      if (botMsgError) throw botMsgError;
      
      // Update local messages
      setMessages(prev => [...prev, botMessage]);
      
      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      // Update conversations list
      fetchConversations();
    } catch (error: any) {
      console.error('Error regenerating response:', error);
      Alert.alert('Error', error.message || 'Failed to regenerate response');
    }
  };

  // ========================================
  // INITIALIZE DATA
  // ========================================

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchBots(),
        fetchConversations(),
      ]);
      setLoading(false);
    };

    initializeData();
  }, []);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value: ChatContextType = {
    bots,
    conversations,
    currentConversation,
    messages,
    loading,
    creatingBot,
    fetchBots,
    fetchConversations,
    fetchMessages,
    createBot,
    updateBot,
    deleteBot,
    createConversation,
    sendMessage,
    clearChat,
    regenerateResponse,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// ========================================
// CUSTOM HOOK
// ========================================

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};