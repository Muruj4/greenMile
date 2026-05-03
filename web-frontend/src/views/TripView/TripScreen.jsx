import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoCarSportOutline,
  IoCalendarOutline,
  IoLocationOutline,
  IoFlagOutline,
  IoMapOutline,
  IoChevronDownOutline,
} from "react-icons/io5";
import Nav from "../Dashboard/Nav";
import TripProgressBar from "./TripProgressBar";
import "./TripScreen.css";

/* ── Reusable custom dropdown ── */
function CustomSelect({ icon, placeholder, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="ts-dd-wrap" ref={ref}>
      <button
        type="button"
        className={`field ts-dd-btn ${open ? "field--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="field-icon">{icon}</span>
        <span className={`ts-dd-text ${value ? "ts-dd-text--val" : ""}`}>
          {value || placeholder}
        </span>
        <span className={`ts-dd-chevron ${open ? "ts-dd-chevron--up" : ""}`}>
          <IoChevronDownOutline size={16} />
        </span>
      </button>

      {open && (
        <div className="ts-dropdown">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={`ts-dd-item ${value === opt ? "ts-dd-item--selected" : ""}`}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function TripScreen() {
  const navigate = useNavigate();

  const companyName =
    localStorage.getItem("company") ||
    sessionStorage.getItem("company") ||
    "Company";

  const [vehicleType, setVehicleType] = useState("");
  const [modelYear,   setModelYear]   = useState("");
  const [fuelType,    setFuelType]    = useState("Petrol");
  const [origin,      setOrigin]      = useState("");
  const [destination, setDestination] = useState("");
  const [city,        setCity]        = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const vehicleOptions = ["Car", "SUV", "Van", "Bus", "Pickup Truck", "Truck", "Motorcycle"];
  const yearOptions    = Array.from({ length: 2025 - 1960 + 1 }, (_, i) => String(2025 - i));
  const cityOptions    = [
    "Riyadh", "Jeddah", "Dammam", "Khobar", "Dhahran",
    "Makkah", "Madinah", "Taif", "Tabuk", "Abha",
    "Khamis Mushait", "Jubail", "Hail", "Yanbu",
  ];

  async function submit_trip(e) {
    e.preventDefault();
    if (!vehicleType) { setError("Please select a vehicle type."); return; }
    if (!modelYear)   { setError("Please select a model year.");   return; }
    if (!city)        { setError("Please select a city.");         return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/process_trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, city, vehicleType, fuelType, modelYear }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to fetch routes");
      const meta = { origin, destination, city, vehicleType, fuelType, modelYear };
      navigate("/map", { state: { routes: data.routes, meta } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="trip-page">
      <Nav companyName={companyName} />
      <TripProgressBar currentStep={1} />

      <div className="trip-page__content">
        <div className="trip-orb trip-orb--1" />
        <div className="trip-orb trip-orb--2" />

        <div className="trip-screen">
          <div className="trip-header">
            <h2>Create a <span className="highlight">Trip</span></h2>
            <p className="trip-subtitle">
              Enter your trip details to generate eco-friendly routes.
            </p>
          </div>

          <form onSubmit={submit_trip}>

            {/* Vehicle row */}
            <div className="form-row">
              <CustomSelect
                icon={<IoCarSportOutline size={18} />}
                placeholder="Vehicle Type"
                value={vehicleType}
                onChange={setVehicleType}
                options={vehicleOptions}
              />
              <CustomSelect
                icon={<IoCalendarOutline size={18} />}
                placeholder="Model Year"
                value={modelYear}
                onChange={setModelYear}
                options={yearOptions}
              />
            </div>

            {/* Fuel toggle */}
            <div className="fuel-toggle">
              <button type="button" className={fuelType === "Petrol" ? "active" : ""} onClick={() => setFuelType("Petrol")}>Petrol</button>
              <button type="button" className={fuelType === "Diesel" ? "active" : ""} onClick={() => setFuelType("Diesel")}>Diesel</button>
            </div>

            {/* City */}
            <CustomSelect
              icon={<IoMapOutline size={18} />}
              placeholder="Select City"
              value={city}
              onChange={setCity}
              options={cityOptions}
            />

            {/* Origin & Destination */}
            <div className="form-row">
              <div className="field">
                <span className="field-icon"><IoLocationOutline size={18} /></span>
                <input
                  placeholder="Origin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <span className="field-icon"><IoFlagOutline size={18} /></span>
                <input
                  placeholder="Destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
              </div>
            </div>

            <button className="trip-submit" type="submit" disabled={loading}>
              <span className="trip-submitText">
                {loading ? "Fetching routes..." : "Create Trip →"}
              </span>
            </button>

            {error && <p className="error-message">⚠️ {error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}