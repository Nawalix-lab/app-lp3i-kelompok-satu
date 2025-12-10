import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    TextInput,
    Alert,
    ScrollView,
    Modal,
    Vibration,
    ActivityIndicator,
    StyleSheet
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import "../../../global.css";

// Tentukan tipe data Product
interface Product {
    id: number;
    name: string;
    sku: string | null;
    barcode: string | null;
    stock: number;
    price: number;
    purchase_price: number | null;
}

// Tentukan tipe data Cart Item
interface CartItem extends Product {
    qty: number;
}

export default function KasirScreen() {
    const router = useRouter();

    // Data
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [session, setSession] = useState<any>(null);

    // Modals
    const [modalBayarVisible, setModalBayarVisible] = useState(false);
    const [modalStrukVisible, setModalStrukVisible] = useState(false);
    const [modalScannerVisible, setModalScannerVisible] = useState(false);
    const [lastTrx, setLastTrx] = useState<any>(null);

    // Pembayaran
    // amountPaidStr digunakan untuk input (string). Kita konversi ke angka untuk perhitungan
    const [amountPaidStr, setAmountPaidStr] = useState<string>("");
    // scanned state kamera
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchProducts(session.user.id);
            } else {
                router.replace('/(auth)/login');
            }
        });
    }, []);

    const fetchProducts = async (userId: string) => {
        setLoading(true);
        // Ambil data produk
        const { data, error } = await supabase.from('products').select('*, purchase_price:buy_price').eq('user_id', userId).order('name');
        if (error) {
            Alert.alert("Error", error.message);
        } else if (data) {
            setProducts(data as Product[]);
        }
        setLoading(false);
    };

    // --- FUNGSI KERANJANG UTAMA ---

    const addToCart = (product: Product, quantity: number = 1) => {
        const existing = cart.find(item => item.id === product.id);

        if (product.stock <= 0) {
            Alert.alert("Stok Habis", `${product.name} memiliki stok 0.`);
            return;
        }

        if (existing) {
            const newQty = existing.qty + quantity;
            if (newQty > product.stock) {
                Alert.alert("Stok Tidak Cukup", `Stok ${product.name} hanya tersedia ${product.stock}.`);
                return;
            }
            setCart(cart.map(item => item.id === product.id ? { ...item, qty: newQty } : item));
        } else {
            if (quantity > product.stock) {
                Alert.alert("Stok Tidak Cukup", `Stok ${product.name} hanya tersedia ${product.stock}.`);
                return;
            }
            setCart([...cart, { ...product, qty: quantity }]);
        }
        Vibration.vibrate(50);
    };

    const removeFromCart = (productId: number) => setCart(cart.filter(item => item.id !== productId));

    const updateQty = (productId: number, delta: number) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id === productId) {
                const product = products.find(p => p.id === productId);
                if (!product) return item;
                const newQty = item.qty + delta;
                if (newQty > product.stock) {
                    Alert.alert("Stok Tidak Cukup", `Stok ${item.name} hanya tersedia ${product.stock}.`);
                    return item;
                }
                if (newQty < 1) {
                    removeFromCart(item.id);
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const totalBelanja = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Hitung jumlah bayar (number) dan kembalian
    const parseCurrencyToNumber = (s: string) => {
        if (!s) return 0;
        // Buang semua selain digit
        const digits = s.replace(/\D/g, '');
        return digits ? parseInt(digits, 10) : 0;
    };
    const amountPaidNumber = parseCurrencyToNumber(amountPaidStr);
    const changeNumber = amountPaidNumber - totalBelanja;

    // Format rupiah kecil
    const formatRupiah = (n: number) => {
        return n.toLocaleString('id-ID');
    };

    // --- FUNGSI SCANNER BARCODE ---

    const handleScanPress = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert("Izin Kamera", "Izin kamera diperlukan untuk scan barcode.");
                return;
            }
        }
        setScanned(false);
        setModalScannerVisible(true);
    };

    const handleBarCodeScanned = ({ data }: { type: string, data: string }) => {
        setScanned(true);
        setModalScannerVisible(false);
        Vibration.vibrate();

        const productFound = products.find(p => p.barcode === data || p.sku === data);

        if (productFound && productFound.stock > 0) {
            addToCart(productFound);
        } else {
            Alert.alert("Produk Tidak Ditemukan", `Barcode/SKU ${data} tidak terdaftar atau stoknya habis.`);
        }

        setTimeout(() => setScanned(false), 1000);
    };

    // --- FUNGSI PRINT / EXPORT PDF BARU ---

    const htmlContent = (trxData: any) => `
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
                body {
                    font-family: 'monospace', 'Courier New', monospace;
                    padding: 15px;
                    margin: 0;
                    font-size: 10px;
                    line-height: 1.4;
                    color: #000;
                    width: 250px;
                }
                .center { text-align: center; }
                .right { text-align: right; }
                .divider {
                    border-bottom: 1px dashed #999;
                    margin: 8px 0;
                    height: 1px;
                    overflow: hidden;
                }
                .total-row {
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 10px;
                }
                .item-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                }
                .item-name { flex: 1; margin-right: 5px; }
                .item-qty-price { width: 40px; text-align: right; }
                .item-subtotal { width: 60px; text-align: right; }
                .small { font-size: 9px; color: #555; }
            </style>
        </head>
        <body>
            <div class="center">
                <h3>kaStok Store</h3>
                <p style="margin: 0;">Jl. Digital No. 1</p>
                <p style="margin: 0;">Telp: 0812-3456-7890</p>
            </div>
            <div class="divider"></div>

            <div style="display: flex; justify-content: space-between; font-size: 9px;">
                <span>No. Order: #${trxData.id}</span>
                <span class="right">${trxData.date}</span>
            </div>

            <div class="divider"></div>

            ${trxData.items.map((item: any) => `
                <div class="item-row">
                    <span class="item-name">${item.name}</span>
                    <span class="item-qty-price">${item.qty} x</span>
                    <span class="item-subtotal">${(item.qty * item.price).toLocaleString('id-ID')}</span>
                </div>
            `).join('')}

            <div class="divider"></div>

            <div class="item-row total-row">
                <span>TOTAL</span>
                <span class="item-subtotal">Rp ${trxData.total.toLocaleString('id-ID')}</span>
            </div>

            <div style="margin-top:8px; font-size:11px;">
                <div style="display:flex; justify-content:space-between;">
                    <span>Bayar</span>
                    <span>Rp ${trxData.paid ? trxData.paid.toLocaleString('id-ID') : '0'}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:4px;">
                    <span>Kembalian</span>
                    <span>Rp ${trxData.change ? trxData.change.toLocaleString('id-ID') : '0'}</span>
                </div>
            </div>

            <div class="divider" style="margin-top: 15px;"></div>
            <p class="center" style="font-size: 10px;">--- TERIMA KASIH ---</p>
        </body>
        </html>
    `;

    const print = async (action: 'print' | 'pdf') => {
        if (!lastTrx) {
            Alert.alert("Tidak ada data struk", "Silakan lakukan transaksi terlebih dahulu.");
            return;
        }
        setLoading(true);

        const html = htmlContent(lastTrx);

        try {
            if (action === 'print') {
                await Print.printAsync({ html });
                Alert.alert("Cetak", "Instruksi cetak telah dikirim.");
            } else if (action === 'pdf') {
                const { uri } = await Print.printToFileAsync({ html, base64: false });

                if (uri) {
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: 'Bagikan Struk Transaksi' });
                    } else {
                        Alert.alert("PDF Tersedia", "File PDF telah dibuat. Silakan cek unduhan Anda.");
                    }
                }
            }
        } catch (error: any) {
            Alert.alert(`Gagal ${action === 'print' ? 'Mencetak' : 'Membuat PDF'}`, error.message || "Terjadi kesalahan.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- FUNGSI CHECKOUT ---

    const handleCheckout = async () => {
        setLoading(true);
        try {
            if (cart.length === 0) throw new Error("Keranjang belanja kosong.");
            if (!session?.user?.id) throw new Error("Sesi pengguna tidak valid. Silakan login ulang.");

            // Validasi pembayaran
            if (amountPaidNumber < totalBelanja) {
                throw new Error("Jumlah bayar kurang dari total. Mohon masukkan jumlah bayar yang sesuai.");
            }

            let totalProfit = 0;
            const itemMovements: any[] = [];

            const productsInCart = cart.map(item => products.find(p => p.id === item.id));

            for (const item of cart) {
                const product = productsInCart.find(p => p?.id === item.id);

                if (!product) throw new Error(`Produk dengan ID ${item.id} tidak ditemukan.`);

                if (item.qty > item.stock) throw new Error(`Stok ${item.name} tidak mencukupi.`);

                const buyPrice = item.purchase_price ?? 0;
                const profitPerItem = (item.price - buyPrice);
                totalProfit += (profitPerItem * item.qty);

                itemMovements.push({
                    product_id: item.id,
                    type: 'OUT',
                    quantity: item.qty,
                    notes: `Penjualan`,
                    user_id: session.user.id
                });
            }

            // 1. Simpan Transaksi
            const { data: trx, error: trxError } = await supabase
                .from('transactions')
                .insert({ total_amount: totalBelanja, total_profit: totalProfit, user_id: session.user.id })
                .select()
                .single();
            if (trxError) throw trxError;

            const finalMovements = itemMovements.map(mov => ({
                ...mov,
                notes: `${mov.notes} #${trx.id}`
            }));

            // 2. Simpan Detail
            const transactionItemsData = cart.map(item => ({
                transaction_id: trx.id,
                product_id: item.id,
                quantity: item.qty,
                price_at_sale: item.price,
                buy_price_at_sale: item.purchase_price ?? 0,
                user_id: session.user.id
            }));

            const { error: itemError } = await supabase.from('transaction_items').insert(transactionItemsData);
            if (itemError) throw itemError;

            // Update stok
            const updateStockPromises = cart.map(item =>
                supabase.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id).eq('user_id', session.user.id)
            );
            await Promise.all(updateStockPromises);

            // Simpan stock movements
            const { error: movementError } = await supabase.from('stock_movements').insert(finalMovements);
            if (movementError) throw movementError;

            // 3. Set Data Struk & Tampilkan Modal (sertakan bayar dan kembalian)
            setLastTrx({
                id: trx.id,
                date: new Date().toLocaleString('id-ID'),
                items: cart,
                total: totalBelanja,
                paid: amountPaidNumber,
                change: changeNumber > 0 ? changeNumber : 0
            });

            // Refresh data produk
            await fetchProducts(session.user.id);

            setLoading(false);
            setModalBayarVisible(false);
            setCart([]);
            setAmountPaidStr(""); // reset input bayar
            setModalStrukVisible(true);

        } catch (error: any) {
            setLoading(false);
            Alert.alert("Gagal Transaksi", error.message || "Terjadi kesalahan.");
        }
    };

    const filteredProducts = products.filter(p =>
        p.stock > 0 && (
            (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    );

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="bg-white pt-14 pb-4 px-5 border-b border-gray-200 shadow-sm z-10">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => router.back()} className="mr-3"><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
                        <Text className="text-xl font-bold">Kasir</Text>
                    </View>
                    <View className="bg-blue-100 px-3 py-1 rounded-full"><Text className="text-blue-700 text-xs font-bold">{cart.length} Item</Text></View>
                </View>

                {/* Input Search + Tombol Scan */}
                <View className="flex-row items-center gap-2">
                    <TextInput
                        className="flex-1 bg-gray-100 rounded-xl px-4 py-3"
                        placeholder="Cari barang atau SKU..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity
                        onPress={handleScanPress}
                        className="p-3 bg-indigo-600 rounded-xl shadow-md"
                    >
                        <Ionicons name="scan-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>

            </View>

            <View className="flex-1 flex-row">
                {/* List Produk */}
                <View className="flex-1 px-2 pt-2">
                    {loading && cart.length === 0 ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="#3B82F6" />
                            <Text className="mt-2 text-gray-500">Memuat produk...</Text>
                        </View>
                    ) : filteredProducts.length === 0 ? (
                        <View className="flex-1 justify-center items-center">
                            <Ionicons name="search" size={50} color="#D1D5DB" />
                            <Text className="mt-2 text-gray-500">Produk tidak ditemukan.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            keyExtractor={(item: any) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => addToCart(item)}
                                    className={`bg-white p-3 mb-2 rounded-xl border ${item.stock <= 0 ? 'border-red-300 opacity-60' : 'border-gray-200'} shadow-sm flex-row justify-between items-center`}
                                    disabled={item.stock <= 0}
                                >
                                    <View className="flex-1">
                                        <Text className="font-bold text-gray-800" numberOfLines={1}>{item.name}</Text>
                                        <Text className="text-xs text-gray-500">Stok: {item.stock} | SKU: {item.sku || '-'}</Text>
                                    </View>
                                    <Text className="text-blue-600 font-bold">Rp {item.price.toLocaleString('id-ID')}</Text>
                                    <Ionicons name="add-circle" size={28} color={item.stock <= 0 ? "gray" : "#2563EB"} style={{ marginLeft: 8 }} />
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </View>

            {/* Footer Keranjang */}
            <View className="bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                {cart.length === 0 ? (
                    <Text className="text-center text-gray-400 py-2">Keranjang Kosong</Text>
                ) : (
                    <View>
                        <ScrollView className="max-h-32 mb-3">
                            {cart.map((item) => (
                                <View key={item.id} className="flex-row justify-between items-center mb-2 border-b border-gray-100 pb-2">
                                    <Text className="flex-1 text-sm font-medium" numberOfLines={1}>{item.name}</Text>
                                    <View className="flex-row items-center gap-3">
                                        <TouchableOpacity onPress={() => updateQty(item.id, -1)}><Ionicons name="remove-circle-outline" size={22} color="gray" /></TouchableOpacity>
                                        <Text className="font-bold w-4 text-center">{item.qty}</Text>
                                        <TouchableOpacity onPress={() => updateQty(item.id, 1)}><Ionicons name="add-circle-outline" size={22} color="gray" /></TouchableOpacity>
                                    </View>
                                    <Text className="w-20 text-right text-sm font-bold">{(item.price * item.qty).toLocaleString('id-ID')}</Text>
                                    <TouchableOpacity onPress={() => removeFromCart(item.id)} className="ml-2"><Ionicons name="trash" size={18} color="red" /></TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-gray-500">Total Belanja</Text>
                            <Text className="text-2xl font-bold text-gray-900">Rp {totalBelanja.toLocaleString('id-ID')}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setModalBayarVisible(true)} className="bg-blue-600 py-4 rounded-xl items-center shadow-lg shadow-blue-200">
                            <Text className="text-white font-bold text-lg">keluarkan Sekarang</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* --- MODAL SCANNER BARCODE --- */}
            <Modal visible={modalScannerVisible} transparent animationType="slide">
                <View style={StyleSheet.absoluteFillObject}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr", "ean13", "code128", "code39"],
                        }}
                    >
                        <View className="flex-1 justify-between bg-black/50 p-6">
                            <Text className="text-white text-center text-xl font-bold mt-10">Pindai Barcode Produk</Text>

                            <View className="flex-1 items-center justify-center">
                                <View className="w-64 h-64 border-4 border-white opacity-70" />
                            </View>

                            <TouchableOpacity
                                onPress={() => { setModalScannerVisible(false); setScanned(false); }}
                                className="bg-red-600 py-4 rounded-xl items-center mb-6"
                            >
                                <Text className="text-white font-bold text-lg">Batal Pindai</Text>
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>
            </Modal>

            {/* --- MODAL PEMBAYARAN (Tambah input bayar dan kembalian) --- */}
            <Modal visible={modalBayarVisible} transparent animationType="slide">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <Text className="text-xl font-bold text-center mb-2">Konfirmasi Pembayaran</Text>
                        <View className="bg-gray-50 p-4 rounded-xl mb-4 items-center">
                            <Text className="text-gray-500 text-sm mb-1">Total Tagihan</Text>
                            <Text className="text-3xl font-bold text-blue-600">Rp {totalBelanja.toLocaleString('id-ID')}</Text>
                        </View>

                        {/* Input Jumlah Bayar */}
                        <View className="mb-4">
                            <Text className="text-sm text-gray-600 mb-2">Jumlah Bayar</Text>
                            <TextInput
                                value={amountPaidStr}
                                onChangeText={(text) => {
                                    // Hanya angka: hapus karakter non-digit, tapi tetap tampilkan sebagai string
                                    const cleaned = text.replace(/[^\d]/g, '');
                                    setAmountPaidStr(cleaned);
                                }}
                                placeholder="Masukkan jumlah bayar (mis. 20000)"
                                keyboardType="numeric"
                                className="bg-white border border-gray-200 rounded-xl px-4 py-3"
                            />
                            <Text className="text-xs text-gray-400 mt-2">Masukkan angka tanpa pemisah. Contoh: 20000</Text>
                        </View>

                        {/* Tampilkan Kembalian */}
                        <View className="mb-4 items-center">
                            <Text className="text-sm text-gray-500">Kembalian</Text>
                            <Text className={`text-2xl font-bold ${changeNumber < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                Rp {formatRupiah(changeNumber > 0 ? changeNumber : 0)}
                            </Text>
                            {changeNumber < 0 && <Text className="text-xs text-red-500 mt-1">Bayar kurang Rp {formatRupiah(Math.abs(changeNumber))}</Text>}
                        </View>

                        <TouchableOpacity onPress={handleCheckout} disabled={loading || amountPaidNumber < totalBelanja} className={`py-4 rounded-xl items-center mb-3 ${amountPaidNumber < totalBelanja ? 'bg-gray-300' : 'bg-green-600'}`}>
                            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">{amountPaidNumber < totalBelanja ? 'Bayar Kurang' : 'Proses Transaksi'}</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { if (!loading) { setModalBayarVisible(false); } }} disabled={loading} className="bg-gray-100 py-4 rounded-xl items-center">
                            <Text className="font-bold text-gray-700">Batal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL STRUK DIGITAL --- */}
            <Modal visible={modalStrukVisible} transparent animationType="fade">
                <View className="flex-1 bg-black/60 justify-center items-center px-4">
                    <View className="bg-white w-full max-w-sm rounded-none overflow-hidden shadow-2xl">
                        {/* Header Struk */}
                        <View className="bg-white p-6 items-center border-b border-dashed border-gray-300">
                            <View className="w-12 h-12 bg-gray-900 rounded-full items-center justify-center mb-3">
                                <MaterialCommunityIcons name="storefront" size={24} color="white" />
                            </View>
                            <Text className="text-xl font-bold text-gray-900 uppercase tracking-widest">kaStok Store</Text>
                            <Text className="text-xs text-gray-500 mt-1">Jl. Digital No. 1, Indonesia</Text>
                            <Text className="text-xs text-gray-500">Telp: 0812-3456-7890</Text>
                        </View>

                        {/* Detail Transaksi */}
                        <View className="p-6 bg-white">
                            <View className="flex-row justify-between mb-4">
                                <Text className="text-xs text-gray-500">No. Order</Text>
                                <Text className="text-xs font-bold text-gray-900">#{lastTrx?.id}</Text>
                            </View>
                            <View className="flex-row justify-between mb-6">
                                <Text className="text-xs text-gray-500">Waktu</Text>
                                <Text className="text-xs font-bold text-gray-900">{lastTrx?.date}</Text>
                            </View>

                            {/* Garis Pemisah */}
                            <View className="h-[1px] bg-gray-200 mb-4 w-full" style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: '#e5e7eb' }} />

                            {/* List Item */}
                            <ScrollView className="max-h-48">
                                {lastTrx?.items.map((item: any, index: number) => (
                                    <View key={index} className="flex-row justify-between mb-2">
                                        <View className="flex-1">
                                            <Text className="text-sm text-gray-800 font-medium">{item.name}</Text>
                                            <Text className="text-xs text-gray-500">{item.qty} x {item.price.toLocaleString('id-ID')}</Text>
                                        </View>
                                        <Text className="text-sm font-bold text-gray-900">
                                            {(item.qty * item.price).toLocaleString('id-ID')}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>

                            {/* Garis Pemisah */}
                            <View className="h-[1px] bg-gray-200 mt-4 mb-4 w-full" style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: '#e5e7eb' }} />

                            {/* Total */}
                            <View className="flex-row justify-between items-center">
                                <Text className="text-base font-bold text-gray-900">TOTAL</Text>
                                <Text className="text-xl font-bold text-gray-900">Rp {lastTrx?.total.toLocaleString('id-ID')}</Text>
                            </View>

                            {/* Bayar & Kembalian */}
                            <View className="mt-2">
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-gray-500">Bayar</Text>
                                    <Text className="text-sm font-bold text-gray-900">Rp {lastTrx?.paid?.toLocaleString('id-ID') ?? '0'}</Text>
                                </View>
                                <View className="flex-row justify-between mt-1">
                                    <Text className="text-sm text-gray-500">Kembalian</Text>
                                    <Text className="text-sm font-bold text-gray-900">Rp {lastTrx?.change?.toLocaleString('id-ID') ?? '0'}</Text>
                                </View>
                            </View>

                            <Text className="text-center text-[10px] text-gray-400 mt-6">--- TERIMA KASIH ---</Text>
                        </View>

                        {/* Tombol Aksi Struk (Diubah) */}
                        <View className="bg-gray-50 p-4 flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => {
                                    setModalStrukVisible(false);
                                    router.replace("/(tabs)");
                                }}
                                className="flex-1 bg-white border border-gray-300 py-3 rounded-xl items-center"
                            >
                                <Text className="font-bold text-gray-700">Tutup</Text>
                            </TouchableOpacity>

                            {/* Tombol CETAK */}
                            <TouchableOpacity
                                onPress={() => print('print')}
                                disabled={loading}
                                className="flex-1 bg-blue-600 py-3 rounded-xl items-center flex-row justify-center gap-2"
                            >
                                {loading ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="print-outline" size={18} color="white" />}
                                <Text className="font-bold text-white">Cetak</Text>
                            </TouchableOpacity>

                            {/* Tombol JADIKAN PDF (BARU) */}
                            <TouchableOpacity
                                onPress={() => print('pdf')}
                                disabled={loading}
                                className="flex-1 bg-purple-600 py-3 rounded-xl items-center flex-row justify-center gap-2"
                            >
                                {loading ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="document-text-outline" size={18} color="white" />}
                                <Text className="font-bold text-white">PDF</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Efek Kertas Sobek di Bawah */}
                        <View className="h-4 bg-gray-50 w-full flex-row">
                            {[...Array(20)].map((_, i) => (
                                <View key={i} className="w-4 h-4 bg-white rounded-full -mt-2 mr-1" />
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    absoluteFillObject: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
});
