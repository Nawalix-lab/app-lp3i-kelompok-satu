import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import "../../global.css";
import React from 'react';


export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Validasi email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validasi password strength
  const validatePasswordStrength = (password: string) => {
    if (password.length < 6) {
      return { valid: false, message: 'Password minimal 6 karakter' };
    }
    if (password.length > 50) {
      return { valid: false, message: 'Password maksimal 50 karakter' };
    }
    // Opsional: Tambah validasi huruf besar, kecil, angka
    // const hasUpperCase = /[A-Z]/.test(password);
    // const hasLowerCase = /[a-z]/.test(password);
    // const hasNumber = /\d/.test(password);
    // if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    //   return { valid: false, message: 'Password harus mengandung huruf besar, kecil, dan angka' };
    // }
    return { valid: true, message: '' };
  };

  async function signUpWithEmail() {
    console.log('Sign up button pressed');
    
    // Validasi: Semua field harus diisi
    if (!fullName.trim()) {
      console.log('Validation failed: fullName empty');
      alert('Mohon isi nama lengkap');
      return;
    }

    if (!email.trim()) {
      console.log('Validation failed: email empty');
      alert('Mohon isi email');
      return;
    }

    if (!password) {
      console.log('Validation failed: password empty');
      alert('Mohon isi password');
      return;
    }

    if (!confirmPassword) {
      console.log('Validation failed: confirmPassword empty');
      alert('Mohon konfirmasi password');
      return;
    }

    // Validasi nama lengkap
    if (fullName.trim().length < 3) {
      console.log('Validation failed: fullName too short');
      alert('Nama lengkap minimal 3 karakter');
      return;
    }

    // Validasi format email
    if (!isValidEmail(email)) {
      console.log('Validation failed: invalid email format');
      alert('Format email tidak valid');
      return;
    }

    // Validasi password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      console.log('Validation failed: password strength');
      alert(passwordValidation.message);
      return;
    }

    // Validasi password match
    if (password !== confirmPassword) {
      console.log('Validation failed: password mismatch');
      alert('Password dan konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    console.log('Starting registration process...');

    try {
      // Sign up dengan Supabase
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: undefined,
        }
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.log('Registration error:', error.message);
        // Handle specific errors
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          alert('Email sudah terdaftar. Silakan login atau gunakan email lain.');
        } else if (error.message.includes('Invalid email')) {
          alert('Format email tidak valid');
        } else if (error.message.includes('Password')) {
          alert('Password tidak memenuhi persyaratan');
        } else {
          alert('Error: ' + error.message);
        }
        setLoading(false);
        return;
      }

      // Sukses register
      if (data.user) {
        console.log('User created:', data.user.id);
        
        // Cek apakah perlu verifikasi email
        if (data.user.identities && data.user.identities.length === 0) {
          console.log('Email already used');
          alert('Email sudah terdaftar. Silakan login.');
          setLoading(false);
          // Clear form
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setFullName('');
          // Navigate to login
          router.push('/(auth)/login');
        } else {
          console.log('Registration successful');
          alert('Berhasil! Akun Anda berhasil dibuat.');
          setLoading(false);
          // Clear form
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setFullName('');
          // Navigate to login
          setTimeout(() => {
            router.push('/(auth)/login');
          }, 500);
        }
      }
    } catch (error: any) {
      console.error('Register error:', error);
      alert('Terjadi kesalahan: ' + (error.message || 'Silakan coba lagi'));
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <StatusBar style="dark" />
      
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-8">
          {/* Header */}
          <View className="mb-8">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="mb-4"
            >
              <Text className="text-blue-500 text-base">← Kembali</Text>
            </TouchableOpacity>
            
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Buat Akun Baru
            </Text>
            <Text className="text-base text-gray-600">
              Daftar untuk memulai menggunakan kaStok
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Full Name Input */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-white"
                placeholder="Masukkan nama lengkap"
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>

            {/* Email Input */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Email <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-white"
                placeholder="nama@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Password <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-white"
                placeholder="Minimal 6 karakter"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                autoComplete="password-new"
              />
              <Text className="text-xs text-gray-500 mt-1">
                Gunakan minimal 6 karakter untuk password Anda
              </Text>
            </View>

            {/* Confirm Password Input */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Konfirmasi Password <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-white"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
                autoComplete="password-new"
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              className={`rounded-lg py-4 mt-4 ${loading ? 'bg-blue-300' : 'bg-blue-500'}`}
              onPress={signUpWithEmail}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center justify-center gap-2">
                  <ActivityIndicator color="white" />
                  <Text className="text-white font-semibold text-base">
                    Mendaftar...
                  </Text>
                </View>
              ) : (
                <Text className="text-white text-center font-semibold text-base">
                  Daftar
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View className="flex-row justify-center mt-4">
              <Text className="text-gray-600">
                Sudah punya akun?{' '}
              </Text>
              <TouchableOpacity 
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text className="text-blue-500 font-semibold">
                  Masuk
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}