import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import { useColorScheme } from "nativewind";

export default function EditProfileScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [stableTimestamp] = useState(Date.now());
  const [oldAvatarPath, setOldAvatarPath] = useState<string | null>(null);

  const [storeName, setStoreName] = useState("");
  const [fullName, setFullName] = useState("");
  const [website, setWebsite] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  // ----------------------------------------------------------
  // LOAD USER
  // ----------------------------------------------------------
  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      setUserId(user.id);

      const metaName = user.user_metadata?.full_name || "";

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && profileData) {

        // SET AVATAR URL
        setAvatarUrl(profileData.avatar_url || null);

        // ➜ Ambil PATH file lama dari public URL supaya bisa dihapus
        if (profileData.avatar_url) {
          const url = profileData.avatar_url;
          const filePath = url.split("/avatars/")[1];   // hasil: "userid_timestamp.jpg"
          setOldAvatarPath(filePath);
        }

        setStoreName(profileData.store_name || "");
        setFullName(profileData.full_name || metaName);
        setWebsite(profileData.website || "");
        setPhoneNumber(profileData.phone_number || "");
        setAddress(profileData.address || "");

      } else {
        setFullName(metaName);
      }
    } finally {
      setLoading(false);
    }
  };


  // ----------------------------------------------------------
  // PICK IMAGE
  // ----------------------------------------------------------
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Izin Ditolak",
        text2: "Akses galeri diperlukan.",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: false,
      exif: false,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };


  // ----------------------------------------------------------
  // SAVE PROFILE (With Confirmation & Logic)
  // ----------------------------------------------------------
  const confirmSave = () => {
    Alert.alert(
      "Konfirmasi Perubahan",
      "Apakah Anda yakin ingin menyimpan perubahan profil?",
      [
        { text: "Batal", style: "cancel" },
        { text: "Ya, Simpan", onPress: executeSave }
      ]
    );
  };

  const executeSave = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      let finalAvatarUrl = avatarUrl; // Default to existing

      // 1. Upload Photo if Changed
      if (selectedImage) {
        // Remove old avatar if exists
        if (oldAvatarPath) {
          await supabase.storage.from("avatars").remove([oldAvatarPath]);
        }

        const fileName = `${userId}_${Date.now()}.jpg`;
        const formData = new FormData();
        // @ts-ignore
        formData.append('file', {
          uri: selectedImage.uri,
          type: 'image/jpeg',
          name: fileName,
        });

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, formData, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        finalAvatarUrl = data.publicUrl;
      }

      // 2. Update Profile Text Data
      const updates = {
        store_name: storeName,
        full_name: fullName,
        website,
        phone_number: phoneNumber,
        address: address,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Berhasil",
        text2: "Profil berhasil diperbarui",
        position: "top",
        visibilityTime: 2000,
      });

      // Kembali ke halaman profil
      setTimeout(() => {
        router.back();
      }, 1000);

    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Gagal Menyimpan",
        text2: (err as Error).message,
        position: "top",
        visibilityTime: 4000,
      });
    } finally {
      setSaving(false);
    }
  };


  // ----------------------------------------------------------
  // UI Rendering
  // ----------------------------------------------------------
  if (loading)
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white dark:bg-gray-900"
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* HEADER */}
      <View className="bg-white dark:bg-gray-800 pt-12 pb-4 px-4 flex-row items-center border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#1F2937'} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-4">
          Edit Profil
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* AVATAR */}
        <View className="items-center mb-8">
          <View className="relative">
            {selectedImage || avatarUrl ? (
              <Image
                source={{ uri: selectedImage ? selectedImage.uri : (avatarUrl ? `${avatarUrl}?t=${stableTimestamp}` : undefined) }}
                className="h-28 w-28 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                resizeMode="cover"
              />
            ) : (
              <View className="h-28 w-28 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 items-center justify-center">
                <Text className="text-4xl font-bold text-blue-500">
                  {(fullName || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={pickImage}
              disabled={saving}
              className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-full border-2 border-white shadow-sm"
            >
              <Ionicons name="camera" size={18} color="white" />
            </TouchableOpacity>
          </View>

          <Text
            className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-3"
            onPress={pickImage}
          >
            Ubah Foto Profil
          </Text>
        </View>

        {/* FORM */}
        <View className="space-y-5">
          <View>
            <Text className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Toko</Text>
            <TextInput
              value={storeName}
              onChangeText={setStoreName}
              placeholder="Nama Toko"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white"
            />
          </View>

          <View>
            <Text className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Lengkap</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nama Lengkap"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white"
            />
          </View>

          <View>
            <Text className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Website</Text>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              placeholder="https://website.com"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
              autoCapitalize="none"
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white"
            />
          </View>

          <View>
            <Text className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Nomor HP</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="08xxxxxxxx"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
              keyboardType="phone-pad"
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white"
            />
          </View>

          <View>
            <Text className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Alamat Lengkap</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Alamat Lengkap"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF'}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white min-h-[80px]"
            />
          </View>
        </View>

        {/* SAVE */}
        <TouchableOpacity
          onPress={confirmSave}
          disabled={saving}
          className={`mt-10 rounded-2xl py-4 items-center justify-center ${saving ? "bg-blue-400" : "bg-blue-600 dark:bg-blue-700"
            } shadow-sm`}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">
              Simpan Perubahan
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <Toast />
    </KeyboardAvoidingView>
  );
}
