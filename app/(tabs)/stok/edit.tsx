import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase"; 
import "../../../global.css";

export default function EditProdukScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");       // Jual
  const [buyPrice, setBuyPrice] = useState(""); // Beli
  const [unit, setUnit] = useState("Pcs");
  const [category, setCategory] = useState("Makanan");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState(""); 

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) { Alert.alert("Error", "Gagal load data"); router.back(); return; }
      
      setName(data.name);
      setSku(data.sku || "");
      setBarcode(data.barcode || "");
      setPrice(data.price?.toString() || "0");
      setBuyPrice(data.buy_price?.toString() || "0"); // Load Beli
      setUnit(data.unit || "Pcs");
      setCategory(data.category || "Lain-lain");
      setDescription(data.description || "");
      setStock(data.stock?.toString() || "0");
      setLoading(false);
    }
    loadProduct();
  }, [id]);

  async function handleUpdate() {
    if (!name) return Alert.alert("Error", "Nama wajib diisi!");
    setSaving(true);
    try {
      const { error } = await supabase.from('products').update({
          name, sku: sku || null, 
          unit, category, description,
          price: parseInt(price) || 0,
          buy_price: parseInt(buyPrice) || 0, // Update Beli
        }).eq('id', id);

      if (error) throw error;
      Alert.alert("Sukses", "Data diperbarui!", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert("Gagal", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View className="flex-1 justify-center items-center"><ActivityIndicator size="large" color="#2563EB" /></View>;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <View className="pt-14 pb-4 px-5 border-b border-gray-100 flex-row items-center bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4"><Ionicons name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Edit Produk</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Nama Barang</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white" value={name} onChangeText={setName} />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Kategori</Text>
          <View className="flex-row gap-2">
            {["Makanan", "Minuman", "Snack", "Lain-lain"].map((cat) => (
              <TouchableOpacity key={cat} onPress={() => setCategory(cat)} className={`flex-1 py-3 rounded-xl border items-center ${category === cat ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                <Text className={`font-semibold text-[10px] ${category === cat ? 'text-white' : 'text-gray-600'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* HARGA EDIT */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Harga Beli</Text>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white" value={buyPrice} onChangeText={setBuyPrice} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Harga Jual</Text>
            <TextInput className="border border-blue-300 bg-blue-50 rounded-xl px-4 py-3 text-blue-900 font-bold" value={price} onChangeText={setPrice} keyboardType="numeric" />
          </View>
        </View>

        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Barcode (Terkunci)</Text>
            <TextInput className="border border-gray-200 bg-gray-100 rounded-xl px-4 py-3 text-gray-400" value={barcode} editable={false} />
          </View>
          <View className="w-1/3">
            <Text className="text-sm font-medium text-gray-700 mb-2">Satuan</Text>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white" value={unit} onChangeText={setUnit} />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Stok Saat Ini</Text>
          <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex-row justify-between items-center">
             <Text className="text-gray-500 font-bold text-lg">{stock}</Text>
             <Text className="text-xs text-gray-400 italic">Read-only</Text>
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-sm font-medium text-gray-700 mb-2">Deskripsi</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white h-24" multiline textAlignVertical="top" value={description} onChangeText={setDescription} />
        </View>

        <TouchableOpacity onPress={handleUpdate} disabled={saving} className={`rounded-xl py-4 items-center shadow-sm ${saving ? 'bg-gray-400' : 'bg-blue-600'}`}>
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan Perubahan</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}