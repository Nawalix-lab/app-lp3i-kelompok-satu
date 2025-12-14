import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import "../../global.css";
  import { useColorScheme } from "nativewind";
  import { SafeAreaView } from "react-native-safe-area-context";

interface Product {
  id: number;
  name: string;
  stock: number;
  min_stock?: number | null;
}

export default function NotifikasiScreen() {   // ⬅️ HARUS ada export default
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [session, setSession] = useState<any>(null);

  // Ambil session user
  useFocusEffect(
    useCallback(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (!session) {
          router.replace("/(auth)/login");
        }
      });
    }, [])
  );

  const fetchLowStock = async () => {
    try {
      setLoading(true);

      // Ambil user saat ini
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Ambil produk user ini saja
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, min_stock")
        .eq("user_id", currentUser.id);  // filter per user

      if (error) {
        console.log(error);
        return;
      }

      const filtered = (data as Product[]).filter((item) => {
        const min = item.min_stock ?? 5;
        return item.stock <= min;
      });

      setItems(filtered);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch setiap session siap
  useEffect(() => {
    if (session) fetchLowStock();
  }, [session]);

  const onRefresh = useCallback(() => {
    // `fetchLowStock` sudah mengatur state loading-nya sendiri
    fetchLowStock();
  }, []);

  // State `refreshing` untuk RefreshControl harus dikontrol secara terpisah
  // dari `loading` agar tidak ada konflik UI.
  const refreshing = loading;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* HEADER */}
      <View className="pt-12 pb-4 px-5 flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mr-2"
          >
            <Ionicons name="chevron-back" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#4B5563'} />
          </TouchableOpacity>
          <View>
            <Text className="text-[11px] text-gray-500 dark:text-gray-400">Detail</Text>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifikasi Stok
            </Text>
          </View>
        </View>
      </View>

    
        {loading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="large" />
            <Text className="mt-3 text-[12px] text-gray-500">
              Mengambil data stok menipis...
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View className="mt-10 items-center">
            <Text className="mt-3 text-[13px] font-semibold text-gray-800 dark:text-gray-300">
              Tidak ada stok menipis 
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            renderItem={({ item }) => (
              <View className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 mb-3 flex-row">
                <View className="h-10 w-10 rounded-2xl bg-red-50 dark:bg-red-900/30 items-center justify-center mr-3">
                  <MaterialCommunityIcons
                    name="cube-outline"
                    size={22}
                    color={colorScheme === 'dark' ? '#F87171' : '#DC2626'}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </Text>
                  <Text className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Stok saat ini:{' '}
                    <Text className="font-semibold text-gray-800 dark:text-gray-200">
                      {item.stock}
                    </Text>
                  </Text>
                </View>
              </View>
            )}
          />

        )}
    </SafeAreaView>
  );
}