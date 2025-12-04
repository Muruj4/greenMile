// driver/screens/NavigationScreen.js

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import MapView, {
  Polyline,
  Marker,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#00542A";

function haversineMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return R * c;
}

function findNearestPointIndex(point, coords) {
  let minDist = Infinity;
  let minIndex = 0;

  for (let i = 0; i < coords.length; i++) {
    const d = haversineMeters(point, coords[i]);
    if (d < minDist) {
      minDist = d;
      minIndex = i;
    }
  }

  return minIndex;
}

export default function NavigationScreen({ navigation, route }) {
  const { routeData, meta } = route.params;

  const [driverLocation, setDriverLocation] = useState(null);
  const [snappedLocation, setSnappedLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [tripStarted, setTripStarted] = useState(false);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);

  const [etaMinutes, setEtaMinutes] = useState(null);
  const [remainingKm, setRemainingKm] = useState(null);

  const mapRef = useRef(null);

  const coords = routeData.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  const destination = coords[coords.length - 1];

  const routeDistances = useMemo(() => {
    if (!coords || coords.length === 0) return [];
    let dists = [0];
    let total = 0;

    for (let i = 1; i < coords.length; i++) {
      const segment = haversineMeters(coords[i - 1], coords[i]);
      total += segment;
      dists.push(total);
    }
    return dists;
  }, [coords]);

  const totalRouteMeters =
    routeDistances.length > 0
      ? routeDistances[routeDistances.length - 1]
      : 0;
  const totalRouteKm = totalRouteMeters / 1000;

  const baseDurationMinutes = useMemo(() => {
    if (!routeData.duration) return null;
    const match = routeData.duration.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }, [routeData.duration]);

  const baseAvgSpeedKmh = useMemo(() => {
    if (!baseDurationMinutes || baseDurationMinutes === 0 || !totalRouteKm)
      return 40;
    return totalRouteKm / (baseDurationMinutes / 60);
  }, [baseDurationMinutes, totalRouteKm]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 2,
        },
        (loc) => {
          const { latitude, longitude, heading, speed } = loc.coords;

          const currentPoint = { latitude, longitude };
          setDriverLocation(currentPoint);
          setHeading(heading || 0);

          if (typeof speed === "number") {
            setCurrentSpeedKmh(Math.max(0, Math.round(speed * 3.6)));
          }

          if (tripStarted && coords.length > 1 && routeDistances.length === coords.length) {
            const nearestIndex = findNearestPointIndex(currentPoint, coords);
            const snapped = coords[nearestIndex];
            setSnappedLocation(snapped);

            const remainingM = Math.max(
              0,
              totalRouteMeters - routeDistances[nearestIndex]
            );
            const remainingKmVal = remainingM / 1000;
            setRemainingKm(remainingKmVal.toFixed(1));

            const effectiveSpeed =
              currentSpeedKmh > 5 ? currentSpeedKmh : baseAvgSpeedKmh;

            if (effectiveSpeed && effectiveSpeed > 0) {
              const etaMin = Math.round(
                (remainingKmVal / effectiveSpeed) * 60
              );
              setEtaMinutes(etaMin);
            }

            if (mapRef.current) {
              mapRef.current.animateCamera({
                center: snapped,
                pitch: 70,
                heading: heading,
                zoom: 17,
              });
            }
          }
        }
      );
    })();
  }, [tripStarted, coords, routeDistances, totalRouteMeters, baseAvgSpeedKmh, currentSpeedKmh]);

  if (!driverLocation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 18 }}>Loading location…</Text>
      </View>
    );
  }

  const markerPosition = snappedLocation || driverLocation;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{routeData.summary}</Text>
        <Text style={styles.headerSub}>
          Distance: {routeData.distance}   |   Duration: {routeData.duration}
        </Text>
        {tripStarted && etaMinutes != null && remainingKm != null && (
          <Text style={styles.headerSub}>
            ETA: {etaMinutes} min   •   Remaining: {remainingKm} km
          </Text>
        )}
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: coords[0].latitude,
          longitude: coords[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsTraffic={true}
        showsMyLocationButton={false}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        <Polyline coordinates={coords} strokeColor={"#00542A"} strokeWidth={6} />

        <Marker anchor={{ x: 0.5, y: 0.5 }} coordinate={markerPosition}>
          <Image
            source={require("../assets/arrow_clean_48.png")}
            style={{
              width: 48,
              height: 48,
              transform: [{ rotate: `${heading}deg` }],
            }}
          />
        </Marker>

        <Marker coordinate={destination} title="Destination" pinColor="red" />
      </MapView>

      <View style={styles.infoBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoText}>
            {tripStarted ? "Navigating…" : "Preview mode"}
          </Text>
          {tripStarted && etaMinutes != null && remainingKm != null && (
            <Text style={styles.infoSubText}>
              ETA: {etaMinutes} min   •   {remainingKm} km left
            </Text>
          )}
        </View>
        <View style={styles.speedBox}>
          <Text style={styles.infoLabel}>Speed</Text>
          <Text style={styles.speedText}>{currentSpeedKmh} km/h</Text>
        </View>
      </View>

      {!tripStarted && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => setTripStarted(true)}
        >
          <Text style={styles.startButtonText}>Start Navigation</Text>
        </TouchableOpacity>
      )}

      {/* EXIT BUTTON — تمت إضافته فقط */}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 20,
    alignSelf: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSub: {
    color: "#e5e5e5",
    fontSize: 13,
    textAlign: "center",
    marginTop: 2,
  },

  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 20,
    left: 20,
    zIndex: 15,
    backgroundColor: PRIMARY,
    padding: 10,
    borderRadius: 50,
  },

  infoBar: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  infoLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  infoSubText: {
    fontSize: 12,
    color: "#374151",
    marginTop: 2,
  },
  speedBox: {
    marginLeft: 16,
    alignItems: "flex-end",
  },
  speedText: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY,
  },

  startButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 40,
    zIndex: 20,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },


  exitButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#D62828",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 40,
    zIndex: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  exitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
