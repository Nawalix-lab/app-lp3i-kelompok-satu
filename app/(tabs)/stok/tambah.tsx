import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Vibration, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from "../../../lib/supabase"; 
import "../../../global.css";

export default function TambahProdukScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Kamera
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");     // Harga Jual
  const [buyPrice, setBuyPrice] = useState(""); // Harga Beli (Baru)
  const [unit, setUnit] = useState("Pcs");
  const [category, setCategory] = useState("Makanan");
  const [description, setDescription] = useState("");
  const [initialStock, setInitialStock] = useState("");

  const handleScanPress = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return alert("Izin kamera diperlukan.");
    }
    setScanned(false);
    setIsScanning(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setBarcode(data);
    setIsScanning(false);
    Vibration.vibrate();
  };

  async function handleSave() {
    if (!name) return alert("Nama barang wajib diisi!");
    setLoading(true);

    try {
      if (sku) {
        const { data: existing } = await supabase.from('products').select('id').eq('sku', sku).single();
        if (existing) {
            alert("SKU sudah digunakan.");
            setLoading(false);
            return;
        }
      }

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert({
          name,
          sku: sku || null,
          barcode: barcode || null,
          unit,
          buy_price: parseInt(buyPrice) || 0, // Simpan Harga Beli
          price: parseInt(price) || 0,        // Simpan Harga Jual
          stock: parseInt(initialStock) || 0,
          category,
          description
        })
        .select()
        .single();

      if (error) throw error;

      if (parseInt(initialStock) > 0 && newProduct) {
        await supabase.from('stock_movements').insert({
          product_id: newProduct.id,
          type: 'IN',
          quantity: parseInt(initialStock),
          notes: 'Stok Awal',
        });
      }

      setLoading(false);
      setShowSuccess(true);
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <View className="pt-14 pb-4 px-5 border-b border-gray-100 flex-row items-center bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4"><Ionicons name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Tambah Produk Baru</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Nama Barang <Text className="text-red-500">*</Text></Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white" placeholder="Contoh: Qtela BBQ" value={name} onChangeText={setName} />
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

        {/* HARGA BELI & JUAL */}
        <View className="flex-row gap-4 mb-2">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Harga Beli (Modal)</Text>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white" placeholder="0" value={buyPrice} onChangeText={setBuyPrice} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Harga Jual</Text>
            <TextInput className="border border-blue-300 bg-blue-50 rounded-xl px-4 py-3 text-blue-900 font-bold" placeholder="0" value={price} onChangeText={setPrice} keyboardType="numeric" />
          </View>
        </View>
        
        {/* Estimasi Profit */}
        <View className="mb-4 flex-row justify-between items-center bg-green-50 px-4 py-2 rounded-lg border border-green-100">
            <Text className="text-green-700 text-xs font-medium">Estimasi Profit:</Text>
            <Text className="text-green-700 font-bold">Rp {((parseInt(price) || 0) - (parseInt(buyPrice) || 0)).toLocaleString()}</Text>
        </View>

        <View className="flex-row gap-4 mb-4">
           <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Barcode</Text>
            <View className="flex-row gap-2">
                <TextInput className="flex-1 border border-gray-300 rounded-xl px-4 py-3 bg-white" value={barcode} onChangeText={setBarcode} keyboardType="numeric" placeholder="Scan/Ketik" />
                <TouchableOpacity onPress={handleScanPress} className="bg-blue-50 border border-blue-200 w-12 rounded-xl items-center justify-center">
                    <Ionicons name="scan-outline" size={22} color="#2563EB" />
                </TouchableOpacity>
            </View>
          </View>
          <View className="w-1/3">
             <Text className="text-sm font-medium text-gray-700 mb-2">Satuan</Text>
             <TextInput className="border border-gray-300 rounded-xl px-4 py-3 bg-white" value={unit} onChangeText={setUnit} placeholder="Pcs" />
          </View>
        </View>

        <View className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <Text className="text-sm font-bold text-gray-700 mb-1">Stok Awal</Text>
          <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 font-bold" placeholder="0" value={initialStock} onChangeText={setInitialStock} keyboardType="numeric" />
        </View>

        <TouchableOpacity onPress={handleSave} disabled={loading} className={`rounded-xl py-4 items-center shadow-sm ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}>
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan Produk</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* KAMERA & SUCCESS MODAL SAMA SEPERTI SEBELUMNYA, DIPERSINGKAT AGAR MUAT */}
      <Modal visible={isScanning} animationType="slide" presentationStyle="fullScreen">
        <View className="flex-1 bg-black">
            <CameraView style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "code128"] }}>
                <View className="flex-1 bg-black/40 justify-center items-center"><View className="w-64 h-64 border-2 border-white/60 rounded-3xl" /></View>
                <TouchableOpacity onPress={() => setIsScanning(false)} className="absolute top-12 left-5 bg-white/20 p-2 rounded-full"><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
            </CameraView>
        </View>
      </Modal>
      <Modal visible={showSuccess} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4"><Ionicons name="checkmark" size={32} color="#2563EB" /></View>
            <Text className="text-xl font-bold text-center mb-6">Produk Tersimpan!</Text>
            <TouchableOpacity onPress={() => { setShowSuccess(false); router.replace("/(tabs)/stok"); }} className="bg-blue-600 w-full py-3 rounded-xl"><Text className="text-white text-center font-bold">Kembali ke Stok</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}