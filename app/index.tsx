import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Pastikan path import ini benar
import "../global.css";
import React from 'react';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        // 1. Cek apakah ada sesi yang aktif
        const { data: { session } } = await supabase.auth.getSession();

        // 2. Beri delay sedikit agar splash screen tampil (opsional)
        // Jika ingin instan, hapus setTimeout dan jalankan isinya langsung
        setTimeout(() => {
          if (session) {
            // Jika user sudah login, arahkan langsung ke Dashboard (tabs)
            console.log('Session found, directing to tabs');
            router.replace('/(tabs)');
          } else {
            // Jika belum login, arahkan ke halaman Login
            console.log('No session, directing to login');
            router.replace('/(auth)/login');
          }
        }, 2000); 
        
      } catch (error) {
        // Jika error, default ke login
        router.replace('/(auth)/login');
      }
    };

    checkUserSession();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-blue-500">
      <StatusBar style="light" />
      
      {/* Logo atau Nama App */}
      <View className="items-center mb-12">
        <View className="bg-white rounded-full w-24 h-24 items-center justify-center mb-6">
          <Text className="text-4xl font-bold text-blue-500">
            kS
          </Text>
        </View>
        
        <Text className="text-4xl font-bold text-white mb-2">
          kaStok
        </Text>
        <Text className="text-base text-blue-100">
          Kelola stok dengan mudah
        </Text>
      </View>

      {/* Loading Indicator */}
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}