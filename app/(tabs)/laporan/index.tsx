import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import "../../../global.css";

// --- UTILITY FUNCTIONS ---
const groupTransactionsByDay = (transactions) => {
  const dailySummary = transactions.reduce((acc, t) => {
    const dateKey = new Date(t.created_at).toISOString().split("T")[0];

    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        omzet: 0,
        profit: 0,
        totalTrx: 0,
      };
    }

    acc[dateKey].omzet += t.total_amount;
    acc[dateKey].profit += t.total_profit;
    acc[dateKey].totalTrx += 1;
    return acc;
  }, {});

  return Object.values(dailySummary).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export default function LaporanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    omzet: 0,
    profit: 0,
    totalTrx: 0,
    expenses: 0,
  });
  const [dailyTransactions, setDailyTransactions] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session || !session.user) {
        setSummary({ omzet: 0, profit: 0, totalTrx: 0, expenses: 0 });
        setDailyTransactions([]);
        return;
      }

      const userId = session.user.id;

      const { data: trxData, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const dailySummaryData = groupTransactionsByDay(trxData);
      setDailyTransactions(dailySummaryData);

      let totalOmzet = 0;
      let totalProfit = 0;
      let totalTrxCount = 0;

      dailySummaryData.forEach((d) => {
        totalOmzet += d.omzet;
        totalProfit += d.profit;
        totalTrxCount += d.totalTrx;
      });

      setSummary({
        omzet: totalOmzet,
        profit: totalProfit,
        totalTrx: totalTrxCount,
        expenses: totalOmzet - totalProfit,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  // FORMATTER
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hari Ini";
    if (date.toDateString() === yesterday.toDateString()) return "Kemarin";

    return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (amount >= 1000) return (amount / 1000).toFixed(0) + "K";
    return amount.toLocaleString("id-ID");
  };

  const formatStandardCurrency = (amount) => `Rp ${amount.toLocaleString("id-ID")}`;

  const handleDailyItemPress = (date) => {
    router.push({ pathname: "laporan/detail-harian", params: { date } });
  };

  // --- FIXED TEXT WRAPPING ERROR ---
  const renderTransactionItem = (item) => (
    <TouchableOpacity
      key={item.date}
      onPress={() => handleDailyItemPress(item.date)}
      className="flex-row justify-between items-center py-4 border-b border-gray-100"
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-3">
          <Ionicons name="calendar-outline" size={20} color="#2563EB" />
        </View>
        <View>
          <Text className="font-bold text-gray-900">{formatDateForDisplay(item.date)}</Text>
          <Text className="text-xs text-gray-500">{item.totalTrx} Transaksi</Text>
        </View>
      </View>

      <View className="items-end">
        <Text className="font-bold text-base text-gray-900">{formatStandardCurrency(item.omzet)}</Text>

        {/* PERBAIKAN: Semua string dibungkus Text */}
        <Text className={`text-xs ${item.profit > 0 ? "text-green-600" : "text-red-600"} font-medium`}>
          <Text>Profit: </Text>
          <Text>{formatStandardCurrency(item.profit)}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSimpleBarChart = () => {
    const chartData = dailyTransactions.slice(0, 7).reverse();
    if (chartData.length === 0) return <Text className="text-gray-400 text-xs w-full text-center">Belum ada data grafik</Text>;

    const maxVal = Math.max(...chartData.map((x) => x.omzet));

    return chartData.map((d, i) => {
      const barHeight = (d.omzet / maxVal) * 80;
      return (
        <View key={i} className="items-center w-10 relative h-full justify-end">
          <Text className="text-xs text-gray-900 font-bold" style={{ position: "absolute", bottom: barHeight + 10 }}>
            {formatCurrency(d.omzet)}
          </Text>

          <View style={{ height: `${barHeight}%` }} className="w-4 bg-blue-500 rounded-t-md opacity-80" />
          <Text className="text-[10px] text-gray-400 mt-1">{new Date(d.date).getDate().toString()}</Text>
        </View>
      );
    });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* PROFIT CARD */}
        <View className="bg-blue-600 rounded-3xl p-6 shadow-lg m-5">
          <Text className="text-blue-100 text-xs">Laba Bersih</Text>
          <Text className="text-white text-4xl font-bold">{formatStandardCurrency(summary.profit)}</Text>
        </View>

        {/* CHART */}
        <View className="bg-white m-5 p-5 rounded-2xl h-48 flex-row items-end justify-around">
          {loading ? <ActivityIndicator color="#2563EB" /> : renderSimpleBarChart()}
        </View>

        {/* DAILY LIST */}
        <View className="bg-white p-6 rounded-t-3xl shadow">
          <Text className="text-base font-bold mb-4">Ringkasan Harian</Text>
          {loading ? <ActivityIndicator color="#2563EB" /> : dailyTransactions.map(renderTransactionItem)}
        </View>

      </ScrollView>
    </View>
  );
}