import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import "../../global.css";
import React from 'react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <View className="flex-1 justify-center px-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Selamat Datang
          </Text>
          <Text className="text-base text-gray-600">
            Masuk ke akun Anda untuk melanjutkan
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          {/* Email Input */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Email
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="nama@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Password
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="Masukkan password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className={`rounded-lg py-4 mt-4 ${loading ? 'bg-blue-300' : 'bg-blue-500'}`}
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
            <Text className="text-gray-600">
              Belum punya akun?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-blue-500 font-semibold">
                Daftar Sekarang
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}