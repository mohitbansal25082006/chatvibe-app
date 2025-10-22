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
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useChat } from '../utils/ChatContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MessageThreadScreenRouteProp = RouteProp<RootStackParamList, 'MessageThread'>;
type MessageThreadScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MessageThread'>;

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: 'user' | 'bot';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const isIOS = Platform.OS === 'ios';

export const MessageThreadScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const insets = useSafeAreaInsets();
  
  const { 
    fetchMessages, 
    sendMessage, 
    conversations 
  } = useChat();
  
  const route = useRoute<MessageThreadScreenRouteProp>();
  const navigation = useNavigation<MessageThreadScreenNavigationProp>();
  const { threadId, parentMessageId } = route.params;

  useEffect(() => {
    // In a real implementation, you would fetch the parent message
    // and the thread messages from the database
    // For now, we'll just simulate it
    const mockParentMessage: Message = {
      id: parentMessageId,
      content: 'This is the parent message',
      created_at: new Date().toISOString(),
      sender: 'user',
    };
    
    setParentMessage(mockParentMessage);
    
    // Load thread messages
    loadThreadMessages();
  }, [threadId, parentMessageId]);

  const loadThreadMessages = async () => {
    try {
      // In a real implementation, you would fetch the thread messages
      // For now, we'll just use an empty array
      setMessages([]);
    } catch (error) {
      console.error('Error loading thread messages:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);
    
    try {
      // In a real implementation, you would send the message to the thread
      // For now, we'll just simulate it
      const newMessage: Message = {
        id: `temp-${Date.now()}`,
        content: messageText,
        created_at: new Date().toISOString(),
        sender: 'user',
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Simulate bot response
      setTimeout(() => {
        const botResponse: Message = {
          id: `temp-${Date.now() + 1}`,
          content: 'This is a response in the thread',
          created_at: new Date().toISOString(),
          sender: 'bot',
        };
        
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setIsTyping(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Thread</Text>
            {parentMessage && (
              <Text style={styles.parentMessage} numberOfLines={1}>
                {parentMessage.content}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>
      
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
          {parentMessage && (
            <View style={styles.parentMessageContainer}>
              <View style={styles.parentMessageBubble}>
                <Text style={styles.parentMessageText}>
                  {parentMessage.content}
                </Text>
                <Text style={styles.parentMessageTime}>
                  {formatTime(parentMessage.created_at)}
                </Text>
              </View>
            </View>
          )}
          
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No replies yet</Text>
              <Text style={styles.emptyDescription}>
                Be the first to reply to this message
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.sender === 'user' ? styles.userMessageContainer : styles.botMessageContainer
                ]}
              >
                <View style={[
                  styles.messageBubble,
                  message.sender === 'user' ? styles.userBubble : styles.botBubble
                ]}>
                  <Text
                    style={[
                      styles.messageText,
                      message.sender === 'user' ? styles.userText : styles.botText
                    ]}
                    selectable={true}
                  >
                    {message.content}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      message.sender === 'user' ? styles.userTime : styles.botTime
                    ]}
                  >
                    {formatTime(message.created_at)}
                  </Text>
                </View>
              </View>
            ))
          )}
          
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#6366f1" />
              </View>
            </View>
          )}
        </KeyboardAwareScrollView>

        <View style={[styles.inputContainer, { paddingBottom: isIOS ? insets.bottom : 16 }]}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a reply..."
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  parentMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SCREEN_WIDTH * 0.04,
    paddingBottom: 8,
    flexGrow: 1,
  },
  parentMessageContainer: {
    marginBottom: 16,
  },
  parentMessageBubble: {
    backgroundColor: '#e5e7eb',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  parentMessageText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  parentMessageTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
  messageTime: {
    fontSize: isSmallDevice ? 9 : 10,
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  botTime: {
    color: '#9ca3af',
  },
  typingContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
});