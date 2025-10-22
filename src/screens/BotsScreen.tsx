import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../utils/ChatContext';
import { Bot } from '../types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type BotsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const BotsScreen: React.FC = () => {
  const { bots, fetchBots, deleteBot, createConversation, loading } = useChat();
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<BotsScreenNavigationProp>();

  useEffect(() => {
    fetchBots();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBots();
    setRefreshing(false);
  };

  const handleDeleteBot = (botId: string, botName: string) => {
    Alert.alert(
      'Delete Bot',
      `Are you sure you want to delete ${botName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: () => deleteBot(botId),
          style: 'destructive'
        }
      ]
    );
  };

  const handleChatWithBot = async (botId: string) => {
    try {
      const conversationId = await createConversation(botId);
      navigation.navigate('Chat', { conversationId, botId });
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const renderBotItem = ({ item }: { item: Bot }) => (
    <View style={[styles.botCard, { borderLeftColor: item.color }]}>
      <View style={styles.botHeader}>
        <View style={styles.botAvatar}>
          <Text style={styles.botEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.botInfo}>
          <Text style={styles.botName}>{item.name}</Text>
          <Text style={styles.botRole}>{item.role}</Text>
        </View>
      </View>
      
      <Text style={styles.botDescription} numberOfLines={2}>
        {item.description || `A ${item.tone} AI assistant with a ${item.role} role.`}
      </Text>
      
      <View style={styles.botActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.chatButton]}
          onPress={() => handleChatWithBot(item.id)}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('BotEdit', { botId: item.id })}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteBot(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#6366f1" />
      <Text style={styles.emptyTitle}>No bots yet</Text>
      <Text style={styles.emptyDescription}>
        Create your first AI bot to start chatting
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Your Bots</Text>
        <Text style={styles.headerSubtitle}>Manage your AI crew</Text>
      </LinearGradient>

      <View style={styles.content}>
        <FlatList
          data={bots}
          renderItem={renderBotItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
        
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('BotCreation')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  botCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  botAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  botEmoji: {
    fontSize: 24,
  },
  botInfo: {
    flex: 1,
  },
  botName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  botRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  botDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  botActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  chatButton: {
    backgroundColor: '#10b981',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});