import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, ScrollView, Modal, Vibration, ActivityIndicator, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import "../../../global.css";

export default function KasirScreen() {
  const router = useRouter();
  
  // Data
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [modalBayarVisible, setModalBayarVisible] = useState(false);
  const [modalStrukVisible, setModalStrukVisible] = useState(false); // Modal Struk Baru
  const [lastTrx, setLastTrx] = useState<any>(null); // Data Transaksi Terakhir

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').gt('stock', 0).order('name');
    if (data) setProducts(data);
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
       if (existing.qty >= product.stock) return Alert.alert("Stok Habis", "Stok tidak mencukupi.");
       setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
       setCart([...cart, { ...product, qty: 1 }]);
    }
    Vibration.vibrate(50);
  };

  const removeFromCart = (productId: number) => setCart(cart.filter(item => item.id !== productId));

  const updateQty = (productId: number, delta: number) => {
      setCart(prevCart => prevCart.map(item => {
          if (item.id === productId) {
              const newQty = item.qty + delta;
              if (newQty > item.stock) return item;
              if (newQty < 1) return item;
              return { ...item, qty: newQty };
          }
          return item;
      }));
  };

  const totalBelanja = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    setLoading(true);
    try {
        let totalProfit = 0;
        cart.forEach(item => {
            const profitPerItem = (item.price - (item.buy_price || 0));
            totalProfit += (profitPerItem * item.qty);
        });

        // 1. Simpan Transaksi
        const { data: trx, error: trxError } = await supabase
            .from('transactions')
            .insert({ total_amount: totalBelanja, total_profit: totalProfit })
            .select()
            .single();
        if (trxError) throw trxError;

        // 2. Simpan Detail & Kurangi Stok
        for (const item of cart) {
            await supabase.from('transaction_items').insert({
                transaction_id: trx.id, product_id: item.id, quantity: item.qty,
                price_at_sale: item.price, buy_price_at_sale: item.buy_price || 0
            });
            await supabase.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
            await supabase.from('stock_movements').insert({ product_id: item.id, type: 'OUT', quantity: item.qty, notes: `Penjualan #${trx.id}` });
        }

        // 3. Set Data Struk & Tampilkan Modal
        setLastTrx({
            id: trx.id,
            date: new Date().toLocaleString('id-ID'),
            items: cart,
            total: totalBelanja
        });

        setLoading(false);
        setModalBayarVisible(false);
        setCart([]); 
        setModalStrukVisible(true); // TAMPILKAN STRUK

    } catch (error: any) {
        setLoading(false);
        Alert.alert("Gagal", error.message);
    }
  };

  const filteredProducts = products.filter((p:any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

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
        <TextInput className="bg-gray-100 rounded-xl px-4 py-3" placeholder="Cari barang..." value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <View className="flex-1 flex-row">
        {/* List Produk */}
        <View className="flex-1 px-2 pt-2">
            <FlatList 
                data={filteredProducts}
                keyExtractor={(item:any) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => addToCart(item)} className="bg-white p-3 mb-2 rounded-xl border border-gray-200 shadow-sm flex-row justify-between items-center">
                        <View className="flex-1">
                            <Text className="font-bold text-gray-800" numberOfLines={1}>{item.name}</Text>
                            <Text className="text-xs text-gray-500">Stok: {item.stock}</Text>
                        </View>
                        <Text className="text-blue-600 font-bold">Rp {item.price.toLocaleString()}</Text>
                        <Ionicons name="add-circle" size={28} color="#2563EB" style={{marginLeft: 8}} />
                    </TouchableOpacity>
                )}
            />
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
                            <Text className="w-20 text-right text-sm font-bold">{(item.price * item.qty).toLocaleString()}</Text>
                            <TouchableOpacity onPress={() => removeFromCart(item.id)} className="ml-2"><Ionicons name="trash" size={18} color="red" /></TouchableOpacity>
                        </View>
                    ))}
                 </ScrollView>
                 <View className="flex-row justify-between items-center mb-3">
                     <Text className="text-gray-500">Total Belanja</Text>
                     <Text className="text-2xl font-bold text-gray-900">Rp {totalBelanja.toLocaleString()}</Text>
                 </View>
                 <TouchableOpacity onPress={() => setModalBayarVisible(true)} className="bg-blue-600 py-4 rounded-xl items-center shadow-lg shadow-blue-200">
                     <Text className="text-white font-bold text-lg">Bayar Sekarang</Text>
                 </TouchableOpacity>
             </View>
         )}
      </View>

      {/* --- MODAL PEMBAYARAN --- */}
      <Modal visible={modalBayarVisible} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-white rounded-t-3xl p-6">
                  <Text className="text-xl font-bold text-center mb-2">Konfirmasi Pembayaran</Text>
                  <View className="bg-gray-50 p-4 rounded-xl mb-6 items-center">
                      <Text className="text-gray-500 text-sm mb-1">Total Tagihan</Text>
                      <Text className="text-3xl font-bold text-blue-600">Rp {totalBelanja.toLocaleString()}</Text>
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

      {/* --- MODAL STRUK DIGITAL (DESAIN BARU) --- */}
      <Modal visible={modalStrukVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
            <View className="bg-white w-full max-w-sm rounded-none overflow-hidden shadow-2xl">
                {/* Header Struk (Efek Kertas Thermal) */}
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
                                    <Text className="text-xs text-gray-500">{item.qty} x {item.price.toLocaleString()}</Text>
                                </View>
                                <Text className="text-sm font-bold text-gray-900">
                                    {(item.qty * item.price).toLocaleString()}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Garis Pemisah */}
                    <View className="h-[1px] bg-gray-200 mt-4 mb-4 w-full" style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: '#e5e7eb' }} />

                    {/* Total */}
                    <View className="flex-row justify-between items-center">
                        <Text className="text-base font-bold text-gray-900">TOTAL</Text>
                        <Text className="text-xl font-bold text-gray-900">Rp {lastTrx?.total.toLocaleString()}</Text>
                    </View>
                     <Text className="text-center text-[10px] text-gray-400 mt-6">--- TERIMA KASIH ---</Text>
                </View>

                {/* Tombol Aksi Struk */}
                <View className="bg-gray-50 p-4 flex-row gap-3">
                    <TouchableOpacity 
                        onPress={() => {
                            setModalStrukVisible(false);
                            router.replace("/(tabs)"); // Balik ke Dashboard
                        }} 
                        className="flex-1 bg-white border border-gray-300 py-3 rounded-xl items-center"
                    >
                        <Text className="font-bold text-gray-700">Tutup</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => {
                            // Disini bisa tambah logika print thermal / share PDF
                            Alert.alert("Print", "Sedang mencetak struk...");
                        }} 
                        className="flex-1 bg-blue-600 py-3 rounded-xl items-center flex-row justify-center gap-2"
                    >
                        <Ionicons name="print-outline" size={18} color="white" />
                        <Text className="font-bold text-white">Cetak</Text>
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