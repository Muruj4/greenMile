import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "../Style/LoginScreenStyles";

const API_BASE = "192.168.3.214:8000"; // change it to your ipv4

export default function LoginScreen({ navigation }) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const companies = [
    "Saudi Post (SPL)",
    "Aramex",
    "Naqel Express",
    "SMSA Express",
    "DHL Saudi Arabia",
    "UPS Saudi Arabia",
    "FedEx Saudi Arabia",
    "Amazon Saudi Arabia",
    "Noon",
    "Ninja",
    "HungerStation",
    "Jahez",
    "Mrsool",
    "Keeta",
    "ToYou",
    "Jtex",
    "Nana",
  ];

  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
  });

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "email" && emailError) setEmailError("");
  };

  const switchToSignIn = () => {
    setIsSignIn(true);
    setShowCompanyDropdown(false);
    setShowPassword(false);
    setEmailError("");
  };

  const switchToSignUp = () => {
    setIsSignIn(false);
    setShowCompanyDropdown(false);
    setShowPassword(false);
    setEmailError("");
  };

  const handleSubmit = async () => {
    // email validation
    if (!formData.email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!validateEmail(formData.email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");

    try {
      if (isSignIn) {
        // ---------- SIGN IN ----------
        if (!formData.password) {
          Alert.alert("Missing data", "Please enter your password.");
          return;
        }

        const res = await fetch(`${API_BASE}/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Sign in failed");

        // Optional: block manager accounts from mobile
        if (data.role !== "driver") {
          throw new Error("This app is for drivers only. Please use the manager web portal.");
        }

        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("role", data.role);

        if (rememberMe) await AsyncStorage.setItem("rememberMe", "1");
        else await AsyncStorage.removeItem("rememberMe");

        navigation.navigate("Trip");
        return;
      }

      // ---------- DRIVER SIGN UP ----------
      if (!formData.name.trim()) {
        Alert.alert("Missing data", "Please enter your name.");
        return;
      }
      if (!formData.company.trim()) {
        Alert.alert("Missing data", "Please select your company.");
        return;
      }
      if (!formData.password) {
        Alert.alert("Missing data", "Please enter a password.");
        return;
      }

      const res = await fetch(`${API_BASE}/auth/driver/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          company: formData.company.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Sign up failed");

      
      setIsSignIn(true);
      setShowCompanyDropdown(false);
      setShowPassword(false);

      // Clear fields (recommended)
      setFormData({ name: "", company: "", email: "", password: "" });
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // Whole page wrapper: View for Sign In, ScrollView for Sign Up
  const PageWrapper = isSignIn ? View : ScrollView;

  const pageWrapperProps = isSignIn
    ? { style: styles.container }
    : {
        style: styles.containerNoPadding,
        contentContainerStyle: styles.scrollContainer,
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: "handled",
      };

  return (
    <PageWrapper {...pageWrapperProps}>
      <View style={styles.backgroundOrb1} />
      <View style={styles.backgroundOrb2} />

      <View style={styles.contentWrapper}>
        <View style={styles.brandSection}>
          <Text style={styles.brandTitle}>GreenMile</Text>
          <Text style={styles.brandTagline}>
            Sustainable Last-Mile Delivery Platform
          </Text>
        </View>

        <View style={styles.authCard}>
          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isSignIn && styles.tabActive]}
              onPress={switchToSignIn}
            >
              <Text style={[styles.tabText, isSignIn && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, !isSignIn && styles.tabActive]}
              onPress={switchToSignUp}
            >
              <Text style={[styles.tabText, !isSignIn && styles.tabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {/* SIGN UP EXTRA FIELDS */}
            {!isSignIn && (
              <>
                {/* Full Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your name"
                      placeholderTextColor="#94a3b8"
                      value={formData.name}
                      onChangeText={(v) => handleInputChange("name", v)}
                    />
                  </View>
                </View>

                {/* Company dropdown */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Company Name</Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowCompanyDropdown(!showCompanyDropdown)}
                  >
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="business-outline"
                        size={20}
                        style={styles.inputIcon}
                      />

                      <View style={styles.input}>
                        <Text
                          style={
                            formData.company
                              ? styles.dropdownValueText
                              : styles.dropdownPlaceholderText
                          }
                        >
                          {formData.company || "Select your Company"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {showCompanyDropdown && (
                    <View style={styles.dropdownContainer}>
                      {companies.map((company, index, arr) => (
                        <TouchableOpacity
                          key={company}
                          onPress={() => {
                            handleInputChange("company", company);
                            setShowCompanyDropdown(false);
                          }}
                          style={[
                            styles.dropdownItem,
                            index === arr.length - 1 && styles.dropdownItemLast,
                          ]}
                        >
                          <Text style={styles.dropdownItemText}>{company}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Email */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, emailError && styles.inputError]}
                  placeholder="you@example.com"
                  placeholderTextColor="#94a3b8"
                  value={formData.email}
                  onChangeText={(v) => handleInputChange("email", v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={formData.password}
                  onChangeText={(v) => handleInputChange("password", v)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="rgba(5, 150, 105, 0.6)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember me (signin only) */}
            {isSignIn && (
              <View style={styles.rememberForgotRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {isSignIn ? "Sign In" : "Create Account"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </PageWrapper>
  );
}