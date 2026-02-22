import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { styles } from "../Style/RoutesScreenStyle";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIMARY = "#00542A";

export default function RoutesScreen({ navigation, route }) {
  const { routes, meta } = route.params;
  const [selectedIndex, setSelectedIndex] = useState(null);
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  
  // fetch AI recommendations when routes or meta changes
  useEffect(() => {
    if (!routes || routes.length === 0) return;

    const fetchAIRecommendations = async () => {
      setAiLoading(true);
      setAiError(null);

      try {
        const tripMetadata = {
          city: meta?.city || "Riyadh",
          vehicleType: meta?.vehicleType || "Light-Duty Trucks",
          fuelType: meta?.fuelType || "Diesel",
          temperature: 28,
          humidity: 40,
          windSpeed: 10,
        };

        const response = await fetch("192.168.3.214:8000/ai/analyze_routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routes: routes,
            trip_metadata: tripMetadata,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "AI analysis failed");
        }

        const data = await response.json();
        setAiAnalysis(data.analysis);

        // Auto-select the best route
        const bestRouteIndex = routes.findIndex(
          (r) => r.summary === data.analysis.best_route.route_name
        );
        if (bestRouteIndex !== -1) {
          setSelectedIndex(bestRouteIndex);
        }
      } catch (error) {
        console.error("AI Error:", error);
        setAiError(error.message);
      } finally {
        setAiLoading(false);
      }
    };

    fetchAIRecommendations();
  }, [routes, meta]);

  // handlers 
  const handleSelect = (index) => {
    setSelectedIndex(index);
  };

