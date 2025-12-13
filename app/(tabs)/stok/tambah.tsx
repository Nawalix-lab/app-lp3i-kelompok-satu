import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  ActivityIndicator, 
  Vibration, 
  StyleSheet 
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import { supabase } from "../../../lib/supabase"; 
import "../../../global.css";
import { useColorScheme } from "nativewind";

export default function TambahProdukScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  // State UI
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // State Data
  const [user, setUser] = useState<any>(null);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

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
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [initialStock, setInitialStock] = useState("");

  // 1. Fetch User & Categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A. Ambil User
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) return;
        setUser(userData.user);

        // B. Ambil Profil untuk tahu Store Type
        const { data: profile } = await supabase
          .from('profiles')
          .select('store_type_id')
          .eq('id', userData.user.id)
          .single();

        let fetchedCategories = ["Umum", "Lain-lain"]; // Default fallback

        if (profile?.store_type_id) {
          // C. Ambil Kategori dari Master Categories
          const { data: cats } = await supabase
            .from('master_categories')
            .select('name')
            .eq('store_type_id', profile.store_type_id);

          if (cats && cats.length > 0) {
            fetchedCategories = cats.map(c => c.name);
          }
        }

        setCategoriesList(fetchedCategories);
        // Set default ke kategori pertama
        if (fetchedCategories.length > 0) {
          setCategory(fetchedCategories[0]);
        }

      } catch (error) {
        console.error("Error init:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchData();
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
    setBarcode(data);
    setIsScanning(false);
    Vibration.vibrate();
  };

  async function handleSave() {
    if (!name.trim()) return alert("Nama barang wajib diisi!");
    if (!user?.id) return alert("Sesi pengguna tidak ditemukan, silakan login ulang.");

    setLoading(true);

    try {
      // Cek ulang user untuk keamanan
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        throw new Error("User belum login atau gagal mengambil data user!");
      }

      // Cek SKU Unik (jika diisi)
      if (sku.trim()) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('sku', sku.trim())
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

      // Insert Produk
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: name.trim(),
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          unit,
          price: priceVal,
          stock: stockVal,
          category, // Ini sekarang dinamis sesuai store type
          description,
          user_id: currentUser.id,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Catat Stok Awal
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

  const handleSuccessConfirm = () => {
    setShowSuccess(false);
    router.replace("/(tabs)/stok");
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View className="pt-14 pb-4 px-5 border-b border-gray-100 dark:border-gray-800 flex-row items-center bg-white dark:bg-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#1F2937'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Tambah Produk Baru</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Form Nama */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Barang <Text className="text-red-500">*</Text></Text>
          <TextInput
            className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-base bg-white dark:bg-gray-800 dark:text-white"
            placeholder="Contoh: Indomie Goreng"
            placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Kategori (DINAMIS) */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori</Text>
          
          {isLoadingCategories ? (
            <View className="flex-row items-center">
               <ActivityIndicator size="small" color="#2563EB" />
               <Text className="text-xs text-gray-500 ml-2">Memuat kategori...</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {categoriesList.map((cat, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCategory(cat)}
                  style={{ 
                    flexGrow: 1,
                    flexBasis: categoriesList.length <= 3 
                      ? `${(100 / categoriesList.length) - 2}%` 
                      : categoriesList.length === 4
                      ? '23%'
                      : '18%'
                  }}
                  className={`px-3 py-2.5 rounded-xl border items-center justify-center ${
                    category === cat 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Text 
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className={`text-xs font-semibold ${
                      category === cat ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* SKU & Barcode */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kode (SKU)</Text>
            <TextInput 
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-base bg-white dark:bg-gray-800 dark:text-white" 
              placeholder="Opsional" 
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'} 
              value={sku} 
              onChangeText={setSku} 
            />
          </View>

          {/* KOLOM BARCODE + SCAN BUTTON */}
          <View className="flex-[1.2]">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Barcode</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-base bg-white dark:bg-gray-800 dark:text-white"
                placeholder="Scan/Ketik"
                placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
                value={barcode}
                onChangeText={setBarcode}
                keyboardType="numeric"
              />
              <TouchableOpacity
                onPress={handleScanPress}
                className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 w-12 rounded-xl items-center justify-center"
              >
                <Ionicons name="scan-outline" size={22} color={colorScheme === 'dark' ? '#60A5FA' : '#2563EB'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Harga & Satuan */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Harga Jual</Text>
            <TextInput 
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-base bg-white dark:bg-gray-800 dark:text-white" 
              placeholder="0" 
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'} 
              value={price} 
              onChangeText={setPrice} 
              keyboardType="numeric" 
            />
          </View>
          <View className="w-1/3">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Satuan</Text>
            <TextInput 
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-base bg-white dark:bg-gray-800 dark:text-white" 
              placeholder="Pcs" 
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'} 
              value={unit} 
              onChangeText={setUnit} 
            />
          </View>
        </View>

        {/* Deskripsi */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deskripsi Produk</Text>
          <TextInput
            className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-base bg-white dark:bg-gray-800 dark:text-white h-24"
            placeholder="Tambahkan detail produk..."
            placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Stok Awal */}
        <View className="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Stok Awal</Text>
          <TextInput
            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-base font-semibold dark:text-white"
            placeholder="0"
            placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
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
            <View className="flex-1 bg-black/40 justify-center items-center">
              <View className="w-64 h-64 border-2 border-white/60 rounded-3xl bg-transparent relative">
                <View className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                <View className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                <View className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                <View className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
              </View>
              <Text className="text-white mt-6 font-medium bg-black/60 px-4 py-2 rounded-full">
                Arahkan kamera ke Barcode
              </Text>
            </View>

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
          <View className="bg-white dark:bg-gray-800 w-full rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark" size={32} color={colorScheme === 'dark' ? '#60A5FA' : '#2563EB'} />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Produk Disimpan!</Text>
            <Text className="text-gray-500 dark:text-gray-400 text-center mb-6">Produk berhasil ditambahkan.</Text>
            <TouchableOpacity onPress={handleSuccessConfirm} className="bg-blue-600 dark:bg-blue-700 w-full py-3 rounded-xl">
              <Text className="text-white text-center font-bold text-base">Kembali ke Stok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}