// driver/screens/NavigationScreen.js

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import MapView, {
  Polyline,
  Marker,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import { initNavigationRoute, sendLocationUpdate } from "../api";
import { styles } from "../Style/NavigationScreenStyles";

const PRIMARY = "#00542A";

export default function NavigationScreen({ navigation, route }) {
  const { routeData, meta, preview } = route.params;

  const [driverLocation, setDriverLocation] = useState(null);
  const [snappedLocation, setSnappedLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [tripStarted, setTripStarted] = useState(!preview);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [remainingKm, setRemainingKm] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);

  const mapRef = useRef(null);

  const coords = routeData.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  const destination = coords[coords.length - 1];

  // Initialize backend navigation
  useEffect(() => {
    (async () => {
      try {
        await initNavigationRoute(coords, routeData.duration);
      } catch (err) {
        console.log("Failed to init navigation:", err);
      }
    })();
  }, []);

  // Location tracking + backend update
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 2,
        },
        async (loc) => {
          const { latitude, longitude, heading: rawHeading, speed } =
            loc.coords;

          const currentPoint = { latitude, longitude };
          setDriverLocation(currentPoint);

          const h = rawHeading || 0;
          setHeading(h);

          const speedKmh = speed ? Math.max(0, speed * 3.6) : 0;
          setCurrentSpeedKmh(Math.round(speedKmh));

          if (!tripStarted) return;

          try {
            const nav = await sendLocationUpdate(currentPoint, h, speedKmh);

            if (nav.snappedLocation) {
              setSnappedLocation({
                latitude: nav.snappedLocation.latitude,
                longitude: nav.snappedLocation.longitude,
              });
            }

            setRemainingKm(nav.remainingKm);
            setEtaMinutes(nav.etaMinutes);

            const focusPoint = nav.snappedLocation
              ? {
                  latitude: nav.snappedLocation.latitude,
                  longitude: nav.snappedLocation.longitude,
                }
              : currentPoint;

            mapRef.current?.animateCamera({
              center: focusPoint,
              zoom: 17,
              pitch: 70,
              heading: h,
            });

          } catch (err) {
            console.log("Navigation update failed:", err);
          }
        }
      );
    })();
  }, [tripStarted]);

  const markerPosition = snappedLocation || driverLocation || destination;

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{routeData.summary}</Text>
        <Text style={styles.headerSub}>
          Distance: {routeData.distance} | Duration: {routeData.duration}
        </Text>

        {tripStarted && remainingKm != null && etaMinutes != null && (
          <Text style={styles.headerSub}>
            ETA: {etaMinutes} mins • Remaining: {remainingKm.toFixed(1)} km
          </Text>
        )}
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: coords[0].latitude,
          longitude: coords[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Polyline coordinates={coords} strokeColor={PRIMARY} strokeWidth={6} />

        {markerPosition && (
          <Marker coordinate={markerPosition} anchor={{ x: 0.5, y: 0.5 }}>
            <Image
              source={require("../assets/arrow_clean_48.png")}
              style={{
                width: 48,
                height: 48,
                transform: [{ rotate: `${heading}deg` }],
              }}
            />
          </Marker>
        )}

        <Marker coordinate={destination} pinColor="red" title="Destination" />
      </MapView>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoText}>
            {tripStarted ? "Navigating…" : "Preview Mode"}
          </Text>

          {tripStarted && remainingKm != null && (
            <Text style={styles.infoSubText}>
              ETA: {etaMinutes} mins • {remainingKm.toFixed(1)} km left
            </Text>
          )}
        </View>

        <View style={styles.speedBox}>
          <Text style={styles.infoLabel}>Speed</Text>
          <Text style={styles.speedText}>{currentSpeedKmh} km/h</Text>
        </View>
      </View>

      {/* Buttons */}
      {!tripStarted && (
        <TouchableOpacity style={styles.startButton} onPress={() => setTripStarted(true)}>
          <Text style={styles.startButtonText}>Start Navigation</Text>
        </TouchableOpacity>
      )}

      {tripStarted && (
        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => {
            setTripStarted(false);
            navigation.goBack();
          }}
        >
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