const handlePreview = async () => {
  if (selectedIndex === null) {
    Alert.alert("Select a Route", "Please select a route first.");
    return;
  }

  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      Alert.alert("Session expired", "Please log in again.");
      navigation.navigate("Login");
      return;
    }

    const selectedRoute = routes[selectedIndex];

    const response = await fetch(
      "http://192.168.3.214:8000/trips/save_selected", 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          origin: meta.origin,
          destination: meta.destination,
          city: meta.city,
          vehicleType: meta.vehicleType,
          fuelType: meta.fuelType,
          modelYear: Number(meta.modelYear),
          route: selectedRoute,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to save trip");
    }

    console.log("Trip saved:", data);

    // ✅ after saving → navigate
    navigation.navigate("NavigationScreen", {
      routeData: selectedRoute,
      meta,
      preview: true,
    });

  } catch (error) {
    console.error("Save trip error:", error);
    Alert.alert("Error", error.message);
  }
};

  // get AI data for a specific route summary
  const getAIForRoute = (routeSummary) => {
    if (!aiAnalysis) return null;
    return aiAnalysis.all_routes.find((ar) => ar.route_name === routeSummary);
  };

  const isBestRoute = (routeSummary) => {
    return aiAnalysis && routeSummary === aiAnalysis.best_route.route_name;
  };

  //render
  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7f4" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Trip Routes</Text>

        {/* META INFO */}
        <View style={styles.metaBox}>
          <Text style={styles.metaText}>
            {meta.origin} → {meta.destination}
          </Text>
          <Text style={styles.metaText}>
            {meta.city} | {meta.vehicleType} | {meta.fuelType} | {meta.modelYear}
          </Text>
        </View>

        {/*  AI LOADING */}
        {aiLoading && (
          <View style={styles.aiLoading}>
            <ActivityIndicator size="small" color="#27ae60" />
            <Text style={styles.aiLoadingText}>🤖 Analyzing routes with AI...</Text>
          </View>
        )}

        {/*  AI ERROR */}
        {aiError && (
          <View style={styles.aiError}>
            <Text style={styles.aiErrorText}>❌ AI Error: {aiError}</Text>
          </View>
        )}

        {/*  AI RECOMMENDATION SUMMARY */}
        {aiAnalysis && !aiLoading && (
          <View style={styles.aiSummary}>
            <View style={styles.aiSummaryHeader}>
              <Text style={styles.aiSummaryTitle}>🤖 AI Recommendation</Text>
              <View
                style={[
                  styles.badge,
                  styles[
                    `badge_${
                      routes.find((r) => r.summary === aiAnalysis.best_route.route_name)
                        ?.color || "green"
                    }`
                  ],
                ]}
              >
                <Text style={styles.badgeText}>
                  {routes
                    .find((r) => r.summary === aiAnalysis.best_route.route_name)
                    ?.color?.toUpperCase() || "GREEN"}
                </Text>
              </View>
            </View>

            <Text style={styles.aiSummaryText}>
              Choose <Text style={styles.boldText}>{aiAnalysis.best_route.route_name}</Text>{" "}
              to save <Text style={styles.boldText}>{aiAnalysis.co2e_saving_kg.toFixed(2)} kg CO₂e</Text>
              {aiAnalysis.co2e_saving_percent > 0 && (
                <Text> ({aiAnalysis.co2e_saving_percent.toFixed(1)}% reduction)</Text>
              )}
            </Text>

            {/* Fuel Savings */}
            {aiAnalysis.fuel_saving_liters > 0 && (
              <View style={styles.fuelSavings}>
                <Text style={styles.fuelSavingsText}>
                  ⛽ Save <Text style={styles.boldText}>{aiAnalysis.fuel_saving_liters.toFixed(2)} L</Text> of fuel
                  {aiAnalysis.fuel_saving_percent > 0 && (
                    <Text> • <Text style={styles.boldText}>
                      {aiAnalysis.fuel_saving_percent.toFixed(1)}%
                    </Text></Text>
                  )}
                </Text>
              </View>
            )}

            {/* Quick Tip */}
            {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
              <View style={styles.aiTip}>
                <Text style={styles.aiTipText}>
                  💡 {aiAnalysis.recommendations[0]}
                </Text>
              </View>
            )}
          </View>
        )}

        {/*  ROUTE CARDS */}
        {routes.map((r, index) => {
          const isSelected = index === selectedIndex;
          const isBest = isBestRoute(r.summary);
          const aiData = getAIForRoute(r.summary);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                isBest && styles.cardBest,
              ]}
              onPress={() => handleSelect(index)}
              activeOpacity={0.9}
            >
              {/* Best Route Badge */}
              {isBest && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>⭐ AI Recommended</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{r.summary || `Route ${index + 1}`}</Text>

                {r.color && (
                  <View style={[styles.badge, styles[`badge_${r.color}`]]}>
                    <Text style={styles.badgeText}>{r.color.toUpperCase()}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardText}>Distance: {r.distance}</Text>
              <Text style={styles.cardText}>Duration: {r.duration}</Text>

              {r.emissions && (
                <Text style={styles.cardText}>CO2e: {r.emissions.co2e.toFixed(2)} kg</Text>
              )}

              {/* AI Prediction with Fuel Info */}
              {aiData && aiAnalysis && (
                <>
                  <View style={styles.aiPrediction}>
                    <Text style={styles.aiPredictionLabel}>AI: </Text>
                    <Text style={styles.aiPredictionValue}>
                      {aiData.predicted_co2e_kg.toFixed(2)} kg
                    </Text>
                    {isBest ? (
                      <View style={styles.aiBestTag}>
                        <Text style={styles.aiBestTagText}>✓ Best</Text>
                      </View>
                    ) : (
                      <Text style={styles.aiExtraText}>
                        +
                        {(
                          aiData.predicted_co2e_kg - aiAnalysis.best_route.predicted_co2e_kg
                        ).toFixed(2)}{" "}
                        kg
                      </Text>
                    )}
                  </View>

                  {/* Fuel Consumption */}
                  {aiData.fuel_consumption && (
                    <View style={styles.fuelInfo}>
                      <Text style={styles.fuelInfoText}>
                        ⛽ {aiData.fuel_consumption.fuel_liters.toFixed(2)} L
                      </Text>
                    </View>
                  )}
                </>
              )}

              {isSelected && <Text style={styles.selectedText}>Selected route</Text>}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* BOTTOM BUTTON */}
      <Pressable
        testID="view-route-button"
        style={[
          styles.previewButton,
          selectedIndex === null && styles.previewButtonDisabled,
        ]}
        onPress={handlePreview}
      >
        <Text style={styles.previewButtonText}>View Route</Text>
      </Pressable>
    </View>
  );
}