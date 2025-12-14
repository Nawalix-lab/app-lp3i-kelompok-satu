import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Image
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import "../global.css";
import Toast from "react-native-toast-message";

// Pastikan path logo benar
const setupLogo = require("../assets/logo.png");

export default function StoreSetupScreen() {
  const router = useRouter();

  // State Form
  const [storeName, setStoreName] = useState("");
  const [storeType, setStoreType] = useState(""); // Hanya untuk tampilan teks input
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null); // PENTING: Ini yang disimpan

  // State Data Database
  const [storeTypesList, setStoreTypesList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // State UI
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState({ name: false, type: false });

  // 1. AMBIL DATA TYPE DARI DATABASE SAAT LOAD
  useEffect(() => {
    const fetchMasterTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('master_store_types')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;

        if (data) {
          setStoreTypesList(data);
        }
      } catch (error) {
        console.log("Gagal mengambil tipe toko:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchMasterTypes();
  }, []);

  async function handleUpdateProfile() {
    setErrors({ name: false, type: false });

    let hasError = false;
    if (!storeName.trim()) {
      setErrors(prev => ({ ...prev, name: true }));
      hasError = true;
    }

    // VALIDASI BARU: Cek apakah ID sudah terpilih
    // Kita memaksa user memilih dari list agar ID-nya valid
    if (!selectedTypeId) {
      setErrors(prev => ({ ...prev, type: true }));
      hasError = true;
    }

    if (hasError) {
      Toast.show({
        type: 'error',
        text1: 'Data Belum Lengkap',
        text2: !selectedTypeId && storeType
          ? 'Silakan pilih Jenis Toko dari daftar'
          : 'Mohon isi Nama Toko dan pilih Jenis Toko',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Toast.show({
          type: 'error',
          text1: 'Sesi pengguna tidak ditemukan',
          text2: 'Mohon login kembali',
          position: 'top',
          visibilityTime: 3000,
        });
        return;
      }

      // 2. SIMPAN HANYA ID, TIDAK ADA LAGI STORE_TYPE TEXT
      const updates = {
        store_name: storeName.trim(),
        store_type_id: selectedTypeId, // Kunci utama relasi
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Gagal Menyimpan',
          text2: error.message,
          position: 'top',
          visibilityTime: 3000,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Sukses',
        text2: 'Toko berhasil didaftarkan!',
        position: 'top',
        visibilityTime: 2500,
      });

      router.replace('/(tabs)');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Gagal Menyimpan',
        text2: error.message,
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={() => { setShowDropdown(false); Keyboard.dismiss(); }}>
        <View className="flex-1 bg-white">
          <StatusBar style="dark" />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* === HEADER === */}
            <View className="mb-8 mt-4 items-center">
              <Image
                source={setupLogo}
                className="w-80 h-80 mb-0"
                resizeMode="contain"
              />
              <Text className="text-gray-500 text-base text-center px-4 -m-12 mb-4">
                Data tokomu belum lengkap nih. Yuk isi dulu biar aplikasi siap digunakan.
              </Text>
            </View>

            {/* Form Container */}
            <View className="gap-6">

              {/* Input Nama Toko */}
              <View className="z-10">
                <Text className="font-semibold text-gray-700 mb-2 ml-1">
                  Nama Toko <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`border rounded-xl px-4 py-4 bg-gray-50 text-base text-gray-900 ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
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

              {/* Input Jenis Toko (Dropdown Dinamis) */}
              <View
                className="relative mb-2"
                style={{ zIndex: 1000, elevation: 10 }}
              >
                <Text className="font-semibold text-gray-700 mb-2 ml-1">
                  Jenis Toko <Text className="text-red-500">*</Text>
                </Text>

                <View>
                  <TextInput
                    className={`border rounded-xl px-4 py-4 bg-gray-50 text-base text-gray-900 pr-12 ${errors.type ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="Pilih dari daftar..."
                    placeholderTextColor="#9CA3AF"
                    value={storeType}
                    onChangeText={(text) => {
                      setStoreType(text);
                      // Reset ID saat user mengetik manual, memaksa mereka memilih dari dropdown
                      setSelectedTypeId(null);
                      setShowDropdown(true);
                      if (text) setErrors(prev => ({ ...prev, type: false }));
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowDropdown(!showDropdown);
                    }}
                    className="absolute right-3 top-4 p-1"
                  >
                    <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {errors.type && <Text className="text-red-500 text-xs ml-1 mt-1">Wajib pilih jenis toko dari daftar</Text>}

                {/* List Dropdown dari Database */}
                {showDropdown && (
                  <View
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden"
                    style={{ zIndex: 2000, elevation: 20 }}
                  >
                    <ScrollView
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={true}
                    >
                      {loadingData ? (
                        <View className="p-4 items-center">
                          <ActivityIndicator size="small" color="#2563EB" />
                          <Text className="text-gray-400 text-xs mt-2">Memuat tipe toko...</Text>
                        </View>
                      ) : storeTypesList.length > 0 ? (
                        storeTypesList
                          // Filter list berdasarkan ketikan user
                          .filter(item => item.name.toLowerCase().includes(storeType.toLowerCase()))
                          .map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              className="px-4 py-3 border-b border-gray-100 active:bg-blue-50"
                              onPress={() => {
                                setStoreType(item.name); // Tampilkan nama di input
                                setSelectedTypeId(item.id); // Simpan ID di state
                                setShowDropdown(false);
                                setErrors(prev => ({ ...prev, type: false }));
                                Keyboard.dismiss();
                              }}
                            >
                              <Text className="text-gray-700 text-base">{item.name}</Text>
                            </TouchableOpacity>
                          ))
                      ) : (
                        <View className="p-4 items-center">
                          <Text className="text-gray-400">Tidak ada data</Text>
                        </View>
                      )}

                      {/* Pesan jika tidak ada hasil filter */}
                      {!loadingData && storeTypesList.length > 0 && storeTypesList.filter(item => item.name.toLowerCase().includes(storeType.toLowerCase())).length === 0 && (
                        <View className="p-4 items-center">
                          <Text className="text-gray-400 text-xs">Tipe tidak ditemukan di daftar</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Tombol Simpan */}
              <View style={{ zIndex: 1, elevation: 1 }}>
                <TouchableOpacity
                  onPress={handleUpdateProfile}
                  disabled={loading}
                  className={`rounded-xl py-4 mt-6 shadow-sm flex-row justify-center items-center ${loading ? 'bg-gray-400' : 'bg-blue-600 active:bg-blue-700'
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
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}