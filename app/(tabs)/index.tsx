import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import "../../global.css";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function HomeScreen() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setLoading(false);

    if (!data.session) {
      router.replace("/(auth)/login");
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || "");
        setUserName(user.user_metadata?.full_name || "");
      }
    });

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          setUserEmail(session.user.email || "");
          setUserName(session.user.user_metadata?.full_name || "");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initial = (userName || "U").charAt(0).toUpperCase();

  function signOut() {
    Alert.alert("Keluar Akun", "Yakin ingin keluar dari kaStok?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  // LOADING SCREEN SAAT CEK SESSION
  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-2 text-gray-500">Memuat data pengguna...</Text>
      </View>
    );
  }

  if (!session) return null;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        
        {/* HEADER */}
        <View className="pt-12 pb-6 px-5 flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] text-gray-500">Dashboard POS</Text>
            <Text className="text-xl font-semibold text-gray-900 mt-1">
              Hai, {userName || "User"} 👋
            </Text>
            <Text className="text-[12px] text-gray-500 mt-1">{userEmail}</Text>
          </View>

          <View className="h-11 w-11 rounded-full bg-gray-100 border border-gray-200 items-center justify-center">
            <Text className="text-lg font-bold text-blue-500">{initial}</Text>
          </View>
        </View>

        {/* TAGLINE CARD */}
        <View className="px-5 mb-3">
          <View className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <Text className="text-lg font-bold text-gray-900">
              kaStok - Aplikasi Manajemen Stok
            </Text>
            <Text className="text-gray-600 text-[13px] mt-2 leading-5">
              Kelola inventori dan stok barang Anda dengan mudah dan efisien.
              Pantau ketersediaan, catat transaksi, dan dapatkan laporan lengkap.
            </Text>
          </View>
        </View>

        {/* OMZET CARD */}
        <View className="px-5">
          <View className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl p-5 shadow">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[12px] text-blue-100 font-semibold">OMZET HARI INI</Text>
                <Text className="text-[30px] font-bold text-white mt-2">Rp 3.250.000</Text>
                <Text className="text-[11px] text-blue-100 mt-1 leading-4">
                  Total penjualan yang sudah dicatat hari ini.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                className="bg-white/20 border border-white/40 px-3 py-2 rounded-2xl flex-row items-center"
                onPress={() => router.push("/kasir")}
              >
                <Ionicons name="add-circle-outline" size={18} color="#F0F8FF" />
                <Text className="text-[12px] text-white font-semibold ml-1">Tambah Transaksi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* STATS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <View className="bg-white rounded-2xl px-4 py-3 mr-3 min-w-[140px] border border-gray-200">
            <Text className="text-[11px] text-gray-500">Total Item</Text>
            <Text className="text-lg font-semibold text-blue-600 mt-1">128</Text>
            <Text className="text-[10px] text-gray-500 mt-1">Produk aktif</Text>
          </View>

          <View className="bg-white rounded-2xl px-4 py-3 mr-3 min-w-[140px] border border-gray-200">
            <Text className="text-[11px] text-gray-500">Stok Menipis</Text>
            <Text className="text-lg font-semibold text-red-500 mt-1">6 Item</Text>
            <Text className="text-[10px] text-gray-500 mt-1">Perlu restock</Text>
          </View>

          <View className="bg-white rounded-2xl px-4 py-3 mr-3 min-w-[140px] border border-gray-200">
            <Text className="text-[11px] text-gray-500">Transaksi</Text>
            <Text className="text-lg font-semibold text-green-600 mt-1">12</Text>
            <Text className="text-[10px] text-gray-500 mt-1">Hari ini</Text>
          </View>
        </ScrollView>

        {/* MENU UTAMA */}
        <View className="px-5 mt-8">
          <Text className="text-[11px] text-gray-500 tracking-wide mb-3">MENU UTAMA</Text>

          {/* Stok */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/stok")}
            className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4 mb-3 border border-gray-200"
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 bg-blue-50 rounded-2xl items-center justify-center mr-3">
                <MaterialCommunityIcons name="cube-outline" size={22} color="#2563EB" />
              </View>
              <View>
                <Text className="text-[14px] font-semibold text-gray-900">Stok Barang</Text>
                <Text className="text-[11px] text-gray-500">Kelola & perbarui stok</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Laporan */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/laporan")}
            className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4 mb-3 border border-gray-200"
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 bg-green-50 rounded-2xl items-center justify-center mr-3">
                <Ionicons name="stats-chart" size={20} color="#059669" />
              </View>
              <View>
                <Text className="text-[14px] font-semibold text-gray-900">Laporan</Text>
                <Text className="text-[11px] text-gray-500">Grafik & riwayat</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Notifikasi */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/notifikasi")}
            className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4 mb-3 border border-gray-200"
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 bg-red-50 rounded-2xl items-center justify-center mr-3">
                <Ionicons name="notifications-outline" size={20} color="#E11D48" />
              </View>
              <View>
                <Text className="text-[14px] font-semibold text-gray-900">Notifikasi</Text>
                <Text className="text-[11px] text-gray-500">Pengingat stok</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Pengaturan */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/pengaturan")}
            className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4 mb-3 border border-gray-200"
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 bg-yellow-50 rounded-2xl items-center justify-center mr-3">
                <Ionicons name="settings-outline" size={20} color="#D97706" />
              </View>
              <View>
                <Text className="text-[14px] font-semibold text-gray-900">Pengaturan</Text>
                <Text className="text-[11px] text-gray-500">Konfigurasi app</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
{/* Kalkulator */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/kalkulator")}
            className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4 mb-3 border border-gray-200"
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 bg-indigo-50 rounded-2xl items-center justify-center mr-3">
                <Ionicons name="calculator-outline" size={20} color="#4F46E5" />
              </View>
              <View>
                <Text className="text-[14px] font-semibold text-gray-900">Kalkulator</Text>
                <Text className="text-[11px] text-gray-500">Hitung cepat</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        {/* FOOTER BOX */}
        <View className="px-5 mt-6">
          <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
            <Text className="text-[11px] text-gray-500 leading-4">
              Pastikan semua transaksi kasir tercatat agar laporan penjualan dan stok selalu akurat.
            </Text>
          </View>
        </View>

        {/* LOGOUT */}
        <View className="px-5 mt-8 mb-10">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={signOut}
            className="bg-red-500 rounded-2xl py-4 items-center justify-center"
          >
            <Text className="text-white font-semibold text-[14px]">
              Keluar dari Akun
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
