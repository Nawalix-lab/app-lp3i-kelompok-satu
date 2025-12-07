import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import "../../global.css";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Tipe data produk
interface Product {
  id: number;
  name: string;
  stock: number;
  min_stock?: number | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    omzetToday: 0,
    productCount: 0,
    transactionCount: 0,
  });

  // --------------------------
  // STOK MENIPIS
  // --------------------------
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [hasShownAlert, setHasShownAlert] = useState(false);

  const fetchLowStock = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, min_stock")
        .eq("user_id", session.user.id); // <-- FILTER BERDASARKAN USER ID

      if (error) {
        console.log("Error fetch products:", error);
        return;
      }

      if (!data) {
        setLowStockItems([]);
        return;
      }

      const filtered = (data as Product[]).filter((item) => {
        const min = item.min_stock ?? 5;
        return item.stock <= min;
      });

      setLowStockItems(filtered);
      setHasShownAlert(false);
    } catch (e) {
      console.log("Unexpected error:", e);
    }
  };

  // --------------------------
  // FETCH DATA STATS DASHBOARD
  // --------------------------
  const fetchDashboardData = async () => {
    if (!session?.user?.id) return;

    const userId = session.user.id;

    // 1. Get total product count
    const { count: productCount, error: productError } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // 2. Get today's transactions and omzet
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const { data: transactions, error: trxError } = await supabase
      .from("transactions")
      .select("total_amount")
      .eq("user_id", userId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    if (productError || trxError) {
      console.error("Error fetching dashboard data:", productError || trxError);
      return;
    }

    const omzetToday = transactions?.reduce(
      (sum, trx) => sum + trx.total_amount,
      0
    ) || 0;

    setDashboardData({
      productCount: productCount || 0,
      transactionCount: transactions?.length || 0,
      omzetToday: omzetToday,
    });
  };

  // --------------------------
  // INITIAL LOAD
  // --------------------------
  useEffect(() => {
    // Cek sesi saat komponen pertama kali dimuat
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        // Langsung fetch data jika sesi sudah ada
        fetchData(session);
      } else {
        setLoading(false);
        router.replace("/(auth)/login");
      }
    });

    // Listener untuk perubahan state otentikasi (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          // Jika user logout, kembali ke halaman login
          router.replace("/(auth)/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --------------------------
  // REALTIME PRODUCTS
  // --------------------------
  useEffect(() => {
    const channel = supabase
      .channel("products-low-stock")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          console.log("Product change detected, refetching...", payload);
          // Cukup panggil fetchLowStock karena hanya itu yang terpengaruh
          if (session) fetchLowStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]); // Tambahkan session sebagai dependency

  // Fungsi gabungan untuk mengambil semua data
  const fetchData = async (currentSession: any) => {
    if (!currentSession) return;
    setLoading(true);
    setUserEmail(currentSession.user.email || "");
    setUserName(currentSession.user.user_metadata?.full_name || "");
    await Promise.all([fetchLowStock(), fetchDashboardData()]);
    setLoading(false);
  };

  // --------------------------
  // ALERT STOK MENIPIS
  // --------------------------
  useEffect(() => {
    if (!hasShownAlert && lowStockItems.length > 0) {
      const names = lowStockItems
        .slice(0, 5)
        .map((p) => `${p.name} (sisa ${p.stock})`)
        .join(", ");

      const extra =
        lowStockItems.length > 5
          ? `, dan ${lowStockItems.length - 5} produk lain`
          : "";

      Alert.alert(
        "Stok Menipis",
        `${names}${extra} stoknya sudah di bawah batas minimal. Segera restock ya.`,
        [{ text: "OK" }]
      );

      setHasShownAlert(true);
    }
  }, [lowStockItems, hasShownAlert]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Cukup panggil fetchData dengan sesi yang sudah ada
      if (session) await fetchData(session);
    } finally {
      setRefreshing(false);
    }
  }, [session]); // Tambahkan session sebagai dependency

  const initial = (userName || "U").charAt(0).toUpperCase();

  // --------------------------
  // LOGOUT
  // --------------------------
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

  // --------------------------
  // LOADING
  // --------------------------
  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-2 text-gray-500">Memuat data pengguna...</Text>
      </View>
    );
  }

  if (!session) return null;

  // --------------------------
  // UI DASHBOARD
  // --------------------------
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        
        {/* HEADER */}
        <View className="pt-4 pb-6 px-5 flex-row items-center justify-between">

          <View>
            <Text className="text-[11px] text-gray-500">Dashboard POS</Text>
            <Text className="text-xl font-semibold text-gray-900 mt-1">
              Hai, {userName || "User"} 👋
            </Text>
            <Text className="text-[12px] text-gray-500 mt-1">{userEmail}</Text>
          </View>

          <View className="flex-row items-center">

            {/* ICON NOTIFIKASI */}
            <View className="mr-3 relative">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/notifikasi")}
                className="h-10 w-10 rounded-full bg-red-50 items-center justify-center"
              >
                <Ionicons name="notifications-outline" size={20} color="#E11D48" />
              </TouchableOpacity>

              {lowStockItems.length > 0 && (
                <View className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 items-center justify-center">
                  <Text className="text-[9px] text-white font-semibold">
                    {lowStockItems.length > 9 ? "9+" : lowStockItems.length}
                  </Text>
                </View>
              )}
            </View>

            {/* AVATAR */}
            <View className="h-11 w-11 rounded-full bg-gray-100 border border-gray-200 items-center justify-center">
              <Text className="text-lg font-bold text-blue-500">{initial}</Text>
            </View>

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
              Pantau ketersediaan, catat transaksi, dan dapatkan laporan
              lengkap.
            </Text>
          </View>
        </View>

        {/* OMZET CARD */}
        <View className="px-5">
          <View className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl p-5 shadow">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[12px] text-blue-100 font-semibold">
                  OMZET HARI INI
                </Text>
                <Text className="text-[30px] font-bold text-white mt-2">
                  Rp {dashboardData.omzetToday.toLocaleString('id-ID')}
                </Text>
                <Text className="text-[11px] text-blue-100 mt-1 leading-4">
                  Total penjualan yang tercatat hari ini.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                className="bg-white/20 border border-white/40 px-3 py-2 rounded-2xl flex-row items-center"
                onPress={() => router.push("/transaksi/tambah")}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color="#F0F8FF"
                />
                <Text className="text-[12px] text-white font-semibold ml-1">
                  Tambah Transaksi
                </Text>
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
            <Text className="text-lg font-semibold text-blue-600 mt-1">
              {dashboardData.productCount}
            </Text>
            <Text className="text-[10px] text-gray-500 mt-1">Produk aktif</Text>
          </View>

          <View className="bg-white rounded-2xl px-4 py-3 mr-3 min-w-[140px] border border-gray-200">
            <Text className="text-[11px] text-gray-500">Stok Menipis</Text>
            <Text className="text-lg font-semibold text-red-500 mt-1">
              {lowStockItems.length} Item
            </Text>
            <Text className="text-[10px] text-gray-500 mt-1">Perlu restock</Text>
          </View>

          <View className="bg-white rounded-2xl px-4 py-3 mr-3 min-w-[140px] border border-gray-200">
            <Text className="text-[11px] text-gray-500">Transaksi</Text>
            <Text className="text-lg font-semibold text-green-600 mt-1">
              {dashboardData.transactionCount}
            </Text>
            <Text className="text-[10px] text-gray-500 mt-1">Hari ini</Text>
          </View>
        </ScrollView>

        {/* MENU UTAMA */}
        <View className="px-5 mt-8">
          <Text className="text-[11px] text-gray-500 tracking-wide mb-3">
            MENU UTAMA
          </Text>

          {/* Stok */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/stok")}
            className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4 mb-3 border border-gray-200"
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 bg-blue-50 rounded-2xl items-center justify-center mr-3">
                <MaterialCommunityIcons
                  name="cube-outline"
                  size={22}
                  color="#2563EB"
                />
              </View>
              <View>
                <Text className="text-[14px] font-semibold text-gray-900">
                  Stok Barang
                </Text>
                <Text className="text-[11px] text-gray-500">
                  Kelola & perbarui stok
                </Text>
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
                <Text className="text-[14px] font-semibold text-gray-900">
                  Laporan
                </Text>
                <Text className="text-[11px] text-gray-500">
                  Grafik & riwayat
                </Text>
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
                <Text className="text-[14px] font-semibold text-gray-900">
                  Pengaturan
                </Text>
                <Text className="text-[11px] text-gray-500">
                  Konfigurasi app
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* FOOTER BOX */}
        <View className="px-5 mt-6">
          <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
            <Text className="text-[11px] text-gray-500 leading-4">
              Pastikan semua transaksi kasir tercatat agar laporan penjualan dan
              stok selalu akurat.
            </Text>
          </View>
        </View>

        <View className="px-5 mt-6">
          <TouchableOpacity
            onPress={signOut}
            className="mt-4 bg-red-500 p-4 rounded-xl"
          >
            <Text className="text-center text-white font-semibold">
              Keluar Akun
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
