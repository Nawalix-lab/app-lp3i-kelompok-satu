import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Image,
    Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
    const router = useRouter();
    const navigation = useNavigation();

    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");
    const [userStoreName, setUserStoreName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            const fetchUser = async () => {
                setLoading(true);
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        setUserId(user.id);
                        const email = user.email || "";
                        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || "";

                        setUserEmail(email);
                        setUserName(metaName);

                        const { data: profileData, error } = await supabase
                            .from("profiles")
                            .select("full_name, avatar_url, username")
                            .eq("id", user.id)
                            .single();

                        if (error && error.code !== 'PGRST116') {
                            throw error;
                        }

                        if (profileData) {
                            setUserName(profileData.full_name || metaName || "User");
                            setUserStoreName(profileData.username || "");
                            setAvatarUrl(profileData.avatar_url);
                        }
                    } else {
                        router.replace("/(auth)/login");
                    }
                } catch (error) {
                    // Silent error or basic log if needed, but keeping it clean as requested
                } finally {
                    setLoading(false);
                }
            };

            fetchUser();
        }, [])
    );

    async function pickImage() {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            uploadAvatar(asset.uri);
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
            const usernameFromEmail = userEmail.split('@')[0];

            const updates = {
                id: userId,
                avatar_url: publicUrl,
                updated_at: new Date().toISOString(),
                full_name: userName || "User",
                username: userStoreName || usernameFromEmail,
            };

            const { error: upsertError } = await supabase.from('profiles').upsert(updates);
            if (upsertError) throw upsertError;

            setAvatarUrl(publicUrl);
            Alert.alert("Sukses", "Foto profil berhasil diperbarui!");

        } catch (error) {
            Alert.alert("Upload Gagal", (error as Error).message);
        } finally {
            setUploading(false);
        }
    }

    const initial = (userName || "U").charAt(0).toUpperCase();

    const openWhatsApp = () => {
        const contactNumber = "6285830125460";
        const message = "Halo admin, saya butuh bantuan terkait aplikasi kaStok.";
        const url = `whatsapp://send?phone=${contactNumber}&text=${encodeURIComponent(message)}`;

        Linking.openURL(url).catch(() => {
            Alert.alert("Error", "WhatsApp tidak terinstall di perangkat ini.");
        });
    };

    function signOut() {
        Alert.alert("Keluar Akun", "Yakin ingin keluar dari kaStok?", [
            { text: "Batal", style: "cancel" },
            {
                text: "Keluar",
                style: "destructive",
                onPress: async () => {
                    await supabase.auth.signOut();
                    router.replace("/(auth)/login");
                },
            },
        ]);
    }

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="bg-white pt-12 pb-4 px-4 flex-row items-center border-b border-gray-200">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900 ml-4">
                    Profil Toko
                </Text>
            </View>

            <View className="items-center mt-8">
                <View>
                    {avatarUrl ? (
                        <Image
                            source={{ uri: avatarUrl.split('?')[0] }}
                            className="h-24 w-24 rounded-full bg-gray-200"
                        />
                    ) : (
                        <View className="h-24 w-24 rounded-full bg-blue-100 border-2 border-blue-300 items-center justify-center">
                            <Text className="text-4xl font-bold text-blue-600">{initial}</Text>
                        </View>
                    )}
                </View>
                <Text className="text-2xl font-bold text-gray-900 mt-3">{userName}</Text>
                {userStoreName ? (
                    <Text className="text-sm font-semibold text-blue-600 mt-1">{userStoreName}</Text>
                ) : null}
                <Text className="text-sm text-gray-500 mt-1">{userEmail}</Text>

                <TouchableOpacity
                    onPress={() => router.push("/edit-profile")}
                    className="mt-4 bg-gray-900 px-5 py-2.5 rounded-full"
                >
                    <Text className="text-white text-[13px] font-semibold">Edit Profil</Text>
                </TouchableOpacity>
            </View>

            {/* Menu Aksi */}
            <View className="px-5 mt-10">
                {/* Ubah Password */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push("/change-password")}
                    className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-6"
                >
                    <View className="h-10 w-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
                        <Ionicons name="lock-closed-outline" size={20} color="#374151" />
                    </View>
                    <Text className="text-gray-800 font-semibold flex-1">
                        Ubah Password
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Pusat Bantuan (WhatsApp) */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={openWhatsApp}
                    className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-200 mb-6"
                >
                    <View className="h-10 w-10 bg-green-50 rounded-lg items-center justify-center mr-3">
                        <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
                    </View>
                    <Text className="text-gray-800 font-semibold flex-1">
                        Pusat Bantuan
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Keluar Akun */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={signOut}
                    className="bg-red-500 rounded-2xl p-4 items-center justify-center flex-row"
                >
                    <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                    <Text className="text-white font-semibold text-[14px] ml-2">
                        Keluar dari Akun
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}