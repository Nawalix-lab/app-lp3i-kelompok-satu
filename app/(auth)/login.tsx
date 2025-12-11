import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from "nativewind";
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import "../../global.css";
import React from 'react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colorScheme } = useColorScheme();

  async function signInWithEmail() {
    console.log('Login button pressed');

    if (!email || !password) {
      console.log('Validation failed: empty fields');
      alert('Mohon isi email dan password');
      return;
    }

    setLoading(true);
    console.log('Attempting login...');

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    console.log('Login response:', { error });

    if (error) {
      console.log('Login error:', error.message);
      alert('Error: ' + error.message);
      setLoading(false);
    } else {
      console.log('Login successful, navigating to tabs');
      // Login berhasil, navigasi ke halaman utama
      router.replace('/(tabs)');
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View className="flex-1 justify-center px-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Selamat Datang
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400">
            Masuk ke akun Anda untuk melanjutkan
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          {/* Email Input */}
          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-base dark:bg-gray-800 dark:text-white"
              placeholder="nama@email.com"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-base dark:bg-gray-800 dark:text-white"
              placeholder="Masukkan password"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className={`rounded-lg py-4 mt-4 ${loading ? 'bg-blue-300' : 'bg-blue-500 dark:bg-blue-600'}`}
            onPress={signInWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                Masuk
              </Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-600 dark:text-gray-400">
              Belum punya akun?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-blue-500 dark:text-blue-400 font-semibold">
                Daftar Sekarang
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}