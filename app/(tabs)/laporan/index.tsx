import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import "../../../global.css";

export default function LaporanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    omzet: 0,
    profit: 0,
    totalTrx: 0,
    expenses: 0, // Estimasi modal keluar
  });
  const [transactions, setTransactions] = useState([]);

  // Fungsi Load Data
  const fetchData = async () => {
    try {
      // 1. Ambil Transaksi (Bulan Ini atau Semua)
      // Disini kita ambil 50 transaksi terakhir untuk performa
      const { data: trxData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;

      // 2. Hitung Ringkasan (Dari data yg ditarik)
      let totalOmzet = 0;
      let totalProfit = 0;
      
      trxData.forEach(t => {
        totalOmzet += t.total_amount;
        totalProfit += t.total_profit;
      });

      setSummary({
        omzet: totalOmzet,
        profit: totalProfit,
        totalTrx: trxData.length,
        expenses: totalOmzet - totalProfit // Modal = Omzet - Profit
      });

      setTransactions(trxData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Format Tanggal
  const formatDate = (dateString: string) => {
    const options: any = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white pt-14 pb-4 px-5 border-b border-gray-200 shadow-sm z-10">
        <View className="flex-row items-center justify-between">
            <View>
                <Text className="text-2xl font-bold text-gray-900">Laporan Keuangan</Text>
                <Text className="text-gray-500 text-xs">Ringkasan performa bisnis Anda</Text>
            </View>
            <TouchableOpacity onPress={onRefresh} className="bg-gray-100 p-2 rounded-full">
                <Ionicons name="refresh" size={20} color="#374151" />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        
        {/* SECTION 1: KARTU RINGKASAN */}
        <View className="px-5 mt-6 mb-6">
            {/* Card Profit (Highlight) */}
            <View className="bg-blue-600 rounded-3xl p-6 shadow-lg shadow-blue-200 mb-4 overflow-hidden relative">
                <View className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
                
                <View className="flex-row items-center mb-2">
                    <MaterialCommunityIcons name="wallet-outline" size={20} color="white" style={{opacity:0.8}} />
                    <Text className="text-blue-100 font-medium text-xs ml-2 uppercase tracking-wide">Laba Bersih (Profit)</Text>
                </View>
                <Text className="text-4xl font-bold text-white mb-1">
                    Rp {summary.profit.toLocaleString()}
                </Text>
                <Text className="text-blue-200 text-xs">Keuntungan bersih setelah dikurangi modal.</Text>
            </View>

            {/* Grid Stats Kecil */}
            <View className="flex-row gap-3">
                <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <Text className="text-gray-500 text-xs mb-1">Total Omzet</Text>
                    <Text className="text-lg font-bold text-gray-900">Rp {summary.omzet.toLocaleString()}</Text>
                    <View className="flex-row items-center mt-2">
                        <Ionicons name="arrow-up" size={12} color="#16A34A" />
                        <Text className="text-[10px] text-green-600 font-bold ml-1">Penjualan</Text>
                    </View>
                </View>
                
                <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <Text className="text-gray-500 text-xs mb-1">Total Modal</Text>
                    <Text className="text-lg font-bold text-gray-900">Rp {summary.expenses.toLocaleString()}</Text>
                     <View className="flex-row items-center mt-2">
                        <Ionicons name="cube-outline" size={12} color="#EA580C" />
                        <Text className="text-[10px] text-orange-600 font-bold ml-1">COGS / HPP</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* SECTION 2: CHART SIMPLE (Visualisasi Batang) */}
        <View className="px-5 mb-6">
            <Text className="text-base font-bold text-gray-900 mb-3">Tren Penjualan (Terakhir)</Text>
            <View className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex-row items-end justify-between h-40">
                {/* Kita ambil 7 data terakhir lalu reverse agar urut waktu */}
                {transactions.slice(0, 7).reverse().map((t: any, index) => {
                    // Normalisasi tinggi batang (max height 100px)
                    const maxVal = Math.max(...transactions.slice(0, 7).map((x:any) => x.total_amount));
                    const height = (t.total_amount / (maxVal || 1)) * 100; 
                    
                    return (
                        <View key={index} className="items-center w-8">
                             <View 
                                style={{ height: `${height}%`, minHeight: 10 }} 
                                className="w-full bg-blue-500 rounded-t-md opacity-80" 
                             />
                             <Text className="text-[8px] text-gray-400 mt-1">
                                {new Date(t.created_at).getDate()}
                             </Text>
                        </View>
                    );
                })}
                {transactions.length === 0 && <Text className="text-gray-400 text-xs w-full text-center">Belum ada data grafik</Text>}
            </View>
        </View>

        {/* SECTION 3: RIWAYAT TRANSAKSI */}
        <View className="px-5 bg-white pt-6 pb-10 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Text className="text-base font-bold text-gray-900 mb-4">Riwayat Transaksi</Text>
            
            {loading ? (
                <ActivityIndicator color="#2563EB" />
            ) : transactions.length === 0 ? (
                <Text className="text-gray-400 text-center py-10">Belum ada transaksi penjualan.</Text>
            ) : (
                transactions.map((item: any) => (
                    <View key={item.id} className="flex-row justify-between items-center py-4 border-b border-gray-100">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-green-50 rounded-full items-center justify-center mr-3">
                                <Ionicons name="receipt-outline" size={20} color="#16A34A" />
                            </View>
                            <View>
                                <Text className="font-bold text-gray-900">Order #{item.id}</Text>
                                <Text className="text-xs text-gray-500">{formatDate(item.created_at)}</Text>
                            </View>
                        </View>
                        <View className="items-end">
                             <Text className="font-bold text-base text-gray-900">+ Rp {item.total_amount.toLocaleString()}</Text>
                             <Text className="text-xs text-green-600 font-medium">Profit: {item.total_profit.toLocaleString()}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>

      </ScrollView>
    </View>
  );
}