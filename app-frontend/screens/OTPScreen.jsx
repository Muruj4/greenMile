import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { otpStyles } from "../Style/OTPScreenStyles";

export default function OTPScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const verifyOtp = async () => {
    if (otp.length !== 4) {
      setError("Please enter the 4-digit OTP code");
      return;
    }

    try {
      setError("");

      const res = await fetch(`${API_BASE_URL}/auth/driver/signup/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid OTP");

      navigation.navigate("Login");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View style={otpStyles.container}>
      <TouchableOpacity
        style={otpStyles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back-outline" size={18} color="#475569" />
        <Text style={otpStyles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={otpStyles.card}>
        <View style={otpStyles.iconCircle}>
          <Ionicons name="mail-outline" size={34} color="#013f2b" />
        </View>

        <Text style={otpStyles.title}>Enter OTP Code</Text>

        <Text style={otpStyles.description}>
          Check your email. We sent a one-time verification code to:
        </Text>

        <Text style={otpStyles.email}>{email}</Text>

        <TextInput
          value={otp}
          onChangeText={(v) => {
            setOtp(v.replace(/\D/g, "").slice(0, 4));
            setError("");
          }}
          keyboardType="numeric"
          maxLength={4}
          placeholder="0000"
          placeholderTextColor="#94a3b8"
          style={[otpStyles.input, error && otpStyles.inputError]}
        />

        {error ? <Text style={otpStyles.errorText}>{error}</Text> : null}

        <TouchableOpacity onPress={verifyOtp} style={otpStyles.button}>
          <Text style={otpStyles.buttonText}>Verify OTP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}