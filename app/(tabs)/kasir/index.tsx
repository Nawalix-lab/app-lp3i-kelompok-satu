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
import * as Print from 'expo-print'; // <-- BARU: Untuk Cetak & PDF
import * as Sharing from 'expo-sharing'; // <-- BARU: Untuk Berbagi PDF
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

    // Modals
    const [modalBayarVisible, setModalBayarVisible] = useState(false);
    const [modalStrukVisible, setModalStrukVisible] = useState(false);
    const [modalScannerVisible, setModalScannerVisible] = useState(false); 
    const [lastTrx, setLastTrx] = useState<any>(null);

    // State Scanner
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);


    useEffect(() => { fetchProducts(); }, []);

    const fetchProducts = async () => {
        setLoading(true);
        // Tambahkan buy_price di sini agar dapat menghitung profit
        const { data, error } = await supabase.from('products').select('*, purchase_price:buy_price').order('name');
        if (error) {
            Alert.alert("Error", error.message);
        } else if (data) {
             // Filter stok > 0 hanya untuk tampilan produk di list,
             // tapi ambil semua data untuk logic lain jika perlu.
            setProducts(data as Product[]);
        }
        setLoading(false);
    };

    // --- FUNGSI KERANJANG UTAMA ---

    const addToCart = (product: Product, quantity: number = 1) => {
        const existing = cart.find(item => item.id === product.id);
        
        // Cek apakah produk memiliki stock yang valid
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
                if (!product) return item; // Safety check
                
                const newQty = item.qty + delta;
                
                if (newQty > product.stock) {
                    Alert.alert("Stok Tidak Cukup", `Stok ${item.name} hanya tersedia ${product.stock}.`);
                    return item; 
                }
                if (newQty < 1) {
                    // Hapus item jika kuantitas kurang dari 1 (tekan tombol minus saat qty=1)
                    removeFromCart(item.id);
                    return item;
                }
                
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const totalBelanja = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
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
        setScanned(true); // Mencegah scan berulang
        setModalScannerVisible(false); // Tutup kamera
        Vibration.vibrate(); // Efek getar
        
        // 1. Cari Produk berdasarkan Barcode
        const productFound = products.find(p => p.barcode === data || p.sku === data); // Cari berdasarkan barcode atau SKU

        if (productFound && productFound.stock > 0) {
            // 2. Tambahkan ke Keranjang
            addToCart(productFound);
        } else {
            Alert.alert("Produk Tidak Ditemukan", `Barcode/SKU ${data} tidak terdaftar atau stoknya habis.`);
        }
        
        // Reset scanned state sebentar setelah modal ditutup agar bisa scan lagi nanti
        setTimeout(() => setScanned(false), 1000); 
    };

    // --- FUNGSI PRINT / EXPORT PDF BARU ---

    const htmlContent = (trxData: any) => `
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
                /* Gaya Struk Mirip Kertas Thermal */
                body { 
                    font-family: 'monospace', 'Courier New', monospace; 
                    padding: 15px; 
                    margin: 0; 
                    font-size: 10px;
                    line-height: 1.4;
                    color: #000;
                    width: 250px; /* Lebar struk */
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
                <div style="font-size: 9px; color: #555; display: none;">
                    &nbsp;&nbsp;&nbsp;&nbsp;@ ${item.price.toLocaleString('id-ID')}
                </div>
            `).join('')}

            <div class="divider"></div>
            
            <div class="item-row total-row">
                <span>TOTAL</span>
                <span class="item-subtotal">Rp ${trxData.total.toLocaleString('id-ID')}</span>
            </div>

            <div class="divider" style="margin-top: 15px;"></div>
            <p class="center" style="font-size: 10px;">--- TERIMA KASIH ---</p>
        </body>
        </html>
    `;

    const print = async (action: 'print' | 'pdf') => {
        if (!lastTrx) return;
        setLoading(true);

        const html = htmlContent(lastTrx);

        try {
            if (action === 'print') {
                // Mencetak langsung
                await Print.printAsync({ html });
                Alert.alert("Cetak", "Instruksi cetak telah dikirim.");
            } else if (action === 'pdf') {
                // Membuat PDF
                const { uri } = await Print.printToFileAsync({ html, base64: false });

                if (uri) {
                    if (await Sharing.isAvailableAsync()) {
                        // Untuk Mobile: Membuka dialog berbagi
                        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: 'Bagikan Struk Transaksi' });
                    } else {
                        // Untuk Web: Biasanya akan memicu download otomatis
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
            
            let totalProfit = 0;
            const itemMovements = []; 

            // Gunakan Promise.all untuk memastikan semua produk ditemukan
            const productsInCart = cart.map(item => products.find(p => p.id === item.id));

            for (const item of cart) {
                const product = productsInCart.find(p => p?.id === item.id);
                
                if (!product) throw new Error(`Produk dengan ID ${item.id} tidak ditemukan.`);
                
                // Pastikan stok tidak negatif
                if (item.qty > item.stock) throw new Error(`Stok ${item.name} tidak mencukupi.`);
                
                const buyPrice = item.purchase_price ?? 0;
                const profitPerItem = (item.price - buyPrice);
                totalProfit += (profitPerItem * item.qty);

                // Data untuk Stock Movement
                itemMovements.push({ 
                    product_id: item.id, 
                    type: 'OUT', 
                    quantity: item.qty, 
                    notes: `Penjualan` 
                });
            }

            // 1. Simpan Transaksi
            const { data: trx, error: trxError } = await supabase
                .from('transactions')
                .insert({ total_amount: totalBelanja, total_profit: totalProfit })
                .select()
                .single();
            if (trxError) throw trxError;

            // Update notes dengan ID Transaksi yang baru dibuat
            const finalMovements = itemMovements.map(mov => ({
                ...mov,
                notes: `${mov.notes} #${trx.id}`
            }));

            // 2. Simpan Detail, Kurangi Stok, dan Catat Movement (Batch)
            const transactionItemsData = cart.map(item => ({
                transaction_id: trx.id, 
                product_id: item.id, 
                quantity: item.qty,
                price_at_sale: item.price, 
                // Pastikan purchase_price yang disimpan
                buy_price_at_sale: item.purchase_price ?? 0
            }));
            
            // a. Simpan Transaction Items
            const { error: itemError } = await supabase.from('transaction_items').insert(transactionItemsData);
            if (itemError) throw itemError;

            // b. Update Stok dan Catat Movement (Looping)
            const updateStockPromises = cart.map(item => 
                 supabase.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id)
            );
            await Promise.all(updateStockPromises);

            // c. Simpan Stock Movements
            const { error: movementError } = await supabase.from('stock_movements').insert(finalMovements);
            if (movementError) throw movementError;

            // 3. Set Data Struk & Tampilkan Modal
            setLastTrx({
                id: trx.id,
                date: new Date().toLocaleString('id-ID'),
                items: cart,
                total: totalBelanja
            });

            // Refresh data produk setelah transaksi berhasil
            await fetchProducts(); 

            setLoading(false);
            setModalBayarVisible(false);
            setCart([]); 
            setModalStrukVisible(true);

        } catch (error: any) {
            setLoading(false);
            Alert.alert("Gagal Transaksi", error.message);
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
                            keyExtractor={(item:any) => item.id.toString()}
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
                                    <Ionicons name="add-circle" size={28} color={item.stock <= 0 ? "gray" : "#2563EB"} style={{marginLeft: 8}} />
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
                            
                            {/* Area fokus visual */}
                            <View className="flex-1 items-center justify-center">
                                <View className="w-64 h-64 border-4 border-white opacity-70" />
                            </View>

                            <TouchableOpacity 
                                onPress={() => {setModalScannerVisible(false); setScanned(false);}} 
                                className="bg-red-600 py-4 rounded-xl items-center mb-6"
                            >
                                <Text className="text-white font-bold text-lg">Batal Pindai</Text>
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>
            </Modal>


            {/* --- MODAL PEMBAYARAN --- */}
            <Modal visible={modalBayarVisible} transparent animationType="slide">
                 <View className="flex-1 bg-black/50 justify-end">
                      <View className="bg-white rounded-t-3xl p-6">
                          <Text className="text-xl font-bold text-center mb-2">Konfirmasi Pembayaran</Text>
                          <View className="bg-gray-50 p-4 rounded-xl mb-6 items-center">
                              <Text className="text-gray-500 text-sm mb-1">Total Tagihan</Text>
                              <Text className="text-3xl font-bold text-blue-600">Rp {totalBelanja.toLocaleString('id-ID')}</Text>
                          </View>
                          <TouchableOpacity onPress={handleCheckout} disabled={loading} className="bg-green-600 py-4 rounded-xl items-center mb-3">
                              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Proses Transaksi</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setModalBayarVisible(false)} disabled={loading} className="bg-gray-100 py-4 rounded-xl items-center">
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