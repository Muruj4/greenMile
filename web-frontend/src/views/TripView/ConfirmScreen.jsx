import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Nav from "../Dashboard/Nav";
import TripProgressBar from "./TripProgressBar";
import "./ConfirmScreen.css";

export default function ConfirmScreen() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const route     = state?.route ?? null;
  const meta      = state?.meta  ?? null;

  const companyName =
    localStorage.getItem("company") ||
    sessionStorage.getItem("company") ||
    "Company";

  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  const colorMap = { green: "#10b981", orange: "#f59e0b", red: "#ef4444" };

  /* handle both field name formats from backend */
  const displayDistance = route?.distance ?? (route?.distance_km ? `${route.distance_km} km` : "—");
  const displayDuration = route?.duration ?? (route?.duration_min ? `${route.duration_min} mins` : "—");
  const displayCo2e     = route?.emissions?.co2e ?? route?.co2e ?? null;

  const handleSave = async () => {
    if (!meta || !route) { setSaveErr("Missing trip data."); return; }
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) { setSaveErr("Session expired. Please log in again."); return; }

    setSaving(true);
    setSaveErr("");
    try {
      const res = await fetch("http://127.0.0.1:8000/trips/save_selected", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          origin:      meta.origin,
          destination: meta.destination,
          city:        meta.city,
          vehicleType: meta.vehicleType,
          fuelType:    meta.fuelType,
          modelYear:   Number(meta.modelYear),
          route,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save");
      setSaveMsg("Route saved successfully!");
      setTimeout(() => navigate("/dashboard"), 1800);
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cs-page">
      <Nav companyName={companyName} />
      <TripProgressBar currentStep={3} />

      <div className="cs-content">
        <div className="cs-orb cs-orb--1" />
        <div className="cs-orb cs-orb--2" />

        <div className="cs-card">

          {/* Header */}
          <div className="cs-header">
            <h2 className="cs-title">
              Review Your <em>Selection</em>
            </h2>
            <p className="cs-sub">Check your details before saving the route</p>
          </div>

          {/* Selected route highlight */}
          {route && (
            <div className="cs-route-box">
              <div className="cs-route-top">
                <span
                  className="cs-route-dot"
                  style={{ background: colorMap[route.color] || "#10b981" }}
                />
                <span className="cs-route-name">{route.summary}</span>
                <span className={`cs-route-badge cs-route-badge--${route.color}`}>
                  {route.color?.toUpperCase()}
                </span>
              </div>
              <div className="cs-route-meta">
                <span>{displayDistance}</span>
                <span>{displayDuration}</span>
              </div>
            </div>
          )}

          {/* Details table */}
          <div className="cs-table">
            <div className="cs-row">
              <span className="cs-key">Origin</span>
              <span className="cs-val">{meta?.origin ?? "—"}</span>
            </div>
            <div className="cs-row">
              <span className="cs-key">Destination</span>
              <span className="cs-val">{meta?.destination ?? "—"}</span>
            </div>
            <div className="cs-row">
              <span className="cs-key">City</span>
              <span className="cs-val">{meta?.city ?? "—"}</span>
            </div>
            <div className="cs-row">
              <span className="cs-key">Vehicle</span>
              <span className="cs-val">{meta?.vehicleType ?? "—"} · {meta?.modelYear ?? "—"}</span>
            </div>
            <div className="cs-row">
              <span className="cs-key">Fuel Type</span>
              <span className="cs-val">{meta?.fuelType ?? "—"}</span>
            </div>
            {displayCo2e && (
              <div className="cs-row">
                <span className="cs-key">CO₂e Emissions</span>
                <span className="cs-val cs-val--green">
                  {Number(displayCo2e).toFixed(2)} kg
                </span>
              </div>
            )}
          </div>

          {/* Messages */}
          {saveMsg && <div className="cs-success">✓ {saveMsg}</div>}
          {saveErr && <div className="cs-error">⚠ {saveErr}</div>}

          {/* Actions */}
          <div className="cs-actions">
            <button className="cs-back" onClick={() => navigate(-1)}>
              ← Back
            </button>
            <button className="cs-save" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Route ✓"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}