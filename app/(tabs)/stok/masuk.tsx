import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, Vibration, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from "../../../lib/supabase";
import "../../../global.css";

export default function BarangMasukScreen() {
  const router = useRouter();
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState(""); // Input Harga Beli Baru
  const [notes, setNotes] = useState("");
  
  const [products, setProducts] = useState([]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => { 
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
  };

  const handleSelectProduct = (product: any) => {
      setSelectedProduct(product);
      // Otomatis isi harga beli dengan harga terakhir di database
      setBuyPrice(product.buy_price ? product.buy_price.toString() : "0");
      setModalVisible(false);
  };

  const handleScanPress = async () => {
    if (!permission?.granted) { const { granted } = await requestPermission(); if (!granted) return alert("Izin kamera diperlukan!"); }
    setScanned(false); setIsScanning(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true); setIsScanning(false); Vibration.vibrate();
    const foundProduct = products.find((p: any) => p.barcode === data);
    if (foundProduct) { 
        handleSelectProduct(foundProduct);
        alert(`Produk Ditemukan: ${foundProduct.name}`); 
    } else { 
        alert(`Barcode ${data} tidak ditemukan.`); 
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return alert("Pilih barang dahulu.");
    if (!quantity || parseInt(quantity) <= 0) return alert("Jumlah minimal 1.");

    setLoadingSubmit(true);
    const qtyInt = parseInt(quantity);
    const newBuyPrice = parseInt(buyPrice) || 0;

    try {
      // 1. Update Stok & Harga Beli Terbaru di Master Produk
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
            stock: selectedProduct.stock + qtyInt,
            buy_price: newBuyPrice // Update harga beli terbaru
        })
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      // 2. Catat Riwayat Masuk
      const { error: logError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: selectedProduct.id,
          type: 'IN',
          quantity: qtyInt,
          notes: notes || 'Restock Barang',
        });

      if (logError) throw logError;

      setLoadingSubmit(false);
      setSuccessModalVisible(true);
    } catch (error: any) {
      alert("Error: " + error.message);
      setLoadingSubmit(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <View className="pt-14 pb-4 px-5 border-b border-gray-100 flex-row items-center bg-white z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4"><Ionicons name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Input Barang Masuk</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Pilih Barang */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Pilih Barang</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={() => setModalVisible(true)} className="flex-1 border border-gray-300 rounded-xl px-4 py-3 bg-white flex-row justify-between items-center">
              <Text className={`text-base ${selectedProduct ? 'text-gray-900 font-semibold' : 'text-gray-400'}`} numberOfLines={1}>
                  {selectedProduct ? selectedProduct.name : "Cari manual..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleScanPress} className="bg-blue-600 w-12 rounded-xl items-center justify-center"><MaterialCommunityIcons name="barcode-scan" size={24} color="white" /></TouchableOpacity>
          </View>
        </View>

        {/* Input Harga Beli (BARU) & Jumlah */}
        <View className="flex-row gap-4 mb-6">
            <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-2">Harga Beli Baru</Text>
                <TextInput 
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white" 
                    placeholder="0" 
                    keyboardType="numeric" 
                    value={buyPrice} 
                    onChangeText={setBuyPrice} 
                />
            </View>
            <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-2">Jumlah Masuk</Text>
                <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-white h-[50px]">
                    <TextInput 
                        className="flex-1 text-base font-bold text-gray-900" 
                        placeholder="0" 
                        keyboardType="number-pad" 
                        value={quantity} 
                        onChangeText={setQuantity} 
                    />
                    <Text className="text-gray-400 text-xs ml-1">{selectedProduct?.unit || ''}</Text>
                </View>
            </View>
        </View>

        <View className="mb-8"><Text className="text-sm font-medium text-gray-700 mb-2">Catatan</Text><TextInput className="border border-gray-300 rounded-xl px-4 py-3 h-24 bg-white" multiline placeholder="Contoh: Kulakan dari Pasar A" value={notes} onChangeText={setNotes} textAlignVertical="top" /></View>
        
        <TouchableOpacity onPress={handleSubmit} disabled={loadingSubmit} className={`rounded-xl py-4 flex-row justify-center items-center ${loadingSubmit ? 'bg-gray-400' : 'bg-blue-600'}`}>
            {loadingSubmit ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan Stok</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Scanner */}
      <Modal visible={isScanning} animationType="slide" presentationStyle="fullScreen"><View className="flex-1 bg-black"><CameraView style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "code128"] }}><View className="flex-1 bg-black/40 justify-center items-center"><View className="w-64 h-64 border-2 border-white/60 rounded-3xl" /></View><TouchableOpacity onPress={() => setIsScanning(false)} className="absolute top-12 left-5 bg-white/20 p-2 rounded-full"><Ionicons name="close" size={24} color="white" /></TouchableOpacity></CameraView></View></Modal>
      
      {/* Modal Cari */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet"><View className="flex-1 bg-white pt-6"><View className="px-5 mb-4 flex-row items-center justify-between"><Text className="text-xl font-bold">Cari Barang</Text><TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} /></TouchableOpacity></View><View className="px-5 mb-2"><TextInput className="bg-gray-100 rounded-xl px-4 py-3" placeholder="Ketik nama..." value={searchText} onChangeText={setSearchText} /></View><FlatList data={products.filter((p:any) => p.name.toLowerCase().includes(searchText.toLowerCase()))} keyExtractor={(item:any) => item.id.toString()} contentContainerStyle={{ padding: 20 }} renderItem={({ item }) => (<TouchableOpacity onPress={() => handleSelectProduct(item)} className="py-4 border-b border-gray-100 flex-row justify-between"><Text className="font-semibold">{item.name}</Text><Text className="text-blue-600">Stok: {item.stock}</Text></TouchableOpacity>)} /></View></Modal>
      
      {/* Success Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade"><View className="flex-1 bg-black/50 justify-center items-center px-6"><View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl"><View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4"><Ionicons name="checkmark" size={32} color="#2563EB" /></View><Text className="text-xl font-bold text-center mb-2">Stok Berhasil Ditambah!</Text><Text className="text-gray-500 text-center mb-4 text-xs">Harga beli juga telah diperbarui.</Text><TouchableOpacity onPress={() => { setSuccessModalVisible(false); router.replace("/(tabs)/stok"); }} className="bg-blue-600 w-full py-3 rounded-xl mt-4"><Text className="text-white text-center font-bold">Kembali ke Stok</Text></TouchableOpacity></View></View></Modal>
    </View>
  );
}