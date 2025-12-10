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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

export default function EditProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [oldAvatarPath, setOldAvatarPath] = useState<string | null>(null);

 const [storeName, setStoreName] = useState("");
  const [fullName, setFullName] = useState("");
  const [website, setWebsite] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

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
      await uploadAvatar(result.assets[0].uri);
    }
  };


  // ----------------------------------------------------------
  // UPLOAD AVATAR (Android Compatible)
  // ----------------------------------------------------------
  const uploadAvatar = async (uri: string) => {
    if (!userId) return;

    try {
      setUploading(true);

      // Hapus avatar lama di storage
      if (oldAvatarPath) {
        await supabase.storage.from("avatars").remove([oldAvatarPath]);
      }

      const fileName = `${userId}_${Date.now()}.jpg`;

      // Untuk Android, gunakan FormData
      const formData = new FormData();
      
      // @ts-ignore - FormData append file untuk React Native
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: fileName,
      });

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, formData, { 
          contentType: "image/jpeg",
          upsert: false 
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      // Update tampilan
      setAvatarUrl(publicUrl);
      setOldAvatarPath(fileName); // update path baru

      // Simpan ke DB
      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (dbError) throw dbError;

      Toast.show({
        type: "success",
        text1: "Berhasil",
        text2: "Foto profil berhasil diperbarui",
        position: "top",
        visibilityTime: 2000,
      });

    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Upload Gagal",
        text2: (err as Error).message,
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setUploading(false);
    }
  };


  // ----------------------------------------------------------
  // SAVE PROFILE
  // ----------------------------------------------------------
  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      const updates = {
        store_name:storeName,
        full_name: fullName,
        website,
        phone_number: phoneNumber,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      setSaving(false);

      Toast.show({
        type: "success",
        text1: "Berhasil",
        text2: "Profil berhasil diperbarui",
        position: "top",
        visibilityTime: 2000,
      });

      // Navigate to profile index after short delay
      setTimeout(() => {
        router.push("/(tabs)/profile");
      }, 500);

    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Gagal",
        text2: (err as Error).message,
        position: "top",
        visibilityTime: 3000,
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
      className="flex-1 bg-white"
    >
      <StatusBar style="dark" />

      {/* HEADER */}
      <View className="bg-white pt-12 pb-4 px-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 ml-4">
          Edit Profil
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* AVATAR */}
        <View className="items-center mb-8">
          <View className="relative">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl + "?t=" + Date.now() }}
                className="h-28 w-28 rounded-full bg-gray-100 border border-gray-200"
              />
            ) : (
              <View className="h-28 w-28 rounded-full bg-blue-50 border border-blue-100 items-center justify-center">
                <Text className="text-4xl font-bold text-blue-500">
                  {(fullName || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={pickImage}
              disabled={uploading}
              className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-full border-2 border-white shadow-sm"
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="camera" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>

          <Text
            className="text-sm text-blue-600 font-medium mt-3"
            onPress={pickImage}
          >
            Ubah Foto Profil
          </Text>
        </View>

        {/* FORM */}
        <View className="space-y-5">
          <View>
            <Text className="text-[13px] font-medium text-gray-700 mb-2">Nama Toko</Text>
            <TextInput
              value={storeName}
              onChangeText={setStoreName}
              placeholder="Nama Toko"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            />
          </View>

          <View>
            <Text className="text-[13px] font-medium text-gray-700 mb-2">Nama Lengkap</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nama Lengkap"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            />
          </View>

          <View>
            <Text className="text-[13px] font-medium text-gray-700 mb-2">Website</Text>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              placeholder="https://website.com"
              autoCapitalize="none"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            />
          </View>

          <View>
            <Text className="text-[13px] font-medium text-gray-700 mb-2">Nomor HP</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="08xxxxxxxx"
              keyboardType="phone-pad"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            />
          </View>
        </View>

        {/* SAVE */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`mt-10 rounded-2xl py-4 items-center justify-center ${
            saving ? "bg-blue-400" : "bg-blue-600"
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
