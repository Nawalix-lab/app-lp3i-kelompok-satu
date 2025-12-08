import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import "../global.css";

export default function StoreSetupScreen() {
  const router = useRouter();
  
  // State Form
  const [storeName, setStoreName] = useState("");
  const [storeType, setStoreType] = useState("");
  
  // State UI
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState({ name: false, type: false });

  const commonStoreTypes = [
    "Kelontong / Sembako",
    "Makanan & Minuman (FnB)",
    "Fashion & Pakaian",
    "Elektronik & Gadget",
    "Kesehatan & Kecantikan",
    "Jasa / Service",
    "Otomotif / Bengkel",
    "Counter Pulsa",
    "Lainnya"
  ];

  async function handleUpdateProfile() {
    setErrors({ name: false, type: false });

    let hasError = false;
    if (!storeName.trim()) {
      setErrors(prev => ({ ...prev, name: true }));
      hasError = true;
    }
    if (!storeType.trim()) {
      setErrors(prev => ({ ...prev, type: true }));
      hasError = true;
    }

    if (hasError) {
      Alert.alert("Data Belum Lengkap", "Mohon isi Nama Toko dan Jenis Toko.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesi pengguna hilang.");

      const { error } = await supabase
        .from('profiles')
        .update({
          store_name: storeName.trim(),
          store_type: storeType.trim(),
          updated_at: new Date(),
        })
        .eq('id', session.user.id);

      if (error) throw error;

      Alert.alert("Sukses", "Toko berhasil didaftarkan!", [
        { text: "Masuk Dashboard", onPress: () => router.replace("/(tabs)") }
      ]);

    } catch (error: any) {
      Alert.alert("Gagal Menyimpan", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={() => { setShowDropdown(false); Keyboard.dismiss(); }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >
        <StatusBar style="dark" />
        
        {/* Tambahkan keyboardShouldPersistTaps="handled" di sini */}
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* Header */}
          <View className="mb-8">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="storefront" size={32} color="#2563EB" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-2">Halo Bos! 👋</Text>
            <Text className="text-gray-500 text-base leading-6">
              Data tokomu belum lengkap nih. Yuk isi dulu biar aplikasi siap digunakan.
            </Text>
          </View>

          {/* Form Container */}
          <View className="gap-5">
            
            {/* Input Nama Toko */}
            <View className="z-10">
              <Text className="font-semibold text-gray-700 mb-2 ml-1">
                Nama Toko <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className={`border rounded-xl px-4 py-3.5 bg-gray-50 text-base text-gray-900 ${
                  errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Contoh: Toko Sembako Makmur"
                placeholderTextColor="#9CA3AF"
                value={storeName}
                onChangeText={(text) => {
                  setStoreName(text);
                  if (text) setErrors(prev => ({ ...prev, name: false }));
                }}
              />
              {errors.name && <Text className="text-red-500 text-xs ml-1 mt-1">Nama toko wajib diisi</Text>}
            </View>

            {/* Input Jenis Toko (Dropdown) */}
            {/* Penting: Set zIndex tinggi dan elevation (Android) agar di atas tombol */}
            <View 
              className="relative mb-2" 
              style={{ zIndex: 1000, elevation: 10 }} // PERBAIKAN UTAMA
            >
              <Text className="font-semibold text-gray-700 mb-2 ml-1">
                Jenis Toko <Text className="text-red-500">*</Text>
              </Text>
              
              <View>
                <TextInput
                  className={`border rounded-xl px-4 py-3.5 bg-gray-50 text-base text-gray-900 pr-12 ${
                    errors.type ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Pilih atau ketik sendiri..."
                  placeholderTextColor="#9CA3AF"
                  value={storeType}
                  onChangeText={(text) => {
                    setStoreType(text);
                    if (text) setErrors(prev => ({ ...prev, type: false }));
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                
                <TouchableOpacity 
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowDropdown(!showDropdown);
                  }}
                  className="absolute right-3 top-3.5 p-1"
                >
                  <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {errors.type && <Text className="text-red-500 text-xs ml-1 mt-1">Jenis toko wajib diisi</Text>}

              {/* List Dropdown */}
              {showDropdown && (
                <View 
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden"
                  style={{ zIndex: 2000, elevation: 20 }} // Pastikan dropdown juga punya zIndex tinggi
                >
                  <ScrollView 
                    nestedScrollEnabled={true} 
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {commonStoreTypes.map((type, index) => (
                      <TouchableOpacity
                        key={index}
                        className="px-4 py-3 border-b border-gray-100 active:bg-blue-50"
                        onPress={() => {
                          setStoreType(type);
                          setShowDropdown(false);
                          setErrors(prev => ({ ...prev, type: false }));
                          Keyboard.dismiss();
                        }}
                      >
                        <Text className="text-gray-700 text-base">{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Tombol Simpan - zIndex rendah */}
            <View style={{ zIndex: 1, elevation: 1 }}> 
              <TouchableOpacity
                onPress={handleUpdateProfile}
                disabled={loading}
                className={`rounded-xl py-4 mt-4 shadow-sm flex-row justify-center items-center ${
                  loading ? 'bg-gray-400' : 'bg-blue-600 active:bg-blue-700'
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Simpan & Masuk</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}