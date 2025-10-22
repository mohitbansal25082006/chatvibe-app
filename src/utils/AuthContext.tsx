import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@config/supabase';
import { User, Session } from '@supabase/supabase-js';
import { Profile, ProfileUpdate, AuthContextType } from '../types';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Alert } from 'react-native';

// ========================================
// CREATE CONTEXT
// ========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ========================================
// PROVIDER COMPONENT
// ========================================

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ========================================
  // FETCH USER PROFILE
  // ========================================
  
  const fetchProfile = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single()

      if (error) {
        console.error('Error fetching profile:', error);
        // Don't throw - profile might not exist yet
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        console.log('No profile found for user:', userId);
        // Profile doesn't exist yet - this is normal for new users
        setProfile(null);
      }
    } catch (error: any) {
      console.error('Unexpected error fetching profile:', error);
    }
  };

  // ========================================
  // INITIALIZE AUTH STATE
  // ========================================

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ========================================
  // SIGN IN
  // ========================================

  const signIn = async (email: string, password: string): Promise<void> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Fetch profile after successful sign in
    if (data.user) {
      await fetchProfile(data.user.id);
    }
  };

  // ========================================
  // SIGN UP
  // ========================================

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    // Create profile manually if trigger didn't work
    if (data.user && !data.session) {
      // Email confirmation required - profile will be created after confirmation
      console.log('Email confirmation required. Profile will be created after confirmation.');
    }
  };

  // ========================================
  // SIGN OUT
  // ========================================

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  // ========================================
  // RESET PASSWORD
  // ========================================

  const resetPassword = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'chatvibe://reset-password',
    });

    if (error) throw error;
  };

  // ========================================
  // UPDATE PROFILE
  // ========================================

  const updateProfile = async (updates: ProfileUpdate): Promise<void> => {
    if (!user) throw new Error('No user logged in');

    // Check if profile exists first
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || null,
          ...updates,
        });

      if (insertError) throw insertError;
    } else {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;
    }

    // Refresh profile
    await fetchProfile(user.id);
  };

  // ========================================
  // UPLOAD AVATAR
  // ========================================

  const uploadAvatar = async (uri: string): Promise<string> => {
    if (!user) throw new Error('No user logged in');

    try {
      // Read the file as base64
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Convert blob to ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Generate unique filename
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload avatar. Please try again.');
    }
  };

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    uploadAvatar,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ========================================
// CUSTOM HOOK
// ========================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};