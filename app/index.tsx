import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import "../global.css";
import React from 'react';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect ke login setelah 2 detik
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-blue-500">
      <StatusBar style="light" />
      
      {/* Logo atau Nama App */}
      <View className="items-center mb-12">
        <View className="bg-white rounded-full w-24 h-24 items-center justify-center mb-6">
          <Text className="text-4xl font-bold text-blue-500">
            kS
          </Text>
        </View>
        
        <Text className="text-4xl font-bold text-white mb-2">
          kaStok
        </Text>
        <Text className="text-base text-blue-100">
          Kelola stok dengan mudah
        </Text>
      </View>

      {/* Loading Indicator */}
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}