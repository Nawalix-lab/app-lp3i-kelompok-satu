import React, { useState, useCallback } from "react";
// Import SafeAreaView
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useFocusEffect, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from "../../../lib/supabase";
import "../../../global.css";
import { SafeAreaView } from "react-native-safe-area-context";


// Format Mata Uang standar (dengan Rp)
const formatStandardCurrency = (amount) => {
    // Pastikan amount adalah angka dan bukan string kosong/null
    const numAmount = Number(amount) || 0;
    // Menggunakan Intl.NumberFormat untuk format mata uang IDR
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numAmount);
};

const formatHeaderDate = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
};

const getDisplayDateTitle = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Normalisasi jam untuk perbandingan tanggal
    const normalizeDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dateToCompare = normalizeDate(date);
    const todayToCompare = normalizeDate(today);
    const yesterdayToCompare = normalizeDate(yesterday);

    if (dateToCompare === todayToCompare) {
        return "Transaksi Hari Ini";
    }
    if (dateToCompare === yesterdayToCompare) {
        return "Transaksi Kemarin";
    }
    return `Transaksi Tanggal ${new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`;
};

const handleViewDetail = (item) => {
    console.log("View detail transaction:", item.id);
    // Tambahkan navigasi ke halaman detail transaksi jika ada
};


