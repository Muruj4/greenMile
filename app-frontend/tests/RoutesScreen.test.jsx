// screens/RoutesScreen.test.jsx
import React from "react";
import { Alert } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";

import RoutesScreen from "../screens/RoutesScreen";

describe("RoutesScreen (React Native)", () => {
  const mockNavigate = jest.fn();

  const meta = {
    origin: "Origin A",
    destination: "Destination B",
    city: "Riyadh",
    vehicleType: "Car",
    fuelType: "Petrol",
    modelYear: "2025",
  };

  const sampleRoutes = [
    {
      summary: "Fast Route",
      distance: "10 km",
      duration: "15 mins",
      emissions: { co2e: 12.34 },
      color: "green",
    },
    {
      summary: "Scenic Route",
      distance: "12 km",
      duration: "18 mins",
      emissions: { co2e: 13.37 },
      color: "yellow",
    },
  ];

  const renderScreen = () =>
    render(
      <RoutesScreen
        navigation={{ navigate: mockNavigate }}
        route={{ params: { routes: sampleRoutes, meta } }}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // ------------------ TC-RS-01 ------------------
  test("TC-RS-01: renders trip meta data and route cards", () => {
    const { getByText } = renderScreen();

    // meta info
    getByText("Origin A → Destination B");
    getByText("Riyadh | Car | Petrol | 2025");

    // route cards
    getByText("Fast Route");
    getByText("Scenic Route");
    getByText("Distance: 10 km");
    getByText("Duration: 15 mins");
    getByText("CO2e: 12.34");
  });

  // ------------------ TC-RS-02 ------------------
  test("TC-RS-02: pressing View Route without selecting shows alert", () => {
    const { getByText } = renderScreen();

    const button = getByText("View Route");
    fireEvent.press(button);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Select a Route",
      "Please select a route first."
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ------------------ TC-RS-03 ------------------
  test("TC-RS-03: selecting a route then View Route navigates with params", () => {
    const { getByText } = renderScreen();

    // نختار المسار الثاني "Scenic Route"
    const routeCard = getByText("Scenic Route");
    fireEvent.press(routeCard);

    // نضغط الزر
    const button = getByText("View Route");
    fireEvent.press(button);

    expect(mockNavigate).toHaveBeenCalledWith("NavigationScreen", {
      routeData: sampleRoutes[1],
      meta,
      preview: true,
    });
  });
});
