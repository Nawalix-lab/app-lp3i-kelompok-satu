import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import "../../global.css"; // Sesuaikan jika path global.css berbeda

export default function KalkulatorScreen() {
  const [display, setDisplay] = useState("0");
  const [currentValue, setCurrentValue] = useState("0");
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // Fungsi untuk menangani input angka
  const handleInputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setCurrentValue(digit);
      setWaitingForOperand(false);
    } else {
      if (currentValue === "0") {
        setDisplay(digit);
        setCurrentValue(digit);
      } else {
        setDisplay(currentValue + digit);
        setCurrentValue(currentValue + digit);
      }
    }
  };

  // Fungsi untuk menangani input desimal
  const handleInputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setCurrentValue("0.");
      setWaitingForOperand(false);
    } else if (!currentValue.includes(".")) {
      setDisplay(currentValue + ".");
      setCurrentValue(currentValue + ".");
    }
  };

  // Fungsi untuk membersihkan (Clear All)
  const handleClear = () => {
    setDisplay("0");
    setCurrentValue("0");
    setOperator(null);
    setWaitingForOperand(false);
  };

  // Fungsi untuk menghapus satu digit (Backspace)
  const handleBackspace = () => {
    if (display.length > 1) {
      const newDisplay = display.slice(0, -1);
      setDisplay(newDisplay);
      setCurrentValue(newDisplay);
    } else {
      setDisplay("0");
      setCurrentValue("0");
    }
  };

  // Fungsi untuk menangani operasi matematika
  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(currentValue);

    if (operator && !waitingForOperand) {
      // Hitung hasil operasi sebelumnya
      const prevValue = parseFloat(display); // Untuk menghindari double perhitungan jika currentValue sudah diubah

      let result = prevValue;

      switch (operator) {
        case "+":
          result = parseFloat(currentValue) + parseFloat(display);
          break;
        case "-":
          result = parseFloat(display) - parseFloat(currentValue);
          break;
        case "*":
          result = parseFloat(display) * parseFloat(currentValue);
          break;
        case "/":
          if (parseFloat(currentValue) === 0) {
            Alert.alert("Error", "Pembagian dengan nol tidak diizinkan.");
            handleClear();
            return;
          }
          result = parseFloat(display) / parseFloat(currentValue);
          break;
        default:
          break;
      }
      
      const resultString = result.toString();
      setDisplay(resultString);
      setCurrentValue(resultString);
    }
    
    // Set operator berikutnya
    setWaitingForOperand(true);
    setOperator(nextOperator === "=" ? null : nextOperator);
    // Jika operator bukan '=', simpan nilai display saat ini sebagai operand pertama
    if (nextOperator !== "=") {
        setCurrentValue(display);
    }
  };
  
  // Fungsi untuk membuat tombol
  const renderButton = (
    label: string,
    onPress: () => void,
    className: string = "bg-gray-200"
  ) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`flex-1 m-1 items-center justify-center rounded-2xl ${className}`}
      style={styles.button}
    >
      <Text className="text-3xl font-light text-gray-800">{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* HEADER */}
      <View className="pt-16 pb-6 px-5 items-center bg-white border-b border-gray-100">
        <Text className="text-xl font-semibold text-gray-900">
          <Ionicons name="calculator-outline" size={24} color="#3B82F6" /> Kalkulator POS
        </Text>
        <Text className="text-xs text-gray-500 mt-1">
            Alat bantu hitung cepat
        </Text>
      </View>

      {/* DISPLAY */}
      <View className="p-5 bg-gray-50 flex-grow justify-end">
        <Text
          className="text-6xl font-light text-gray-900 text-right"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {display}
        </Text>
      </View>

      {/* KEYPAD */}
      <View className="p-3 bg-white">
        {/* Row 1 */}
        <View className="flex-row justify-between">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClear}
            className="flex-1 m-1 items-center justify-center rounded-2xl bg-gray-300"
            style={styles.button}
          >
            <Text className="text-3xl font-light text-red-600">AC</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBackspace}
            className="flex-1 m-1 items-center justify-center rounded-2xl bg-gray-300"
            style={styles.button}
          >
            <Ionicons name="backspace-outline" size={30} color="#1F2937" />
          </TouchableOpacity>
          {renderButton("÷", () => performOperation("/"), "bg-blue-500")}
          {renderButton("×", () => performOperation("*"), "bg-blue-500")}
        </View>

        {/* Row 2 */}
        <View className="flex-row justify-between">
          {renderButton("7", () => handleInputDigit("7"))}
          {renderButton("8", () => handleInputDigit("8"))}
          {renderButton("9", () => handleInputDigit("9"))}
          {renderButton("-", () => performOperation("-"), "bg-blue-500")}
        </View>

        {/* Row 3 */}
        <View className="flex-row justify-between">
          {renderButton("4", () => handleInputDigit("4"))}
          {renderButton("5", () => handleInputDigit("5"))}
          {renderButton("6", () => handleInputDigit("6"))}
          {renderButton("+", () => performOperation("+"), "bg-blue-500")}
        </View>

        {/* Row 4 */}
        <View className="flex-row justify-between">
          <View className="flex-[3] flex-row">
            <View className="flex-1">
              <View className="flex-row">
                {renderButton("1", () => handleInputDigit("1"))}
                {renderButton("2", () => handleInputDigit("2"))}
                {renderButton("3", () => handleInputDigit("3"))}
              </View>
              <View className="flex-row">
                {renderButton("0", () => handleInputDigit("0"), "flex-[2]")}
                {renderButton(".", handleInputDecimal)}
              </View>
            </View>
          </View>

          <View className="flex-1 m-1">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => performOperation("=")}
              className="flex-1 items-center justify-center rounded-2xl bg-blue-600"
              style={styles.equalsButton}
            >
              <Text className="text-4xl font-light text-white">=</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// Tambahkan StyleSheet untuk tinggi tombol agar layout lebih rapi dan konsisten
const styles = StyleSheet.create({
  button: {
    aspectRatio: 1, // Membuat tombol menjadi persegi
    height: 70, // Sesuaikan tinggi sesuai keinginan
  },
  equalsButton: {
    height: 148, // Kira-kira dua kali tinggi tombol lain
  },
});