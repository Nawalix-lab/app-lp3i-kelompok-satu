import { StatusBar } from 'expo-status-bar';
import { Text, View, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import "../../global.css";
import React from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    // Ambil data user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.full_name || '');
      }
    });
  }, []);

  async function signOut() {
    const confirmLogout = confirm('Apakah Anda yakin ingin keluar?');
    
    if (confirmLogout) {
      console.log('Logging out...');
      await supabase.auth.signOut();
      console.log('Logged out, navigating to login');
      router.replace('/(auth)/login');
    }
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-blue-500 pt-12 pb-8 px-6">
        <Text className="text-2xl font-bold text-white mb-1">
          Selamat Datang, {userName || 'User'}!
        </Text>
        <Text className="text-blue-100">
          {userEmail}
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 py-8">
        <View className="bg-gray-50 rounded-2xl p-6 mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">
            kaStok - Aplikasi Manajemen Stok
          </Text>
          <Text className="text-gray-600 leading-6">
            Kelola inventori dan stok barang Anda dengan mudah dan efisien. 
            Pantau ketersediaan, catat transaksi, dan dapatkan laporan lengkap.
          </Text>
        </View>

        {/* Menu Grid */}
        <View className="gap-4">
          <View className="flex-row gap-4">
            <View className="flex-1 bg-blue-50 rounded-xl p-4">
              <Text className="text-3xl mb-2">📦</Text>
              <Text className="font-semibold text-gray-900">Stok Barang</Text>
              <Text className="text-xs text-gray-600 mt-1">Kelola inventory</Text>
            </View>
            <View className="flex-1 bg-green-50 rounded-xl p-4">
              <Text className="text-3xl mb-2">📊</Text>
              <Text className="font-semibold text-gray-900">Laporan</Text>
              <Text className="text-xs text-gray-600 mt-1">Lihat statistik</Text>
            </View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1 bg-purple-50 rounded-xl p-4">
              <Text className="text-3xl mb-2">🔔</Text>
              <Text className="font-semibold text-gray-900">Notifikasi</Text>
              <Text className="text-xs text-gray-600 mt-1">Stok menipis</Text>
            </View>
            <View className="flex-1 bg-orange-50 rounded-xl p-4">
              <Text className="text-3xl mb-2">⚙️</Text>
              <Text className="font-semibold text-gray-900">Pengaturan</Text>
              <Text className="text-xs text-gray-600 mt-1">Konfigurasi app</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className="bg-red-500 rounded-xl py-4 mt-8"
          onPress={signOut}
        >
          <Text className="text-white font-semibold text-center text-base">
            Keluar dari Akun
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}