import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import "../global.css";

export default function ChangePasswordScreen() {
    const navigation = useNavigation();
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleChangePassword() {
        if (!newPassword || !confirmPassword) {
            Alert.alert("Input Kosong", "Harap isi semua kolom.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Password Tidak Cocok", "Konfirmasi password tidak sesuai.");
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert("Password Terlalu Pendek", "Password minimal harus 6 karakter.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            Alert.alert("Gagal", error.message);
        } else {
            Alert.alert("Sukses", "Password Anda berhasil diubah.", [
                { text: "OK", onPress: () => navigation.goBack() },
            ]);
        }
        setLoading(false);
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
                    Ubah Password
                </Text>
            </View>

            <View className="p-5 space-y-4 mt-4">
                <View>
                    <Text className="text-gray-600 mb-2">Password Baru</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg p-3 text-base"
                        placeholder="Masukkan password baru"
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                </View>
                <View>
                    <Text className="text-gray-600 mb-2">Konfirmasi Password Baru</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg p-3 text-base"
                        placeholder="Ulangi password baru"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>
                <TouchableOpacity onPress={handleChangePassword} disabled={loading} className="bg-blue-500 rounded-lg p-4 items-center mt-5">
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Simpan Perubahan</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}