import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useChat } from '../utils/ChatContext';
import { BotCreate } from '../types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type BotCreationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BotCreation'>;

const BOT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

const BOT_EMOJIS = [
  '🤖', '👨‍💼', '👩‍💼', '🧙‍♂️', '🧙‍♀️', '🦸‍♂️', '🦸‍♀️', '🧝‍♂️', '🧝‍♀️',
  '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨',
  '🧠', '💡', '🔮', '🎭', '🎪', '🎨', '🎯', '🎲', '🎸', '🎺',
];

const BOT_ROLES = [
  'Assistant', 'Mentor', 'Coach', 'Friend', 'Teacher', 'Advisor', 
  'Expert', 'Consultant', 'Companion', 'Therapist', 'Motivator', 'Critic'
];

const BOT_TONES = [
  'Friendly', 'Professional', 'Casual', 'Formal', 'Humorous', 'Serious',
  'Encouraging', 'Sarcastic', 'Empathetic', 'Analytical', 'Creative', 'Direct'
];

export const BotCreationScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [tone, setTone] = useState('');
  const [emoji, setEmoji] = useState('🤖');
  const [color, setColor] = useState('#6366f1');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);
  
  const { createBot, creatingBot } = useChat();
  const navigation = useNavigation<BotCreationScreenNavigationProp>();

  const handleCreateBot = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a bot name');
      return;
    }
    
    if (!role.trim()) {
      Alert.alert('Error', 'Please select a role');
      return;
    }
    
    if (!tone.trim()) {
      Alert.alert('Error', 'Please select a tone');
      return;
    }

    const botData: BotCreate = {
      name: name.trim(),
      role: role.trim(),
      tone: tone.trim(),
      emoji,
      color,
      description: description.trim() || undefined,
      system_prompt: systemPrompt.trim() || undefined,
    };

    try {
      await createBot(botData);
      navigation.goBack();
    } catch (error) {
      console.error('Error creating bot:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Create New Bot</Text>
          <Text style={styles.headerSubtitle}>Design your AI companion</Text>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.previewContainer}>
            <View style={[styles.previewAvatar, { backgroundColor: color }]}>
              <Text style={styles.previewEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.previewName}>{name || 'Bot Name'}</Text>
            <Text style={styles.previewRole}>{role || 'Role'}</Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Bot Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter a name for your bot"
            />

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Role</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowRolePicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  {role || 'Select a role'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Tone</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTonePicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  {tone || 'Select a tone'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Emoji</Text>
              <View style={styles.emojiGrid}>
                {BOT_EMOJIS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.emojiItem,
                      emoji === item && styles.emojiItemSelected
                    ]}
                    onPress={() => setEmoji(item)}
                  >
                    <Text style={styles.emojiText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Color</Text>
              <View style={styles.colorGrid}>
                {BOT_COLORS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.colorItem,
                      { backgroundColor: item },
                      color === item && styles.colorItemSelected
                    ]}
                    onPress={() => setColor(item)}
                  >
                    {color === item && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of your bot"
              multiline
              numberOfLines={3}
            />

            <Input
              label="System Prompt (Optional)"
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              placeholder="Custom instructions for the AI (advanced)"
              multiline
              numberOfLines={4}
            />

            <Button
              title="Create Bot"
              onPress={handleCreateBot}
              loading={creatingBot}
              style={styles.createButton}
            />
          </View>
        </ScrollView>

        {/* Role Picker Modal */}
        {showRolePicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <ScrollView style={styles.optionsContainer}>
                {BOT_ROLES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionItem}
                    onPress={() => {
                      setRole(item);
                      setShowRolePicker(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRolePicker(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tone Picker Modal */}
        {showTonePicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Tone</Text>
              <ScrollView style={styles.optionsContainer}>
                {BOT_TONES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionItem}
                    onPress={() => {
                      setTone(item);
                      setShowTonePicker(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTonePicker(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewEmoji: {
    fontSize: 40,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  previewRole: {
    fontSize: 16,
    color: '#6b7280',
  },
  formContainer: {
    padding: 16,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  emojiItem: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  emojiItemSelected: {
    backgroundColor: '#e0e7ff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  emojiText: {
    fontSize: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  colorItem: {
    width: 50,
    height: 50,
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: '#1f2937',
  },
  createButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    maxHeight: 300,
  },
  optionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  modalCancelButton: {
    paddingVertical: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
});