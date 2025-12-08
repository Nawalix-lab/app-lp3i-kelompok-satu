import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Vibration, StyleSheet, Button } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from 'expo-camera'; // Import Kamera
import { supabase } from "../../../lib/supabase"; 
import "../../../global.css";

export default function TambahProdukScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  // --- KAMERA STATE ---
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("Pcs");
  const [category, setCategory] = useState("Makanan");
  const [description, setDescription] = useState("");
  const [initialStock, setInitialStock] = useState("");


  useEffect(() => {
  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  getUser();
}, []);


  // --- FUNGSI SCAN BARCODE ---
  const handleScanPress = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        alert("Izin kamera diperlukan untuk scan barcode.");
        return;
      }
    }
    setScanned(false);
    setIsScanning(true);
  };

  const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
    setScanned(true);
    setBarcode(data); // Isi otomatis ke input barcode
    setIsScanning(false); // Tutup kamera
    Vibration.vibrate(); // Efek getar biar mantap
    // alert(`Barcode tipe ${type} dan data ${data} berhasil discan!`); // Opsional
  };

  async function handleSave() {
    if (!name) return alert("Nama barang wajib diisi!");
    
    setLoading(true);

    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      throw new Error("User belum login atau gagal mengambil data user!");
    }

      if (sku) {
        const { data: existing } = await supabase.from('products').select('id').eq('sku', sku).single();
        if (existing) {
          alert("Kode Barang (SKU) sudah digunakan.");
          setLoading(false);
          return;
        }
      }

      const stockVal = parseInt(initialStock) || 0;
      const priceVal = parseInt(price) || 0;

      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name,
          sku: sku || null,
          barcode: barcode || null,
          unit,
          price: priceVal,
          stock: stockVal,
          category,
          description,
          user_id: currentUser.id, 
        })
        .select()
        .eq('user_id', currentUser.id)
        .single();

      if (productError) throw productError;

      if (stockVal > 0 && newProduct) {
        await supabase.from('stock_movements').insert({
          product_id: newProduct.id,
          type: 'IN',
          quantity: stockVal,
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

  const handleSuccessConfirm = () => {
    setShowSuccess(false);
    router.replace("/(tabs)/stok");
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="pt-14 pb-4 px-5 border-b border-gray-100 flex-row items-center bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Tambah Produk Baru</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Form Nama */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Nama Barang <Text className="text-red-500">*</Text></Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
            placeholder="Contoh: Indomie Goreng"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Kategori */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Kategori</Text>
          <View className="flex-row gap-2">
            {["Makanan", "Minuman", "Snack", "Lain-lain"].map((cat) => (
              <TouchableOpacity 
                key={cat}
                onPress={() => setCategory(cat)}
                className={`flex-1 py-3 rounded-xl border items-center ${category === cat ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
              >
                <Text className={`font-semibold text-[10px] ${category === cat ? 'text-white' : 'text-gray-600'}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SKU & Barcode (DENGAN TOMBOL SCAN) */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Kode (SKU)</Text>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white" placeholder="Opsional" value={sku} onChangeText={setSku} />
          </View>
          
          {/* KOLOM BARCODE + SCAN BUTTON */}
          <View className="flex-[1.2]">
            <Text className="text-sm font-medium text-gray-700 mb-2">Barcode</Text>
            <View className="flex-row gap-2">
                <TextInput 
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base bg-white" 
                    placeholder="Scan/Ketik" 
                    value={barcode} 
                    onChangeText={setBarcode} 
                    keyboardType="numeric" 
                />
                <TouchableOpacity 
                    onPress={handleScanPress}
                    className="bg-blue-50 border border-blue-200 w-12 rounded-xl items-center justify-center"
                >
                    <Ionicons name="scan-outline" size={22} color="#2563EB" />
                </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Harga & Satuan */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Harga Jual</Text>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white" placeholder="0" value={price} onChangeText={setPrice} keyboardType="numeric" />
          </View>
          <View className="w-1/3">
            <Text className="text-sm font-medium text-gray-700 mb-2">Satuan</Text>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white" placeholder="Pcs" value={unit} onChangeText={setUnit} />
          </View>
        </View>

        {/* Deskripsi */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Deskripsi Produk</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white h-24"
            placeholder="Tambahkan detail produk..."
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Stok Awal */}
        <View className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <Text className="text-sm font-bold text-gray-700 mb-1">Stok Awal</Text>
          <TextInput
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-semibold"
            placeholder="0"
            value={initialStock}
            onChangeText={setInitialStock}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity onPress={handleSave} disabled={loading} className={`rounded-xl py-4 items-center shadow-sm ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}>
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan Produk</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* --- MODAL SCANNER KAMERA --- */}
      <Modal visible={isScanning} animationType="slide" presentationStyle="fullScreen">
        <View className="flex-1 bg-black">
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "ean8", "upc_e", "code128"],
                }}
            >
                {/* Overlay UI Scanner */}
                <View className="flex-1 bg-black/40 justify-center items-center">
                    <View className="w-64 h-64 border-2 border-white/60 rounded-3xl bg-transparent relative">
                         {/* Garis Pojok Pemanis */}
                         <View className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                         <View className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                         <View className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                         <View className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                    </View>
                    <Text className="text-white mt-6 font-medium bg-black/60 px-4 py-2 rounded-full">
                        Arahkan kamera ke Barcode
                    </Text>
                </View>

                {/* Tombol Tutup Scanner */}
                <View className="absolute top-12 left-5">
                    <TouchableOpacity 
                        onPress={() => setIsScanning(false)}
                        className="w-10 h-10 bg-white/20 rounded-full items-center justify-center backdrop-blur-md"
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </CameraView>
        </View>
      </Modal>

      {/* --- CUSTOM SUCCESS MODAL --- */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark" size={32} color="#2563EB" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">Produk Disimpan!</Text>
            <Text className="text-gray-500 text-center mb-6">Produk berhasil ditambahkan.</Text>
            <TouchableOpacity onPress={handleSuccessConfirm} className="bg-blue-600 w-full py-3 rounded-xl">
              <Text className="text-white text-center font-bold text-base">Kembali ke Stok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}