import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import "../global.css";
import React from 'react';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animasi masuk
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const checkUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        // Delay 2.5 detik untuk menampilkan logo
        setTimeout(() => {
          if (session) {
            router.replace('/(tabs)'); // Ke Dashboard
          } else {
            router.replace('/(auth)/login'); // Ke Login
          }
        }, 2500); 
        
      } catch (error) {
        console.error('Session check error:', error);
        router.replace('/(auth)/login');
      }
    };

    checkUserSession();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950" 
          style={{ backgroundColor: '#1e3a8a' }}>
      <StatusBar style="light" />
      
      <Animated.View 
        style={{ 
          opacity: fadeAnim, 
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ] 
        }}
        className="items-center"
      >
        {/* LOGO CONTAINER dengan Depth Effect */}
        <View className="items-center mb-8">
          {/* Shadow layer untuk depth */}
          <View className="absolute w-32 h-32 rounded-3xl bg-black/20 blur-xl" 
                style={{ 
                  top: 8, 
                  left: 4,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                  elevation: 10,
                }} 
          />
          
          {/* Main Logo Container */}
          <View className="w-32 h-32 rounded-3xl bg-white items-center justify-center"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 15,
                }}>
            <MaterialCommunityIcons 
              name="cart-variant" 
              size={64} 
              color="#1E3A8A" 
            />
          </View>
        </View>
        
        {/* BRAND NAME */}
        <View className="items-center">
          <Text className="text-6xl font-extrabold text-white tracking-wider mb-2"
                style={{ 
                  letterSpacing: 4,
                  textShadowColor: 'rgba(0, 0, 0, 0.3)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                }}>
            KASTOCK
          </Text>
          
          {/* Decorative Line */}
          <View className="flex-row items-center gap-2 my-3">
            <View className="w-2 h-2 rounded-full bg-blue-300" />
            <View className="w-32 h-[2px] bg-blue-300" />
            <View className="w-2 h-2 rounded-full bg-blue-300" />
          </View>
          
          {/* Tagline */}
          <Text className="text-sm text-blue-200 font-semibold tracking-widest uppercase"
                style={{ letterSpacing: 3 }}>
            Smart Stock Management
          </Text>
        </View>
      </Animated.View>

      {/* Loading Indicator */}
      <View className="absolute bottom-24">
        <ActivityIndicator size="large" color="#93C5FD" />
        <Text className="text-blue-200 text-xs mt-3 text-center tracking-wide">
          Memuat aplikasi...
        </Text>
      </View>

      {/* Version Footer */}
      <View className="absolute bottom-8">
        <Text className="text-blue-300/60 text-xs tracking-wider">
          v1.0.0
        </Text>
      </View>
    </View>
  );
}