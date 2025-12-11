// ===================== CLEAN VERSION ==========================

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import "../../global.css";
import { useColorScheme } from "nativewind";




export default function HomeScreen() {

  // ==== SCREEN DATA ====
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
  const FAB_SIZE = 56;
  const FAB_MARGIN = 24;

  const router = useRouter();
  const { colorScheme } = useColorScheme();

  // ====================== USER STATE ===========================
  const [session, setSession] = useState<any | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");

  const userId = session?.user?.id;

  // ====================== DASHBOARD STATE ======================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    todayTransactions: 0,
    todayRevenue: 0,
  });

  const hasLowStock = stats.lowStock > 0;

  // ====================== DRAGGABLE FAB ========================
  const pan = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH - FAB_SIZE - FAB_MARGIN,
      y: SCREEN_HEIGHT - FAB_SIZE - FAB_MARGIN - 80,
    })
  ).current;

  const isTapping = useRef(true);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isTapping.current = true;
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (e, gesture) => {
        if (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2) {
          isTapping.current = false;
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(e, gesture);
      },

      onPanResponderRelease: () => {
        pan.flattenOffset();

        if (isTapping.current) {
          router.push("/kalkulator");
          return;
        }

        let newX = pan.x._value;
        let newY = pan.y._value;

        const maxX = SCREEN_WIDTH - FAB_SIZE - FAB_MARGIN;
        const minX = FAB_MARGIN;

        const tabHeight = 80;
        const headerHeight = 100;

        const maxY = SCREEN_HEIGHT - FAB_SIZE - FAB_MARGIN - tabHeight;
        const minY = headerHeight;

        if (newX < minX) newX = minX;
        if (newX > maxX) newX = maxX;
        if (newY < minY) newY = minY;
        if (newY > maxY) newY = maxY;

        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
          bounciness: 0,
        }).start();
      },
    })
  ).current;

  // ====================== FETCH DASHBOARD DATA =================
  async function fetchDashboardData(uid: string) {
    try {
      // Ambil produk
      const { data: products } = await supabase
        .from("products")
        .select("id, stock, price, min_stock")
        .eq("user_id", uid);

      const totalProds = products?.length || 0;
      const lowStk =
        products?.filter((p: any) => (p.stock ?? 0) <= (p.min_stock ?? 5))
          .length || 0;

      // tanggal hari ini
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = today.toISOString();
      const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Ambil transaksi
      const { data: trx } = await supabase
        .from("transactions")
        .select("total_amount")
        .eq("user_id", uid)
        .gte("created_at", start)
        .lte("created_at", end);

      const revenue = trx?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

      setStats({
        totalProducts: totalProds,
        lowStock: lowStk,
        todayTransactions: trx?.length || 0,
        todayRevenue: revenue,
      });
    } catch (err) {
      console.log("Error fetching dashboard:", err);
    }
  }

  // ====================== FETCH USER ============================
  const fetchUserAndStats = async () => {
    setLoading(true);
    try {
      // Ambil session
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      const user = data.session?.user;

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const fullName = user.user_metadata?.full_name || "User";
      setUserName(fullName);
      setUserEmail(user.email || "");

      // Profile + cek store_name
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url, store_name")
        .eq("id", user.id)
        .single();

      if (!profileError) {
        setAvatarUrl(profileData?.avatar_url || null);

        // Kalau store_name kosong → ke setup
        if (!profileData?.store_name) {
          router.replace("/store-setup");
          return;
        }

        setStoreName(profileData.store_name);
      }

      // Load dashboard
      await fetchDashboardData(user.id);

    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      fetchUserAndStats();
    }, [])
  );




  // Refresh function
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Cukup panggil fetchUserAndStats karena sudah menangani semuanya
    fetchUserAndStats();
  }, []); // Tidak perlu dependensi karena fetchUserAndStats selalu mengambil data terbaru


  const initial = (userName || "U").charAt(0).toUpperCase();

  // ====================== LOGOUT =========================
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

  // ====================== LOADING =========================
  if (loading && !session) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // ====================== MAIN UI =========================
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ================= HEADER ================= */}
        <View className="flex-row items-center justify-between px-5 py-5 bg-white border-b border-gray-100 shadow-sm">
          <View>
            <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {storeName ? storeName : "Dashboard Owner"}
            </Text>
            <Text className="text-xl font-bold text-gray-900 mt-1">
              Hai, {userName} 👋
            </Text>
          </View>

          <View className="flex-row items-center">

            {/* Notifikasi */}
            <TouchableOpacity onPress={() => router.push("/(tabs)/notifikasi")} className="mr-3">
              <View className="h-10 w-10 rounded-full bg-red-50 items-center justify-center relative">
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="#E11D48"
                />
                {hasLowStock && (
                  <View className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border border-white" />
                )}
              </View>
            </TouchableOpacity>

            {/* Avatar */}
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              className="h-11 w-11 rounded-full bg-gray-100 border border-gray-200 items-center justify-center"
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="h-11 w-11 rounded-full"
                />
              ) : (
                <Text className="text-lg font-bold text-blue-600">{initial}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View >

        {/* ================= OMZET CARD ================= */}
        < View className="px-5 mt-6" >
          <View className="bg-blue-600 rounded-3xl p-6 shadow-lg relative overflow-hidden">
            <View className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/30 rounded-full" />
            <View className="absolute -left-4 -bottom-4 w-24 h-24 bg-blue-500/20 rounded-full" />

            <View className="flex-row items-center justify-between mb-4">
              <View className="bg-blue-500/40 px-3 py-1 rounded-full">
                <Text className="text-[10px] text-white font-bold">
                  OMZET HARI INI
                </Text>
              </View>
              <MaterialCommunityIcons
                name="finance"
                size={24}
                color="white"
              />
            </View>

            <Text className="text-4xl font-bold text-white mb-2">
              Rp {stats.todayRevenue.toLocaleString("id-ID")}
            </Text>

            <TouchableOpacity
              className="bg-white px-4 py-3 rounded-xl flex-row items-center justify-center mt-3"
              onPress={() => router.push("/(tabs)/kasir")}
            >
              <Ionicons name="cart-outline" size={20} color="#2563EB" />
              <Text className="text-blue-700 font-bold ml-2">
                Buka Kasir / Jual
              </Text>
            </TouchableOpacity>
          </View>
        </ View>

        {/* ================= GRID ================= */}
        < View className="px-5 flex-row gap-3 mt-8" >
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/stok")}
            className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 items-center shadow-sm"
          >
            <View className="h-10 w-10 bg-indigo-50 rounded-full items-center justify-center mb-2">
              <MaterialCommunityIcons
                name="package-variant"
                size={24}
                color="#4F46E5"
              />
            </View>
            <Text className="text-2xl font-bold">{stats.totalProducts}</Text>
            <Text className="text-xs text-gray-500">Total Produk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/notifikasi")}
            className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 items-center shadow-sm"
          >
            <View className="h-10 w-10 bg-orange-50 rounded-full items-center justify-center mb-2">
              <Ionicons
                name="alert-circle-outline"
                size={24}
                color="#EA580C"
              />
            </View>
            <Text
              className={`text-2xl font-bold ${stats.lowStock > 0 ? "text-orange-600" : "text-gray-900"
                }`}
            >
              {stats.lowStock}
            </Text>
            <Text className="text-xs text-gray-500">Stok Menipis</Text>
          </TouchableOpacity>

          <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 items-center shadow-sm">
            <View className="h-10 w-10 bg-green-50 rounded-full items-center justify-center mb-2">
              <MaterialCommunityIcons name="receipt" size={24} color="#16A34A" />
            </View>
            <Text className="text-2xl font-bold">
              {stats.todayTransactions}
            </Text>
            <Text className="text-xs text-gray-500">Trx Hari Ini</Text>
          </View>
        </View>

        {/* ================= MENU UTAMA ================= */}
        <View View className="px-5 mt-10" >
          <Text className="text-xs text-gray-400 font-bold tracking-widest mb-3">
            Menu Aplikasi
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/stok")}
            className="flex-row items-center bg-white p-4 rounded-2xl border border-gray-200 mb-3 shadow-sm"
          >
            <View className="h-12 w-12 bg-blue-50 rounded-2xl items-center justify-center mr-3">
              <MaterialCommunityIcons name="cube-outline" size={24} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold">Stok Barang</Text>
              <Text className="text-xs text-gray-500">Kelola & tambah barang</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/laporan")}
            className="flex-row items-center bg-white p-4 rounded-2xl border border-gray-200 mb-3 shadow-sm"
          >
            <View className="h-12 w-12 bg-purple-50 rounded-2xl items-center justify-center mr-3">
              <Ionicons name="stats-chart" size={24} color="#9333EA" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold">Laporan Keuangan</Text>
              <Text className="text-xs text-gray-500">Grafik profit & pengeluaran</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>


          {/* Pengaturan */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/settings")}
            className="flex-row items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 mb-3 shadow-sm"
          >
            <View className="h-12 w-12 bg-gray-50 dark:bg-gray-700 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="settings-outline" size={24} color={colorScheme === 'dark' ? '#9CA3AF' : '#4B5563'} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 dark:text-white">
                Pengaturan
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Profil toko & akun
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colorScheme === 'dark' ? '#6B7280' : '#D1D5DB'} />
          </TouchableOpacity>
        </View>

        
      </ScrollView >

      {/* ================= FAB ================= */}
      < Animated.View
        style={{
          position: "absolute",
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          backgroundColor: "#2563EB",
          justifyContent: "center",
          alignItems: "center",
          elevation: 6,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        }
        }
        {...panResponder.panHandlers}
      >
        <Ionicons name="calculator-outline" size={24} color="white" />
      </Animated.View>
    </SafeAreaView >
  );
}

// Tambahkan StyleSheet untuk Android shadow (elevation)
const styles = StyleSheet.create({
  draggableContainer: {
    position: 'absolute',
    // Nilai awal posisi telah diatur di pan.current
    // Kita gunakan zIndex agar FAB selalu di atas elemen lain
    zIndex: 1000,
  },
  fabShadow: {
    // Shadow untuk iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    // Elevation untuk Android
    elevation: 8,
  },
});