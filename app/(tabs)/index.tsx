import { StatusBar } from 'expo-status-bar';
import { Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import "../../global.css";
import React from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [session, setSession] = useState<Session | null>(null);
  
  // Default loading TRUE agar tidak langsung render halaman atau redirect
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fungsi untuk cek sesi
    const checkSession = async () => {
      try {
        const { data: { session: savedSession } } = await supabase.auth.getSession();
        
        if (savedSession) {
          console.log("Sesi ditemukan:", savedSession.user.email);
          setSession(savedSession);
          setUserEmail(savedSession.user.email || '');
          setUserName(savedSession.user.user_metadata?.full_name || '');
        } else {
          console.log("Tidak ada sesi tersimpan, redirect ke login");
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        // Matikan loading setelah pengecekan selesai
        setLoading(false);
      }
    };

    checkSession();

    // Listener realtime (opsional, untuk menangani logout dari tab lain/expired)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        setUserEmail(session.user.email || '');
        setUserName(session.user.user_metadata?.full_name || '');
      } 
      // Kita tidak menaruh logic redirect di sini untuk menghindari loop,
      // biarkan checkSession di awal yang menangani redirect utama.
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    Alert.alert("Konfirmasi Logout", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      { 
        text: "Keluar", 
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        }
      }
    ]);
  }

  // TAMPILKAN LOADING SCREEN DULU
  // Ini mencegah aplikasi "berkedip" atau langsung melempar ke login sebelum cek selesai
  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-2 text-gray-500">Memuat data pengguna...</Text>
      </View>
    );
  }

  // Jika tidak loading tapi tidak ada sesi, return null (karena useEffect akan redirect)
  if (!session) return null;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-blue-500 pt-12 pb-8 px-6">
        <Text className="text-2xl font-bold text-white mb-1">
          Selamat Datang, {userName || 'User'}!
        </Text>
        <Text className="text-blue-100">{userEmail}</Text>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 py-8">
        <View className="bg-gray-50 rounded-2xl p-6 mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">
            kaStok - Dashboard
          </Text>
          <Text className="text-gray-600 leading-6">
            Sesi Anda sekarang aktif dan tidak akan logout saat di-refresh.
          </Text>
        </View>

        {/* Menu Grid */}
        <View className="gap-4">
          <View className="flex-row gap-4">
            <View className="flex-1 bg-blue-50 rounded-xl p-4">
              <Text className="text-3xl mb-2">📦</Text>
              <Text className="font-semibold text-gray-900">Stok Barang</Text>
            </View>
            <View className="flex-1 bg-green-50 rounded-xl p-4">
              <Text className="text-3xl mb-2">📊</Text>
              <Text className="font-semibold text-gray-900">Laporan</Text>
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