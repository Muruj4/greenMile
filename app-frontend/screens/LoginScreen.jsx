import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from "../Style/LoginScreenStyles";

export default function LoginScreen({ navigation }) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    password: ''
  });

  const validateEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const handleSubmit = () => {
    if (!formData.email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');
    console.log('Form submitted:', formData);

    navigation.navigate('Trip');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'email' && emailError) {
      setEmailError('');
    }
  };

  const switchToSignIn = () => {
    setIsSignIn(true);
    setShowCompanyDropdown(false);
  };

  const switchToSignUp = () => {
    setIsSignIn(false);
    setShowCompanyDropdown(false);
  };

  // ✅ Whole page wrapper: View for Log In, ScrollView for Sign Up
  const PageWrapper = isSignIn ? View : ScrollView;

  const pageWrapperProps = isSignIn
    ? { style: styles.container }
    : {
        style: styles.containerNoPadding,
        contentContainerStyle: styles.scrollContainer,
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: 'handled',
      };

  return (
    <PageWrapper {...pageWrapperProps}>
      {/* Background decorations */}
      <View style={styles.backgroundOrb1} />
      <View style={styles.backgroundOrb2} />

      <View style={styles.contentWrapper}>
        {/* Brand Section */}
        <View style={styles.brandSection}>
          <Text style={styles.brandTitle}>GreenMlie</Text>
          <Text style={styles.brandTagline}>Sustainable Travel Solutions</Text>
        </View>

        {/* Main Card */}
        <View style={styles.authCard}>
          {/* Toggle Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isSignIn && styles.tabActive]}
              onPress={switchToSignIn}
            >
              <Text style={[styles.tabText, isSignIn && styles.tabTextActive]}>
                Log In
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

          {/* Form */}
          <View style={styles.form}>
            {!isSignIn && (
              <>
                {/* Full Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your name"
                      placeholderTextColor="#94a3b8"
                      value={formData.name}
                      onChangeText={(value) => handleInputChange('name', value)}
                    />
                  </View>
                </View>

                {/* Company Name (Dropdown) */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Company Name</Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowCompanyDropdown(!showCompanyDropdown)}
                  >
                    <View style={styles.inputWrapper}>
                      <Ionicons name="business-outline" size={20} style={styles.inputIcon} />

                      <View style={styles.input}>
                        <Text
                          style={
                            formData.company
                              ? styles.dropdownValueText
                              : styles.dropdownPlaceholderText
                          }
                        >
                          {formData.company || 'Select your Company'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {showCompanyDropdown && (
                    <View style={styles.dropdownContainer}>
                      {['Aramco','Other'].map((company, index, arr) => (
                        <TouchableOpacity
                          key={company}
                          onPress={() => {
                            handleInputChange('company', company);
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
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="rgba(5, 150, 105, 0.6)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember me / Forgot password (Log In only) */}
            {isSignIn && (
              <View style={styles.rememberForgotRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
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

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>
                {isSignIn ? 'Log In' : 'Create Account'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </PageWrapper>
  );
}
