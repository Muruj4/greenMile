// screens/TripScreen.test.jsx

import React from "react";
import { Alert } from "react-native";
import {
  render,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";

import TripScreen from "../screens/TripScreen";
import { processTrip } from "../api";

jest.mock("../api", () => ({
  processTrip: jest.fn(),
}));

describe("TripScreen (React Native)", () => {
  const mockNavigate = jest.fn();

  const renderScreen = () =>
    render(<TripScreen navigation={{ navigate: mockNavigate }} />);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // ------------------ TC-TS-01 ------------------
  test("TC-TS-01: shows alert when required fields are missing", () => {
    const { UNSAFE_getByProps } = renderScreen();

    const button = UNSAFE_getByProps({ testID: "create-trip-button" });
    fireEvent.press(button);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Missing data",
      "Please fill all fields."
    );
    expect(processTrip).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ------------------ helper for picking options ------------------
  function pressOptionByText(utils, text) {
    const { UNSAFE_getAllByProps } = utils;
    const matches = UNSAFE_getAllByProps({ children: text });
    if (!matches || matches.length === 0) {
      throw new Error(`No option found with text "${text}"`);
    }
    fireEvent.press(matches[0]);
  }

  // ------------------ TC-TS-02 ------------------
  test("TC-TS-02: submits valid form and navigates to Routes screen", async () => {
    const utils = renderScreen();
    const { UNSAFE_getByProps, UNSAFE_getAllByProps } = utils;

    const currentYear = String(new Date().getFullYear());

    processTrip.mockResolvedValueOnce({
      routes: [{ summary: "Route 1", distance: "10 km", duration: "15 mins" }],
    });

    // Vehicle Type
    const vehicleSelect = UNSAFE_getByProps({
      testID: "vehicle-type-select",
    });
    fireEvent.press(vehicleSelect);
    pressOptionByText(utils, "Car");

    // Model Year
    const yearSelect = UNSAFE_getByProps({
      testID: "model-year-select",
    });
    fireEvent.press(yearSelect);
    pressOptionByText(utils, currentYear);

    // City
    const citySelect = UNSAFE_getByProps({ testID: "city-select" });
    fireEvent.press(citySelect);
    pressOptionByText(utils, "Riyadh");

    // Origin / Destination (باستخدام placeholder prop)
    const originInput =
      UNSAFE_getAllByProps({ placeholder: "Enter origin" })[0];
    const destInput =
      UNSAFE_getAllByProps({ placeholder: "Enter destination" })[0];

    fireEvent.changeText(originInput, "Origin A");
    fireEvent.changeText(destInput, "Destination B");

    // Submit
    const button = UNSAFE_getByProps({ testID: "create-trip-button" });
    fireEvent.press(button);

    await waitFor(() => {
      expect(processTrip).toHaveBeenCalledTimes(1);
      expect(processTrip).toHaveBeenCalledWith({
        vehicleType: "Car",
        modelYear: currentYear,
        fuelType: "Petrol",
        origin: "Origin A",
        destination: "Destination B",
        city: "Riyadh",
      });

      expect(mockNavigate).toHaveBeenCalledWith("Routes", {
        routes: [
          { summary: "Route 1", distance: "10 km", duration: "15 mins" },
        ],
        meta: {
          vehicleType: "Car",
          modelYear: currentYear,
          fuelType: "Petrol",
          origin: "Origin A",
          destination: "Destination B",
          city: "Riyadh",
        },
      });
    });
  });

  // ------------------ TC-TS-03 ------------------
  test("TC-TS-03: shows alert when backend returns no routes", async () => {
    const utils = renderScreen();
    const { UNSAFE_getByProps, UNSAFE_getAllByProps } = utils;

    const currentYear = String(new Date().getFullYear());

    processTrip.mockResolvedValueOnce({
      routes: [],
    });

    // Vehicle Type
    const vehicleSelect = UNSAFE_getByProps({
      testID: "vehicle-type-select",
    });
    fireEvent.press(vehicleSelect);
    pressOptionByText(utils, "Car");

    // Model Year
    const yearSelect = UNSAFE_getByProps({
      testID: "model-year-select",
    });
    fireEvent.press(yearSelect);
    pressOptionByText(utils, currentYear);

    // City
    const citySelect = UNSAFE_getByProps({ testID: "city-select" });
    fireEvent.press(citySelect);
    pressOptionByText(utils, "Riyadh");

    // Origin / Destination
    const originInput =
      UNSAFE_getAllByProps({ placeholder: "Enter origin" })[0];
    const destInput =
      UNSAFE_getAllByProps({ placeholder: "Enter destination" })[0];

    fireEvent.changeText(originInput, "Origin A");
    fireEvent.changeText(destInput, "Destination B");

    // Submit
    const button = UNSAFE_getByProps({ testID: "create-trip-button" });
    fireEvent.press(button);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "No routes",
        "Backend returned no routes."
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
