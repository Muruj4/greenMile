import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Nav from "../Dashboard/Nav";
import TripProgressBar from "./TripProgressBar";
import "./MapScreen.css";

const colorMap = {
  green:  "#10b981",
  orange: "#f59e0b",
  red:    "#ef4444",
};

export default function MapScreen() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const routes     = useMemo(() => state?.routes ?? [], [state]);
  const meta       = useMemo(() => state?.meta   ?? null, [state]);
  const mapRef     = useRef(null);
  const mapInstanceRef = useRef(null);

  const companyName =
    localStorage.getItem("company") ||
    sessionStorage.getItem("company") ||
    "Company";

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mapError,   setMapError]   = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState(null);

  /* ── AI analysis ── */
  useEffect(() => {
    if (!routes.length) return;
    const analyze = async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const city        = state?.city        || meta?.city        || "Riyadh";
        const vehicleType = state?.vehicleType || meta?.vehicleType || "Light-Duty Trucks";
        const fuelType    = state?.fuelType    || meta?.fuelType    || "Diesel";
        const tripMetadata = { city, vehicleType, fuelType, temperature: 28, humidity: 40, windSpeed: 10 };

        const response = await fetch("http://localhost:8000/ai/analyze_routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routes, trip_metadata: tripMetadata }),
        });
        if (!response.ok) throw new Error("AI analysis failed");
        const data = await response.json();
        setAiAnalysis(data.analysis);
      } catch (err) {
        setAiError(err.message);
      } finally {
        setAiLoading(false);
      }
    };
    analyze();
  }, [routes, meta, state]);

  /* ── Map init ── */
  useEffect(() => {
    if (!routes.length || mapInstanceRef.current || !window.H) return;
    try {
      const platform = new window.H.service.Platform({ apikey: process.env.REACT_APP_HERE_API_KEY });
      const layers   = platform.createDefaultLayers();
      const map      = new window.H.Map(mapRef.current, layers.vector.normal.map, {
        center: { lat: 21.543333, lng: 39.172779 }, zoom: 12,
      });
      new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
      window.H.ui.UI.createDefault(map, layers);
      mapInstanceRef.current = map;
    } catch (err) {
      setMapError("There was a problem loading the map.");
    }
  }, [routes]);

  /* ── Draw routes ── */
  useEffect(() => {
    if (!mapInstanceRef.current || !routes.length || !window.H) return;
    const map = mapInstanceRef.current;
    map.removeObjects(map.getObjects());
    const group = new window.H.map.Group();
    routes.forEach((route, index) => {
      if (!route.coordinates?.length) return;
      const line = new window.H.geo.LineString();
      route.coordinates.forEach(([lng, lat]) => line.pushLatLngAlt(lat, lng));
      const polyline = new window.H.map.Polyline(line, {
        style: {
          strokeColor: colorMap[route.color] || "#10b981",
          lineWidth:   index === selectedIndex ? 10 : 6,
          opacity:     index === selectedIndex ? 1  : 0.4,
        },
      });
      polyline.addEventListener("tap", () => setSelectedIndex(index));
      group.addObject(polyline);
    });
    map.addObject(group);
    map.getViewModel().setLookAtData({ bounds: group.getBoundingBox(), padding: 30 });
  }, [routes, selectedIndex]);

  /* ── Go to confirm ── */
  const handleNext = () => {
    const selectedRoute = routes[selectedIndex];
    navigate("/confirm", { state: { route: selectedRoute, meta } });
  };

  const routesWithAI = useMemo(() => {
    if (!aiAnalysis || !routes.length) return routes;
    return routes.map((route) => {
      const aiRoute = aiAnalysis.all_routes?.find((ar) => ar.route_name === route.summary);
      return { ...route, ai: aiRoute || null };
    });
  }, [routes, aiAnalysis]);

  return (
    <div className="map-page">
      <Nav companyName={companyName} />
      <TripProgressBar currentStep={2} />

      {mapError && <div className="map-error">⚠ {mapError}</div>}

      <div className="map-layout">
        {/* ── Map area ── */}
        <div className="map-area">
          <div ref={mapRef} className="map-canvas" />
          {aiLoading && (
            <div className="map-ai-badge">
              <span className="map-ai-dot" />
              Analyzing routes with AI
            </div>
          )}
          {aiAnalysis && !aiLoading && (
            <div className="map-ai-badge map-ai-badge--ready">
              <span className="map-ai-dot" />
              AI Ready
            </div>
          )}
        </div>

        {/* ── Side panel ── */}
        <div className="map-panel">
          <div className="map-panel__header">
            <div className="map-panel__title">
              {routes.length} Route{routes.length !== 1 ? "s" : ""} Found
            </div>
            <div className="map-panel__sub">Tap to preview on map</div>
          </div>

          {aiError && (
            <div className="map-panel__ai-error">⚠ AI Error: {aiError}</div>
          )}

          {/* ── Scrollable content: Smart Recommendation + Route Cards ── */}
          <div className="map-panel__scroll">

            {/* Smart Recommendation — shown first */}
            {aiAnalysis && !aiLoading && (
              <div className="map-ai-section">
                <div className="map-ai-header">
                  <span className="map-ai-title">Smart Recommendation</span>
                  <span className={`map-ai-best-badge map-ai-best-badge--${routesWithAI.find(r => r.summary === aiAnalysis.best_route?.route_name)?.color || "green"}`}>
                    Best: {(routesWithAI.find(r => r.summary === aiAnalysis.best_route?.route_name)?.color || "green").toUpperCase()}
                  </span>
                </div>

                <div className="map-ai-summary">
                  Choose '{aiAnalysis.best_route?.route_name}' to save{" "}
                  <strong>{aiAnalysis.co2e_saving_kg?.toFixed(2)} kg CO₂e</strong>
                  {aiAnalysis.co2e_saving_percent > 0 && (
                    <span className="map-ai-percent"> ({aiAnalysis.co2e_saving_percent?.toFixed(1)}% reduction)</span>
                  )}
                </div>

                {aiAnalysis.fuel_saving_liters > 0 && (
                  <div className="map-ai-fuel-banner">
                    Save <strong>{aiAnalysis.fuel_saving_liters?.toFixed(2)} L</strong> of fuel
                    {aiAnalysis.fuel_saving_percent > 0 && (
                      <span> · {aiAnalysis.fuel_saving_percent?.toFixed(1)}%</span>
                    )}
                  </div>
                )}

                {aiAnalysis.recommendations?.length > 0 && (
                  <div className="map-ai-block">
                    <div className="map-ai-block__title">Smart Suggestions:</div>
                    {aiAnalysis.recommendations.map((rec, i) => (
                      <div key={i} className="map-ai-block__item">✓ {rec}</div>
                    ))}
                  </div>
                )}

                {aiAnalysis.reasons?.length > 0 && (
                  <div className="map-ai-block">
                    <div className="map-ai-block__title">Why this route?</div>
                    {aiAnalysis.reasons.map((reason, i) => (
                      <div key={i} className="map-ai-block__item">✓ {reason}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Route Cards — after Smart Recommendation */}
            <div className="map-panel__cards">
              {routesWithAI.map((route, index) => {
                const isBest     = aiAnalysis && route.summary === aiAnalysis.best_route?.route_name;
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={index}
                    className={`route-card ${isSelected ? "route-card--selected" : ""} ${isBest ? "route-card--best" : ""}`}
                    onClick={() => setSelectedIndex(index)}
                  >
                    {isBest && <div className="route-card__ribbon">⭐ AI Pick</div>}

                    <div className="route-card__header">
                      <span className="route-card__dot" style={{ background: colorMap[route.color] }} />
                      <span className="route-card__name">{route.summary}</span>
                      <span className={`route-card__badge route-card__badge--${route.color}`}>
                        {route.color.toUpperCase()}
                      </span>
                    </div>

                    <div className="route-card__meta">
                      <span>{route.distance}</span>
                      <span>{route.duration}</span>
                    </div>

                    {route.emissions?.co2e && (
                      <div className={`route-card__co2 route-card__co2--${route.color}`}>
                        {Number(route.emissions.co2e).toFixed(2)} kg CO₂e
                        {isBest ? " · Best Choice" : ""}
                      </div>
                    )}
                    {route.ai && aiAnalysis && !isBest && (
                      <div className={`route-card__co2 route-card__co2--${route.color}`}>
                        +{(route.ai.predicted_co2e_kg - aiAnalysis.best_route.predicted_co2e_kg).toFixed(2)} kg
                      </div>
                    )}
                    {isBest && route.ai?.fuel_consumption && (
                      <div className="route-card__fuel">
                        {route.ai.fuel_consumption.fuel_liters.toFixed(2)} L
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

          {/* ── Fixed footer button ── */}
          <div className="map-panel__footer">
            <button className="map-panel__next" onClick={handleNext}>
              Next: Review →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}