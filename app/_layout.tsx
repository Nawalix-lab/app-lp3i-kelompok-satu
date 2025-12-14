import { Stack } from 'expo-router';
import "../global.css";
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
    return (
        <>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
            </Stack>
            <Toast/>
        </>
    );
}
