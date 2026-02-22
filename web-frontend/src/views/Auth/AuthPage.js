import React, { useMemo, useState, useEffect, useRef } from "react";
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
} from "react-icons/io5";
import "./AuthPage.css";
const API_BASE = "http://127.0.0.1:8000"; 

export default function AuthPage() {
  const nav = useNavigate();
  const ddRef = useRef(null);

  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
  });

  const [touched, setTouched] = useState({ email: false });
  const [emailError, setEmailError] = useState("");

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

  const computedEmailError = useMemo(() => {
    if (!touched.email) return "";
    if (!formData.email.trim()) return "Email is required";
    if (!validateEmail(formData.email.trim())) return "Please enter a valid email address";
    return "";
  }, [formData.email, touched.email]);

  const handleInputChange = (field, value) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (field === "email") setEmailError("");
  };

  const switchToSignIn = () => {
    setIsSignIn(true);
    setShowCompanyDropdown(false);
    setTouched({ email: false });
    setEmailError("");
    setShowPassword(false);
  };

  const switchToSignUp = () => {
    setIsSignIn(false);
    setShowCompanyDropdown(false);
    setTouched({ email: false });
    setEmailError("");
    setShowPassword(false);
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setTouched({ email: true });

  const err = computedEmailError;
  if (err) {
    setEmailError(err);
    return;
  }

  // extra validation for Sign Up
  if (!isSignIn) {
    if (!formData.name.trim()) {
      setEmailError("Name is required");
      return;
    }
    if (!formData.company.trim()) {
      setEmailError("Company is required");
      return;
    }
    if (!formData.password.trim()) {
      setEmailError("Password is required");
      return;
    }
  } else {
    if (!formData.password.trim()) {
      setEmailError("Password is required");
      return;
    }
  }

  setEmailError("");

  try {
    if (isSignIn) {
      // -------- SIGN IN --------
      const res = await fetch(`${API_BASE}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "SignIn failed");

      // save token
      if (rememberMe) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
      } else {
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("role", data.role);
      }

      nav("/trip");

    } else {

      const endpoint = `${API_BASE}/auth/manager/signup`;

      const res = await fetch(endpoint, {
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
      if (!res.ok) throw new Error(data.detail || "Signup failed");

      
      setIsSignIn(true);
      setShowCompanyDropdown(false);

     
      setFormData((p) => ({ ...p, name: "", company: "", password: "" }));

    }
  } catch (error) {
    setEmailError(error.message);
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

          <div className="gm-brand__tagline">Sustainable Last-Mile Delivery Platform</div>
        </div>

        <div className="gm-card">
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
                  <div className="gm-inputWrap">
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
                </div>

                <div className="gm-group gm-group--dd" ref={ddRef}>
                  <label className="gm-label">Company Name</label>

                  <button
                    type="button"
                    className="gm-dropdownBtn"
                    onClick={() => setShowCompanyDropdown((v) => !v)}
                    aria-expanded={showCompanyDropdown}
                  >
                    <div className="gm-inputWrap gm-inputWrap--dropdown">
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

                  {showCompanyDropdown && (
                    <div className="gm-dropdown" role="listbox">
                      {companies.map((company, idx) => (
                        <button
                          key={`${company}-${idx}`}
                          type="button"
                          className="gm-ddItem"
                          onClick={() => {
                            handleInputChange("company", company);
                            setShowCompanyDropdown(false);
                          }}
                          role="option"
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
              <div className={`gm-inputWrap ${emailError ? "gm-inputWrap--error" : ""}`}>
                <span className="gm-icon">
                  <IoMailOutline size={20} />
                </span>
                <input
                  className="gm-input"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={() => setTouched({ email: true })}
                  inputMode="email"
                  autoComplete="email"
                />
              </div>
              {emailError ? <div className="gm-error">{emailError}</div> : null}
            </div>

            <div className="gm-group">
              <label className="gm-label">Password</label>
              <div className="gm-inputWrap">
                <span className="gm-icon">
                  <IoLockClosedOutline size={20} />
                </span>
                <input
                  className="gm-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
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
            </div>

            {isSignIn && (
              <div className="gm-row">
                <button type="button" className="gm-checkRow" onClick={() => setRememberMe((v) => !v)}>
                  <span className={`gm-check ${rememberMe ? "gm-check--on" : ""}`}>
                    {rememberMe ? <IoCheckmark size={16} /> : null}
                  </span>
                  <span className="gm-checkText">Remember me</span>
                </button>

                <button type="button" className="gm-linkBtn">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" className="gm-submit">
              <span className="gm-submitText">{isSignIn ? "Sign In" : "Create Account"}</span>
            </button>

            <div className="gm-switchRow">
              {isSignIn ? (
                <button type="button" className="gm-switchBtn" onClick={switchToSignUp}>
                  Don’t have an account? <span className="gm-switchStrong">Sign Up</span>
                </button>
              ) : (
                <button type="button" className="gm-switchBtn" onClick={switchToSignIn}>
                  Already have an account? <span className="gm-switchStrong">Sign In</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
