import React, { useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Animated, // Import Animated untuk PanResponder
    PanResponder, // Import PanResponder
    Dimensions, // Import Dimensions untuk mendapatkan ukuran layar
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import "../../global.css";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Dapatkan ukuran layar
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// Ukuran FAB (asumsi 14 * 4 = 56px)
const FAB_SIZE = 56;
// Margin default dari bawah dan kanan
const FAB_MARGIN = 24;

export default function HomeScreen() {
    const router = useRouter();

    // State User
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");
    const [session, setSession] = useState<any | null>(null);

    // State Data Dashboard
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStock: 0,
        todayTransactions: 0,
        todayRevenue: 0,
    });

    const hasLowStock = stats.lowStock > 0;

    // --- LOGIKA DRAGGABLE FAB ---
    
    // Nilai animasi posisi X dan Y
    const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - FAB_SIZE - FAB_MARGIN, y: SCREEN_HEIGHT - FAB_SIZE - FAB_MARGIN - 80 })).current;

    // Untuk melacak apakah gesture yang dilakukan adalah 'tap' atau 'drag'
    const isTapping = useRef(true);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,

            onPanResponderGrant: () => {
                isTapping.current = true;
                pan.setOffset({
                    x: pan.x._value,
                    y: pan.y._value,
                });
                pan.setValue({ x: 0, y: 0 });
            },

            onPanResponderMove: (e, gestureState) => {
                // Jika pergerakan lebih besar dari 2px, anggap sebagai drag
                if (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2) {
                    isTapping.current = false;
                }
                
                return Animated.event(
                    [
                        null,
                        { dx: pan.x, dy: pan.y }
                    ],
                    { useNativeDriver: false }
                )(e, gestureState);
            },

            onPanResponderRelease: (e, gestureState) => {
                pan.flattenOffset();
                
                // Jika ini adalah 'tap', navigasi
                if (isTapping.current) {
                    router.push("/kalkulator");
                } else {
                    // Jika ini adalah 'drag', kembalikan ke batas layar (Snap to Edge)
                    let newX = pan.x._value;
                    let newY = pan.y._value;

                    // Batas Kiri/Kanan
                    const maxX = SCREEN_WIDTH - FAB_SIZE - FAB_MARGIN;
                    const minX = FAB_MARGIN;
                    
                    if (newX < minX) newX = minX;
                    if (newX > maxX) newX = maxX;

                    // Batas Atas/Bawah (Adjusted untuk menutupi Header & Footer Tab)
                    const tabHeight = 80; // Estimasi tinggi tab navigator
                    const headerHeight = 100; // Estimasi tinggi header
                    const maxY = SCREEN_HEIGHT - FAB_SIZE - FAB_MARGIN - tabHeight;
                    const minY = headerHeight; 
                    
                    if (newY < minY) newY = minY;
                    if (newY > maxY) newY = maxY;

                    Animated.spring(pan, {
                        toValue: { x: newX, y: newY },
                        useNativeDriver: false,
                        bounciness: 0,
                    }).start();
                }
            },
        })
    ).current;

    // --- LOGIKA DATA DAN OTORISASI (SAMA DENGAN SEBELUMNYA) ---

    async function checkSession() {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        if (data.session) {
            setUserEmail(data.session.user.email || "");
            setUserName(data.session.user.user_metadata?.full_name || "");
        } else {
            router.replace("/(auth)/login");
        }
    }

    async function fetchDashboardData() {
        try {
            const { data: products, error: prodError } = await supabase
                .from("products")
                .select("id, stock, price, min_stock");

            if (prodError) throw prodError;

            const totalProds = products?.length || 0;

            const lowStk =
                products?.filter((p: any) => {
                    const min = p.min_stock ?? 5;
                    return (p.stock ?? 0) <= min;
                }).length || 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString();

            const { data: movements, error: movError } = await supabase
                .from("stock_movements")
                .select("quantity, product_id")
                .eq("type", "OUT")
                .gte("created_at", todayStr);

            if (movError) throw movError;

            let revenue = 0;
            let txCount = 0; 

            if (movements && products) {
                txCount = movements.length; 
                movements.forEach((mov: any) => {
                    const product = products.find((p: any) => p.id === mov.product_id);
                    if (product && product.price) {
                        revenue += mov.quantity * product.price;
                    }
                });
            }

            setStats({
                totalProducts: totalProds,
                lowStock: lowStk,
                todayTransactions: txCount,
                todayRevenue: revenue,
            });
        } catch (error) {
            console.error("Error fetching dashboard:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            checkSession();
            fetchDashboardData();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboardData();
    }, []);

    const initial = (userName || "U").charAt(0).toUpperCase();

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

    if (!session && loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    // --- TAMPILAN UTAMA ---
    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="dark" />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* HEADER PROFILE */}
                <View className="bg-white pt-14 pb-6 px-5 flex-row items-center justify-between border-b border-gray-100 shadow-sm mb-4">
                    {/* kiri: teks */}
                    <View>
                        <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dashboard Owner
                        </Text>
                        <Text className="text-xl font-bold text-gray-900 mt-1">
                            Hai, {userName || "Boss"} 👋
                        </Text>
                    </View>

                    {/* kanan: lonceng + avatar */}
                    <View className="flex-row items-center">
                        {/* icon lonceng bulat merah muda */}
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/notifikasi")}
                            className="mr-3"
                            activeOpacity={0.7}
                        >
                            <View className="h-10 w-10 rounded-full bg-red-50 items-center justify-center relative">
                                <Ionicons
                                    name="notifications-outline"
                                    size={20}
                                    color="#E11D48"
                                />
                                {/* titik merah kecil kalau ada stok menipis */}
                                {hasLowStock && (
                                    <View className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border border-white" />
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* avatar / inisial */}
                        <TouchableOpacity
                            onPress={signOut}
                            className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 items-center justify-center"
                        >
                            <Text className="text-lg font-bold text-blue-600">{initial}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* CARD OMZET */}
                <View className="px-5 mb-6">
                    <View className="bg-blue-600 rounded-3xl p-6 shadow-lg shadow-blue-200 relative overflow-hidden">
                        {/* Background Decoration */}
                        <View className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/30 rounded-full" />
                        <View className="absolute -left-4 -bottom-4 w-24 h-24 bg-blue-500/20 rounded-full" />

                        <View className="flex-row items-center justify-between mb-4">
                            <View className="bg-blue-500/40 px-3 py-1 rounded-full">
                                <Text className="text-[10px] text-white font-bold tracking-widest">
                                    OMZET HARI INI
                                </Text>
                            </View>
                            <MaterialCommunityIcons
                                name="finance"
                                size={24}
                                color="white"
                                style={{ opacity: 0.8 }}
                            />
                        </View>

                        {/* Loading / Data Omzet */}
                        {loading ? (
                            <View className="py-4">
                                <ActivityIndicator size="small" color="white" />
                                <Text className="text-xs text-blue-100 mt-2">Memuat omzet...</Text>
                            </View>
                        ) : (
                            <Text className="text-4xl font-bold text-white mb-2">
                                Rp {stats.todayRevenue.toLocaleString("id-ID")}
                            </Text>
                        )}

                        <Text className="text-blue-100 text-xs leading-4 mb-4">
                            Total pendapatan kotor dari transaksi penjualan yang tercatat hari
                            ini.
                        </Text>

                        {/* Tombol Kasir */}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            className="bg-white px-4 py-3 rounded-xl flex-row items-center justify-center"
                            onPress={() => router.push("/(tabs)/kasir")}
                        >
                            <Ionicons name="cart-outline" size={20} color="#2563EB" />
                            <Text className="text-blue-700 font-bold ml-2">
                                Keluarkan Stok
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* STATS GRID */}
                <View className="px-5 flex-row gap-3 mb-8">
                    {/* Card Total Item */}
                    <TouchableOpacity
                        onPress={() => router.push("/(tabs)/stok")}
                        className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center"
                    >
                        <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center mb-2">
                            <MaterialCommunityIcons
                                name="package-variant"
                                size={22}
                                color="#4F46E5"
                            />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900">
                            {loading ? "-" : stats.totalProducts}
                        </Text>
                        <Text className="text-xs text-gray-500">Total Produk</Text>
                    </TouchableOpacity>

                    {/* Card Stok Menipis */}
                    <TouchableOpacity
                        onPress={() => router.push("/(tabs)/notifikasi")}
                        className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center"
                    >
                        <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center mb-2">
                            <MaterialCommunityIcons
                                name="alert-circle-outline"
                                size={22}
                                color="#EA580C"
                            />
                        </View>
                        <Text
                            className={`text-2xl font-bold ${
                                stats.lowStock > 0 ? "text-orange-600" : "text-gray-900"
                            }`}
                        >
                            {loading ? "-" : stats.lowStock}
                        </Text>
                        <Text className="text-xs text-gray-500">Stok Menipis</Text>
                    </TouchableOpacity>

                    {/* Card Transaksi */}
                    <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center">
                        <View className="w-10 h-10 bg-green-50 rounded-full items-center justify-center mb-2">
                            <MaterialCommunityIcons
                                name="receipt"
                                size={22}
                                color="#16A34A"
                            />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900">
                            {loading ? "-" : stats.todayTransactions}
                        </Text>
                        <Text className="text-xs text-gray-500">Trx Hari Ini</Text>
                    </View>
                </View>

                {/* MENU UTAMA */}
                <View className="px-5">
                    <Text className="text-xs font-bold text-gray-400 tracking-widest mb-4 uppercase">
                        Menu Aplikasi
                    </Text>

                    {/* Stok Barang */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push("/(tabs)/stok")}
                        className="flex-row items-center bg-white p-4 rounded-2xl border border-gray-200 mb-3 shadow-sm"
                    >
                        <View className="h-12 w-12 bg-blue-50 rounded-2xl items-center justify-center mr-4">
                            <MaterialCommunityIcons
                                name="cube-outline"
                                size={24}
                                color="#2563EB"
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900">
                                Stok Barang
                            </Text>
                            <Text className="text-xs text-gray-500 mt-0.5">
                                Input stok masuk, edit & hapus barang
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                    </TouchableOpacity>

                    {/* Laporan */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push("/(tabs)/laporan")}
                        className="flex-row items-center bg-white p-4 rounded-2xl border border-gray-200 mb-3 shadow-sm"
                    >
                        <View className="h-12 w-12 bg-purple-50 rounded-2xl items-center justify-center mr-4">
                            <Ionicons name="stats-chart" size={24} color="#9333EA" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900">
                                Laporan Keuangan
                            </Text>
                            <Text className="text-xs text-gray-500 mt-0.5">
                                Lihat grafik profit & pengeluaran
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                    </TouchableOpacity>

                    {/* Pengaturan */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push("/pengaturan")} // asumsikan ini bukan tab
                        className="flex-row items-center bg-white p-4 rounded-2xl border border-gray-200 mb-3 shadow-sm"
                    >
                        <View className="h-12 w-12 bg-gray-50 rounded-2xl items-center justify-center mr-4">
                            <Ionicons name="settings-outline" size={24} color="#4B5563" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900">
                                Pengaturan
                            </Text>
                            <Text className="text-xs text-gray-500 mt-0.5">
                                Profil toko & akun
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                    </TouchableOpacity>
                </View>

                {/* FOOTER BOX */}
                <View className="px-5 mt-6">
                    <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                        <Text className="text-[11px] text-gray-500 leading-4">
                            Pastikan semua transaksi kasir tercatat agar laporan penjualan dan stok selalu akurat.
                        </Text>
                    </View>
                </View>

                {/* LOGOUT */}
                <View className="px-5 mt-6 mb-10">
                    <TouchableOpacity onPress={signOut} className="py-4 items-center">
                        <Text className="text-red-500 font-semibold text-sm">
                            Keluar dari Akun
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* FLOATING ACTION BUTTON (FAB) KALKULATOR - Draggable Component */}
            <Animated.View
                style={[
                    styles.draggableContainer,
                    { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                ]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    className="bg-indigo-600 h-14 w-14 rounded-full items-center justify-center"
                    style={styles.fabShadow} // Gunakan StyleSheet untuk shadow/elevasi
                >
                    <Ionicons name="calculator-outline" size={28} color="white" />
                </TouchableOpacity>
            </Animated.View>
        </View>
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