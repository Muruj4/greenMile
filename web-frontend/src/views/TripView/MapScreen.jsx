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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mapError, setMapError] = useState(null);

  // INITIALIZE MAP
  
  useEffect(() => {
    try {
      if (!routes.length) return;
      if (!window.H) return;
      if (mapRef.current) return; 

      const platform = new window.H.service.Platform({
        apikey: process.env.REACT_APP_HERE_API_KEY,
      });

      const layers = platform.createDefaultLayers();

      mapRef.current = new window.H.Map(
        document.getElementById("here-map-container"),
        layers.vector.normal.map,
        { center: { lat: 21.543333, lng: 39.172779 }, zoom: 12 }
      );

      const mapEvents = new window.H.mapevents.MapEvents(mapRef.current);
      new window.H.mapevents.Behavior(mapEvents);
      window.H.ui.UI.createDefault(mapRef.current, layers);
    } catch (error) {
      console.error("Error initializing HERE map:", error);
      setMapError("There was a problem loading the map. Please try again.");
    }
  }, [routes]);


  useEffect(() => {
    try {
      if (!mapRef.current || !routes.length || !window.H) return;

      const map = mapRef.current;
      map.removeObjects(map.getObjects());
      const group = new window.H.map.Group();

      // --- START MARKER ICON ---
      const startIcon = new window.H.map.Icon(
        "data:image/svg+xml;utf-8," +
          encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#0E7AFE" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13z"/>
          </svg>
        `)
      );

      // --- END MARKER ICON ---
      const endIcon = new window.H.map.Icon(
        "data:image/svg+xml;utf-8," +
          encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#E53935" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13z"/>
          </svg>
        `)
      );

      // ---- DRAW EACH ROUTE ----
      routes.forEach((route, index) => {
        if (!route.coordinates?.length) return;

        const line = new window.H.geo.LineString();

        
        route.coordinates.forEach(([lng, lat]) => {
          line.pushLatLngAlt(lat, lng);
        });

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

      // --- ADD START MARKER ---
      const first = routes[0]?.coordinates?.[0];
      if (first) {
        const [lng, lat] = first;
        group.addObject(new window.H.map.Marker({ lat, lng }, { icon: startIcon }));
      }

      // --- ADD END MARKER ---
      const last = routes[selectedIndex]?.coordinates?.slice(-1)[0];
      if (last) {
        const [lng, lat] = last;
        group.addObject(new window.H.map.Marker({ lat, lng }, { icon: endIcon }));
      }

      map.addObject(group);
      map.getViewModel().setLookAtData({
        bounds: group.getBoundingBox(),
        padding: 20,
      });
    } catch (error) {
      console.error("Error drawing routes on HERE map:", error);
      setMapError("There was a problem displaying the routes on the map.");
    }
  }, [routes, selectedIndex]);

  return (
    <div className="map-screen">
      {mapError && <p className="error-message">{mapError}</p>}

      {routes.length === 0 && <h3 className="no-routes">No routes available.</h3>}

      {routes.length > 0 && (
        <>
          <h2 className="title">Routes</h2>

          <div id="here-map-container" className="map-container"></div>

          <div className="routes-list">
            {routes.map((route, index) => (
              <div
                key={index}
                className={`route-card ${index === selectedIndex ? "selected" : ""}`}
                onClick={() => setSelectedIndex(index)}
              >
                <div className="route-header">
                  <span
                    className="route-dot"
                    style={{ backgroundColor: colorMap[route.color] }}
                  ></span>
                  <span className="route-summary">{route.summary}</span>
                </div>

                <div className="route-details">
                  <span>{route.distance}</span>
                  <span>{route.duration}</span>
                  <span>{route.emissions.co2e.toFixed(1)} CO₂e</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
