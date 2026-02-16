import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import "./MapScreen.css";

const colorMap = {
  green: "#27ae60",
  orange: "#f39c12",
  red: "#e74c3c",
};

export default function MapScreen() {
  const { state } = useLocation();
  const routes = useMemo(() => state?.routes ?? [], [state]);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mapError, setMapError] = useState(null);

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const getAIRecommendations = async (routes, tripMetadata) => {
    const response = await fetch("http://localhost:8000/ai/analyze_routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routes,
        trip_metadata: tripMetadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "AI analysis failed");
    }

    const data = await response.json();
    return data.analysis;
  };

  const routesWithAI = useMemo(() => {
    if (!aiAnalysis || !routes.length) return routes;

    return routes.map((route) => {
      const aiRoute = aiAnalysis.all_routes.find(
        (ar) => ar.route_name === route.summary
      );
      return { ...route, ai: aiRoute || null };
    });
  }, [routes, aiAnalysis]);

  useEffect(() => {
    if (!routes.length) return;

    const analyze = async () => {
      setAiLoading(true);
      setAiError(null);

      try {
        const tripMetadata = {
          city: state?.city || "Riyadh",
          vehicleType: state?.vehicleType || "Light-Duty Trucks",
          fuelType: state?.fuelType || "Diesel",
          temperature: 28,
          humidity: 40,
          windSpeed: 10,
        };

        const result = await getAIRecommendations(routes, tripMetadata);
        setAiAnalysis(result);
      } catch (error) {
        setAiError(error.message);
      } finally {
        setAiLoading(false);
      }
    };

    analyze();
  }, [routes, state]);

  useEffect(() => {
    if (!routes.length || mapInstanceRef.current || !window.H) return;

    try {
      const platform = new window.H.service.Platform({
        apikey: process.env.REACT_APP_HERE_API_KEY,
      });

      const layers = platform.createDefaultLayers();
      const map = new window.H.Map(
        mapRef.current,
        layers.vector.normal.map,
        { center: { lat: 21.543333, lng: 39.172779 }, zoom: 12 }
      );

      new window.H.mapevents.Behavior(
        new window.H.mapevents.MapEvents(map)
      );
      window.H.ui.UI.createDefault(map, layers);
      
      mapInstanceRef.current = map;
    } catch (error) {
      console.error("Map initialization error:", error);
      setMapError("There was a problem loading the map.");
    }
  }, [routes]);

  useEffect(() => {
    if (!mapInstanceRef.current || !routes.length || !window.H) return;

    const map = mapInstanceRef.current;
    map.removeObjects(map.getObjects());

    const group = new window.H.map.Group();

    routes.forEach((route, index) => {
      if (!route.coordinates?.length) return;

      const line = new window.H.geo.LineString();
      route.coordinates.forEach(([lng, lat]) =>
        line.pushLatLngAlt(lat, lng)
      );

      const polyline = new window.H.map.Polyline(line, {
        style: {
          strokeColor: colorMap[route.color],
          lineWidth: index === selectedIndex ? 10 : 6,
          opacity: index === selectedIndex ? 1 : 0.45,
        },
      });

      polyline.addEventListener("tap", () => setSelectedIndex(index));
      group.addObject(polyline);
    });

    map.addObject(group);
    map.getViewModel().setLookAtData({
      bounds: group.getBoundingBox(),
      padding: 20,
    });
  }, [routes, selectedIndex]);

  return (
    <div className="map-screen">
      {mapError && <p className="error-message">{mapError}</p>}

      <h2 className="title">Routes</h2>

      {/* MAP CONTAINER - KEPT! */}
      <div 
        ref={mapRef}
        id="here-map-container" 
        className="map-container"
        style={{ width: '100%', height: '400px', marginBottom: '20px' }}
      ></div>

      {aiLoading && (
        <div className="ai-loading">
          <p>🤖 Analyzing routes with AI...</p>
        </div>
      )}

      {aiError && (
        <div className="ai-error">
          <p>❌ AI Error: {aiError}</p>
        </div>
      )}

      {aiAnalysis && !aiLoading && (
        <div className="ai-summary-compact">
          <div className="ai-summary-header">
            <h3> Smart Recommendation</h3>
            <span className={`badge badge-${routes.find(r => r.summary === aiAnalysis.best_route.route_name)?.color || 'green'}`}>
              Best: {routes.find(r => r.summary === aiAnalysis.best_route.route_name)?.color?.toUpperCase() || 'GREEN'}
            </span>
          </div>

          <p className="ai-summary-text">
            Choose <strong>{aiAnalysis.best_route.route_name}</strong> to save{" "}
            <strong>{aiAnalysis.co2e_saving_kg.toFixed(2)} kg CO₂e</strong>
            {aiAnalysis.co2e_saving_percent > 0 && (
              <> ({aiAnalysis.co2e_saving_percent.toFixed(1)}% reduction)</>
            )}
          </p>

          {/* Fuel Savings - ONLY for best route */}
          {aiAnalysis.fuel_saving_liters > 0 && (
            <div className="fuel-savings-banner">
              <span className="fuel-icon"></span>
              <span className="fuel-savings-text">
                Save <strong>{aiAnalysis.fuel_saving_liters.toFixed(2)} L</strong> of fuel
                {aiAnalysis.fuel_saving_percent > 0 && (
                  <> • <strong>{aiAnalysis.fuel_saving_percent.toFixed(1)}%</strong></>
                )}
              </span>
            </div>
          )}

          {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
            <div className="ai-all-recommendations">
              <strong> Smart Suggestions:</strong>
              <ul>
                {aiAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {aiAnalysis.reasons && aiAnalysis.reasons.length > 0 && (
            <div className="ai-reasons">
              <strong> Why this route?</strong>
              <ul>
                {aiAnalysis.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="routes-list">
        {routesWithAI.map((route, index) => {
          const isBest =
            aiAnalysis &&
            route.summary === aiAnalysis.best_route.route_name;

          return (
            <div
              key={index}
              className={`route-card ${
                index === selectedIndex ? "selected" : ""
              } ${isBest ? "ai-best" : ""}`}
              onClick={() => setSelectedIndex(index)}
            >
              {isBest && <div className="best-route-ribbon">⭐ AI Recommended</div>}

              <div className="route-header">
                <span
                  className="route-dot"
                  style={{ backgroundColor: colorMap[route.color] }}
                />
                <span className="route-summary">{route.summary}</span>
                <span className={`ai-category-mini badge-${route.color}`}>
                  {route.color.toUpperCase()}
                </span>
              </div>

              <div className="route-details">
                <span>{route.distance}</span>
                <span>{route.duration}</span>
              </div>

              {route.ai && aiAnalysis && (
                <>
                  <div className="ai-prediction-line">
                    <div className="ai-pred-left">
                      <span className="ai-label">AI:</span>
                      <span className="ai-value">{route.ai.predicted_co2e_kg.toFixed(2)} kg CO₂e</span>
                    </div>
                    
                    <div className="ai-pred-right">
                      {isBest ? (
                        <span className="ai-best-tag">✓ Best Choice</span>
                      ) : (
                        <span className="ai-extra-emissions">
                          +{(route.ai.predicted_co2e_kg - aiAnalysis.best_route.predicted_co2e_kg).toFixed(2)} kg
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fuel Consumption Info - ONLY show on best route */}
                  {isBest && route.ai.fuel_consumption && (
                    <div className="fuel-consumption-line">
                      <span className="fuel-icon-small"></span>
                      <span className="fuel-amount">
                        {route.ai.fuel_consumption.fuel_liters.toFixed(2)} L
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}