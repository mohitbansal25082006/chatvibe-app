import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { 
  Bot, 
  BotCreate, 
  BotUpdate, 
  Conversation, 
  Message, 
  MessageReaction,
  MessageThread,
  MessageAttachment,
  ChatSuggestion,
  ChatContextType,
  BotMemory
} from '../types';
import { 
  generateBotResponse, 
  generateConversationSummary as generateSummaryAI,
  generateSmartSuggestions,
  learnFromFeedback,
  extractMemoryFromConversation
} from '../services/openai';
import { Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [pendingMessages, setPendingMessages] = useState<{[key: string]: Message[]}>({});
  const [retryCount, setRetryCount] = useState<{[key: string]: number}>({});
  const [botMemories, setBotMemories] = useState<{[key: string]: BotMemory}>({});
  
  // New loading states for suggestions and summary
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // ========================================
  // FETCH BOTS
  // ========================================
  
  const fetchBots = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBots(data || []);
      
      // Cache bots locally
      await AsyncStorage.setItem('cached_bots', JSON.stringify(data || []));
    } catch (error: any) {
      console.error('Error fetching bots:', error);
      
      // Try to load from cache if online fetch fails
      try {
        const cachedBots = await AsyncStorage.getItem('cached_bots');
        if (cachedBots) {
          setBots(JSON.parse(cachedBots));
        }
      } catch (cacheError) {
        console.error('Error loading cached bots:', cacheError);
      }
      
      // Only show alert if we're online
      if (onlineStatus) {
        Alert.alert('Error', 'Failed to load bots');
      }
    }
  }, [onlineStatus]);

  // ========================================
  // FETCH CONVERSATIONS
  // ========================================
  
  const fetchConversations = useCallback(async (): Promise<void> => {
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
      
      // Cache conversations locally
      await AsyncStorage.setItem('cached_conversations', JSON.stringify(data || []));
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      
      // Try to load from cache if online fetch fails
      try {
        const cachedConversations = await AsyncStorage.getItem('cached_conversations');
        if (cachedConversations) {
          setConversations(JSON.parse(cachedConversations));
        }
      } catch (cacheError) {
        console.error('Error loading cached conversations:', cacheError);
      }
      
      // Only show alert if we're online
      if (onlineStatus) {
        Alert.alert('Error', 'Failed to load conversations');
      }
    }
  }, [onlineStatus]);

  // ========================================
  // FETCH MESSAGES WITH REACTIONS
  // ========================================
  
  const fetchMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          reactions:message_reactions(*),
          attachments:message_attachments(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Process the data to include reactions and attachments
      const processedMessages = data?.map(msg => ({
        ...msg,
        reactions: msg.reactions || [],
        attachments: msg.attachments || []
      })) || [];
      
      setMessages(processedMessages);
      
      // Cache messages locally
      await AsyncStorage.setItem(`cached_messages_${conversationId}`, JSON.stringify(processedMessages));
      
      return processedMessages;
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      
      // Try to load from cache if online fetch fails
      try {
        const cachedMessages = await AsyncStorage.getItem(`cached_messages_${conversationId}`);
        if (cachedMessages) {
          const parsedMessages = JSON.parse(cachedMessages);
          setMessages(parsedMessages);
          return parsedMessages;
        }
      } catch (cacheError) {
        console.error('Error loading cached messages:', cacheError);
      }
      
      // Only show alert if we're online
      if (onlineStatus) {
        Alert.alert('Error', 'Failed to load messages');
      }
      
      return [];
    }
  }, [onlineStatus]);

  // ========================================
  // FETCH BOT MEMORY
  // ========================================
  
  const fetchBotMemory = useCallback(async (botId: string, userId: string): Promise<BotMemory | null> => {
    try {
      // Check if we already have this memory in state
      if (botMemories[`${botId}_${userId}`]) {
        return botMemories[`${botId}_${userId}`];
      }
      
      const { data, error } = await supabase
        .from('bot_memories')
        .select('*')
        .eq('bot_id', botId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Cache memory in state
        setBotMemories(prev => ({
          ...prev,
          [`${botId}_${userId}`]: data
        }));
        
        // Cache memory locally
        await AsyncStorage.setItem(`cached_memory_${botId}_${userId}`, JSON.stringify(data));
      }
      
      return data || null;
    } catch (error: any) {
      console.error('Error fetching bot memory:', error);
      
      // Try to load from cache if online fetch fails
      try {
        const cachedMemory = await AsyncStorage.getItem(`cached_memory_${botId}_${userId}`);
        if (cachedMemory) {
          const parsedMemory = JSON.parse(cachedMemory);
          setBotMemories(prev => ({
            ...prev,
            [`${botId}_${userId}`]: parsedMemory
          }));
          return parsedMemory;
        }
      } catch (cacheError) {
        console.error('Error loading cached memory:', cacheError);
      }
      
      return null;
    }
  }, [botMemories]);

  // ========================================
  // UPDATE BOT MEMORY WITH ADVANCED EXTRACTION
  // ========================================
  
  const updateBotMemory = async (botId: string, userId: string, messages: any[]): Promise<void> => {
    try {
      // Use advanced memory extraction
      const memoryData = await extractMemoryFromConversation(messages);
      
      // Check if memory already exists
      const { data: existingMemory } = await supabase
        .from('bot_memories')
        .select('*')
        .eq('bot_id', botId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingMemory) {
        // Update existing memory
        const { error } = await supabase
          .from('bot_memories')
          .update({
            conversation_summary: memoryData.summary,
            user_preferences: memoryData.userPreferences,
            important_dates: memoryData.importantDates,
            updated_at: new Date().toISOString(),
          })
          .eq('bot_id', botId)
          .eq('user_id', userId);
        
        if (error) throw error;
        
        // Update state
        setBotMemories(prev => ({
          ...prev,
          [`${botId}_${userId}`]: {
            ...prev[`${botId}_${userId}`],
            conversation_summary: memoryData.summary,
            user_preferences: memoryData.userPreferences,
            important_dates: memoryData.importantDates,
            updated_at: new Date().toISOString()
          }
        }));
      } else {
        // Create new memory
        const { data, error } = await supabase
          .from('bot_memories')
          .insert({
            bot_id: botId,
            user_id: userId,
            conversation_summary: memoryData.summary,
            user_preferences: memoryData.userPreferences,
            important_dates: memoryData.importantDates,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Update state
        setBotMemories(prev => ({
          ...prev,
          [`${botId}_${userId}`]: data
        }));
      }
      
      // Update cache
      await AsyncStorage.setItem(
        `cached_memory_${botId}_${userId}`, 
        JSON.stringify({
          ...existingMemory,
          conversation_summary: memoryData.summary,
          user_preferences: memoryData.userPreferences,
          important_dates: memoryData.importantDates,
          updated_at: new Date().toISOString()
        })
      );
    } catch (error: any) {
      console.error('Error updating bot memory:', error);
      // Don't show alert for memory errors as they're not critical
    }
  };

  // ========================================
  // ADVANCED MOOD DETECTION
  // ========================================
  
  const detectMood = async (text: string): Promise<any> => {
    try {
      // Import the detectMood function from openai.ts
      const { detectMood: detectMoodFromAI } = await import('../services/openai');
      return await detectMoodFromAI(text);
    } catch (error) {
      console.error('Error detecting mood:', error);
      
      // Fallback to simple mood detection
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('happy') || lowerText.includes('excited') || lowerText.includes('great')) {
        return { mood: 'happy', confidence: 0.7 };
      } else if (lowerText.includes('sad') || lowerText.includes('down') || lowerText.includes('unhappy')) {
        return { mood: 'sad', confidence: 0.7 };
      } else if (lowerText.includes('angry') || lowerText.includes('mad') || lowerText.includes('frustrated')) {
        return { mood: 'angry', confidence: 0.7 };
      } else if (lowerText.includes('anxious') || lowerText.includes('worried') || lowerText.includes('nervous')) {
        return { mood: 'anxious', confidence: 0.7 };
      } else if (lowerText.includes('tired') || lowerText.includes('exhausted') || lowerText.includes('sleepy')) {
        return { mood: 'tired', confidence: 0.7 };
      } else {
        return { mood: 'neutral', confidence: 0.5 };
      }
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
      
      // Update cache
      const cachedBots = await AsyncStorage.getItem('cached_bots');
      const bots = cachedBots ? JSON.parse(cachedBots) : [];
      await AsyncStorage.setItem('cached_bots', JSON.stringify([data, ...bots]));
      
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
      
      // Update cache
      const cachedBots = await AsyncStorage.getItem('cached_bots');
      const bots = cachedBots ? JSON.parse(cachedBots) : [];
      const updatedBots = bots.map((bot: Bot) => bot.id === id ? data : bot);
      await AsyncStorage.setItem('cached_bots', JSON.stringify(updatedBots));
      
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
      
      // Update cache
      const cachedBots = await AsyncStorage.getItem('cached_bots');
      const bots = cachedBots ? JSON.parse(cachedBots) : [];
      const filteredBots = bots.filter((bot: Bot) => bot.id !== id);
      await AsyncStorage.setItem('cached_bots', JSON.stringify(filteredBots));
      
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
      
      // Update cache
      const cachedConversations = await AsyncStorage.getItem('cached_conversations');
      const conversations = cachedConversations ? JSON.parse(cachedConversations) : [];
      await AsyncStorage.setItem('cached_conversations', JSON.stringify([data, ...conversations]));
      
      return data.id;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', error.message || 'Failed to create conversation');
      throw error;
    }
  };

  // ========================================
  // SEND MESSAGE WITH REPLY SUPPORT
  // ========================================
  
  const sendMessage = async (
    conversationId: string, 
    content: string, 
    attachments?: MessageAttachment[],
    parentMessageId?: string
  ): Promise<void> => {
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
      
      // Create a temporary user message with a unique ID
      const tempUserMessageId = `temp-user-${Date.now()}`;
      const tempUserMessage: Message = {
        id: tempUserMessageId,
        conversation_id: conversationId,
        sender: 'user',
        content,
        parent_message_id: parentMessageId,
        created_at: new Date().toISOString(),
        reactions: [],
        attachments: attachments || []
      };
      
      // Add temporary message to local state
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Add to pending messages if offline
      if (!onlineStatus) {
        setPendingMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), tempUserMessage]
        }));
        return;
      }
      
      // Add user message to database
      const { data: userMessage, error: userMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: 'user',
          content,
          parent_message_id: parentMessageId,
        })
        .select()
        .single();
      
      if (userMsgError) throw userMsgError;
      
      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          await supabase
            .from('message_attachments')
            .insert({
              message_id: userMessage.id,
              type: attachment.type,
              url: attachment.url,
              metadata: attachment.metadata,
            });
        }
      }
      
      // Replace temporary message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempUserMessageId 
          ? { ...userMessage, reactions: [], attachments: attachments || [] }
          : msg
      ));
      
      // Get recent messages for context
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Get bot memory
      const botMemory = await fetchBotMemory(conversation.bot_id, user.id);
      
      // Create a temporary bot message
      const tempBotMessageId = `temp-bot-${Date.now()}`;
      const tempBotMessage: Message = {
        id: tempBotMessageId,
        conversation_id: conversationId,
        sender: 'bot',
        content: '',
        parent_message_id: parentMessageId, // Bot replies to the same parent
        created_at: new Date().toISOString(),
        reactions: [],
        attachments: []
      };
      
      // Add temporary bot message to show typing indicator
      setMessages(prev => [...prev, tempBotMessage]);
      
      try {
        // Generate bot response
        const botResponse = await generateBotResponse(
          conversation.bot,
          recentMessages?.reverse() || [],
          botMemory || undefined
        );
        
        // Add bot message to database
        const { data: botMessage, error: botMsgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender: 'bot',
            content: botResponse,
            parent_message_id: parentMessageId, // Bot replies to the same parent
          })
          .select()
          .single();
        
        if (botMsgError) throw botMsgError;
        
        // Replace temporary bot message with real one
        setMessages(prev => prev.map(msg => 
          msg.id === tempBotMessageId 
            ? { ...botMessage, reactions: [], attachments: [] }
            : msg
        ));
        
        // Update conversation timestamp and mood
        const userMood = await detectMood(content);
        await supabase
          .from('conversations')
          .update({ 
            updated_at: new Date().toISOString(),
            last_mood: userMood.mood
          })
          .eq('id', conversationId);
        
        // Update bot memory if needed
        if (recentMessages && recentMessages.length >= 5) {
          await updateBotMemory(conversation.bot_id, user.id, recentMessages);
        }
        
        // Reset retry count for this conversation
        setRetryCount(prev => ({
          ...prev,
          [conversationId]: 0
        }));
        
        // Update conversations list
        fetchConversations();
      } catch (botError) {
        console.error('Error generating bot response:', botError);
        
        // Remove temporary bot message
        setMessages(prev => prev.filter(msg => msg.id !== tempBotMessageId));
        
        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          conversation_id: conversationId,
          sender: 'bot',
          content: 'Sorry, I had trouble generating a response. Please try again.',
          created_at: new Date().toISOString(),
          reactions: [],
          attachments: []
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        // Increment retry count
        const newRetryCount = (retryCount[conversationId] || 0) + 1;
        setRetryCount(prev => ({
          ...prev,
          [conversationId]: newRetryCount
        }));
        
        // If we haven't retried too many times, add to pending messages
        if (newRetryCount < 3) {
          setPendingMessages(prev => ({
            ...prev,
            [conversationId]: [...(prev[conversationId] || []), userMessage]
          }));
        }
      }
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
      
      // Clear cache
      await AsyncStorage.removeItem(`cached_messages_${conversationId}`);
      
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
      
      // Get bot memory
      const botMemory = await fetchBotMemory(conversation.bot_id, user.id);
      
      // Create a temporary bot message
      const tempBotMessageId = `temp-bot-${Date.now()}`;
      const tempBotMessage: Message = {
        id: tempBotMessageId,
        conversation_id: conversationId,
        sender: 'bot',
        content: '',
        created_at: new Date().toISOString(),
        reactions: [],
        attachments: []
      };
      
      // Add temporary bot message to show typing indicator
      setMessages(prev => [...prev, tempBotMessage]);
      
      try {
        // Generate new bot response
        const botResponse = await generateBotResponse(
          conversation.bot,
          recentMessages?.reverse() || [],
          botMemory || undefined
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
        
        // Replace temporary bot message with real one
        setMessages(prev => prev.map(msg => 
          msg.id === tempBotMessageId 
            ? { ...botMessage, reactions: [], attachments: [] }
            : msg
        ));
        
        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
        
        // Update conversations list
        fetchConversations();
      } catch (botError) {
        console.error('Error regenerating response:', botError);
        
        // Remove temporary bot message
        setMessages(prev => prev.filter(msg => msg.id !== tempBotMessageId));
        
        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          conversation_id: conversationId,
          sender: 'bot',
          content: 'Sorry, I had trouble generating a response. Please try again.',
          created_at: new Date().toISOString(),
          reactions: [],
          attachments: []
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      console.error('Error regenerating response:', error);
      Alert.alert('Error', error.message || 'Failed to regenerate response');
    }
  };

  // ========================================
  // ADD MESSAGE REACTION
  // ========================================
  
  const addMessageReaction = async (messageId: string, emoji: string): Promise<void> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Check if reaction already exists
      const { data: existingReaction } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();
      
      if (existingReaction) {
        // Reaction already exists, remove it
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add new reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            emoji,
            user_id: user.id,
          });
      }
      
      // Refresh messages
      const conversationId = messages.find(m => m.id === messageId)?.conversation_id;
      if (conversationId) {
        await fetchMessages(conversationId);
      }
    } catch (error: any) {
      console.error('Error adding reaction:', error);
      Alert.alert('Error', error.message || 'Failed to add reaction');
    }
  };

  // ========================================
  // REMOVE MESSAGE REACTION
  // ========================================
  
  const removeMessageReaction = async (messageId: string, emoji: string): Promise<void> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Remove reaction
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
      
      // Refresh messages
      const conversationId = messages.find(m => m.id === messageId)?.conversation_id;
      if (conversationId) {
        await fetchMessages(conversationId);
      }
    } catch (error: any) {
      console.error('Error removing reaction:', error);
      Alert.alert('Error', error.message || 'Failed to remove reaction');
    }
  };

  // ========================================
  // CREATE MESSAGE THREAD
  // ========================================
  
  const createMessageThread = async (messageId: string): Promise<string> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Get message details
      const { data: message } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();
      
      if (!message) throw new Error('Message not found');
      
      // Create thread
      const { data, error } = await supabase
        .from('message_threads')
        .insert({
          parent_message_id: messageId,
          conversation_id: message.conversation_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data.id;
    } catch (error: any) {
      console.error('Error creating thread:', error);
      Alert.alert('Error', error.message || 'Failed to create thread');
      throw error;
    }
  };

  // ========================================
  // SUBMIT FEEDBACK WITH LEARNING
  // ========================================
  
  const submitFeedback = async (messageId: string, score: number): Promise<void> => {
    try {
      // Update message feedback
      await supabase
        .from('messages')
        .update({ feedback_score: score })
        .eq('id', messageId);
      
      // Get message details for learning
      const { data: message } = await supabase
        .from('messages')
        .select(`
          *,
          conversation:conversation_id(
            *,
            bot:bot_id(*)
          )
        `)
        .eq('id', messageId)
        .single();
      
      if (message && message.conversation && message.conversation.bot) {
        // Get recent messages for context
        const { data: recentMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', message.conversation_id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        // Learn from feedback
        const learning = await learnFromFeedback(
          message.conversation.bot,
          recentMessages || [],
          score
        );
        
        console.log('Learning from feedback:', learning);
        
        // Update bot memory with learning
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const botMemory = await fetchBotMemory(message.conversation.bot_id, user.id);
          
          if (botMemory) {
            // Add learning to learned_responses
            const updatedLearnedResponses = [
              ...(botMemory.learned_responses || []),
              learning
            ];
            
            await supabase
              .from('bot_memories')
              .update({
                learned_responses: updatedLearnedResponses,
                updated_at: new Date().toISOString()
              })
              .eq('bot_id', message.conversation.bot_id)
              .eq('user_id', user.id);
            
            // Update state
            setBotMemories(prev => ({
              ...prev,
              [`${message.conversation.bot_id}_${user.id}`]: {
                ...prev[`${message.conversation.bot_id}_${user.id}`],
                learned_responses: updatedLearnedResponses,
                updated_at: new Date().toISOString()
              }
            }));
          }
        }
      }
      
      // Refresh messages
      const conversationId = messages.find(m => m.id === messageId)?.conversation_id;
      if (conversationId) {
        await fetchMessages(conversationId);
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', error.message || 'Failed to submit feedback');
    }
  };

  // ========================================
  // VOICE RECORDING
  // ========================================
  
  const startRecording = async (): Promise<void> => {
    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async (): Promise<void> => {
    console.log('Stopping recording..');
    if (!recording) return;
    
    setRecording(null);
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);
    
    // In a real implementation, you would process the recording
    // and convert it to text using a speech-to-text service
  };

  // ========================================
  // TEXT-TO-SPEECH
  // ========================================
  
  const speakText = async (text: string, voiceId?: string): Promise<void> => {
    try {
      setIsSpeaking(true);
      
      const options: Speech.SpeechOptions = {
        voice: voiceId,
        pitch: 1.0,
        rate: 0.9,
      };
      
      await Speech.speak(text, options);
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      Alert.alert('Error', 'Failed to speak text');
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = async (): Promise<void> => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  };

  // ========================================
  // GENERATE SUGGESTIONS WITH LOADING STATE
  // ========================================
  
  const generateSuggestions = async (conversationId: string): Promise<void> => {
    try {
      setLoadingSuggestions(true);
      
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
      
      // Get recent messages
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Generate suggestions
      const suggestionsText = await generateSmartSuggestions(
        conversation.bot,
        recentMessages || []
      );
      
      // Convert to ChatSuggestion format
      const chatSuggestions: ChatSuggestion[] = suggestionsText.map((text, index) => ({
        id: `suggestion-${index}`,
        text,
        category: index % 3 === 0 ? 'question' : index % 3 === 1 ? 'statement' : 'action',
      }));
      
      setSuggestions(chatSuggestions);
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      Alert.alert('Error', error.message || 'Failed to generate suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // ========================================
  // SEARCH MESSAGES
  // ========================================
  
  const searchMessages = async (conversationId: string, query: string): Promise<Message[]> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error searching messages:', error);
      Alert.alert('Error', error.message || 'Failed to search messages');
      return [];
    }
  };

  // ========================================
  // GENERATE CONVERSATION SUMMARY WITH LOADING STATE
  // ========================================
  
  const generateConversationSummary = async (conversationId: string): Promise<string> => {
    try {
      setLoadingSummary(true);
      setShowSummary(false);
      
      // Get messages
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (!messages || messages.length === 0) {
        const noMessagesSummary = 'No messages to summarize';
        setSummary(noMessagesSummary);
        setShowSummary(true);
        return noMessagesSummary;
      }
      
      // Generate summary using the renamed import
      const summary = await generateSummaryAI(messages);
      
      // Update conversation with summary
      await supabase
        .from('conversations')
        .update({ summary })
        .eq('id', conversationId);
      
      // Update conversations list
      fetchConversations();
      
      // Set summary state and show it
      setSummary(summary);
      setShowSummary(true);
      
      return summary;
    } catch (error: any) {
      console.error('Error generating summary:', error);
      Alert.alert('Error', error.message || 'Failed to generate summary');
      return '';
    } finally {
      setLoadingSummary(false);
    }
  };

  // ========================================
  // SYNC PENDING MESSAGES
  // ========================================
  
  const syncPendingMessages = useCallback(async (): Promise<void> => {
    if (!onlineStatus) return;
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Process each conversation with pending messages
      for (const [conversationId, pendingMsgs] of Object.entries(pendingMessages)) {
        if (pendingMsgs.length === 0) continue;
        
        // Get conversation details
        const { data: conversation } = await supabase
          .from('conversations')
          .select(`
            *,
            bot:bot_id(*)
          `)
          .eq('id', conversationId)
          .single();
        
        if (!conversation?.bot) continue;
        
        // Get bot memory
        const botMemory = await fetchBotMemory(conversation.bot_id, user.id);
        
        // Process each pending message
        for (const pendingMsg of pendingMsgs) {
          try {
            // Add user message to database
            const { data: userMessage } = await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                sender: 'user',
                content: pendingMsg.content,
                parent_message_id: pendingMsg.parent_message_id,
              })
              .select()
              .single();
            
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
              recentMessages?.reverse() || [],
              botMemory || undefined
            );
            
            // Add bot message to database
            await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                sender: 'bot',
                content: botResponse,
                parent_message_id: pendingMsg.parent_message_id,
              });
            
            // Update conversation timestamp
            await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId);
          } catch (msgError) {
            console.error('Error syncing pending message:', msgError);
          }
        }
        
        // Clear pending messages for this conversation
        setPendingMessages(prev => {
          const newPending = { ...prev };
          delete newPending[conversationId];
          return newPending;
        });
      }
      
      // Refresh conversations and messages
      fetchConversations();
      if (currentConversation) {
        fetchMessages(currentConversation.id);
      }
    } catch (error: any) {
      console.error('Error syncing pending messages:', error);
    }
  }, [onlineStatus, pendingMessages, currentConversation, fetchBotMemory, fetchConversations, fetchMessages]);

  // ========================================
  // MONITOR ONLINE STATUS
  // ========================================
  
  useEffect(() => {
    const handleConnectivityChange = (isConnected: boolean) => {
      setOnlineStatus(isConnected);
      
      if (isConnected) {
        // Sync pending messages when coming back online
        syncPendingMessages();
      }
    };
    
    // In a real implementation, you would use NetInfo to monitor connectivity
    // For now, we'll just assume we're online
    handleConnectivityChange(true);
    
    return () => {
      // Cleanup
    };
  }, [syncPendingMessages]);

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
  }, [fetchBots, fetchConversations]);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value = {
    bots,
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    loading,
    creatingBot,
    isRecording,
    isSpeaking,
    suggestions,
    loadingSuggestions,
    loadingSummary,
    summary,
    showSummary,
    setShowSummary,
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
    addMessageReaction,
    removeMessageReaction,
    createMessageThread,
    submitFeedback,
    startRecording,
    stopRecording,
    speakText,
    stopSpeaking,
    generateSuggestions,
    searchMessages,
    generateConversationSummary,
  } as ChatContextType;

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