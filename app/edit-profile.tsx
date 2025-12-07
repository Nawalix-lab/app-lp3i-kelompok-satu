import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useNavigation } from "expo-router";
import { supabase } from "../lib/supabase";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function EditProfileScreen() {
    const router = useRouter();
    const navigation = useNavigation();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [userId, setUserId] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [website, setWebsite] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Get basic metadata
                const metaName = user.user_metadata?.full_name || "";

                const { data: profileData, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (profileData) {
                    setAvatarUrl(profileData.avatar_url);
                    setUsername(profileData.username || "");
                    setFullName(profileData.full_name || metaName);
                    setWebsite(profileData.website || "");
                    setPhoneNumber(profileData.phone_number || "");
                } else {
                    // Fallback if no profile row yet
                    setFullName(metaName);
                }
            } else {
                router.replace("/(auth)/login");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            Alert.alert("Error", "Gagal memuat data profil");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const updates = {
                username,
                full_name: fullName,
                website,
                phone_number: phoneNumber,
                avatar_url: avatarUrl, // Pastikan avatar tidak hilang
                updated_at: new Date().toISOString(),
            };

            // Gunakan update karena baris seharusnya sudah ada (insert row hanya saat register/first load)
            const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", userId);

            if (error) throw error;

            Alert.alert("Berhasil", "Data profil telah berhasil diperbarui.", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert("Gagal", (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    async function pickImage() {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadAvatar(result.assets[0].uri);
        }
    }

    async function uploadAvatar(uri: string) {
        if (!userId) return;
        try {
            setUploading(true);
            const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
            const fileName = `${userId}_${new Date().getTime()}.${fileExt}`;
            const filePath = `${fileName}`;

            const formData = new FormData();
            formData.append('file', {
                uri,
                name: fileName,
                type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
            } as any);

            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, formData, { upsert: false });
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            // Update local state immediately for preview
            setAvatarUrl(publicUrl);

            // Also update DB immediately for the avatar field
            const { error: dbError } = await supabase.from('profiles').upsert({
                id: userId,
                avatar_url: publicUrl,
                updated_at: new Date().toISOString(),
            });
            if (dbError) throw dbError;

        } catch (error) {
            Alert.alert("Upload Gagal", (error as Error).message);
        } finally {
            setUploading(false);
        }
    }

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-white"
        >
            <StatusBar style="dark" />

            {/* Header */}
            <View className="bg-white pt-12 pb-4 px-4 flex-row items-center border-b border-gray-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900 ml-4">Edit Profil</Text>
            </View>

            <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Avatar Section */}
                <View className="items-center mb-8">
                    <View className="relative">
                        {avatarUrl ? (
                            <Image
                                source={{ uri: avatarUrl }}
                                className="h-28 w-28 rounded-full bg-gray-100 border border-gray-200"
                            />
                        ) : (
                            <View className="h-28 w-28 rounded-full bg-blue-50 border border-blue-100 items-center justify-center">
                                <Text className="text-4xl font-bold text-blue-500">{(fullName || "U").charAt(0).toUpperCase()}</Text>
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
                    <Text className="text-sm text-blue-600 font-medium mt-3" onPress={pickImage}>
                        Ubah Foto Profil
                    </Text>
                </View>

                {/* Form Fields */}
                <View className="space-y-5">
                    <View>
                        <Text className="text-[13px] font-medium text-gray-700 mb-2">Nama Toko</Text>
                        <TextInput
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Nama Toko (Contoh: Toko Berkah)"
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                        />
                    </View>

                    <View>
                        <Text className="text-[13px] font-medium text-gray-700 mb-2">Nama Lengkap</Text>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Nama Lengkap Anda"
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

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className={`mt-10 rounded-2xl py-4 items-center justify-center ${saving ? 'bg-blue-400' : 'bg-blue-600'} shadow-sm`}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-base">Simpan Perubahan</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}
