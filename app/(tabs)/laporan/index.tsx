import React, { useState, useCallback } from "react";

import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";

import { StatusBar } from "expo-status-bar";

import { useRouter, useFocusEffect } from "expo-router";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { LineChart } from "react-native-chart-kit";

import { supabase } from "../../../lib/supabase";

import "../../../global.css";



// --- UTILITY FUNCTIONS ---



/**

 * Mengelompokkan transaksi berdasarkan tanggal (per hari) dan menjumlahkan total_amount dan total_profit.

 * @param {Array<Object>} transactions - Array of transaction objects.

 * @returns {Array<Object>} Array of daily summary objects.

 */

const groupTransactionsByDay = (transactions: any[]) => {

  const dailySummary = transactions.reduce((acc: any, t: any) => {

    // Ambil tanggal dalam format YYYY-MM-DD

    const dateKey = new Date(t.created_at).toISOString().split('T')[0];



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

    acc[dateKey].totalTrx += 1; // Menghitung jumlah transaksi per hari



    return acc;

  }, {});



  // Konversi object menjadi array dan urutkan dari tanggal terbaru

  return Object.values(dailySummary).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

};





export default function LaporanScreen() {

  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  // State baru untuk menyimpan ID pengguna yang sedang login

  const [userId, setUserId] = useState<string | null>(null);

  const [summary, setSummary] = useState({

    omzet: 0,

    profit: 0,

    totalTrx: 0,

    expenses: 0, // Estimasi modal keluar (omzet - profit)

  });

  // State baru untuk menyimpan data transaksi yang sudah dikelompokkan per hari

  const [dailyTransactions, setDailyTransactions] = useState<any[]>([]);



  // Fungsi untuk mendapatkan User ID

  const getUserId = async () => {

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {

      setUserId(user.id);

      return user.id;

    }

    // Jika tidak ada user, atur loading menjadi false untuk menghindari loop tak terbatas

    setLoading(false);

    return null;

  };



  // Fungsi Load Data

  const fetchData = async (currentUserId: string) => {

    // Jika tidak ada ID user, hentikan pengambilan data

    if (!currentUserId) {

      console.log("No user ID found. Skipping data fetch.");

      setLoading(false);

      setRefreshing(false);

      return;

    }



    try {

      // 1. Ambil Transaksi (Tambahkan filter: .eq('user_id', currentUserId))

      const { data: trxData, error } = await supabase

        .from('transactions')

        .select('*')

        .eq('user_id', currentUserId) // <-- PENTING: Filter berdasarkan user_id

        .order('created_at', { ascending: false })

        .limit(100);



      if (error) throw error;



      // 2. Kelompokkan dan Hitung Ringkasan Harian

      const dailySummaryData = groupTransactionsByDay(trxData || []);

      setDailyTransactions(dailySummaryData);



      // 3. Hitung Ringkasan Keseluruhan (Total dari semua data harian yang ditarik)

      let totalOmzet = 0;

      let totalProfit = 0;

      let totalTrxCount = 0;



      dailySummaryData.forEach((d: any) => {

        totalOmzet += d.omzet;

        totalProfit += d.profit;

        totalTrxCount += d.totalTrx; // Jumlah transaksi yang terhitung di semua hari

      });



      setSummary({

        omzet: totalOmzet,

        profit: totalProfit,

        totalTrx: totalTrxCount,

        expenses: totalOmzet - totalProfit // Modal = Omzet - Profit

      });



    } catch (err) {

      console.error("Error fetching data:", err);

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  };



  // Menggunakan useFocusEffect untuk mengambil User ID dan data saat screen fokus

  useFocusEffect(useCallback(() => {

    const loadData = async () => {

      setLoading(true);

      const id = await getUserId();

      // Panggil fetchData hanya jika ID user berhasil didapatkan

      if (id) {

        fetchData(id);

      }

    };

    loadData();

  }, []));



  const onRefresh = useCallback(() => {

    setRefreshing(true);

    // Gunakan userId yang sudah ada di state untuk refresh data

    if (userId) {

      fetchData(userId);

    } else {

      // Jika userId belum ada, coba dapatkan lagi

      const loadDataOnRefresh = async () => {

        const id = await getUserId();

        if (id) {

          fetchData(id);

        } else {

          setRefreshing(false);

        }

      };

      loadDataOnRefresh();

    }

  }, [userId]); // Tambahkan userId sebagai dependency agar useCallback ter-update jika userId berubah



  // Format Tanggal untuk Tampilan

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);

    // Ambil tanggal sekarang dan kemarin di WIB
    const now = new Date();
    const options = { timeZone: 'Asia/Jakarta', hour12: false };
    const todayStr = now.toLocaleDateString('id-ID', options);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('id-ID', options);

    const dateStr = date.toLocaleDateString('id-ID', options);

    if (dateStr === todayStr) return "Hari Ini";
    if (dateStr === yesterdayStr) return "Kemarin";

    // Format tanggal lain
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  };




  // Format Mata Uang ringkas (untuk chart)

  const formatCurrency = (amount: number) => {

    // Fungsi bantuan untuk menyingkat angka besar (misal: 110.000 menjadi 110K)

    if (amount >= 1000000) {

      return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';

    }

    if (amount >= 1000) {

      return (amount / 1000).toFixed(0) + 'K';

    }

    return amount.toLocaleString('id-ID');

  };



  // Format Mata Uang standar (dengan Rp)

  const formatStandardCurrency = (amount: number) => {

    return `Rp ${amount.toLocaleString('id-ID')}`;

  };



  // --- FUNGSI BARU UNTUK NAVIGASI ---

  const handleDailyItemPress = (date: string) => {

    router.push({

      pathname: "laporan/detail-harian",

      params: { date: date } // Kirim tanggal (YYYY-MM-DD) sebagai parameter

    });

  };



  // --- RENDERING COMPONENTS ---



  const renderTransactionItem = (item: any) => (

    // UBAH DARI <View> MENJADI <TouchableOpacity>

    <TouchableOpacity

      key={item.date}

      className="flex-row justify-between items-center py-4 border-b border-gray-100"

      onPress={() => handleDailyItemPress(item.date)} // Tambahkan onPress handler

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

        <Text className={`text-xs ${item.profit > 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>

          Profit: {formatStandardCurrency(item.profit)}

        </Text>

      </View>

    </TouchableOpacity> // Tutup TouchableOpacity

  );



  // --- FUNGSI BARU: renderSimpleLineChart dengan react-native-chart-kit ---

  const renderSimpleLineChart = () => {

    // Ambil maksimal 7 hari terakhir

    const chartData = dailyTransactions.slice(0, 7).reverse();



    if (chartData.length === 0) {

      return <Text className="text-gray-400 text-xs w-full text-center">Belum ada data grafik</Text>;

    }



    // Siapkan data untuk chart dengan area fill

    const data = {

      labels: chartData.map((d: any) => {

        const date = new Date(d.date);

        return date.getDate().toString();

      }),

      datasets: [

        {

          data: chartData.map((d: any) => d.omzet),

          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`, // Purple color

          strokeWidth: 3

        }

      ]

    };



    const screenWidth = Dimensions.get("window").width - 40; // padding 20 on each side



    return (

      <LineChart

        data={data}

        width={screenWidth}

        height={220}

        chartConfig={{

          backgroundColor: "#f3e8ff",

          backgroundGradientFrom: "#f3e8ff",

          backgroundGradientFromOpacity: 0.3,

          backgroundGradientTo: "#ffffff",

          backgroundGradientToOpacity: 0.1,

          decimalPlaces: 0,

          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,

          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,

          style: {

            borderRadius: 16

          },

          propsForDots: {

            r: "6",

            strokeWidth: "3",

            stroke: "#8b5cf6",

            fill: "#ffffff"

          },

          propsForBackgroundLines: {

            strokeDasharray: "",

            stroke: "#e9d5ff",

            strokeWidth: 1,

            strokeOpacity: 0.3

          },

          fillShadowGradient: "#8b5cf6",

          fillShadowGradientOpacity: 0.3,

        }}

        bezier

        style={{

          marginVertical: 8,

          borderRadius: 16,

          paddingRight: 0

        }}

        withShadow={true}

        withInnerLines={true}

        withOuterLines={false}

        withVerticalLines={false}

        withHorizontalLines={true}

        withVerticalLabels={true}

        withHorizontalLabels={true}

        withDots={true}

        fromZero={true}

        segments={4}

        decorator={() => {

          return null;

        }}

        onDataPointClick={(data) => {

          console.log(data);

        }}

      />

    );

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

              <MaterialCommunityIcons name="wallet-outline" size={20} color="white" style={{ opacity: 0.8 }} />

              <Text className="text-blue-100 font-medium text-xs ml-2 uppercase tracking-wide">Laba Bersih (Profit)</Text>

            </View>

            <Text className="text-4xl font-bold text-white mb-1">

              {formatStandardCurrency(summary.profit)}

            </Text>

            <Text className="text-blue-200 text-xs">Keuntungan bersih setelah dikurangi modal dari {summary.totalTrx} transaksi.</Text>

          </View>



          {/* Card Total Omzet - Full Width */}

          <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">

            <Text className="text-gray-500 text-xs mb-1">Total Omzet</Text>

            <Text className="text-2xl font-bold text-gray-900">{formatStandardCurrency(summary.omzet)}</Text>

            <View className="flex-row items-center mt-2">

              <Ionicons name="arrow-up" size={14} color="#16A34A" />

              <Text className="text-xs text-green-600 font-bold ml-1">Total Penjualan dari {summary.totalTrx} transaksi</Text>

            </View>

          </View>

        </View>



        {/* SECTION 2: CHART SIMPLE (Visualisasi Garis dengan Area Fill) */}

        <View className="px-5 mb-10">

          <Text className="text-base font-bold text-gray-900 mb-3">Tren Penjualan Harian (7 Hari Terakhir)</Text>

          {/* Chart container with gradient background */}

          <View className="bg-white rounded-2xl border border-purple-100 shadow-lg overflow-hidden">

            {loading ? (

              <View className="h-56 items-center justify-center">

                <ActivityIndicator color="#8b5cf6" />

              </View>

            ) : (

              renderSimpleLineChart()

            )}

          </View>

        </View>



        {/* SECTION 3: RIWAYAT TRANSAKSI HARIAN */}

        <View className="px-5 bg-white pt-6 pb-10 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">

          <Text className="text-base font-bold text-gray-900 mb-4">Ringkasan Penjualan Harian ({dailyTransactions.length} Hari)</Text>



          {loading ? (

            <ActivityIndicator color="#2563EB" />

          ) : dailyTransactions.length === 0 ? (

            <Text className="text-gray-400 text-center py-10">Belum ada ringkasan penjualan harian.</Text>

          ) : (

            dailyTransactions.map(renderTransactionItem)

          )}

        </View>



      </ScrollView>

    </View>

  );

}