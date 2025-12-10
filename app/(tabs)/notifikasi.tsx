// app/(tabs)/notifikasi.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import "../../global.css";

interface Product {
  id: number;
  name: string;
  stock: number;
  min_stock?: number | null;
}

export default function NotifikasiScreen() {
  const router = useRouter();
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
    if (!session?.user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, min_stock")
        .eq("user_id", session.user.id); // <-- FILTER PER USER ID

      if (error) {
        console.log(error);
        return;
      }

      const filtered = (data as Product[]).filter((item) => {
        const min = item.min_stock ?? 5; // default minimal stok
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

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* HEADER */}
      <View className="pt-12 pb-4 px-5 flex-row items-center justify-between border-b border-gray-100 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-9 w-9 rounded-full bg-gray-100 items-center justify-center mr-2"
          >
            <Ionicons name="chevron-back" size={18} color="#4B5563" />
          </TouchableOpacity>
          <View>
            <Text className="text-[11px] text-gray-500">Detail</Text>
            <Text className="text-lg font-semibold text-gray-900">
              Notifikasi Stok
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
      >
        {loading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="large" />
            <Text className="mt-3 text-[12px] text-gray-500">
              Mengambil data stok menipis...
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View className="mt-10 items-center">
            <Ionicons
              name="checkmark-circle-outline"
              size={40}
              color="#16A34A"
            />
            <Text className="mt-3 text-[13px] font-semibold text-gray-800">
              Tidak ada stok menipis 🎉
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3 flex-row"
            >
              <View className="h-10 w-10 rounded-2xl bg-red-50 items-center justify-center mr-3">
                <MaterialCommunityIcons
                  name="cube-outline"
                  size={22}
                  color="#DC2626"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-gray-900">
                  {item.name}
                </Text>
                <Text className="text-[11px] text-gray-500 mt-1">
                  Stok saat ini:{" "}
                  <Text className="font-semibold text-gray-800">
                    {item.stock}
                  </Text>
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