export default function DetailTransaksiHarian() {
    const { date } = useLocalSearchParams();
    const router = useRouter();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // State untuk melacak multiple ID yang di-expand
    const [expandedTrxIds, setExpandedTrxIds] = useState(new Set());
    
    // Fungsi untuk toggle expand/collapse satu item
    const toggleExpand = (id) => {
        const newSet = new Set(expandedTrxIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedTrxIds(newSet);
    };

    // Fungsi untuk expand semua item
    const expandAll = () => {
        const allIds = new Set(transactions.map(t => t.id));
        setExpandedTrxIds(allIds);
    };

    // Fungsi untuk collapse semua item
    const collapseAll = () => {
        setExpandedTrxIds(new Set());
    };


    if (!date) {
        return <View className="flex-1 items-center justify-center"><Text>Tanggal tidak ditemukan.</Text></View>;
    }

    // --- FUNGSI GENERASI HTML UNTUK PDF ---
    
    const generateHTML = (data, reportDate) => {
        let totalOmzet = 0;
        let totalProfit = 0;
        // Hitung total omzet dan profit
        data.forEach(t => {
            totalOmzet += Number(t.total_amount) || 0;
            totalProfit += Number(t.total_profit) || 0;
        });
        
        // Urutkan berdasarkan waktu transaksi (paling awal di atas)
        const sortedData = [...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Fungsi helper untuk merender baris detail item dalam tabel HTML
        const itemRows = (items) => {
            if (!Array.isArray(items) || items.length === 0) {
                return '<tr><td colspan="2" style="text-align:center; color:#999; padding:5px 0; border:none;">Item tidak tercatat.</td></tr>';
            }
            return items.map(t_item => {
                const productName = t_item.products?.name || 'Produk Tidak Dikenal';
                const quantity = t_item.quantity || 0;
                const priceAtSale = Number(t_item.price_at_sale) || 0;
                const itemTotal = quantity * priceAtSale;

                return `
                    <tr style="border-bottom: 1px dotted #ddd; ">
                        <td style="padding: 3px 0; font-size: 11px; color: #333;">${productName} (${quantity}x @ ${formatStandardCurrency(priceAtSale)})</td>
                        <td style="padding: 3px 0; text-align: right; font-size: 11px; font-weight: 500;">${formatStandardCurrency(itemTotal)}</td>
                    </tr>
                `;
            }).join('');
        };

        // Render semua kartu transaksi
        const transactionCards = sortedData.map(item => {
            const transactionId = String(item.id).substring(0, 8);
            const profitColor = item.total_profit > 0 ? '#047857' : '#EF4444'; // Green-700 / Red-500
            const totalItemsCount = item.transaction_items?.length || 0;

            return `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 15px; padding: 15px; background-color: #fff; page-break-inside: avoid;">
                    
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding-bottom: 10px; margin-bottom: 10px;">
                        <div>
                            <p style="font-weight: bold; margin: 0; font-size: 14px; color: #1F2937;">Transaksi #${transactionId}</p>
                            <p style="margin: 0; font-size: 10px; color: #6B7280;">Pukul: ${new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="font-weight: bold; margin: 0; font-size: 16px; color: #10B981;">${formatStandardCurrency(item.total_amount)}</p>
                            <p style="margin: 0; font-size: 10px; font-weight: 500; color: ${profitColor};">Profit: ${formatStandardCurrency(item.total_profit)}</p>
                        </div>
                    </div>

                    <p style="font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 5px;">Detail Item (${totalItemsCount} Jenis Produk)</p>
                    <table style="width: 100%; border-collapse: collapse; background-color: #F9FAFB; padding: 5px; border-radius: 4px;">
                        <tbody>
                            ${itemRows(item.transaction_items)}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');

        return `
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; color: #333; }
                    h1 { font-size: 20px; margin-bottom: 5px; color: #1F2937; }
                    p { margin: 0; line-height: 1.4; }
                    .container { padding: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Laporan Transaksi Harian</h1>
                    <p style="font-size: 14px; color: #4B5563; margin-bottom: 20px;">Ringkasan untuk: <b>${formatHeaderDate(reportDate)}</b></p>
                    
                    <div style="margin-bottom: 25px; padding: 15px; background-color: #DBF0FF; border-radius: 8px; border: 1px solid #BFDBFE;">
                        <p style="font-size: 13px; color: #1E40AF; font-weight: bold; margin-bottom: 10px;">Ringkasan Global</p>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="font-size: 14px; color: #1F2937;">Total Transaksi:</td>
                                <td style="font-size: 14px; font-weight: bold; text-align: right; color: #1E40AF;">${data.length}</td>
                            </tr>
                            <tr>
                                <td style="font-size: 14px; color: #1F2937;">Total Omzet:</td>
                                <td style="font-size: 14px; font-weight: bold; text-align: right; color: #10B981;">${formatStandardCurrency(totalOmzet)}</td>
                            </tr>
                            <tr>
                                <td style="font-size: 14px; color: #1F2937;">Total Profit:</td>
                                <td style="font-size: 14px; font-weight: bold; text-align: right; color: #1E40AF;">${formatStandardCurrency(totalProfit)}</td>
                            </tr>
                        </table>
                    </div>

                    <h2 style="font-size: 16px; color: #1F2937; margin-bottom: 10px;">Detail Transaksi:</h2>

                    ${transactionCards}
                </div>
            </body>
            </html>
        `;
    };


    const fetchData = async () => {
        setLoading(true);
        setRefreshing(true);
        try {
            // 1. AMBIL USER ID TERLEBIH DAHULU
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error("User tidak terautentikasi:", authError);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const currentUserId = user.id;

            // 2. LOGIKA TANGGAL
            const startOfDay = `${date}T00:00:00.000Z`;
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            const startOfNextDay = nextDay.toISOString().split('T')[0] + 'T00:00:00.000Z';

            // 3. QUERY TRANSAKSI
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    id,
                    created_at,
                    total_amount,
                    total_profit,
                    transaction_items (
                        quantity,
                        price_at_sale,
                        products (
                            name
                        )
                    )
                `)
                .gte('created_at', startOfDay)
                .lt('created_at', startOfNextDay)
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false });

            
            if (error) throw error;
            
            setTransactions(data);

        } catch (err) {
            console.error("Error fetching daily transactions:", err);
            setTransactions([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // --- FUNGSI MENCETAK LAPORAN ---
    const printReport = async () => {
        if (transactions.length === 0) {
            alert("Tidak ada data untuk dicetak.");
            return;
        }

        const htmlContent = generateHTML(transactions, date);

        try {
            const { uri } = await Print.printToFileAsync({
                html: htmlContent,
                base64: false,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Bagikan Laporan Transaksi',
                    UTI: 'com.adobe.pdf',
                });
            } else {
                alert("Fitur berbagi tidak tersedia di perangkat ini.");
            }

        } catch (error) {
            console.error('Error generating or sharing PDF:', error);
            alert("Gagal membuat atau membagikan laporan PDF.");
        }
    };


    useFocusEffect(useCallback(() => { fetchData(); }, [date]));

    const onRefresh = useCallback(() => {
        fetchData();
    }, [date]);

    // --- FUNGSI MERENDER DETAIL ITEM (BARIS DEMI BARIS) ---
    const renderItemDetails = (items) => {
        if (!Array.isArray(items) || items.length === 0) {
            return (
                <Text className="text-xs text-gray-400 mt-1">Item tidak tercatat.</Text>
            );
        }

        return items.map((t_item, index) => {
            const productName = t_item.products?.name || 'Produk Tidak Dikenal';
            const quantity = t_item.quantity || 0;
            const priceAtSale = Number(t_item.price_at_sale) || 0;
            const itemTotal = quantity * priceAtSale;

            return (
                <View
                    key={index}
                    className="flex-row justify-between items-center"
                    style={{marginTop: index > 0 ? 4 : 0}}
                >
                    {/* Kiri: Nama Produk, Kuantitas, dan Harga Satuan */}
                    <Text className="text-sm text-gray-700 flex-1 pr-2">
                        {productName} ({quantity}x)
                    </Text>
                    
                    {/* Kanan: Harga Total Per Item */}
                    <Text className="text-sm font-medium text-gray-800">
                           {formatStandardCurrency(itemTotal)}
                    </Text>
                </View>
            );
        });
    };

    // --- FUNGSI: renderTransactionCard ---
    const renderTransactionCard = (item) => {
        const transactionId = item.id
            ? String(item.id).substring(0, 8)
            : 'N/A';
        
        const totalItemsCount = item.transaction_items?.length || 0;
        const profitColor = item.total_profit > 0 ? 'text-blue-600' : 'text-red-600';
        
        // Cek apakah item ini yang sedang di-expand
        const isExpanded = expandedTrxIds.has(item.id);
        const iconName = isExpanded ? 'chevron-up' : 'chevron-down';

        return (
            <View
                key={item.id}
                className="bg-white p-4 mx-5 mb-4 rounded-2xl border border-gray-200 shadow-sm"
            >
                {/* BAGIAN ATAS CARD: Ringkasan Transaksi & Total Harga */}
                <View className="flex-row items-start justify-between">
                    {/* Kiri: ID Transaksi, Pukul */}
                    <TouchableOpacity
                         onPress={() => handleViewDetail(item)}
                         className="flex-1 mr-4"
                    >
                        <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
                            Transaksi #{transactionId}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                            Pukul: {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </TouchableOpacity>
                    
                    {/* Kanan: Total Harga & Profit */}
                    <View className="items-end">
                        <Text className="text-xl font-bold text-green-600">
                            {formatStandardCurrency(item.total_amount)}
                        </Text>
                        <Text className={`text-xs ${profitColor} font-medium`}>
                             Profit: {formatStandardCurrency(item.total_profit)}
                        </Text>
                    </View>
                </View>
                
                {/* --- BAGIAN BAWAH CARD: COLLAPSIBLE DETAIL --- */}
                
                {/* Header Detail Item & Tombol Collapse */}
                <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs font-semibold text-gray-700">
                        Detail Item ({totalItemsCount} Jenis Produk)
                    </Text>
                    
                    {/* Tombol Collapse/Expand */}
                    <TouchableOpacity onPress={() => toggleExpand(item.id)}>
                         <Ionicons name={iconName} size={20} color="#4B5563" />
                    </TouchableOpacity>
                </View>

                {/* Daftar Item (Hanya tampil jika isExpanded = true) */}
                {isExpanded && (
                    <View className="bg-gray-50 p-3 rounded-lg mt-2">
                        {renderItemDetails(item.transaction_items)}
                    </View>
                )}
                
            </View>
        );
    };

    // --- HITUNG TOTAL PENJUALAN UNTUK HEADER ---
    const totalSales = transactions.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <StatusBar style="dark" />
            
            {/* 1. Stack Screen Options */}
            <Stack.Screen
                options={{
                    headerShown: false,
                    headerTitle: getDisplayDateTitle(date),
                }}
            />

            {/* 2. CUSTOM HEADER */}
            <View className="bg-white pt-4 pb-3 px-5 border-b border-gray-200 flex-row items-center justify-between">
                
                {/* Kiri: Tombol Back & Judul */}
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 ml-[-10px] mr-2"
                    >
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
                        {getDisplayDateTitle(date)}
                    </Text>
                </View>

                {/* Kanan: Tombol Print */}
                <TouchableOpacity
                    onPress={printReport}
                    className="p-2"
                    disabled={loading || transactions.length === 0} // Nonaktifkan jika memuat/tidak ada data
                >
                    <Ionicons
                        name="print-outline"
                        size={24}
                        color={loading || transactions.length === 0 ? "#9CA3AF" : "#2563EB"}
                    />
                </TouchableOpacity>
            </View>

            {/* 3. SCROLLVIEW KONTEN */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingTop: 0, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header Tanggal Statis (di luar list) */}
                <View className="bg-white px-5 pt-4 pb-4 border-b border-gray-100 shadow-sm mb-4">
                    <Text className="text-xs text-gray-500 font-medium">Ringkasan untuk tanggal:</Text>
                    <Text className="text-lg font-bold text-gray-900">{formatHeaderDate(date)}</Text>
                    
                    {/* INFO TOTAL TRANSAKSI DAN TOTAL PENJUALAN */}
                    <Text className="text-sm text-gray-600 mt-2">
                        Total Transaksi: <Text className="font-bold text-blue-600">{transactions.length}</Text>
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                        Total Penjualan: <Text className="font-bold text-green-600">{formatStandardCurrency(totalSales)}</Text>
                    </Text>
                    
                    {/* Tombol Expand/Collapse Semua */}
                    {transactions.length > 0 && (
                        <View className="flex-row justify-end mt-2">
                            {expandedTrxIds.size === transactions.length ? (
                                <TouchableOpacity onPress={collapseAll} className="flex-row items-center">
                                    <Ionicons name="contract-outline" size={14} color="#EF4444" style={{marginRight: 4}} />
                                    <Text className="text-xs font-semibold text-red-500">Collapse Semua</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={expandAll} className="flex-row items-center">
                                    <Ionicons name="expand-outline" size={14} color="#2563EB" style={{marginRight: 4}} />
                                    <Text className="text-xs font-semibold text-blue-500">Expand Semua</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Daftar Transaksi Harian */}
                <View className="flex-1">
                    {loading ? (
                        <View className="items-center justify-center py-10">
                            <ActivityIndicator size="large" color="#2563EB" />
                            <Text className="text-gray-500 mt-3">Memuat transaksi harian...</Text>
                        </View>
                    ) : transactions.length === 0 ? (
                        <View className="items-center justify-center py-20 bg-white mx-5 rounded-xl border border-gray-200">
                            <Ionicons name="alert-circle-outline" size={40} color="#D1D5DB" />
                            <Text className="text-gray-400 text-center mt-3">Tidak ada transaksi yang tercatat pada tanggal ini.</Text>
                        </View>
                    ) : (
                        transactions.map(renderTransactionCard)
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}