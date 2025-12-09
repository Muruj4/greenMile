// screens/NavigationScreen.test.jsx

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import NavigationScreen from "../screens/NavigationScreen";
import { initNavigationRoute, sendLocationUpdate } from "../api";
import * as Location from "expo-location";

// 🧩 mock لـ @expo/vector-icons عشان ما نحمل كود ESM حق المكتبة
jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props) => null,
}));

// ---- Mock backend API ----
jest.mock("../api", () => ({
  initNavigationRoute: jest.fn().mockResolvedValue({}),
  sendLocationUpdate: jest.fn().mockResolvedValue({
    snappedLocation: null,
    remainingKm: 10,
    etaMinutes: 15,
  }),
}));

// ---- Mock Expo Location ----
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted" }),
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  Accuracy: { High: "high" },
}));

// ---- Mock react-native-maps ----
jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockMap = React.forwardRef((props, ref) => <View ref={ref} {...props} />);
  const MockPolyline = (props) => <View {...props} />;
  const MockMarker = (props) => <View {...props} />;

  return {
    __esModule: true,
    default: MockMap,
    Polyline: MockPolyline,
    Marker: MockMarker,
    PROVIDER_GOOGLE: "google",
  };
});

// ... وباقي الكود اللي كتبناه للتست (TC-NS-01, TC-NS-02, TC-NS-03) نفسه بدون تغيير


// ---- Test helpers ----
const baseRouteData = {
  summary: "Main Route",
  distance: "10 km",
  duration: "15 mins",
  coordinates: [
    [39.5, 24.7],
    [39.6, 24.8],
  ],
};

const baseMeta = {
  origin: "Origin A",
  destination: "Destination B",
  city: "Riyadh",
  vehicleType: "Car",
  fuelType: "Petrol",
  modelYear: "2025",
};

const createProps = (overrideParams = {}) => {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  return {
    navigation,
    route: {
      params: {
        routeData: baseRouteData,
        meta: baseMeta,
        preview: true,
        ...overrideParams,
      },
    },
  };
};

describe("NavigationScreen (React Native)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ------------------ TC-NS-01 ------------------
  test("TC-NS-01: renders header + preview status when preview mode", async () => {
    const props = createProps({ preview: true });
    const { getByText } = render(<NavigationScreen {...props} />);

    // Header info
    expect(getByText("Main Route")).toBeTruthy();
    expect(
      getByText("Distance: 10 km | Duration: 15 mins")
    ).toBeTruthy();

    // Status in preview
    expect(getByText("Preview Mode")).toBeTruthy();
    expect(getByText("Start Navigation")).toBeTruthy();

    // initNavigationRoute called with coords + duration
    await waitFor(() => {
      expect(initNavigationRoute).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------ TC-NS-02 ------------------
  test("TC-NS-02: tapping Start Navigation switches to active navigation state", () => {
    const props = createProps({ preview: true });
    const { getByTestId, getByText, queryByText } = render(
      <NavigationScreen {...props} />
    );

    const startButton = getByTestId("start-navigation-button");
    fireEvent.press(startButton);

    // Now should show Navigating… + Exit, and no Preview Mode
    expect(queryByText("Preview Mode")).toBeNull();
    expect(getByText("Navigating…")).toBeTruthy();
    expect(getByTestId("exit-navigation-button")).toBeTruthy();
  });

  // ------------------ TC-NS-03 ------------------
  test("TC-NS-03: tapping Exit calls navigation.goBack when trip is active", () => {
    const props = createProps({ preview: false }); // tripStarted = true by default
    const { getByTestId } = render(<NavigationScreen {...props} />);

    const exitButton = getByTestId("exit-navigation-button");
    fireEvent.press(exitButton);

    expect(props.navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
