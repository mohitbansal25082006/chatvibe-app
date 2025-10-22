import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import Slider from '@react-native-community/slider';
import { useChat } from '../utils/ChatContext';
import { BotCreate, BotPersonality, BotVoice } from '../types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type BotCreationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BotCreation'>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

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

const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', language: 'en', gender: 'neutral' as const },
  { id: 'echo', name: 'Echo', language: 'en', gender: 'male' as const },
  { id: 'fable', name: 'Fable', language: 'en', gender: 'neutral' as const },
  { id: 'onyx', name: 'Onyx', language: 'en', gender: 'male' as const },
  { id: 'nova', name: 'Nova', language: 'en', gender: 'female' as const },
  { id: 'shimmer', name: 'Shimmer', language: 'en', gender: 'female' as const },
];

const AVATAR_STYLES = [
  'Realistic', 'Cartoon', 'Anime', 'Pixel Art', 'Abstract', 'Minimalist', 
  '3D Render', 'Watercolor', 'Oil Painting', 'Sketch', 'Cyberpunk', 'Fantasy'
];

export const BotCreationScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [tone, setTone] = useState('');
  const [emoji, setEmoji] = useState('🤖');
  const [color, setColor] = useState('#6366f1');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [backgroundStory, setBackgroundStory] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('Realistic');
  
  // Personality traits
  const [personality, setPersonality] = useState<BotPersonality>({
    humor: 50,
    empathy: 50,
    creativity: 50,
    formality: 50,
  });
  
  // Voice settings
  const [voiceSettings, setVoiceSettings] = useState<BotVoice>({
    voice_id: 'alloy',
    name: 'Alloy',
    language: 'en',
    gender: 'neutral',
  });
  
  // UI state
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [showAvatarStylePicker, setShowAvatarStylePicker] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  
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
      personality,
      background_story: backgroundStory.trim() || undefined,
      voice_settings: voiceSettings,
      avatar_style: avatarStyle,
    };

    try {
      await createBot(botData);
      navigation.goBack();
    } catch (error) {
      console.error('Error creating bot:', error);
    }
  };

  const sections: Array<{ title: string; icon: IoniconsName }> = [
    { title: 'Basic Info', icon: 'person-outline' },
    { title: 'Personality', icon: 'happy-outline' },
    { title: 'Appearance', icon: 'color-palette-outline' },
    { title: 'Voice', icon: 'volume-high-outline' },
    { title: 'Advanced', icon: 'settings-outline' },
  ];

  const renderBasicInfo = () => (
    <View>
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

      <Input
        label="Description (Optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Brief description of your bot"
        multiline
        numberOfLines={3}
      />
    </View>
  );

  const renderPersonality = () => (
    <View>
      <Text style={styles.sectionTitle}>Personality Traits</Text>
      
      <View style={styles.traitContainer}>
        <View style={styles.traitHeader}>
          <Text style={styles.traitName}>Humor</Text>
          <Text style={styles.traitValue}>{Math.round(personality.humor)}%</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={personality.humor}
          onValueChange={(value: number) => setPersonality({...personality, humor: value})}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#e5e7eb"
          thumbTintColor="#6366f1"
        />
      </View>

      <View style={styles.traitContainer}>
        <View style={styles.traitHeader}>
          <Text style={styles.traitName}>Empathy</Text>
          <Text style={styles.traitValue}>{Math.round(personality.empathy)}%</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={personality.empathy}
          onValueChange={(value: number) => setPersonality({...personality, empathy: value})}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#e5e7eb"
          thumbTintColor="#6366f1"
        />
      </View>

      <View style={styles.traitContainer}>
        <View style={styles.traitHeader}>
          <Text style={styles.traitName}>Creativity</Text>
          <Text style={styles.traitValue}>{Math.round(personality.creativity)}%</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={personality.creativity}
          onValueChange={(value: number) => setPersonality({...personality, creativity: value})}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#e5e7eb"
          thumbTintColor="#6366f1"
        />
      </View>

      <View style={styles.traitContainer}>
        <View style={styles.traitHeader}>
          <Text style={styles.traitName}>Formality</Text>
          <Text style={styles.traitValue}>{Math.round(personality.formality)}%</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={personality.formality}
          onValueChange={(value: number) => setPersonality({...personality, formality: value})}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#e5e7eb"
          thumbTintColor="#6366f1"
        />
      </View>

      <Input
        label="Background Story (Optional)"
        value={backgroundStory}
        onChangeText={setBackgroundStory}
        placeholder="Create a backstory for your bot"
        multiline
        numberOfLines={4}
      />
    </View>
  );

  const renderAppearance = () => (
    <View>
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

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Avatar Style</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowAvatarStylePicker(true)}
        >
          <Text style={styles.pickerButtonText}>
            {avatarStyle || 'Select an avatar style'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVoice = () => (
    <View>
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Voice</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowVoicePicker(true)}
        >
          <Text style={styles.pickerButtonText}>
            {voiceSettings.name || 'Select a voice'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.voicePreview}>
        <Ionicons name="volume-high-outline" size={24} color="#6366f1" />
        <Text style={styles.voicePreviewText}>Voice Preview</Text>
        <TouchableOpacity style={styles.playButton}>
          <Ionicons name="play-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAdvanced = () => (
    <View>
      <Input
        label="System Prompt (Optional)"
        value={systemPrompt}
        onChangeText={setSystemPrompt}
        placeholder="Custom instructions for the AI (advanced)"
        multiline
        numberOfLines={6}
      />
      
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Advanced Mode</Text>
        <Switch
          value={advancedMode}
          onValueChange={setAdvancedMode}
          trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
          thumbColor={advancedMode ? '#6366f1' : '#f4f4f4'}
        />
      </View>
      
      {advancedMode && (
        <View style={styles.advancedOptions}>
          <Text style={styles.advancedTitle}>Advanced Options</Text>
          <Text style={styles.advancedDescription}>
            Enable advanced features like memory system, mood detection, and learning mode.
          </Text>
        </View>
      )}
    </View>
  );

  const renderSection = () => {
    switch (currentSection) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderPersonality();
      case 2:
        return renderAppearance();
      case 3:
        return renderVoice();
      case 4:
        return renderAdvanced();
      default:
        return renderBasicInfo();
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

        <View style={styles.sectionSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sections.map((section, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.sectionTab,
                  currentSection === index && styles.sectionTabActive
                ]}
                onPress={() => setCurrentSection(index)}
              >
                <Ionicons 
                  name={section.icon} 
                  size={20} 
                  color={currentSection === index ? '#6366f1' : '#9ca3af'} 
                />
                <Text style={[
                  styles.sectionTabText,
                  currentSection === index && styles.sectionTabTextActive
                ]}>
                  {section.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.previewContainer}>
            <View style={[styles.previewAvatar, { backgroundColor: color }]}>
              <Text style={styles.previewEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.previewName}>{name || 'Bot Name'}</Text>
            <Text style={styles.previewRole}>{role || 'Role'}</Text>
          </View>

          <View style={styles.formContainer}>
            {renderSection()}
            
            <View style={styles.navigationButtons}>
              {currentSection > 0 && (
                <Button
                  title="Previous"
                  onPress={() => setCurrentSection(currentSection - 1)}
                  variant="outline"
                  style={styles.navButton}
                />
              )}
              
              {currentSection < sections.length - 1 ? (
                <Button
                  title="Next"
                  onPress={() => setCurrentSection(currentSection + 1)}
                  style={styles.navButton}
                />
              ) : (
                <Button
                  title="Create Bot"
                  onPress={handleCreateBot}
                  loading={creatingBot}
                  style={styles.createButton}
                />
              )}
            </View>
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

        {/* Voice Picker Modal */}
        {showVoicePicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Voice</Text>
              <ScrollView style={styles.optionsContainer}>
                {VOICE_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.optionItem}
                    onPress={() => {
                      setVoiceSettings({
                        voice_id: item.id,
                        name: item.name,
                        language: item.language,
                        gender: item.gender,
                      });
                      setShowVoicePicker(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item.name}</Text>
                    <Text style={styles.optionSubtext}>{item.gender} • {item.language}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowVoicePicker(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Avatar Style Picker Modal */}
        {showAvatarStylePicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Avatar Style</Text>
              <ScrollView style={styles.optionsContainer}>
                {AVATAR_STYLES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionItem}
                    onPress={() => {
                      setAvatarStyle(item);
                      setShowAvatarStylePicker(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAvatarStylePicker(false)}
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
  sectionSelector: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  sectionTabActive: {
    backgroundColor: '#eef2ff',
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    marginLeft: 6,
  },
  sectionTabTextActive: {
    color: '#6366f1',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  traitContainer: {
    marginBottom: 20,
  },
  traitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  traitName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  traitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  slider: {
    width: '100%',
    height: 40,
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
  voicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  voicePreviewText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  advancedOptions: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  advancedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  advancedDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 24,
  },
  navButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  createButton: {
    flex: 1,
    marginHorizontal: 8,
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
  optionSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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