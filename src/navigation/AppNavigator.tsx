import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@utils/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Import screens
import { OnboardingScreen } from '@screens/OnboardingScreen';
import { SignInScreen } from '@screens/SignInScreen';
import { SignUpScreen } from '@screens/SignUpScreen';
import { ForgotPasswordScreen } from '@screens/ForgotPasswordScreen';
import { ProfileSetupScreen } from '@screens/ProfileSetupScreen';
import { HomeScreen } from '@screens/HomeScreen';
import { BotsScreen } from '@screens/BotsScreen';
import { ProfileScreen } from '@screens/ProfileScreen';
import { BotCreationScreen } from '@screens/BotCreationScreen';
import { BotEditScreen } from '@screens/BotEditScreen';
import { ChatScreen } from '@screens/ChatScreen';
import { MessageThreadScreen } from '@screens/MessageThreadScreen';
import { VoiceSettingsScreen } from '@screens/VoiceSettingsScreen';
import { AvatarCreationScreen } from '@screens/AvatarCreationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ========================================
// MAIN TAB NAVIGATOR (Logged In Users)
// ========================================

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Bots"
        component={BotsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ========================================
// ROOT NAVIGATOR
// ========================================

export const AppNavigator = () => {
  const { user, profile, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // ========================================
          // AUTH FLOW (Not Logged In)
          // ========================================
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        ) : profile === null ? (
          // ========================================
          // PROFILE SETUP (Profile doesn't exist or hasn't loaded yet)
          // ========================================
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : (
          // ========================================
          // MAIN APP (Logged In Users with Profile)
          // ========================================
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="BotCreation" 
              component={BotCreationScreen} 
              options={{ 
                headerShown: true,
                title: 'Create Bot',
                headerStyle: { backgroundColor: '#6366f1' },
                headerTintColor: '#fff',
              }} 
            />
            <Stack.Screen 
              name="BotEdit" 
              component={BotEditScreen} 
              options={{ 
                headerShown: true,
                title: 'Edit Bot',
                headerStyle: { backgroundColor: '#6366f1' },
                headerTintColor: '#fff',
              }} 
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen} 
              options={{ 
                headerShown: false,
              }} 
            />
            <Stack.Screen 
              name="MessageThread" 
              component={MessageThreadScreen} 
              options={{ 
                headerShown: true,
                title: 'Thread',
                headerStyle: { backgroundColor: '#6366f1' },
                headerTintColor: '#fff',
              }} 
            />
            <Stack.Screen 
              name="VoiceSettings" 
              component={VoiceSettingsScreen} 
              options={{ 
                headerShown: true,
                title: 'Voice Settings',
                headerStyle: { backgroundColor: '#6366f1' },
                headerTintColor: '#fff',
              }} 
            />
            <Stack.Screen 
              name="AvatarCreation" 
              component={AvatarCreationScreen} 
              options={{ 
                headerShown: true,
                title: 'Avatar Creation',
                headerStyle: { backgroundColor: '#6366f1' },
                headerTintColor: '#fff',
              }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});