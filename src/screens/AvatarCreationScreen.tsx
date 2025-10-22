import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Slider from '@react-native-community/slider';

type AvatarCreationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AvatarCreation'>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const AVATAR_STYLES: Array<{ id: string; name: string; icon: IoniconsName }> = [
  { id: 'realistic', name: 'Realistic', icon: 'person-outline' },
  { id: 'cartoon', name: 'Cartoon', icon: 'happy-outline' },
  { id: 'anime', name: 'Anime', icon: 'star-outline' },
  { id: 'pixel', name: 'Pixel Art', icon: 'grid-outline' },
  { id: 'abstract', name: 'Abstract', icon: 'shapes-outline' },
  { id: 'minimalist', name: 'Minimalist', icon: 'remove-outline' },
  { id: '3d', name: '3D Render', icon: 'cube-outline' },
  { id: 'watercolor', name: 'Watercolor', icon: 'color-palette-outline' },
  { id: 'oil', name: 'Oil Painting', icon: 'brush-outline' },
  { id: 'sketch', name: 'Sketch', icon: 'pencil-outline' },
  { id: 'cyberpunk', name: 'Cyberpunk', icon: 'flash-outline' },
  { id: 'fantasy', name: 'Fantasy', icon: 'sparkles-outline' },
];

const COLORS = [
  { id: 'skin', name: 'Skin Tone', colors: ['#FDBCB4', '#F5DEB3', '#FFE4C4', '#FFDEAD', '#D2B48C', '#BC8F8F', '#F4A460', '#D2691E', '#8B4513', '#654321'] },
  { id: 'hair', name: 'Hair Color', colors: ['#000000', '#4B3621', '#8B4513', '#D2691E', '#FFD700', '#FF6347', '#8B0000', '#4B0082', '#000080', '#008080'] },
  { id: 'eyes', name: 'Eye Color', colors: ['#8B4513', '#4B3621', '#000000', '#000080', '#4169E1', '#008080', '#228B22', '#808000', '#FFD700', '#FF6347'] },
  { id: 'clothing', name: 'Clothing Color', colors: ['#FFFFFF', '#F5F5F5', '#D3D3D3', '#A9A9A9', '#808080', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'] },
];

const FACIAL_FEATURES = [
  { id: 'face_shape', name: 'Face Shape', options: ['Oval', 'Round', 'Square', 'Heart', 'Diamond'] },
  { id: 'hair_style', name: 'Hair Style', options: ['Short', 'Medium', 'Long', 'Bald', 'Buzz Cut', 'Ponytail', 'Braids'] },
  { id: 'facial_hair', name: 'Facial Hair', options: ['None', 'Beard', 'Mustache', 'Goatee', 'Stubble'] },
  { id: 'accessories', name: 'Accessories', options: ['None', 'Glasses', 'Sunglasses', 'Earrings', 'Hat', 'Scarf'] },
];

export const AvatarCreationScreen: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState(AVATAR_STYLES[0]);
  const [selectedColors, setSelectedColors] = useState<{ [key: string]: string }>({});
  const [selectedFeatures, setSelectedFeatures] = useState<{ [key: string]: string }>({});
  const [customizationLevel, setCustomizationLevel] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  
  const navigation = useNavigation<AvatarCreationScreenNavigationProp>();

  const handleGenerateAvatar = async () => {
    setIsGenerating(true);
    
    try {
      // In a real implementation, you would call an AI service
      // to generate the avatar based on the selected options
      // For now, we'll just simulate it with a timeout
      
      setTimeout(() => {
        // Simulate a generated avatar
        setGeneratedAvatar('https://picsum.photos/seed/avatar/300/300.jpg');
        setIsGenerating(false);
        Alert.alert('Success', 'Avatar generated successfully!');
      }, 3000);
    } catch (error) {
      console.error('Error generating avatar:', error);
      Alert.alert('Error', 'Failed to generate avatar');
      setIsGenerating(false);
    }
  };

  const handleSaveAvatar = () => {
    if (!generatedAvatar) {
      Alert.alert('Error', 'Please generate an avatar first');
      return;
    }
    
    // In a real implementation, you would save the avatar
    // to your backend or local storage
    Alert.alert('Success', 'Avatar saved successfully!');
    navigation.goBack();
  };

  const handleColorSelect = (colorId: string, color: string) => {
    setSelectedColors(prev => ({ ...prev, [colorId]: color }));
  };

  const handleFeatureSelect = (featureId: string, option: string) => {
    setSelectedFeatures(prev => ({ ...prev, [featureId]: option }));
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
          
          <Text style={styles.headerTitle}>Avatar Creation</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Preview</Text>
          
          <View style={styles.avatarPreview}>
            {generatedAvatar ? (
              <Image source={{ uri: generatedAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={60} color="#9ca3af" />
                <Text style={styles.avatarPlaceholderText}>Your avatar will appear here</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerateAvatar}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Ionicons name="sync" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Avatar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Style</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.styleOptions}>
              {AVATAR_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.styleOption,
                    selectedStyle.id === style.id && styles.styleOptionSelected
                  ]}
                  onPress={() => setSelectedStyle(style)}
                >
                  <Ionicons 
                    name={style.icon} 
                    size={24} 
                    color={selectedStyle.id === style.id ? '#6366f1' : '#6b7280'} 
                  />
                  <Text style={[
                    styles.styleOptionText,
                    selectedStyle.id === style.id && styles.styleOptionTextSelected
                  ]}>
                    {style.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customization Level</Text>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Detail</Text>
              <Text style={styles.sliderValue}>{Math.round(customizationLevel)}%</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              value={customizationLevel}
              onValueChange={(value: number) => setCustomizationLevel(value)}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor="#6366f1"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Colors</Text>
          
          {COLORS.map((colorGroup) => (
            <View key={colorGroup.id} style={styles.colorGroup}>
              <Text style={styles.colorGroupTitle}>{colorGroup.name}</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.colorOptions}>
                  {colorGroup.colors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColors[colorGroup.id] === color && styles.colorOptionSelected
                      ]}
                      onPress={() => handleColorSelect(colorGroup.id, color)}
                    >
                      {selectedColors[colorGroup.id] === color && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facial Features</Text>
          
          {FACIAL_FEATURES.map((feature) => (
            <View key={feature.id} style={styles.featureGroup}>
              <Text style={styles.featureGroupTitle}>{feature.name}</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.featureOptions}>
                  {feature.options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.featureOption,
                        selectedFeatures[feature.id] === option && styles.featureOptionSelected
                      ]}
                      onPress={() => handleFeatureSelect(feature.id, option)}
                    >
                      <Text style={[
                        styles.featureOptionText,
                        selectedFeatures[feature.id] === option && styles.featureOptionTextSelected
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, !generatedAvatar && styles.saveButtonDisabled]} 
          onPress={handleSaveAvatar}
          disabled={!generatedAvatar}
        >
          <Text style={styles.saveButtonText}>Save Avatar</Text>
        </TouchableOpacity>
      </ScrollView>
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
  previewSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
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
  avatarPreview: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
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
  styleOptions: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  styleOption: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
  },
  styleOptionSelected: {
    backgroundColor: '#eef2ff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  styleOptionText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  styleOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: 16,
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
  colorGroup: {
    marginBottom: 16,
  },
  colorGroupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  colorOptions: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#1f2937',
  },
  featureGroup: {
    marginBottom: 16,
  },
  featureGroupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  featureOptions: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  featureOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  featureOptionSelected: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  featureOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  featureOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});