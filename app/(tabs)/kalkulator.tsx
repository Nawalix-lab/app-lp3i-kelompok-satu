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
import "../../global.css";

export default function KalkulatorScreen() {
  const [display, setDisplay] = useState("0");
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // === HANDLE INPUT DIGIT ===
  const handleInputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  // === DECIMAL ===
  const handleInputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  // === CLEAR ===
  const handleClear = () => {
    setDisplay("0");
    setFirstOperand(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  // === BACKSPACE ===
  const handleBackspace = () => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  // === PERFORM OPERATION ===
  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (firstOperand == null) {
      setFirstOperand(inputValue);
    } else if (operator) {
      let result = firstOperand;

      switch (operator) {
        case "+":
          result = firstOperand + inputValue;
          break;
        case "-":
          result = firstOperand - inputValue;
          break;
        case "*":
          result = firstOperand * inputValue;
          break;
        case "/":
          if (inputValue === 0) {
            Alert.alert("Error", "Tidak bisa membagi dengan 0");
            handleClear();
            return;
          }
          result = firstOperand / inputValue;
          break;
      }

      setDisplay(String(result));
      setFirstOperand(result);
    }

    setOperator(nextOperator === "=" ? null : nextOperator);
    setWaitingForOperand(true);
  };

  // === UI BUTTON ===
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
        <Text className="text-xs text-gray-500 mt-1">Alat bantu hitung cepat</Text>
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

const styles = StyleSheet.create({
  button: {
    aspectRatio: 1,
    height: 70,
  },
  equalsButton: {
    height: 148,
  },
});
