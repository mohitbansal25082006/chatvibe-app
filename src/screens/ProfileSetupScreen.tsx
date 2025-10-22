import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '@utils/AuthContext';
import { Input } from '@components/Input';
import { Button } from '@components/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type ProfileSetupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;
};

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  navigation,
}) => {
  const { user, profile, updateProfile, uploadAvatar } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ username: '', bio: '' });

  // Request permissions on mount
  React.useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to upload a profile picture.'
        );
      }
    })();
  }, []);

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not pick image. Please try again.');
    }
  };

  // Validate inputs
  const validate = (): boolean => {
    let valid = true;
    const newErrors = { username: '', bio: '' };

    // Username validation
    if (username.trim()) {
      if (username.trim().length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
        valid = false;
      } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        newErrors.username =
          'Username can only contain letters, numbers, and underscores';
        valid = false;
      }
    }

    // Bio validation (optional but has max length)
    if (bio.trim() && bio.trim().length > 150) {
      newErrors.bio = 'Bio must be 150 characters or less';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Handle profile setup
  const handleSetupProfile = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      let avatarUrl = profile?.avatar_url || undefined;

      // Upload avatar if changed
      if (avatarUri) {
        avatarUrl = await uploadAvatar(avatarUri);
      }

      // Update profile - convert empty strings and null to undefined
      await updateProfile({
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl,
      });

      Alert.alert('Success!', 'Your profile has been set up.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Main'),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Could not update profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Skip setup
  const handleSkip = () => {
    Alert.alert(
      'Skip Setup?',
      'You can complete your profile later from settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => navigation.navigate('Main'),
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSubtitle}>
            Tell us a bit about yourself
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {/* Avatar Picker */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={pickImage}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color="#9ca3af" />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarLabel}>Profile Picture</Text>
            <Text style={styles.avatarHint}>
              Tap to upload from your gallery
            </Text>
          </View>

          {/* Username Input */}
          <Input
            label="Username (optional)"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setErrors({ ...errors, username: '' });
            }}
            placeholder="johndoe123"
            autoCapitalize="none"
            error={errors.username}
          />

          {/* Bio Input */}
          <Input
            label="Bio (optional)"
            value={bio}
            onChangeText={(text) => {
              setBio(text);
              setErrors({ ...errors, bio: '' });
            }}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={4}
            error={errors.bio}
          />

          <Text style={styles.charCount}>{bio.length}/150</Text>

          {/* Buttons */}
          <Button
            title="Complete Setup"
            onPress={handleSetupProfile}
            loading={loading}
            style={styles.setupButton}
          />

          <Button
            title="Skip for Now"
            onPress={handleSkip}
            variant="outline"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  avatarHint: {
    fontSize: 13,
    color: '#9ca3af',
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 24,
  },
  setupButton: {
    marginBottom: 16,
  },
});