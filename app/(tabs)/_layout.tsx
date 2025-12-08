import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      {/* Halaman utama / root */}
      <Stack.Screen
        name="index"
        options={{ headerShown: false }} // bisa pakai header custom di halaman
      />

      {/* Halaman Stok */}
      <Stack.Screen
        name="stok/index"
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name="stok/tambah"
        options={{
          title: 'Tambah Produk ',
          headerBackTitleVisible: false,
          headerShown: false
        }}
      />

      <Stack.Screen
        name="stok/masuk"
        options={{
          title: 'Barang Masuk',
          headerBackTitleVisible: false,
          headerShown: false
        }}
      />

      {/* Halaman lain */}
      <Stack.Screen
        name="notifikasi"
        options={{
          title: 'Notifikasi',
          headerBackTitleVisible: false,
          headerShown: false
        }}
      />
    </Stack>
  );
}
