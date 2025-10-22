import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform, AppState, AppStateStatus } from 'react-native';

// ========================================
// ASYNC STORAGE ADAPTER FOR SUPABASE
// ========================================

// Supabase expects synchronous storage, but AsyncStorage is async.
// This adapter uses promises internally while providing sync interface
const AsyncStorageAdapter = {
  getItem: (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    return AsyncStorage.removeItem(key);
  },
};

// ========================================
// SUPABASE CLIENT CONFIGURATION
// ========================================

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing Supabase environment variables!\n\n' +
    'Please check your .env file and make sure you have:\n' +
    '  • EXPO_PUBLIC_SUPABASE_URL=your_supabase_url\n' +
    '  • EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key\n\n' +
    'Example .env file:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ========================================
// AUTO-REFRESH SESSION
// ========================================

// Keeps the session fresh when app is in foreground
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// ========================================
// TYPE EXPORTS
// ========================================

export type { User, Session } from '@supabase/supabase-js';