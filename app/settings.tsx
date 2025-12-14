import React from "react";
import { View, Text, TouchableOpacity, Switch } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

export default function SettingsScreen() {
    const navigation = useNavigation();
    const { colorScheme, toggleColorScheme } = useColorScheme();

    return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900">
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            {/* Header */}
            <View className="bg-white dark:bg-gray-800 pt-12 pb-4 px-4 flex-row items-center border-b border-gray-200 dark:border-gray-700">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <Ionicons name="arrow-back" size={24} className="text-gray-900 dark:text-white" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-4">
                    Pengaturan
                </Text>
            </View>

            <View className="px-5 mt-6">
                {/* Tampilan */}
                <View className="mb-6">
                    <Text className="px-4 mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Tampilan
                    </Text>
                    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center border border-gray-200 dark:border-gray-700">
                        <View className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-lg items-center justify-center mr-3">
                            <Ionicons name="moon-outline" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#374151'} />
                        </View>
                        <Text className="text-gray-800 dark:text-white font-semibold flex-1">
                            Mode Gelap
                        </Text>
                        <Switch
                            value={colorScheme === 'dark'}
                            onValueChange={toggleColorScheme}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}
