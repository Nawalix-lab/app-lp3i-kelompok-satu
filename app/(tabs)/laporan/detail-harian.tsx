import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useFocusEffect, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from 'expo-print'; 
import * as Sharing from 'expo-sharing'; 
import { supabase } from "../../../lib/supabase";
import "../../../global.css";

const formatStandardCurrency = (amount) => {
  const numAmount = Number(amount) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numAmount);
};

const formatHeaderDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const getDisplayDateTitle = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const normalize = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  if (normalize(date) === normalize(today)) return "Transaksi Hari Ini";
  if (normalize(date) === normalize(yesterday)) return "Transaksi Kemarin";

  return `Transaksi Tanggal ${date.toLocaleDateString("id-ID", { day: "numeric", month: "long" })}`;
};

export default function DetailTransaksiHarian() {
  const { date } = useLocalSearchParams();
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTrxIds, setExpandedTrxIds] = useState(new Set());

  const toggleExpand = (id) => {
    const updated = new Set(expandedTrxIds);
    updated.has(id) ? updated.delete(id) : updated.add(id);
    setExpandedTrxIds(updated);
  };

  const expandAll = () => setExpandedTrxIds(new Set(transactions.map(t => t.id)));
  const collapseAll = () => setExpandedTrxIds(new Set());

  if (!date) return (
    <View className="flex-1 items-center justify-center">
      <Text>Tanggal tidak ditemukan.</Text>
    </View>
  );

  const fetchData = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setTransactions([]);
        return;
      }

      const start = `${date}T00:00:00.000Z`;
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      const end = `${next.toISOString().split("T")[0]}T00:00:00.000Z`;

      const { data } = await supabase
        .from("transactions")
        .select(`id, created_at, total_amount, total_profit, transaction_items(quantity, price_at_sale, products(name))`)
        .eq("user_id", session.user.id)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false });

      setTransactions(data || []);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [date]));
  const onRefresh = useCallback(fetchData, [date]);

  const renderItemDetails = (items) => {
    if (!items?.length) return <Text className="text-xs text-gray-400 mt-1">Item tidak tercatat.</Text>;

    return items.map((p, i) => (
      <View key={i} className="flex-row justify-between items-center mt-2">
        <Text className="text-sm text-gray-700 flex-1 pr-2">
          {p.products?.name || "Produk"} ({p.quantity}x)
        </Text>
        <Text className="text-sm font-medium text-gray-800">
          {formatStandardCurrency(p.quantity * Number(p.price_at_sale))}
        </Text>
      </View>
    ));
  };

  const renderTransactionCard = (item) => {
    const idCut = item.id?.toString().slice(0, 8);
    const expanded = expandedTrxIds.has(item.id);
    const profitColor = item.total_profit > 0 ? "text-blue-600" : "text-red-600";

    return (
      <View className="bg-white p-4 mx-5 mb-4 rounded-2xl border border-gray-200 shadow-sm" key={item.id}>
        <View className="flex-row justify-between">
          <View>
            <Text className="font-bold text-base">Transaksi #{idCut}</Text>
            <Text className="text-xs text-gray-500">
              Pukul: {new Date(item.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xl font-bold text-green-600">{formatStandardCurrency(item.total_amount)}</Text>
            <Text className={`text-xs ${profitColor} font-medium`}>
              Profit: {formatStandardCurrency(item.total_profit)}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <Text className="text-xs font-semibold text-gray-700">
            Detail Item ({item.transaction_items?.length || 0} Produk)
          </Text>

          <TouchableOpacity onPress={() => toggleExpand(item.id)}>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {expanded && (
          <View className="bg-gray-50 p-3 rounded-lg mt-2">
            {renderItemDetails(item.transaction_items)}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View className="bg-white px-5 pt-4 pb-3 border-b flex-row justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>

        <Text className="font-bold text-lg flex-1 text-center">
          {getDisplayDateTitle(date)}
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View className="bg-white p-4">
          <Text className="text-xs text-gray-500">Ringkasan:</Text>
          <Text className="text-lg font-bold text-gray-900">{formatHeaderDate(date)}</Text>
          <Text className="text-sm text-gray-700 mt-1">
            Total Transaksi: {transactions.length}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" className="mt-10" />
        ) : !transactions.length ? (
          <View className="mx-5 mt-10 p-6 bg-white rounded-xl border items-center">
            <Ionicons name="alert-circle-outline" size={40} color="#D1D5DB" />
            <Text className="text-gray-400 mt-3">Tidak ada transaksi.</Text>
          </View>
        ) : (
          transactions.map(renderTransactionCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
