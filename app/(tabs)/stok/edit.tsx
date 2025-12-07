import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase"; 
import "../../../global.css";

export default function EditProdukScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("Pcs");
  const [category, setCategory] = useState("Makanan");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState(""); 

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) {
        Alert.alert("Error", "Gagal memuat data produk");
        router.back();
        return;
      }
      
      setName(data.name);
      setSku(data.sku || "");
      setBarcode(data.barcode || "");
      setPrice(data.price?.toString() || "0");
      setUnit(data.unit || "Pcs");
      setCategory(data.category || "Lain-lain");
      setDescription(data.description || "");
      setStock(data.stock?.toString() || "0");
      setLoading(false);
    }
    loadProduct();
  }, [id]);

  async function handleUpdate() {
    if (!name) return Alert.alert("Error", "Nama barang wajib diisi!");
    setSaving(true);

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name,
          sku: sku || null,
          // Barcode dan Stock tidak diupdate karena disable
          unit,
          price: parseInt(price) || 0,
          category,
          description
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert("Sukses", "Data produk berhasil diperbarui!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Gagal", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View className="flex-1 justify-center items-center"><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="pt-14 pb-4 px-5 border-b border-gray-100 flex-row items-center bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Edit Produk</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Nama Barang */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Nama Barang</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base" value={name} onChangeText={setName} />
        </View>

        {/* Kategori */}
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

        {/* SKU & Barcode */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">SKU</Text>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base" value={sku} onChangeText={setSku} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Barcode</Text>
            {/* DISABLED / LOCKED */}
            <TextInput 
              className="border border-gray-200 bg-gray-100 rounded-xl px-4 py-3 text-gray-400 text-base" 
              value={barcode} 
              editable={false} // Kunci input
              placeholder="Tidak dapat diubah"
            />
          </View>
        </View>

        {/* Harga & Satuan */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Harga</Text>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base" value={price} onChangeText={setPrice} keyboardType="numeric" />
          </View>
          <View className="w-1/3">
            <Text className="text-sm font-medium text-gray-700 mb-2">Satuan</Text>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base" value={unit} onChangeText={setUnit} />
          </View>
        </View>

        {/* Stok - READ ONLY */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Stok Saat Ini</Text>
          <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex-row justify-between items-center">
             <Text className="text-gray-500 font-bold text-lg">{stock}</Text>
             <Text className="text-xs text-gray-400 italic">Tidak dapat diedit disini</Text>
          </View>
          <Text className="text-[11px] text-gray-400 mt-1 ml-1">
            *Gunakan menu "Input Barang Masuk" untuk menambah stok.
          </Text>
        </View>

        {/* Deskripsi */}
        <View className="mb-8">
          <Text className="text-sm font-medium text-gray-700 mb-2">Deskripsi</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white h-24 text-base" multiline textAlignVertical="top" value={description} onChangeText={setDescription} />
        </View>

        <TouchableOpacity onPress={handleUpdate} disabled={saving} className={`rounded-xl py-4 items-center shadow-sm ${saving ? 'bg-gray-400' : 'bg-blue-600'}`}>
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan Perubahan</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}