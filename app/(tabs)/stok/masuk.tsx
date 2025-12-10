  import React, { useState, useEffect } from "react";
  import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, Vibration, StyleSheet } from "react-native";
  import { StatusBar } from "expo-status-bar";
  import { useRouter } from "expo-router";
  import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
  import { CameraView, useCameraPermissions } from 'expo-camera'; // Import Kamera
  import { supabase } from "../../../lib/supabase";
  import "../../../global.css";

  type Product = {
    id: number;
    name: string;
    category: string;
    stock: number;
    unit: string;
    price: number;
    barcode?: string;
    description?: string;
    user_id: string;
  };

  export default function BarangMasukScreen() {
    const router = useRouter();
    
    // State Form
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    
    // State Data & UI
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const [loadingSubmit, setLoadingSubmit] = useState(false);
    
    // Modals
    const [modalVisible, setModalVisible] = useState(false); // Modal cari manual
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [searchText, setSearchText] = useState("");

    // Camera State
    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
      fetchProducts();
    }, []);

    const fetchProducts = async () => {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) return;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    console.log("Error fetch:", error);
  }

  if (data) setProducts(data);
};


    // --- LOGIKA SCAN BARCODE UNTUK CARI PRODUK ---
    const handleScanPress = async () => {
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) return alert("Izin kamera diperlukan!");
      }
      setScanned(false);
      setIsScanning(true);
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
      setScanned(true);
      setIsScanning(false);
      Vibration.vibrate();

      // CARI BARANG BERDASARKAN BARCODE
      const foundProduct = products.find((p: any) => p.barcode === data);

      if (foundProduct) {
        setSelectedProduct(foundProduct); // Otomatis pilih produk
        alert(`Produk Ditemukan: ${foundProduct.name}`);
      } else {
        alert(`Barang dengan barcode ${data} tidak ditemukan di database.`);
      }
    };
    // ---------------------------------------------

    const handleSubmit = async () => {
      if (!selectedProduct) return alert("Pilih barang dahulu.");
      if (!quantity || parseInt(quantity) <= 0) return alert("Jumlah minimal 1.");

      setLoadingSubmit(true);
      const qtyInt = parseInt(quantity);

      try {
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: selectedProduct.stock + qtyInt })
          .eq('id', selectedProduct.id);
        if (updateError) throw updateError;

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
        
        {/* Header */}
        <View className="pt-14 pb-4 px-5 border-b border-gray-100 flex-row items-center bg-white z-10">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Barang Masuk</Text>
        </View>

        <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
          
          <View className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex-row items-start">
            <Ionicons name="information-circle" size={22} color="#2563EB" style={{ marginTop: 2 }} />
            <Text className="ml-3 text-blue-800 text-sm flex-1 leading-5">
              Gunakan tombol scan untuk mencari barang dengan cepat, atau pilih manual.
            </Text>
          </View>

          {/* --- PILIH BARANG (Dropdown + Scan Button) --- */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Pilih Barang</Text>
            <View className="flex-row gap-2">
              {/* Dropdown Manual */}
              <TouchableOpacity 
                onPress={() => setModalVisible(true)} 
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 bg-white flex-row justify-between items-center"
              >
                <View className="flex-1 mr-2">
                  <Text className={`text-base ${selectedProduct ? 'text-gray-900 font-semibold' : 'text-gray-400'}`} numberOfLines={1}>
                    {selectedProduct ? selectedProduct.name : "Cari manual..."}
                  </Text>
                  {selectedProduct && (
                    <Text className="text-xs text-blue-600 mt-1">Stok saat ini: {async function handleSave() {
  if (!name) return alert("Nama barang wajib diisi!");    
  if (!user?.id) return alert("Sesi pengguna tidak ditemukan, silakan login ulang.");

  setLoading(true);

  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      throw new Error("User belum login atau gagal mengambil data user!");
    }

    if (sku) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', sku)
        .eq('user_id', currentUser.id)
        .single();

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
      .single();

    if (productError) throw productError;

    if (stockVal > 0 && newProduct) {
      await supabase.from('stock_movements').insert({
        product_id: newProduct.id,
        type: 'IN',
        quantity: stockVal,
        notes: 'Stok Awal',
        user_id: currentUser.id,
      });
    }

    setLoading(false);
    setShowSuccess(true);

  } catch (error: any) {
    alert(error.message);
    setLoading(false);
  }
}
.stock}</Text>
                  )}
                </View>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>

              {/* Tombol Scan */}
              <TouchableOpacity 
                onPress={handleScanPress}
                className="bg-blue-600 w-12 rounded-xl items-center justify-center shadow-sm active:bg-blue-700"
              >
                <MaterialCommunityIcons name="barcode-scan" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Input Jumlah */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Jumlah Masuk</Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-white">
              <MaterialCommunityIcons name="cube-send" size={22} color="#6B7280" />
              <TextInput className="flex-1 py-4 ml-3 text-lg font-bold" placeholder="0" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
              <Text className="text-gray-500 font-bold text-xs">{selectedProduct?.unit || 'Pcs'}</Text>
            </View>
          </View>

          {/* Catatan */}
          <View className="mb-8">
            <Text className="text-sm font-medium text-gray-700 mb-2">Catatan</Text>
            <TextInput 
                className="border border-gray-300 rounded-xl px-4 py-3 h-24 bg-white" 
                multiline 
                placeholder="Contoh: Pembelian via Tokopedia"
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
            />
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={loadingSubmit} className={`rounded-xl py-4 flex-row justify-center items-center ${loadingSubmit ? 'bg-gray-400' : 'bg-blue-600'}`}>
            {loadingSubmit ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan Stok</Text>}
          </TouchableOpacity>
        </ScrollView>

        {/* --- KAMERA MODAL --- */}
        <Modal visible={isScanning} animationType="slide" presentationStyle="fullScreen">
          <View className="flex-1 bg-black">
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "code128"] }}
            >
              <View className="flex-1 bg-black/40 justify-center items-center">
                  <View className="w-64 h-64 border-2 border-white/60 rounded-3xl" />
                  <Text className="text-white mt-4 bg-black/50 px-4 py-2 rounded-full">Scan Barcode Barang</Text>
              </View>
              <TouchableOpacity onPress={() => setIsScanning(false)} className="absolute top-12 left-5 bg-white/20 p-2 rounded-full">
                  <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </CameraView>
          </View>
        </Modal>

        {/* --- MODAL CARI MANUAL --- */}
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
          <View className="flex-1 bg-white pt-6">
            <View className="px-5 mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold">Cari Barang</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
            </View>
            <View className="px-5 mb-2"><TextInput className="bg-gray-100 rounded-xl px-4 py-3" placeholder="Ketik nama..." value={searchText} onChangeText={setSearchText} /></View>
            <FlatList 
              data={products.filter((p:any) => p.name.toLowerCase().includes(searchText.toLowerCase()))}
              keyExtractor={(item:any) => item.id.toString()}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setSelectedProduct(item); setModalVisible(false); }} className="py-4 border-b border-gray-100 flex-row justify-between">
                  <Text className="font-semibold">{item.name}</Text>
                  <Text className="text-blue-600">Stok: {item.stock}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal visible={successModalVisible} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl">
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4"><Ionicons name="checkmark" size={32} color="#2563EB" /></View>
              <Text className="text-xl font-bold text-center mb-2">Stok Berhasil Ditambah!</Text>
              <TouchableOpacity onPress={() => { setSuccessModalVisible(false); router.replace("/(tabs)/stok"); }} className="bg-blue-600 w-full py-3 rounded-xl mt-4">
                <Text className="text-white text-center font-bold">Kembali ke Stok</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    );
  }