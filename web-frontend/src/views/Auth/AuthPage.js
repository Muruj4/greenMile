import React, { useState, useEffect, useRef } from "react";
import logo from "../../assets/logo.png";
import { useNavigate } from "react-router-dom";
import {
  IoPersonOutline,
  IoBusinessOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoCheckmark,
  IoChevronDownOutline,
  IoArrowBackOutline,
} from "react-icons/io5";
import "./AuthPage.css";

const API_BASE = "http://127.0.0.1:8000";

export default function AuthPage() {
  const nav = useNavigate();
  const ddRef = useRef(null);

  const [isSignIn, setIsSignIn] = useState(true);
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
  });

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

  useEffect(() => {
    const onMouseDown = (e) => {
      if (!ddRef.current) return;
      if (!ddRef.current.contains(e.target)) setShowCompanyDropdown(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowCompanyDropdown(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInputChange = (field, value) => {
    const nextValue = field === "password" ? value.slice(0, 8) : value;

    setFormData((p) => ({ ...p, [field]: nextValue }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
      general: "",
    }));
  };

  const switchToSignIn = () => {
    setIsSignIn(true);
    setOtpMode(false);
    setOtpCode("");
    setPendingEmail("");
    setShowCompanyDropdown(false);
    setErrors({});
    setShowPassword(false);
  };

  const switchToSignUp = () => {
    setIsSignIn(false);
    setOtpMode(false);
    setOtpCode("");
    setPendingEmail("");
    setShowCompanyDropdown(false);
    setErrors({});
    setShowPassword(false);
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
      newErrors.email = "Please enter your email";
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setErrors({});

      if (isSignIn) {
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

        if (data.role !== "manager") {
          throw new Error("This website is for managers only. Please use the driver app.");
        }

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("token", data.token);
        storage.setItem("role", data.role);
        storage.setItem("company_id", data.company_id ?? "");
        storage.setItem("company", data.company ?? "");

        nav("/dashboard");
        return;
      }

      const res = await fetch(`${API_BASE}/auth/manager/signup/request-otp`, {
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
      if (!res.ok) throw new Error(data.detail || "Failed to send OTP");

      setPendingEmail(formData.email.trim());
      setOtpMode(true);
      setOtpCode("");
      setErrors({});
    } catch (error) {
      setErrors({ general: error.message });
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (otpCode.trim().length !== 4) {
      setErrors({ otp: "Please enter the 4-digit OTP code" });
      return;
    }

    try {
      setErrors({});

      const res = await fetch(`${API_BASE}/auth/manager/signup/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          otp: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid OTP");

      setOtpMode(false);
      setIsSignIn(true);
      setOtpCode("");
      setPendingEmail("");
      setShowPassword(false);
      setFormData({
        name: "",
        company: "",
        email: "",
        password: "",
      });

      setErrors({ general: "Account verified successfully. Please sign in." });
    } catch (error) {
      setErrors({ otp: error.message });
    }
  };

  const handleResendOtp = async () => {
    try {
      setErrors({});

      const res = await fetch(`${API_BASE}/auth/manager/signup/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          company: formData.company.trim(),
          email: pendingEmail,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to resend OTP");

      setOtpCode("");
      setErrors({ otp: "A new OTP has been sent to your email." });
    } catch (error) {
      setErrors({ otp: error.message });
    }
  };

  return (
    <div className={`gm-page ${isSignIn ? "gm-page--signin" : "gm-page--signup"}`}>
      <div className="gm-orb gm-orb--1" />
      <div className="gm-orb gm-orb--2" />

      <div className="gm-content">
        <div className="gm-brand">
          <img src={logo} alt="GreenMile Logo" className="gm-logo" />
          <div className="gm-brand__title">
            <span className="gm-brandGreen">Green</span>
            <span className="gm-brandMile">Mile</span>
          </div>
          <div className="gm-brand__tagline">
            Sustainable Last-Mile Delivery Platform
          </div>
        </div>

        <div className="gm-card">
          {otpMode ? (
            <form className="gm-form gm-otpForm" onSubmit={handleVerifyOtp}>
              <button
                type="button"
                className="gm-backBtn"
                onClick={() => {
                  setOtpMode(false);
                  setOtpCode("");
                  setErrors({});
                }}
              >
                <IoArrowBackOutline size={18} />
                Back
              </button>

              <div className="gm-otpHeader">
                <div className="gm-otpIcon">
                  <IoMailOutline size={30} />
                </div>
                <h2 className="gm-otpTitle">Enter OTP Code</h2>
                <p className="gm-otpText">
                  Check your email. We sent a one-time verification code to:
                </p>
                <p className="gm-otpEmail">{pendingEmail}</p>
              </div>

              <input
                className={`gm-otpInput ${errors.otp ? "gm-inputWrap--error" : ""}`}
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setOtpCode(value);
                  setErrors((prev) => ({ ...prev, otp: "" }));
                }}
                placeholder="0000"
                inputMode="numeric"
                maxLength={4}
              />

              {errors.otp && <div className="gm-error gm-centerError">{errors.otp}</div>}

              <button type="submit" className="gm-submit">
                <span className="gm-submitText">Verify OTP</span>
              </button>

              <button type="button" className="gm-resendBtn" onClick={handleResendOtp}>
                Didn’t get OTP? <span>Resend OTP</span>
              </button>
            </form>
          ) : (
            <>
              <div className="gm-tabs">
                <button
                  type="button"
                  className={`gm-tab ${isSignIn ? "gm-tab--active" : ""}`}
                  onClick={switchToSignIn}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  className={`gm-tab ${!isSignIn ? "gm-tab--active" : ""}`}
                  onClick={switchToSignUp}
                >
                  Sign Up
                </button>
              </div>

              <form className="gm-form" onSubmit={handleSubmit}>
                {!isSignIn && (
                  <>
                    <div className="gm-group">
                      <label className="gm-label">Full Name</label>
                      <div className={`gm-inputWrap ${errors.name ? "gm-inputWrap--error" : ""}`}>
                        <span className="gm-icon">
                          <IoPersonOutline size={20} />
                        </span>
                        <input
                          className="gm-input"
                          placeholder="Enter your name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                        />
                      </div>
                      {errors.name && <div className="gm-error">{errors.name}</div>}
                    </div>

                    <div className="gm-group gm-group--dd" ref={ddRef}>
                      <label className="gm-label">Company Name</label>
                      <button
                        type="button"
                        className="gm-dropdownBtn"
                        onClick={() => setShowCompanyDropdown((v) => !v)}
                        aria-expanded={showCompanyDropdown}
                      >
                        <div className={`gm-inputWrap gm-inputWrap--dropdown ${errors.company ? "gm-inputWrap--error" : ""}`}>
                          <span className="gm-icon">
                            <IoBusinessOutline size={20} />
                          </span>
                          <div className="gm-input gm-input--fake">
                            <span className={formData.company ? "gm-ddValue" : "gm-ddPlaceholder"}>
                              {formData.company || "Select your Company"}
                            </span>
                          </div>
                          <span className={`gm-ddChevron ${showCompanyDropdown ? "gm-ddChevron--up" : ""}`}>
                            <IoChevronDownOutline size={18} />
                          </span>
                        </div>
                      </button>

                      {errors.company && <div className="gm-error">{errors.company}</div>}

                      {showCompanyDropdown && (
                        <div className="gm-dropdown" role="listbox">
                          {companies.map((company, idx) => (
                            <button
                              key={`${company}-${idx}`}
                              type="button"
                              className="gm-ddItem"
                              role="option"
                              onClick={() => {
                                handleInputChange("company", company);
                                setShowCompanyDropdown(false);
                              }}
                            >
                              {company}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="gm-group">
                  <label className="gm-label">Email Address</label>
                  <div className={`gm-inputWrap ${errors.email ? "gm-inputWrap--error" : ""}`}>
                    <span className="gm-icon">
                      <IoMailOutline size={20} />
                    </span>
                    <input
                      className="gm-input"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      inputMode="email"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <div className="gm-error">{errors.email}</div>}
                </div>

                <div className="gm-group">
                  <label className="gm-label">Password</label>
                  <div className={`gm-inputWrap ${errors.password ? "gm-inputWrap--error" : ""}`}>
                    <span className="gm-icon">
                      <IoLockClosedOutline size={20} />
                    </span>
                    <input
                      className="gm-input"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      maxLength={8}
                      type={showPassword ? "text" : "password"}
                      autoComplete={isSignIn ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      className="gm-eye"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <IoEyeOutline size={20} /> : <IoEyeOffOutline size={20} />}
                    </button>
                  </div>

                  {errors.password && <div className="gm-error">{errors.password}</div>}

                  {!isSignIn && (
                    <div className="gm-passwordRules">
                      <div className={passwordRules.length ? "gm-rule gm-rule--ok" : "gm-rule gm-rule--bad"}>
                        {passwordRules.length ? "✓" : "✕"} Exactly 8 characters
                      </div>
                      <div className={passwordRules.capital ? "gm-rule gm-rule--ok" : "gm-rule gm-rule--bad"}>
                        {passwordRules.capital ? "✓" : "✕"} At least 1 capital letter
                      </div>
                      <div className={passwordRules.number ? "gm-rule gm-rule--ok" : "gm-rule gm-rule--bad"}>
                        {passwordRules.number ? "✓" : "✕"} At least 1 number
                      </div>
                      <div className={passwordRules.special ? "gm-rule gm-rule--ok" : "gm-rule gm-rule--bad"}>
                        {passwordRules.special ? "✓" : "✕"} At least 1 special character
                      </div>
                    </div>
                  )}
                </div>

                {isSignIn && (
                  <div className="gm-row">
                    <button
                      type="button"
                      className="gm-checkRow"
                      onClick={() => setRememberMe((v) => !v)}
                    >
                      <span className={`gm-check ${rememberMe ? "gm-check--on" : ""}`}>
                        {rememberMe && <IoCheckmark size={16} />}
                      </span>
                      <span className="gm-checkText">Remember me</span>
                    </button>
                    <button type="button" className="gm-linkBtn">
                      Forgot password?
                    </button>
                  </div>
                )}

                {errors.general && <div className="gm-error">{errors.general}</div>}

                <button type="submit" className="gm-submit">
                  <span className="gm-submitText">
                    {isSignIn ? "Sign In" : "Send OTP"}
                  </span>
                </button>

                <div className="gm-switchRow">
                  {isSignIn ? (
                    <button type="button" className="gm-switchBtn" onClick={switchToSignUp}>
                      Don't have an account?{" "}
                      <span className="gm-switchStrong">Sign Up</span>
                    </button>
                  ) : (
                    <button type="button" className="gm-switchBtn" onClick={switchToSignIn}>
                      Already have an account?{" "}
                      <span className="gm-switchStrong">Sign In</span>
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}