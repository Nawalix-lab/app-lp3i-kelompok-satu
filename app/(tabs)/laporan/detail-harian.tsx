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
const formatStandardCurrency = (amount: number) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numAmount);
};

const formatHeaderDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
};

const getDisplayDateTitle = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
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

const handleViewDetail = (item: any) => {
    console.log("View detail transaction:", item.id);
};


export default function DetailTransaksiHarian() {
    const { date } = useLocalSearchParams();
    const router = useRouter();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedTrxIds, setExpandedTrxIds] = useState(new Set());
    
    const toggleExpand = (id: any) => {
        const newSet = new Set(expandedTrxIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedTrxIds(newSet);
    };

    const expandAll = () => {
        const allIds = new Set(transactions.map(t => t.id));
        setExpandedTrxIds(allIds);
    };

    const collapseAll = () => {
        setExpandedTrxIds(new Set());
    };

    if (!date) {
        return <View className="flex-1 items-center justify-center"><Text>Tanggal tidak ditemukan.</Text></View>;
    }

    const generateHTML = (data: any[], reportDate: string) => {
        let totalOmzet = 0;
        let totalProfit = 0;
        
        data.forEach(t => {
            totalOmzet += Number(t.total_amount) || 0;
            totalProfit += Number(t.total_profit) || 0;
        });
        
        const sortedData = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const itemRows = (items: any[]) => {
            if (!Array.isArray(items) || items.length === 0) {
                return '<tr><td colspan="4" style="text-align:center; color:#6c757d; padding:8px;">Tidak ada item</td></tr>';
            }
            return items.map((t_item, idx) => {
                const productName = t_item.products?.name || 'Produk Tidak Dikenal';
                const quantity = t_item.quantity || 0;
                const priceAtSale = Number(t_item.price_at_sale) || 0;
                const itemTotal = quantity * priceAtSale;

                return `
                    <tr>
                        <td style="padding: 8px; text-align: center; border-bottom: 1px solid #dee2e6;">${idx + 1}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${productName}</td>
                        <td style="padding: 8px; text-align: center; border-bottom: 1px solid #dee2e6;">${quantity} × ${formatStandardCurrency(priceAtSale)}</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #dee2e6; font-weight: 600;">${formatStandardCurrency(itemTotal)}</td>
                    </tr>
                `;
            }).join('');
        };

        const transactionCards = sortedData.map((item, index) => {
            const transactionId = String(item.id).substring(0, 8);
            const totalItemsCount = item.transaction_items?.length || 0;
            const transactionTime = new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            return `
                <div style="margin-bottom: 20px; page-break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-bottom: none;">
                        <div>
                            <div style="font-size: 13px; font-weight: 600; color: #000;">Transaksi #${index + 1} - ID: ${transactionId}</div>
                            <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">${transactionTime}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 16px; font-weight: 700; color: #000;">${formatStandardCurrency(item.total_amount)}</div>
                            <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">Profit: ${formatStandardCurrency(item.total_profit)}</div>
                        </div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #dee2e6; background-color: #fff;">
                        <thead>
                            <tr style="background-color: #e9ecef;">
                                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; width: 40px;">No</th>
                                <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">Nama Produk</th>
                                <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">Qty × Harga</th>
                                <th style="padding: 10px 8px; text-align: right; font-size: 11px; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRows(item.transaction_items)}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Laporan Transaksi Harian</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        padding: 40px; 
                        background-color: #ffffff; 
                        color: #000000;
                        line-height: 1.6;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #000000;
                    }
                    .header h1 {
                        font-size: 24px;
                        font-weight: 700;
                        margin-bottom: 8px;
                        color: #000000;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .header .date {
                        font-size: 14px;
                        color: #333333;
                        margin-top: 5px;
                    }
                    .summary-section {
                        margin-bottom: 30px;
                        padding: 20px;
                        background-color: #f8f9fa;
                        border: 1px solid #dee2e6;
                    }
                    .summary-title {
                        font-size: 14px;
                        font-weight: 700;
                        color: #000000;
                        margin-bottom: 15px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .summary-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .summary-table td {
                        padding: 8px 0;
                        font-size: 13px;
                    }
                    .summary-table td:first-child {
                        color: #495057;
                        width: 60%;
                    }
                    .summary-table td:last-child {
                        text-align: right;
                        font-weight: 600;
                        color: #000000;
                    }
                    .section-title {
                        font-size: 14px;
                        font-weight: 700;
                        color: #000000;
                        margin: 30px 0 15px 0;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #000000;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #dee2e6;
                        text-align: center;
                    }
                    .footer p {
                        font-size: 10px;
                        color: #6c757d;
                    }
                    @media print {
                        body { padding: 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Laporan Transaksi Harian</h1>
                    <div class="date">${formatHeaderDate(reportDate)}</div>
                </div>
                
                <div class="summary-section">
                    <div class="summary-title">Ringkasan</div>
                    <table class="summary-table">
                        <tr>
                            <td>Total Transaksi</td>
                            <td>${data.length} transaksi</td>
                        </tr>
                        <tr>
                            <td>Total Omzet</td>
                            <td>${formatStandardCurrency(totalOmzet)}</td>
                        </tr>
                    </table>
                </div>

                <div class="section-title">Detail Transaksi</div>
                ${transactionCards}
                
                <div class="footer">
                    <p>Dicetak pada: ${new Date().toLocaleString('id-ID', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </div>
            </body>
            </html>
        `;
    };

    const fetchData = async () => {
        setLoading(true);
        setRefreshing(true);
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error("User tidak terautentikasi:", authError);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const currentUserId = user.id;
            const startOfDay = `${date}T00:00:00.000Z`;
            const nextDay = new Date(Array.isArray(date) ? date[0] : date);
            nextDay.setDate(nextDay.getDate() + 1);
            const startOfNextDay = nextDay.toISOString().split('T')[0] + 'T00:00:00.000Z';

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
            setTransactions(data || []);

        } catch (err) {
            console.error("Error fetching daily transactions:", err);
            setTransactions([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const printReport = async () => {
        if (transactions.length === 0) {
            alert("Tidak ada data untuk dicetak.");
            return;
        }

        const htmlContent = generateHTML(transactions, Array.isArray(date) ? date[0] : date);

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

    const renderItemDetails = (items: any[]) => {
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
                    <Text className="text-sm text-gray-700 flex-1 pr-2">
                        {productName} ({quantity}x)
                    </Text>
                    <Text className="text-sm font-medium text-gray-800">
                           {formatStandardCurrency(itemTotal)}
                    </Text>
                </View>
            );
        });
    };

    const renderTransactionCard = (item: any) => {
        const transactionId = item.id ? String(item.id).substring(0, 8) : 'N/A';
        const totalItemsCount = item.transaction_items?.length || 0;
        const profitColor = item.total_profit > 0 ? 'text-blue-600' : 'text-red-600';
        const isExpanded = expandedTrxIds.has(item.id);
        const iconName = isExpanded ? 'chevron-up' : 'chevron-down';

        return (
            <View
                key={item.id}
                className="bg-white p-4 mx-5 mb-4 rounded-2xl border border-gray-200 shadow-sm"
            >
                <View className="flex-row items-start justify-between">
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
                    
                    <View className="items-end">
                        <Text className="text-xl font-bold text-green-600">
                            {formatStandardCurrency(item.total_amount)}
                        </Text>
                        <Text className={`text-xs ${profitColor} font-medium`}>
                             Profit: {formatStandardCurrency(item.total_profit)}
                        </Text>
                    </View>
                </View>
                
                <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs font-semibold text-gray-700">
                        Detail Item ({totalItemsCount} Jenis Produk)
                    </Text>
                    
                    <TouchableOpacity onPress={() => toggleExpand(item.id)}>
                         <Ionicons name={iconName} size={20} color="#4B5563" />
                    </TouchableOpacity>
                </View>

                {isExpanded && (
                    <View className="bg-gray-50 p-3 rounded-lg mt-2">
                        {renderItemDetails(item.transaction_items)}
                    </View>
                )}
            </View>
        );
    };

    const totalSales = transactions.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <StatusBar style="dark" />
            
            <Stack.Screen
                options={{
                    headerShown: false,
                    headerTitle: getDisplayDateTitle(Array.isArray(date) ? date[0] : date),
                }}
            />

            <View className="bg-white pt-4 pb-3 px-5 border-b border-gray-200 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 ml-[-10px] mr-2"
                    >
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
                        {getDisplayDateTitle(Array.isArray(date) ? date[0] : date)}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={printReport}
                    className="p-2"
                    disabled={loading || transactions.length === 0}
                >
                    <Ionicons
                        name="print-outline"
                        size={24}
                        color={loading || transactions.length === 0 ? "#9CA3AF" : "#2563EB"}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingTop: 0, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="bg-white px-5 pt-4 pb-4 border-b border-gray-100 shadow-sm mb-4">
                    <Text className="text-xs text-gray-500 font-medium">Ringkasan untuk tanggal:</Text>
                    <Text className="text-lg font-bold text-gray-900">{formatHeaderDate(Array.isArray(date) ? date[0] : date)}</Text>
                    
                    <Text className="text-sm text-gray-600 mt-2">
                        Total Transaksi: <Text className="font-bold text-blue-600">{transactions.length}</Text>
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                        Total Penjualan: <Text className="font-bold text-green-600">{formatStandardCurrency(totalSales)}</Text>
                    </Text>
                    
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
