import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import { styles } from "../Style/TripScreenStyle";

import { processTrip } from "../api";

const VEHICLE_TYPES = [
  "Car",
  "SUV",
  "Van",
  "Bus",
  "Pickup Truck",
  "Truck",
  "Motorcycle",
];

const CITIES = [
  "Riyadh",
  "Jeddah",
  "Dammam",
  "Khobar",
  "Dhahran",
  "Makkah",
  "Madinah",
  "Taif",
  "Tabuk",
  "Abha",
  "Khamis Mushait",
  "Jubail",
  "Hail",
  "Yanbu",
];

// السنوات – من السنة الحالية رجوعاً إلى 1960
const CURRENT_YEAR = new Date().getFullYear();
const MODEL_YEARS = [];
for (let y = CURRENT_YEAR; y >= 1960; y--) {
  MODEL_YEARS.push(String(y)); 
}

export default function TripScreen({ navigation }) {
  const [fuelType, setFuelType] = useState("Petrol");

  const [tripData, setTripData] = useState({
    vehicleType: "",
    modelYear: "",
    fuelType: "Petrol",
    origin: "",
    destination: "",
    city: "",
  });

  const [showVehicleTypeList, setShowVehicleTypeList] = useState(false);
  const [showModelYearList, setShowModelYearList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setTripData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSelectFuel = (type) => {
    setFuelType(type);
    handleChange("fuelType", type);
  };


  const handleCreateTrip = async () => {
    if (
      !tripData.origin ||
      !tripData.destination ||
      !tripData.city ||
      !tripData.vehicleType ||
      !tripData.modelYear
    ) {
      Alert.alert("Missing data", "Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      const data = await processTrip(tripData);

      if (data.error) {
        throw new Error(data.error || "Failed to fetch routes");
      }

      if (!data.routes || data.routes.length === 0) {
        Alert.alert("No routes", "Backend returned no routes.");
        return;
      }

      // ✔️ الانتقال إلى شاشة المسارات
      navigation.navigate("Routes", {
        routes: data.routes,
        meta: tripData,
      });

    } catch (error) {
      console.error(error);
      Alert.alert("Error", error.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          Create a <Text style={styles.highlight}>Trip</Text>
        </Text>

        {/* Vehicle Type + Model Year */}
        <View style={styles.row}>

          {/* Vehicle Type */}
          <View style={styles.block}>
            <Text style={styles.label}>Vehicle Type</Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setShowVehicleTypeList(!showVehicleTypeList);
                setShowModelYearList(false);
                setShowCityList(false);
              }}
            >
              <View style={styles.selectBox}>
                <Text
                  style={
                    tripData.vehicleType
                      ? styles.valueText
                      : styles.placeholderText
                  }
                >
                  {tripData.vehicleType || "Select vehicle"}
                </Text>
                <Text style={styles.arrow}>⌄</Text>
              </View>
            </TouchableOpacity>

            {showVehicleTypeList && (
              <View style={styles.dropdown}>
                {VEHICLE_TYPES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleChange("vehicleType", item);
                      setShowVehicleTypeList(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Model Year */}
          <View style={styles.block}>
            <Text style={styles.label}>Model Year</Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setShowModelYearList(!showModelYearList);
                setShowVehicleTypeList(false);
                setShowCityList(false);
              }}
            >
              <View style={styles.selectBox}>
                <Text
                  style={
                    tripData.modelYear
                      ? styles.valueText
                      : styles.placeholderText
                  }
                >
                  {tripData.modelYear || "Select year"}
                </Text>
                <Text style={styles.arrow}>⌄</Text>
              </View>
            </TouchableOpacity>

            {showModelYearList && (
              <View style={styles.dropdown}>
                <ScrollView style={{ maxHeight: 250 }}>
                  {MODEL_YEARS.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={styles.dropdownItem}
                      onPress={() => {
                        handleChange("modelYear", year);
                        setShowModelYearList(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Fuel Type */}
        <View style={styles.block}>
          <Text style={styles.label}>Fuel Type</Text>

          <View style={styles.fuelBox}>
            <TouchableOpacity
              style={[
                styles.fuelButton,
                fuelType === "Petrol" && styles.fuelButtonActive,
              ]}
              onPress={() => handleSelectFuel("Petrol")}
            >
              <Text
                style={[
                  styles.fuelText,
                  fuelType === "Petrol" && styles.fuelTextActive,
                ]}
              >
                Petrol
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fuelButton,
                fuelType === "Diesel" && styles.fuelButtonActive,
              ]}
              onPress={() => handleSelectFuel("Diesel")}
            >
              <Text
                style={[
                  styles.fuelText,
                  fuelType === "Diesel" && styles.fuelTextActive,
                ]}
              >
                Diesel
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* City */}
        <View style={styles.block}>
          <Text style={styles.label}>City</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setShowCityList(!showCityList);
              setShowVehicleTypeList(false);
              setShowModelYearList(false);
            }}
          >
            <View style={styles.selectBox}>
              <Text
                style={
                  tripData.city ? styles.valueText : styles.placeholderText
                }
              >
                {tripData.city || "Select city"}
              </Text>
              <Text style={styles.arrow}>⌄</Text>
            </View>
          </TouchableOpacity>

          {showCityList && (
            <View style={styles.dropdown}>
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={styles.dropdownItem}
                  onPress={() => {
                    handleChange("city", city);
                    setShowCityList(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Origin */}
        <View style={styles.block}>
          <Text style={styles.label}>Origin</Text>

          <View style={styles.inputWithIcon}>
            <TextInput
              placeholder="Enter origin"
              placeholderTextColor="#9CA3AF"
              style={styles.inputField}
              value={tripData.origin}
              onChangeText={(text) => handleChange("origin", text)}
            />
            <Text style={styles.icon}>📍</Text>
          </View>
        </View>

        {/* Destination */}
        <View style={styles.block}>
          <Text style={styles.label}>Destination</Text>

          <View style={styles.inputWithIcon}>
            <TextInput
              placeholder="Enter destination"
              placeholderTextColor="#9CA3AF"
              style={styles.inputField}
              value={tripData.destination}
              onChangeText={(text) => handleChange("destination", text)}
            />
            <Text style={styles.icon}>📍</Text>
          </View>
        </View>

        {/* Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleCreateTrip}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Create Trip"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
