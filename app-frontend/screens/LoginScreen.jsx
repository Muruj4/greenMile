import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "../Style/LoginScreenStyles";
import { API_BASE_URL } from "../config";

export default function LoginScreen({ navigation }) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

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

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
  });

  const passwordRules = {
    length: formData.password.length === 8,
    capital: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  const isPasswordValid =
    passwordRules.length &&
    passwordRules.capital &&
    passwordRules.number &&
    passwordRules.special;

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInputChange = (field, value) => {
    const nextValue = field === "password" ? value.slice(0, 8) : value;

    setFormData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
      general: "",
    }));
  };

  const switchToSignIn = () => {
    setIsSignIn(true);
    setShowCompanyDropdown(false);
    setShowPassword(false);
    setErrors({});
  };

  const switchToSignUp = () => {
    setIsSignIn(false);
    setShowCompanyDropdown(false);
    setShowPassword(false);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isSignIn && !formData.name.trim()) {
      newErrors.name = "Please enter your name";
    }

    if (!isSignIn && !formData.company.trim()) {
      newErrors.company = "Please select your company";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Please enter your password";
    }

    if (!isSignIn && formData.password.trim() && !isPasswordValid) {
      newErrors.password = "Password must match all requirements";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setErrors({});

      if (isSignIn) {
        const res = await fetch(`${API_BASE_URL}/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Sign in failed");
        }

        if (data.role !== "driver") {
          throw new Error(
            "This app is for drivers only. Please use the manager web portal."
          );
        }

        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("role", data.role);

        if (rememberMe) {
          await AsyncStorage.setItem("rememberMe", "1");
        } else {
          await AsyncStorage.removeItem("rememberMe");
        }

        navigation.navigate("Trip");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/auth/driver/signup/request-otp`, {
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

      if (!res.ok) {
        throw new Error(data.detail || "Failed to send OTP");
      }

      navigation.navigate("OTP", {
        email: formData.email.trim(),
      });

      setShowCompanyDropdown(false);
      setShowPassword(false);
      setErrors({});
    } catch (err) {
      setErrors({ general: err.message });
    }
  };

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
          <Text style={styles.brandTitle}>
            <Text style={styles.greenText}>Green</Text>
            <Text style={styles.mileText}>Mile</Text>
          </Text>

          <Text style={styles.brandTagline}>
            Sustainable Last-Mile Delivery Platform
          </Text>
        </View>

        <View style={styles.authCard}>
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
            {!isSignIn && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      style={styles.inputIcon}
                    />

                    <TextInput
                      style={[styles.input, errors.name && styles.inputError]}
                      placeholder="Enter your name"
                      placeholderTextColor="#94a3b8"
                      value={formData.name}
                      onChangeText={(v) => handleInputChange("name", v)}
                    />
                  </View>

                  {errors.name ? (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  ) : null}
                </View>

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

                      <View
                        style={[
                          styles.input,
                          errors.company && styles.inputError,
                        ]}
                      >
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

                  {errors.company ? (
                    <Text style={styles.errorText}>{errors.company}</Text>
                  ) : null}

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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  style={styles.inputIcon}
                />

                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="you@example.com"
                  placeholderTextColor="#94a3b8"
                  value={formData.email}
                  onChangeText={(v) => handleInputChange("email", v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  style={styles.inputIcon}
                />

                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={formData.password}
                  onChangeText={(v) => handleInputChange("password", v)}
                  maxLength={8}
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

              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}

              {!isSignIn && (
                <View style={styles.passwordRulesContainer}>
                  <Text
                    style={[
                      styles.passwordRuleText,
                      passwordRules.length
                        ? styles.passwordRuleValid
                        : styles.passwordRuleInvalid,
                    ]}
                  >
                    {passwordRules.length ? "✓" : "✕"} Exactly 8 characters
                  </Text>

                  <Text
                    style={[
                      styles.passwordRuleText,
                      passwordRules.capital
                        ? styles.passwordRuleValid
                        : styles.passwordRuleInvalid,
                    ]}
                  >
                    {passwordRules.capital ? "✓" : "✕"} At least 1 capital
                    letter
                  </Text>

                  <Text
                    style={[
                      styles.passwordRuleText,
                      passwordRules.number
                        ? styles.passwordRuleValid
                        : styles.passwordRuleInvalid,
                    ]}
                  >
                    {passwordRules.number ? "✓" : "✕"} At least 1 number
                  </Text>

                  <Text
                    style={[
                      styles.passwordRuleText,
                      passwordRules.special
                        ? styles.passwordRuleValid
                        : styles.passwordRuleInvalid,
                    ]}
                  >
                    {passwordRules.special ? "✓" : "✕"} At least 1 special
                    character
                  </Text>
                </View>
              )}
            </View>

            {isSignIn && (
              <View style={styles.rememberForgotRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxChecked,
                    ]}
                  >
                    {rememberMe && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>

                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            )}

            {errors.general ? (
              <Text style={styles.errorText}>{errors.general}</Text>
            ) : null}

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {isSignIn ? "Sign In" : "Send OTP"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </PageWrapper>
  );
}