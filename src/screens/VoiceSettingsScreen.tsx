import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Slider from '@react-native-community/slider';
import * as Speech from 'expo-speech';

type VoiceSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VoiceSettings'>;

const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', language: 'en', gender: 'neutral' as const },
  { id: 'echo', name: 'Echo', language: 'en', gender: 'male' as const },
  { id: 'fable', name: 'Fable', language: 'en', gender: 'neutral' as const },
  { id: 'onyx', name: 'Onyx', language: 'en', gender: 'male' as const },
  { id: 'nova', name: 'Nova', language: 'en', gender: 'female' as const },
  { id: 'shimmer', name: 'Shimmer', language: 'en', gender: 'female' as const },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
];

const SAMPLE_TEXT = "Hello, I'm your AI assistant. How can I help you today?";

export const VoiceSettingsScreen: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]);
  const [pitch, setPitch] = useState(1.0);
  const [rate, setRate] = useState(0.9);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  
  const navigation = useNavigation<VoiceSettingsScreenNavigationProp>();

  useEffect(() => {
    // Load saved voice settings
    loadVoiceSettings();
  }, []);

  const loadVoiceSettings = () => {
    // In a real implementation, you would load the saved settings
    // from AsyncStorage or your state management
  };

  const saveVoiceSettings = () => {
    // In a real implementation, you would save the settings
    // to AsyncStorage or your state management
    Alert.alert('Success', 'Voice settings saved successfully!');
  };

  const handlePlaySample = async () => {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }

    try {
      setIsSpeaking(true);
      
      const options: Speech.SpeechOptions = {
        voice: selectedVoice.id,
        pitch,
        rate,
      };
      
      await Speech.speak(SAMPLE_TEXT, options);
      
      // Set a timeout to reset the speaking state
      setTimeout(() => {
        setIsSpeaking(false);
      }, 5000);
    } catch (error) {
      console.error('Error playing sample:', error);
      Alert.alert('Error', 'Failed to play sample');
      setIsSpeaking(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
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
          
          <Text style={styles.headerTitle}>Voice Settings</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Selection</Text>
          
          <TouchableOpacity
            style={styles.voiceSelector}
            onPress={() => setShowVoicePicker(true)}
          >
            <View style={styles.voiceInfo}>
              <Text style={styles.voiceName}>{selectedVoice.name}</Text>
              <Text style={styles.voiceDetails}>
                {selectedVoice.gender} • {selectedVoice.language}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlaySample}
          >
            {isSpeaking ? (
              <Ionicons name="stop" size={20} color="#fff" />
            ) : (
              <Ionicons name="play" size={20} color="#fff" />
            )}
            <Text style={styles.playButtonText}>
              {isSpeaking ? 'Stop' : 'Play Sample'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Characteristics</Text>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Pitch</Text>
              <Text style={styles.sliderValue}>{pitch.toFixed(1)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              value={pitch}
              onValueChange={setPitch}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor="#6366f1"
            />
          </View>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Speed</Text>
              <Text style={styles.sliderValue}>{rate.toFixed(1)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={1.5}
              value={rate}
              onValueChange={setRate}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor="#6366f1"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Auto-play messages</Text>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
              thumbColor={autoPlay ? '#6366f1' : '#f4f4f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample Text</Text>
          <View style={styles.sampleTextContainer}>
            <Text style={styles.sampleText}>{SAMPLE_TEXT}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveVoiceSettings}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Voice Picker Modal */}
      {showVoicePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Voice</Text>
            <ScrollView style={styles.optionsContainer}>
              {VOICE_OPTIONS.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.optionItem,
                    selectedVoice.id === voice.id && styles.optionItemSelected
                  ]}
                  onPress={() => {
                    setSelectedVoice(voice);
                    setShowVoicePicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{voice.name}</Text>
                  <Text style={styles.optionSubtext}>{voice.gender} • {voice.language}</Text>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  voiceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  voiceDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  sampleTextContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  sampleText: {
    fontSize: 16,
    color: '#374151',
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  optionItemSelected: {
    backgroundColor: '#f0f4ff',
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