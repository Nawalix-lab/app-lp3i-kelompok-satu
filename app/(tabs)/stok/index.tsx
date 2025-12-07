import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, RefreshControl, Modal, ScrollView, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase"; 
import "../../../global.css";

export default function StokScreen() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("Semua");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const fetchProducts = async () => {
    try {
      let query = supabase.from('products').select('*').order('name', { ascending: true });
      if (searchQuery) query = query.ilike('name', `%${searchQuery}%`);
      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProducts(); }, [searchQuery]));

  const filteredProducts = products.filter(item => {
    if (filterCategory === "Semua") return true;
    return item.category === filterCategory;
  });

  // --- PERBAIKAN LOGIKA DELETE ---
  const handleDelete = (item) => {
    Alert.alert(
      "Hapus Produk",
      `Yakin ingin menghapus "${item.name}"? Semua riwayat stok produk ini juga akan terhapus.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Hapus dulu riwayat stok-nya (agar tidak error Foreign Key)
              await supabase.from('stock_movements').delete().eq('product_id', item.id);

              // 2. Baru hapus produknya
              const { error } = await supabase.from('products').delete().eq('id', item.id);
              
              if (error) throw error;
              
              // Refresh
              fetchProducts();
              Alert.alert("Sukses", "Produk berhasil dihapus.");
            } catch (error: any) {
              Alert.alert("Gagal", "Gagal menghapus: " + error.message);
            }
          }
        }
      ]
    );
  };

  const handleEdit = (item) => {
    router.push({ pathname: "/(tabs)/stok/edit", params: { id: item.id } });
  };

  const getCategoryColor = (cat) => {
    if (cat === 'Makanan') return { bg: 'bg-orange-100', text: 'text-orange-700' };
    if (cat === 'Minuman') return { bg: 'bg-blue-100', text: 'text-blue-700' };
    if (cat === 'Snack') return { bg: 'bg-pink-100', text: 'text-pink-700' };
    return { bg: 'bg-purple-100', text: 'text-purple-700' };
  };

  const renderItem = ({ item }) => {
    const colors = getCategoryColor(item.category);
    return (
      <TouchableOpacity 
        onPress={() => { setSelectedItem(item); setDetailModalVisible(true); }}
        className="bg-white p-4 mb-3 rounded-2xl border border-gray-200 shadow-sm flex-row items-center justify-between"
      >
        <View className="flex-1 mr-4">
          <Text className="text-gray-900 font-bold text-base mb-1" numberOfLines={1}>{item.name}</Text>
          <View className="flex-row items-center gap-2">
             <View className={`px-2 py-0.5 rounded ${colors.bg}`}>
                <Text className={`text-[10px] ${colors.text} font-medium`}>{item.category || 'Lain-lain'}</Text>
              </View>
              <Text className="text-xs text-gray-500">
                Stok: <Text className={`font-bold ${item.stock <= 5 ? 'text-red-500' : 'text-blue-600'}`}>{item.stock} {item.unit}</Text>
              </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => handleEdit(item)} className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl items-center justify-center active:bg-blue-100">
            <Ionicons name="pencil" size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} className="w-9 h-9 bg-red-50 border border-red-100 rounded-xl items-center justify-center active:bg-red-100">
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <View className="bg-white pt-14 pb-2 px-5 border-b border-gray-200 shadow-sm z-10">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} className="mr-3 p-1">
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View>
              <Text className="text-2xl font-bold text-gray-900">Stok Barang</Text>
              <Text className="text-gray-500 text-xs">Kelola data & inventaris</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/stok/tambah")} className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center border border-blue-100">
            <Ionicons name="add" size={26} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput className="flex-1 ml-3 text-base text-gray-900" placeholder="Cari nama barang..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {["Semua", "Makanan", "Minuman", "Snack", "Lain-lain"].map((cat) => (
            <TouchableOpacity key={cat} onPress={() => setFilterCategory(cat)} className={`px-4 py-2 rounded-full border mr-2 ${filterCategory === cat ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}>
              <Text className={`text-xs font-medium ${filterCategory === cat ? 'text-white' : 'text-gray-600'}`}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View className="px-5 mt-4 mb-2">
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/(tabs)/stok/masuk")} className="bg-blue-600 rounded-xl p-4 flex-row items-center shadow-lg shadow-blue-200">
          <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-4">
            <MaterialCommunityIcons name="dolly" size={24} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">Input Barang Masuk</Text>
            <Text className="text-blue-100 text-xs">Scan barcode / cari manual</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProducts} />}
        ListEmptyComponent={!loading && <View className="mt-10 items-center"><Text className="text-gray-400">Data kosong</Text></View>}
      />

      {/* DETAIL MODAL (Updated dengan Profit) */}
      <Modal visible={detailModalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6 h-[70%]">
             <View className="items-center mb-4"><View className="w-16 h-1 bg-gray-300 rounded-full" /></View>
             {selectedItem && (
               <ScrollView showsVerticalScrollIndicator={false}>
                 <Text className="text-2xl font-bold text-center mb-2">{selectedItem.name}</Text>
                 <View className="flex-row justify-center mb-6">
                    <View className={`px-3 py-1 rounded-full ${getCategoryColor(selectedItem.category).bg}`}>
                      <Text className={getCategoryColor(selectedItem.category).text}>{selectedItem.category}</Text>
                    </View>
                 </View>

                 {/* INFO HARGA & PROFIT */}
                 <View className="flex-row flex-wrap gap-3 mb-6">
                    <View className="w-[48%] bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <Text className="text-gray-500 text-xs">Harga Beli (Modal)</Text>
                      <Text className="text-base font-semibold text-gray-700">Rp {selectedItem.buy_price ? selectedItem.buy_price.toLocaleString() : '0'}</Text>
                    </View>
                    <View className="w-[48%] bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <Text className="text-blue-600 text-xs font-bold">Harga Jual</Text>
                      <Text className="text-xl font-bold text-blue-700">Rp {selectedItem.price ? selectedItem.price.toLocaleString() : '0'}</Text>
                    </View>
                    <View className="w-full bg-green-50 p-3 rounded-xl border border-green-200 flex-row justify-between items-center">
                      <View>
                          <Text className="text-green-700 text-xs font-bold">Profit per Unit</Text>
                          <Text className="text-[10px] text-green-600">Selisih Jual - Beli</Text>
                      </View>
                      <Text className="text-xl font-bold text-green-700">
                        Rp {((selectedItem.price || 0) - (selectedItem.buy_price || 0)).toLocaleString()}
                      </Text>
                    </View>
                 </View>

                 <View className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 flex-row justify-between items-center">
                   <Text className="text-gray-500 font-medium">Stok Saat Ini</Text>
                   <Text className="text-xl font-bold">{selectedItem.stock} {selectedItem.unit}</Text>
                 </View>

                 <Text className="font-bold mb-1">Deskripsi:</Text>
                 <Text className="text-gray-600 leading-5">{selectedItem.description || 'Tidak ada deskripsi.'}</Text>
               </ScrollView>
             )}
             <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="bg-gray-200 mt-4 py-3 rounded-xl items-center"><Text className="font-bold text-gray-700">Tutup</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}