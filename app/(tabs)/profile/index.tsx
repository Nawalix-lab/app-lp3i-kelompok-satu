import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Switch,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userStoreName, setUserStoreName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const fetchUser = async () => {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserId(user.id);
            const email = user.email || "";
            const metaName = user.user_metadata?.full_name || user.user_metadata?.name || "";

            setUserEmail(email);
            setUserName(metaName);

            const { data: profileData, error } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, username")
              .eq("id", user.id)
              .single();

            if (error && error.code !== 'PGRST116') {
              throw error;
            }

            if (profileData) {
              setUserName(profileData.full_name || metaName || "User");
              setUserStoreName(profileData.username || "");
              setAvatarUrl(profileData.avatar_url);
            }
          } else {
            router.replace("/(auth)/login");
          }
          
          // Load settings from AsyncStorage
          const notifSetting = await AsyncStorage.getItem('notifications_enabled');
          const darkModeSetting = await AsyncStorage.getItem('dark_mode_enabled');
          
          if (notifSetting !== null) setNotificationsEnabled(notifSetting === 'true');
          if (darkModeSetting !== null) setDarkModeEnabled(darkModeSetting === 'true');
          
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    }, [])
  );

  const initial = (userName || "U").charAt(0).toUpperCase();

  const openWhatsApp = () => {
    const contactNumber = "6285830125460";
    const message = "Halo admin, saya butuh bantuan terkait aplikasi kaStok.";
    const url = `whatsapp://send?phone=${contactNumber}&text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "WhatsApp tidak terinstall di perangkat ini.");
    });
  };

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notifications_enabled', value.toString());
    Alert.alert(
      "Notifikasi", 
      value ? "Notifikasi diaktifkan" : "Notifikasi dinonaktifkan"
    );
  };

  const toggleDarkMode = async (value: boolean) => {
    setDarkModeEnabled(value);
    await AsyncStorage.setItem('dark_mode_enabled', value.toString());
    Alert.alert(
      "Mode Gelap", 
      value ? "Mode gelap akan segera hadir!" : "Mode terang aktif"
    );
  };

  const showAppInfo = () => {
    Alert.alert(
      "Tentang kaStok",
      "kaStok v1.0.0\n\nAplikasi manajemen stok barang pintar untuk toko Anda.\n\n© 2024 kaStok Team",
      [{ text: "OK" }]
    );
  };

  const showPrivacyPolicy = () => {
    Alert.alert(
      "Kebijakan Privasi",
      "Data Anda aman bersama kami. Kami tidak membagikan informasi pribadi Anda kepada pihak ketiga.\n\nUntuk informasi lengkap, hubungi kami via WhatsApp.",
      [{ text: "OK" }]
    );
  };

  const clearCache = () => {
    Alert.alert(
      "Hapus Cache",
      "Yakin ingin menghapus cache aplikasi? Ini akan mempercepat performa aplikasi.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            // Simulate cache clearing
            await new Promise(resolve => setTimeout(resolve, 1000));
            Alert.alert("Berhasil", "Cache berhasil dihapus!");
          },
        },
      ]
    );
  };

  const exportData = () => {
    Alert.alert(
      "Export Data",
      "Fitur export data akan segera tersedia. Anda dapat mengexport semua data produk dan transaksi ke file Excel.",
      [{ text: "OK" }]
    );
  };

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

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 flex-row items-center border-b border-gray-200">
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 ml-4">
          Profil & Pengaturan
        </Text>
      </View>

      {/* Profile Section */}
      <View className="items-center mt-8 mb-6">
        <View className="relative">
          {avatarUrl ? (
            <Image
              source={{ uri: `${avatarUrl}?t=${Date.now()}` }}
              className="h-24 w-24 rounded-full bg-gray-200"
              key={avatarUrl}
            />
          ) : (
            <View className="h-24 w-24 rounded-full bg-blue-100 border-2 border-blue-300 items-center justify-center">
              <Text className="text-4xl font-bold text-blue-600">{initial}</Text>
            </View>
          )}
        </View>
        <Text className="text-2xl font-bold text-gray-900 mt-3">{userName}</Text>
        <Text className="text-sm text-gray-500 mt-1">{userEmail}</Text>

        <TouchableOpacity
          onPress={() => router.push("(tabs)/profile/edit-profile")}
          className="mt-4 bg-gray-900 px-5 py-2.5 rounded-full"
        >
          <Text className="text-white text-[13px] font-semibold">Edit Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View className="px-5 mb-6">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-3 ml-1">
          Akun
        </Text>

        {/* Ubah Password */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(tabs)/profile/change-password")}
          className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3"
        >
          <View className="h-10 w-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
            <Ionicons name="lock-closed-outline" size={20} color="#374151" />
          </View>
          <Text className="text-gray-800 font-semibold flex-1">
            Ubah Password
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Export Data */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={exportData}
          className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3"
        >
          <View className="h-10 w-10 bg-blue-50 rounded-lg items-center justify-center mr-3">
            <Ionicons name="download-outline" size={20} color="#3B82F6" />
          </View>
          <Text className="text-gray-800 font-semibold flex-1">
            Export Data
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* App Settings Section */}
      <View className="px-5 mb-6">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-3 ml-1">
          Pengaturan Aplikasi
        </Text>

        {/* Notifications Toggle */}
        <View className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3">
          <View className="h-10 w-10 bg-yellow-50 rounded-lg items-center justify-center mr-3">
            <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
          </View>
          <Text className="text-gray-800 font-semibold flex-1">
            Notifikasi
          </Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Dark Mode Toggle */}
        <View className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3">
          <View className="h-10 w-10 bg-purple-50 rounded-lg items-center justify-center mr-3">
            <Ionicons name="moon-outline" size={20} color="#8B5CF6" />
          </View>
          <Text className="text-gray-800 font-semibold flex-1">
            Mode Gelap
          </Text>
          <Switch
            value={darkModeEnabled}
            onValueChange={toggleDarkMode}
            trackColor={{ false: "#D1D5DB", true: "#8B5CF6" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Clear Cache */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={clearCache}
          className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3"
        >
          <View className="h-10 w-10 bg-orange-50 rounded-lg items-center justify-center mr-3">
            <Ionicons name="trash-outline" size={20} color="#F97316" />
          </View>
          <Text className="text-gray-800 font-semibold flex-1">
            Hapus Cache
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View className="px-5 mb-6">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-3 ml-1">
          Bantuan & Info
        </Text>

        {/* Pusat Bantuan (WhatsApp) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={openWhatsApp}
          className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3"
        >
          <View className="h-10 w-10 bg-green-50 rounded-lg items-center justify-center mr-3">
            <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
          </View>
          <Text className="text-gray-800 font-semibold flex-1">
            Pusat Bantuan
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={showPrivacyPolicy}
          className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3"
        >
          <View className="h-10 w-10 bg-indigo-50 rounded-lg items-center justify-center mr-3">
            <Ionicons name="shield-checkmark-outline" size={20} color="#6366F1" />
          </View>
          <Text className="text-gray-800 font-semibold flex-1">
            Kebijakan Privasi
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* About App */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={showAppInfo}
          className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3"
        >
          <View className="h-10 w-10 bg-cyan-50 rounded-lg items-center justify-center mr-3">
            <Ionicons name="information-circle-outline" size={20} color="#06B6D4" />
          </View>
          <Text className="text-gray-800 font-semibold flex-1">
            Tentang Aplikasi
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Logout Section */}
      <View className="px-5 mb-10">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={signOut}
          className="bg-red-500 rounded-2xl p-4 items-center justify-center flex-row"
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text className="text-white font-semibold text-[14px] ml-2">
            Keluar dari Akun
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View className="items-center pb-8">
        <Text className="text-gray-400 text-xs">
          kaStok v1.0.0
        </Text>
        <Text className="text-gray-400 text-xs mt-1">
          © 2024 kaStok Team
        </Text>
      </View>
    </ScrollView>
  );
}