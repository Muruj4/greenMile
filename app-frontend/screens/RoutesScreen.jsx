// driver/screens/RoutesScreen.js
// screens/RoutesScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";

import { styles } from "../Style/RoutesScreenStyle";

const PRIMARY = "#00542A";

export default function RoutesScreen({ navigation, route }) {
  const { routes, meta } = route.params;
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleSelect = (index) => {
    setSelectedIndex(index);
  };

  const handlePreview = () => {
    if (selectedIndex === null) {
      Alert.alert("Select a Route", "Please select a route first.");
      return;
    }

    const selectedRoute = routes[selectedIndex];

    navigation.navigate("NavigationScreen", {
      routeData: selectedRoute,
      meta,
      preview: true,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Trip Routes</Text>

        {/* meta info */}
        <View style={styles.metaBox}>
          <Text style={styles.metaText}>
            {meta.origin} → {meta.destination}
          </Text>
          <Text style={styles.metaText}>
            {meta.city} | {meta.vehicleType} | {meta.fuelType} | {meta.modelYear}
          </Text>
        </View>

        {/* route cards */}
        {routes.map((r, index) => {
          const isSelected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => handleSelect(index)}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {r.summary || `Route ${index + 1}`}
                </Text>

                {r.color && (
                  <View style={[styles.badge, styles[`badge_${r.color}`]]}>
                    <Text style={styles.badgeText}>
                      {r.color.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardText}>Distance: {r.distance}</Text>
              <Text style={styles.cardText}>Duration: {r.duration}</Text>

              {r.emissions && (
                <Text style={styles.cardText}>
                  CO2e: {r.emissions.co2e.toFixed(2)}
                </Text>
              )}

              {isSelected && (
                <Text style={styles.selectedText}>Selected route</Text>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* bottom button */}
      <Pressable
        style={[
          styles.previewButton,
          selectedIndex === null && styles.previewButtonDisabled,
        ]}
        onPress={handlePreview}
        disabled={selectedIndex === null}
      >
        <Text style={styles.previewButtonText}>View Route</Text>
      </Pressable>
    </View>
  );
}
