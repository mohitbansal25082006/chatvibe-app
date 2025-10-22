import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useChat } from '../utils/ChatContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Message as DBMessage, MessageReaction } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
// Removed Location import
import { Audio } from 'expo-av';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: 'user' | 'bot';
  reactions?: { emoji: string; count: number }[];
  attachments?: { type: string; url: string }[];
  feedback_score?: number;
  parent_message_id?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const isIOS = Platform.OS === 'ios';

const aggregateReactions = (reactions: MessageReaction[]): { emoji: string; count: number }[] => {
  const counts = new Map<string, number>();
  reactions.forEach((r) => {
    const emoji = r.emoji;
    counts.set(emoji, (counts.get(emoji) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count }));
};

const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={styles.typingIndicator}>
      <Animated.View
        style={[
          styles.typingDot,
          {
            opacity: dot1,
            transform: [
              {
                translateY: dot1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.typingDot,
          {
            opacity: dot2,
            transform: [
              {
                translateY: dot2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.typingDot,
          {
            opacity: dot3,
            transform: [
              {
                translateY: dot3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
};

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const MessageBubble: React.FC<{
  message: Message;
  isUser: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  onFeedback: (messageId: string, score: number) => void;
  messages: Message[];
}> = ({ message, isUser, onReaction, onReply, onFeedback, messages }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Find the parent message if this is a reply
  const parentMessage = message.parent_message_id
    ? messages.find(m => m.id === message.parent_message_id)
    : null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderAttachment = (attachment: any, index: number) => {
    if (attachment.type === 'image') {
      return (
        <Image
          key={index}
          source={{ uri: attachment.url }}
          style={styles.attachmentImage}
          resizeMode="cover"
        />
      );
    } else if (attachment.type === 'location') {
      return (
        <View key={index} style={styles.locationContainer}>
          <Ionicons name="location" size={20} color="#6366f1" />
          <Text style={styles.locationText}>Location shared</Text>
        </View>
      );
    } else if (attachment.type === 'voice') {
      return (
        <View key={index} style={styles.voiceContainer}>
          <Ionicons name="mic" size={20} color="#6366f1" />
          <Text style={styles.voiceText}>Voice message</Text>
        </View>
      );
    } else {
      return (
        <View key={index} style={styles.documentContainer}>
          <Ionicons name="document" size={20} color="#6366f1" />
          <Text style={styles.documentText}>Document</Text>
        </View>
      );
    }
  };

  return (
    <View style={[
      styles.messageContainer,
      isUser ? styles.userMessageContainer : styles.botMessageContainer
    ]}>
      {/* Show parent message if this is a reply */}
      {parentMessage && (
        <View style={styles.parentMessageContainer}>
          <View style={styles.parentMessageBar} />
          <View style={styles.parentMessageContent}>
            <Text style={styles.parentMessageLabel}>
              {parentMessage.sender === 'user' ? 'You' : 'Bot'}
            </Text>
            <Text style={styles.parentMessageText} numberOfLines={2}>
              {parentMessage.content}
            </Text>
          </View>
        </View>
      )}
      <TouchableOpacity
        onLongPress={() => setShowActions(true)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.botText
            ]}
            selectable={true}
          >
            {message.content}
          </Text>
          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {message.attachments.map((attachment, index) => renderAttachment(attachment, index))}
            </View>
          )}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isUser ? styles.userTime : styles.botTime
              ]}
            >
              {formatTime(message.created_at)}
            </Text>
            {!isUser && (
              <View style={styles.feedbackContainer}>
                <TouchableOpacity
                  style={[
                    styles.feedbackButton,
                    message.feedback_score === 1 && styles.feedbackButtonPositive
                  ]}
                  onPress={() => onFeedback(message.id, 1)}
                >
                  <Ionicons
                    name="thumbs-up"
                    size={16}
                    color={message.feedback_score === 1 ? "#fff" : "#9ca3af"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.feedbackButton,
                    message.feedback_score === -1 && styles.feedbackButtonNegative
                  ]}
                  onPress={() => onFeedback(message.id, -1)}
                >
                  <Ionicons
                    name="thumbs-down"
                    size={16}
                    color={message.feedback_score === -1 ? "#fff" : "#9ca3af"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {message.reactions && message.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {message.reactions.map((reaction, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.reactionBubble}
                  onPress={() => onReaction(message.id, reaction.emoji)}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={styles.reactionCount}>{reaction.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
      {showActions && (
        <View style={styles.messageActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              onReply(message.id);
              setShowActions(false);
            }}
          >
            <Ionicons name="arrow-undo" size={20} color="#6366f1" />
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setShowReactions(true);
              setShowActions(false);
            }}
          >
            <Ionicons name="happy-outline" size={20} color="#6366f1" />
            <Text style={styles.actionText}>React</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowActions(false)}
          >
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}
      {showReactions && (
        <View style={styles.reactionsModal}>
          <View style={styles.reactionsModalContent}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionOption}
                  onPress={() => {
                    onReaction(message.id, emoji);
                    setShowReactions(false);
                  }}
                >
                  <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeReactions}
              onPress={() => setShowReactions(false)}
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bot, setBot] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const insets = useSafeAreaInsets();

  const {
    fetchMessages,
    sendMessage,
    clearChat,
    regenerateResponse,
    conversations,
    suggestions,
    loadingSuggestions,
    loadingSummary,
    summary,
    showSummary,
    setShowSummary,
    isRecording: isRecordingVoice,
    isSpeaking,
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
    generateConversationSummary
  } = useChat();

  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { conversationId, botId } = route.params;

  useEffect(() => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation?.bot) {
      setBot(conversation.bot);
      navigation.setOptions({
        headerShown: true,
        headerTitle: conversation.bot.name,
        headerStyle: { backgroundColor: conversation.bot.color },
        headerTintColor: '#fff',
        headerRight: () => (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => handleGenerateSuggestions()}
            >
              {loadingSuggestions ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="bulb-outline" size={20} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => handleGenerateSummary()}
            >
              {loadingSummary ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="document-text-outline" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        ),
      });
    }
    loadMessages();
  }, [conversationId, conversations, loadingSuggestions, loadingSummary]);

  const loadMessages = async () => {
    try {
      const chatMessages: DBMessage[] = await fetchMessages(conversationId);
      if (Array.isArray(chatMessages)) {
        const transformedMessages = chatMessages.map((msg) => ({
          ...msg,
          reactions: msg.reactions ? aggregateReactions(msg.reactions) : undefined,
        } as Message));
        setMessages(transformedMessages);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd(true);
        }, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);
    try {
      await sendMessage(conversationId, messageText, undefined, replyingTo || undefined);
      setReplyingTo(null);
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            await clearChat(conversationId);
            setMessages([]);
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleRegenerateResponse = () => {
    Alert.alert(
      'Regenerate Response',
      'Are you sure you want to regenerate the last bot response?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            setIsTyping(true);
            try {
              await regenerateResponse(conversationId);
              await loadMessages();
            } catch (error) {
              console.error('Error regenerating response:', error);
              Alert.alert('Error', 'Failed to regenerate response');
            } finally {
              setIsTyping(false);
            }
          }
        }
      ]
    );
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addMessageReaction(messageId, emoji);
      await loadMessages();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleReply = (messageId: string) => {
    setReplyingTo(messageId);
    setInputText('');
  };

  const handleFeedback = async (messageId: string, score: number) => {
    try {
      await submitFeedback(messageId, score);
      await loadMessages();
      // Show feedback to user
      Alert.alert(
        'Feedback Submitted',
        score > 0
          ? 'Thank you for your positive feedback! I\'ll use this to improve future responses.'
          : 'Thank you for your feedback! I\'ll work on providing better responses in the future.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handleSpeakText = async (text: string) => {
    try {
      if (isSpeaking) {
        await stopSpeaking();
      } else {
        await speakText(text, bot?.voice_settings?.voice_id);
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      Alert.alert('Error', 'Failed to speak text');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        console.log('Selected image:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (result.assets && result.assets.length > 0) {
        console.log('Selected document:', result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  // Removed handleShareLocation

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results: DBMessage[] = await searchMessages(conversationId, searchQuery);
      const transformedResults = results.map((msg) => ({
        ...msg,
        reactions: msg.reactions ? aggregateReactions(msg.reactions) : undefined,
      } as Message));
      setSearchResults(transformedResults);
    } catch (error) {
      console.error('Error searching messages:', error);
      Alert.alert('Error', 'Failed to search messages');
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
    setShowSuggestions(false);
  };

  const handleGenerateSuggestions = async () => {
    try {
      await generateSuggestions(conversationId);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      await generateConversationSummary(conversationId);
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  const replyingToMessage = messages.find(m => m.id === replyingTo);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={bot?.color || '#6366f1'}
      />
      {bot && (
        <LinearGradient
          colors={[bot.color, `${bot.color}dd`]}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.botInfo}>
            <View style={styles.botAvatar}>
              <Text style={styles.botEmoji}>{bot.emoji}</Text>
            </View>
            <View style={styles.botDetails}>
              <Text style={styles.botName} numberOfLines={1}>{bot.name}</Text>
              <Text style={styles.botRole} numberOfLines={1}>{bot.role}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleRegenerateResponse}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleClearChat}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      )}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={isIOS ? 'padding' : undefined}
        keyboardVerticalOffset={isIOS ? 0 : 0}
      >
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd(true)}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={isIOS ? 20 : 100}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{bot?.emoji || '🤖'}</Text>
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.emptyDescription}>
                Say hello to {bot?.name || 'your bot'}!
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isUser={message.sender === 'user'}
                onReaction={handleReaction}
                onReply={handleReply}
                onFeedback={handleFeedback}
                messages={messages}
              />
            ))
          )}
          {isTyping && (
            <View style={[styles.messageBubble, styles.botBubble]}>
              <TypingIndicator />
            </View>
          )}
        </KeyboardAwareScrollView>
        {replyingToMessage && (
          <View style={styles.replyingContainer}>
            <View style={styles.replyingBar} />
            <View style={styles.replyingContent}>
              <Text style={styles.replyingLabel}>Replying to</Text>
              <Text style={styles.replyingText} numberOfLines={2}>
                {replyingToMessage.content}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cancelReply}
              onPress={() => setReplyingTo(null)}
            >
              <Ionicons name="close" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionBubble}
                  onPress={() => handleSuggestionPress(suggestion.text)}
                >
                  <Text style={styles.suggestionText}>{suggestion.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeSuggestions}
              onPress={() => setShowSuggestions(false)}
            >
              <Ionicons name="close" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputContainer, { paddingBottom: isIOS ? insets.bottom : 16 }]}>
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={styles.inputActionButton}
              onPress={handlePickImage}
            >
              <Ionicons name="image-outline" size={20} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.inputActionButton}
              onPress={handlePickDocument}
            >
              <Ionicons name="document-outline" size={20} color="#6366f1" />
            </TouchableOpacity>
            {/* Location button removed */}
            {isRecording ? (
              <TouchableOpacity
                style={[styles.inputActionButton, styles.recordingButton]}
                onPress={handleStopRecording}
              >
                <Ionicons name="stop" size={20} color="#ef4444" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.inputActionButton}
                onPress={handleStartRecording}
              >
                <Ionicons name="mic-outline" size={20} color="#6366f1" />
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1000}
            textAlignVertical="center"
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.7}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Search Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchHeader}>
            <TouchableOpacity
              style={styles.searchBackButton}
              onPress={() => setShowSearch(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages..."
              placeholderTextColor="#9ca3af"
              autoFocus
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Ionicons name="search" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.searchResults}>
            {searchResults.map((message) => (
              <View key={message.id} style={styles.searchResultItem}>
                <Text style={styles.searchResultSender}>
                  {message.sender === 'user' ? 'You' : bot?.name}
                </Text>
                <Text style={styles.searchResultContent}>
                  {message.content}
                </Text>
                <Text style={styles.searchResultTime}>
                  {new Date(message.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Summary Modal */}
      <Modal
        visible={showSummary}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <TouchableOpacity
              style={styles.summaryBackButton}
              onPress={() => setShowSummary(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.summaryTitle}>Conversation Summary</Text>
          </View>
          <View style={styles.summaryContent}>
            {loadingSummary ? (
              <View style={styles.summaryLoading}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.summaryLoadingText}>Generating summary...</Text>
              </View>
            ) : (
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryText}>{summary}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    width: isSmallDevice ? 32 : 36,
    height: isSmallDevice ? 32 : 36,
    borderRadius: isSmallDevice ? 16 : 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatar: {
    width: isSmallDevice ? 44 : 50,
    height: isSmallDevice ? 44 : 50,
    borderRadius: isSmallDevice ? 22 : 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  botEmoji: {
    fontSize: isSmallDevice ? 20 : 24,
  },
  botDetails: {
    flex: 1,
    marginRight: 8,
  },
  botName: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  botRole: {
    fontSize: isSmallDevice ? 12 : 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SCREEN_WIDTH * 0.04,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  emptyEmoji: {
    fontSize: isSmallDevice ? 48 : 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyDescription: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.75,
    minWidth: SCREEN_WIDTH * 0.2,
    paddingHorizontal: isSmallDevice ? 10 : 12,
    paddingVertical: isSmallDevice ? 8 : 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  messageText: {
    fontSize: isSmallDevice ? 14 : 16,
    lineHeight: isSmallDevice ? 20 : 22,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#1f2937',
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 8,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  voiceText: {
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 8,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  documentText: {
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 8,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: isSmallDevice ? 9 : 10,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  botTime: {
    color: '#9ca3af',
  },
  feedbackContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackButtonPositive: {
    backgroundColor: '#10b981',
  },
  feedbackButtonNegative: {
    backgroundColor: '#ef4444',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 2,
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 4,
  },
  reactionsModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
    paddingBottom: 32,
  },
  reactionsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  reactionOption: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  reactionOptionEmoji: {
    fontSize: 24,
  },
  closeReactions: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6b7280',
  },
  parentMessageContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    marginLeft: isSmallDevice ? 30 : 40,
  },
  parentMessageBar: {
    width: 2,
    height: 30,
    backgroundColor: '#e5e7eb',
    borderRadius: 1,
    marginRight: 8,
  },
  parentMessageContent: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#e5e7eb',
  },
  parentMessageLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  parentMessageText: {
    fontSize: 12,
    color: '#6b7280',
  },
  replyingContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  replyingBar: {
    width: 3,
    height: 40,
    backgroundColor: '#6366f1',
    borderRadius: 1.5,
    marginRight: 12,
  },
  replyingContent: {
    flex: 1,
  },
  replyingLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  replyingText: {
    fontSize: 14,
    color: '#1f2937',
  },
  cancelReply: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    position: 'relative',
  },
  suggestionBubble: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  suggestionText: {
    fontSize: 14,
    color: '#1f2937',
  },
  closeSuggestions: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  inputActions: {
    flexDirection: 'row',
    marginRight: 8,
    marginBottom: 4,
  },
  inputActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  recordingButton: {
    backgroundColor: '#fee2e2',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 8 : 10,
    fontSize: isSmallDevice ? 14 : 16,
    maxHeight: 100,
    minHeight: 40,
    marginRight: 8,
    color: '#1f2937',
    ...Platform.select({
      ios: {
        paddingTop: 10,
      },
      android: {
        paddingTop: 8,
        textAlignVertical: 'center',
      },
    }),
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  searchContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResults: {
    flex: 1,
    padding: 16,
  },
  searchResultItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 4,
  },
  searchResultContent: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 4,
  },
  searchResultTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  summaryContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryBackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  summaryContent: {
    flex: 1,
    padding: 16,
  },
  summaryLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  summaryLoadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  summaryTextContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  summaryText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
});