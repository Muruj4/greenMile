// screens/RoutesScreen.test.jsx
import React from "react";
import { Alert } from "react-native";
import { render, fireEvent ,waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RoutesScreen from "../screens/RoutesScreen";
 

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Ensure fetch is always defined in the Jest Node environment.
// Individual tests override this with their own mock as needed.
beforeAll(() => {
  if (!global.fetch) global.fetch = jest.fn();
  // Suppress expected console noise from intentional error/network scenarios
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});


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
    // Required: handlePreview reads AsyncStorage and calls fetch before navigating
    AsyncStorage.getItem.mockResolvedValue("valid-token");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "saved" }),
    });
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
    getByText("CO2e: 12.34 kg");
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
  test("TC-RS-03: selecting a route then View Route navigates with params", async () => {
    const { getByText } = renderScreen();

    // نختار المسار الثاني "Scenic Route"
    const routeCard = getByText("Scenic Route");
    fireEvent.press(routeCard);

    // نضغط الزر
    const button = getByText("View Route");
    await act(async () => {
      fireEvent.press(button);
    });

    expect(mockNavigate).toHaveBeenCalledWith("NavigationScreen", {
      routeData: sampleRoutes[1],
      meta,
      preview: true,
    });
  });
});


const AI_META = {
  origin: "King Khalid Airport",
  destination: "Kingdom Centre",
  city: "Riyadh",
  vehicleType: "Car",
  fuelType: "Gasoline",
  modelYear: "2022",
};

const AI_ROUTES = [
  {
    summary: "Highway Express",
    distance: "25 km",
    duration: "20 mins",
    emissions: { co2e: 5.5 },
    color: "green",
  },
  {
    summary: "City Road",
    distance: "22 km",
    duration: "35 mins",
    emissions: { co2e: 9.1 },
    color: "orange",
  },
];

// Mirrors data.analysis returned by the backend
const MOCK_AI_ANALYSIS = {
  all_routes: [
    {
      route_name: "Highway Express",
      predicted_co2e_kg: 4.5,
      category: "Green",
      fuel_consumption: { fuel_liters: 1.68, fuel_unit: "L" },
    },
    {
      route_name: "City Road",
      predicted_co2e_kg: 8.2,
      category: "Yellow",
      fuel_consumption: { fuel_liters: 3.06, fuel_unit: "L" },
    },
  ],
  best_route: {
    route_name: "Highway Express",
    predicted_co2e_kg: 4.5,
    fuel_consumption: { fuel_liters: 1.68, fuel_unit: "L" },
  },
  worst_route: { route_name: "City Road", predicted_co2e_kg: 8.2 },
  co2e_saving_kg: 3.7,         // toFixed(2) → "3.70"
  co2e_saving_percent: 45.1,
  fuel_saving_liters: 1.38,    // toFixed(2) → "1.38"
  fuel_saving_percent: 45.1,
  cost_saving_sar: 0.65,
  recommendations: ["Maintain steady speed for optimal efficiency."],
  reasons: ["Highway Express has the lowest predicted CO₂e emissions."],
  generated_at: "2025-05-01 10:00:00",
};

// Successful AI fetch + successful save_selected fetch
function mockBothFetchSuccess(analysis = MOCK_AI_ANALYSIS) {
  global.fetch = jest
    .fn()
    // First call → AI analyze_routes
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysis }),
    })
    // Second call → save_selected (used when pressing View Route)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "saved" }),
    });
}

function mockAIFetchError(detail = "AI service unavailable") {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ detail }),
  });
}

function mockAINetworkError(message = "Network error") {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}

function renderAIScreen(routes = AI_ROUTES, meta = AI_META) {
  const mockNavigate = jest.fn();
  const utils = render(
    <RoutesScreen
      navigation={{ navigate: mockNavigate }}
      route={{ params: { routes, meta } }}
    />
  );
  return { ...utils, mockNavigate };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW AI TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("RoutesScreen — AI Loading State", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // TC-AI-01
  test("TC-AI-01: shows loading indicator while AI fetch is in progress", () => {
    global.fetch = jest.fn(() => new Promise(() => {})); // never resolves

    const { getByText } = renderAIScreen();

    getByText("🤖 Analyzing routes with AI...");
  });

  // TC-AI-02
  test("TC-AI-02: loading indicator disappears after AI response arrives", async () => {
    mockBothFetchSuccess();

    const { queryByText } = renderAIScreen();

    await waitFor(() =>
      expect(
        queryByText("🤖 Analyzing routes with AI...")
      ).toBeNull()
    );
  });

  // TC-AI-03
  test("TC-AI-03: does not call fetch when routes array is empty", () => {
    global.fetch = jest.fn();

    renderAIScreen([]);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("RoutesScreen — AI API Call", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // TC-AI-04
  test("TC-AI-04: calls the AI endpoint with POST method", async () => {
    mockBothFetchSuccess();

    renderAIScreen();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("http://192.168.3.214:8000/ai/analyze_routes");
    expect(options.method).toBe("POST");
  });

  // TC-AI-05
  test("TC-AI-05: sends Content-Type: application/json header", async () => {
    mockBothFetchSuccess();

    renderAIScreen();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  // TC-AI-06
  test("TC-AI-06: sends routes array in request body", async () => {
    mockBothFetchSuccess();

    renderAIScreen();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.routes).toHaveLength(AI_ROUTES.length);
  });

  // TC-AI-07
  test("TC-AI-07: sends trip_metadata object in request body", async () => {
    mockBothFetchSuccess();

    renderAIScreen();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata).toBeDefined();
  });

  // TC-AI-08
  test("TC-AI-08: uses city from meta in trip_metadata", async () => {
    mockBothFetchSuccess();

    renderAIScreen(AI_ROUTES, { ...AI_META, city: "Jeddah" });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.city).toBe("Jeddah");
  });

  // TC-AI-09
  test("TC-AI-09: uses vehicleType from meta in trip_metadata", async () => {
    mockBothFetchSuccess();

    renderAIScreen(AI_ROUTES, { ...AI_META, vehicleType: "Truck" });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.vehicleType).toBe("Truck");
  });

  // TC-AI-10
  test("TC-AI-10: uses fuelType from meta in trip_metadata", async () => {
    mockBothFetchSuccess();

    renderAIScreen(AI_ROUTES, { ...AI_META, fuelType: "Electric" });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.fuelType).toBe("Electric");
  });

  // TC-AI-11
  test("TC-AI-11: defaults city to Riyadh when meta.city is missing", async () => {
    mockBothFetchSuccess();

    const noCity = { ...AI_META };
    delete noCity.city;
    renderAIScreen(AI_ROUTES, noCity);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.city).toBe("Riyadh");
  });

  // TC-AI-12
  test("TC-AI-12: defaults vehicleType to Light-Duty Trucks when meta.vehicleType is missing", async () => {
    mockBothFetchSuccess();

    const noVehicle = { ...AI_META };
    delete noVehicle.vehicleType;
    renderAIScreen(AI_ROUTES, noVehicle);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.vehicleType).toBe("Light-Duty Trucks");
  });

  // TC-AI-13
  test("TC-AI-13: defaults fuelType to Diesel when meta.fuelType is missing", async () => {
    mockBothFetchSuccess();

    const noFuel = { ...AI_META };
    delete noFuel.fuelType;
    renderAIScreen(AI_ROUTES, noFuel);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.fuelType).toBe("Diesel");
  });
});

describe("RoutesScreen — AI Error State", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // TC-AI-14
  test("TC-AI-14: shows error text when API returns non-ok response", async () => {
    mockAIFetchError("AI service unavailable");

    const { getByText } = renderAIScreen();

    await waitFor(() =>
      getByText("❌ AI Error: AI service unavailable")
    );
  });

  // TC-AI-15
  test("TC-AI-15: shows error text on network failure", async () => {
    mockAINetworkError("Network error");

    const { getByText } = renderAIScreen();

    await waitFor(() =>
      getByText("❌ AI Error: Network error")
    );
  });

  // TC-AI-16
  test("TC-AI-16: does not show AI Recommendation block when fetch fails", async () => {
    mockAIFetchError("Bad request");

    const { queryByText } = renderAIScreen();

    await waitFor(() =>
      expect(queryByText("❌ AI Error: Bad request")).not.toBeNull()
    );

    expect(queryByText("🤖 AI Recommendation")).toBeNull();
  });

  // TC-AI-17
  test("TC-AI-17: still renders route cards when AI fetch fails", async () => {
    mockAIFetchError("Service down");

    const { getByText } = renderAIScreen();

    await waitFor(() =>
      expect(getByText("❌ AI Error: Service down")).toBeTruthy()
    );

    getByText("Highway Express");
    getByText("City Road");
  });

  // TC-AI-18
  test("TC-AI-18: loading indicator disappears after fetch error", async () => {
    mockAIFetchError("Timeout");

    const { queryByText } = renderAIScreen();

    await waitFor(() =>
      expect(queryByText("🤖 Analyzing routes with AI...")).toBeNull()
    );
  });
});

describe("RoutesScreen — AI Auto-Select Best Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // TC-AI-19
  test("TC-AI-19: auto-selects best route after successful AI fetch", async () => {
    mockBothFetchSuccess();

    const { getByText } = renderAIScreen();

    // After AI fetch, "Highway Express" is the best route → auto-selected
    // "Selected route" text should appear on it
    await waitFor(() =>
      getByText("Selected route")
    );
  });

  // TC-AI-20
  test("TC-AI-20: selected route label appears on the best route card", async () => {
    mockBothFetchSuccess();

    const { getAllByText, getByText } = renderAIScreen();

    await waitFor(() => getByText("🤖 AI Recommendation"));

    // "Highway Express" card should show "Selected route"
    getByText("Selected route");
  });

  // TC-AI-21
  test("TC-AI-21: does not auto-select when best route name does not match any route", async () => {
    const mismatchAnalysis = {
      ...MOCK_AI_ANALYSIS,
      best_route: { ...MOCK_AI_ANALYSIS.best_route, route_name: "Unknown Route" },
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysis: mismatchAnalysis }),
    });

    const { queryByText } = renderAIScreen();

    await waitFor(() =>
      expect(queryByText("🤖 AI Recommendation")).not.toBeNull()
    );

    // No auto-selection happened → "Selected route" text should not appear
    expect(queryByText("Selected route")).toBeNull();
  });
});

describe("RoutesScreen — AI Summary Block", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // TC-AI-22
  test("TC-AI-22: renders AI Recommendation heading after successful fetch", async () => {
    mockBothFetchSuccess();

    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("🤖 AI Recommendation"));
  });

  // TC-AI-23
  test("TC-AI-23: shows best route colour badge in uppercase", async () => {
    mockBothFetchSuccess();

    // Best route is "Highway Express" with color "green" → badge: "GREEN"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("GREEN"));
  });

  // TC-AI-24
  test("TC-AI-24: shows best route name in summary text", async () => {
    mockBothFetchSuccess();

    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("Highway Express"));
  });

  // TC-AI-25
  test("TC-AI-25: shows CO₂e saving formatted to 2 decimal places", async () => {
    mockBothFetchSuccess();

    // co2e_saving_kg = 3.7 → toFixed(2) = "3.70 kg CO₂e"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("3.70 kg CO₂e"));
  });

  // TC-AI-26
  test("TC-AI-26: shows percentage reduction when co2e_saving_percent > 0", async () => {
    mockBothFetchSuccess();

    // "(45.1% reduction)"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText(" (45.1% reduction)"));
  });

  // TC-AI-27
  test("TC-AI-27: does not show percentage reduction when co2e_saving_percent is 0", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        analysis: { ...MOCK_AI_ANALYSIS, co2e_saving_percent: 0 },
      }),
    });

    const { queryByText } = renderAIScreen();

    await waitFor(() =>
      expect(queryByText("🤖 AI Recommendation")).not.toBeNull()
    );

    expect(queryByText(/reduction/)).toBeNull();
  });

  // TC-AI-28
  test("TC-AI-28: shows fuel saving banner when fuel_saving_liters > 0", async () => {
    mockBothFetchSuccess();

    // "⛽ Save 1.38 L of fuel • 45.1%"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("1.38 L"));
  });

  // TC-AI-29
  test("TC-AI-29: does not show fuel saving banner when fuel_saving_liters is 0", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        analysis: { ...MOCK_AI_ANALYSIS, fuel_saving_liters: 0 },
      }),
    });

    const { queryByText } = renderAIScreen();

    await waitFor(() =>
      expect(queryByText("🤖 AI Recommendation")).not.toBeNull()
    );

    expect(queryByText(/Save.*L.*of fuel/)).toBeNull();
  });

  // TC-AI-30
  test("TC-AI-30: shows fuel saving percentage in banner", async () => {
    mockBothFetchSuccess();

    // fuel_saving_percent = 45.1 → "45.1%"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("45.1%"));
  });

  // TC-AI-31
  test("TC-AI-31: shows first recommendation as quick tip", async () => {
    mockBothFetchSuccess();

    // "💡 Maintain steady speed for optimal efficiency."
    const { getByText } = renderAIScreen();

    await waitFor(() =>
      getByText("💡 Maintain steady speed for optimal efficiency.")
    );
  });

  // TC-AI-32
  test("TC-AI-32: does not show quick tip when recommendations list is empty", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        analysis: { ...MOCK_AI_ANALYSIS, recommendations: [] },
      }),
    });

    const { queryByText } = renderAIScreen();

    await waitFor(() =>
      expect(queryByText("🤖 AI Recommendation")).not.toBeNull()
    );

    expect(queryByText(/💡/)).toBeNull();
  });
});

describe("RoutesScreen — Route Cards AI Data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // TC-AI-33
  test("TC-AI-33: shows AI Recommended badge on best route card", async () => {
    mockBothFetchSuccess();

    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("⭐ AI Recommended"));
  });

  // TC-AI-34
  test("TC-AI-34: only one card gets the AI Recommended badge", async () => {
    mockBothFetchSuccess();

    const { getAllByText } = renderAIScreen();

    await waitFor(() =>
      expect(getAllByText("⭐ AI Recommended")).toHaveLength(1)
    );
  });

  // TC-AI-35
  test("TC-AI-35: shows predicted CO₂e on best route card (4.50 kg)", async () => {
    mockBothFetchSuccess();

    // best route: 4.5 → toFixed(2) = "4.50 kg"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("4.50 kg"));
  });

  // TC-AI-36
  test("TC-AI-36: shows predicted CO₂e on non-best route card (8.20 kg)", async () => {
    mockBothFetchSuccess();

    // city road: 8.2 → toFixed(2) = "8.20 kg"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("8.20 kg"));
  });

  // TC-AI-37
  test("TC-AI-37: shows Best tag on the best route card", async () => {
    mockBothFetchSuccess();

    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("✓ Best"));
  });

  // TC-AI-38
  test("TC-AI-38: shows extra kg emissions on non-best route card", async () => {
    mockBothFetchSuccess();

    // City Road: 8.2 − 4.5 = 3.70 → "+3.70 kg"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("+3.70 kg"));
  });

  // TC-AI-39
  test("TC-AI-39: shows fuel consumption on best route card", async () => {
    mockBothFetchSuccess();

    // Highway Express fuel: 1.68 → "⛽ 1.68 L"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("⛽ 1.68 L"));
  });

  // TC-AI-40
  test("TC-AI-40: shows fuel consumption on non-best route card", async () => {
    mockBothFetchSuccess();

    // City Road fuel: 3.06 → "⛽ 3.06 L"
    const { getByText } = renderAIScreen();

    await waitFor(() => getByText("⛽ 3.06 L"));
  });

  // TC-AI-41
  test("TC-AI-41: does not show AI prediction lines before fetch completes", () => {
    global.fetch = jest.fn(() => new Promise(() => {})); // never resolves

    const { queryByText } = renderAIScreen();

    expect(queryByText("4.50 kg")).toBeNull();
    expect(queryByText("8.20 kg")).toBeNull();
    expect(queryByText("⭐ AI Recommended")).toBeNull();
  });
});

describe("RoutesScreen — handlePreview with AsyncStorage", () => {
  const mockNavigate = jest.fn();

  function renderWithNav(routes = AI_ROUTES, meta = AI_META) {
    return render(
      <RoutesScreen
        navigation={{ navigate: mockNavigate }}
        route={{ params: { routes, meta } }}
      />
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // TC-AI-42
  test("TC-AI-42: navigates to Login and shows alert when token is missing", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue(null); // no token

    const { getByTestId, getByText } = renderWithNav();

    // Wait for AI to auto-select best route
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Session expired",
      "Please log in again."
    );
    expect(mockNavigate).toHaveBeenCalledWith("Login");
  });

  // TC-AI-43
  test("TC-AI-43: saves trip and navigates to NavigationScreen when token exists", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("valid-token-abc");

    const { getByTestId, getByText } = renderWithNav();

    // Wait for AI to auto-select best route
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(mockNavigate).toHaveBeenCalledWith("NavigationScreen", {
      routeData: AI_ROUTES[0], // Highway Express = index 0 = best route
      meta: AI_META,
      preview: true,
    });
  });

  // TC-AI-44
  test("TC-AI-44: sends Authorization header with Bearer token to save_selected", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("my-secret-token");

    const { getByTestId, getByText } = renderWithNav();

    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    // Second fetch call is the save_selected call
    const saveCall = global.fetch.mock.calls[1];
    expect(saveCall[1].headers["Authorization"]).toBe("Bearer my-secret-token");
  });

  // TC-AI-45
  test("TC-AI-45: shows alert when save_selected call fails", async () => {
    // AI fetch succeeds, save_selected fails
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analysis: MOCK_AI_ANALYSIS }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Failed to save trip" }),
      });

    AsyncStorage.getItem.mockResolvedValue("valid-token");

    const { getByTestId, getByText } = renderWithNav();

    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(Alert.alert).toHaveBeenCalledWith("Error", "Failed to save trip");
    expect(mockNavigate).not.toHaveBeenCalledWith("NavigationScreen", expect.anything());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB INTEGRATION — save_selected HTTP Request Payload
// ─────────────────────────────────────────────────────────────────────────────

describe("RoutesScreen — DB Integration: save_selected Request Payload", () => {
  const mockNavigate = jest.fn();

  function renderWithNav(routes = AI_ROUTES, meta = AI_META) {
    return render(
      <RoutesScreen
        navigation={{ navigate: mockNavigate }}
        route={{ params: { routes, meta } }}
      />
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // TC-DB-01
  test("TC-DB-01: POSTs to the correct save_selected endpoint", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const saveCall = global.fetch.mock.calls[1];
    expect(saveCall[0]).toContain("/trips/save_selected");
  });

  // TC-DB-02
  test("TC-DB-02: save_selected request uses POST method", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const saveOptions = global.fetch.mock.calls[1][1];
    expect(saveOptions.method).toBe("POST");
  });

  // TC-DB-03
  test("TC-DB-03: save_selected request sends Content-Type: application/json", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const saveOptions = global.fetch.mock.calls[1][1];
    expect(saveOptions.headers["Content-Type"]).toBe("application/json");
  });

  // TC-DB-04
  test("TC-DB-04: sends origin in save_selected body", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.origin).toBe(AI_META.origin);
  });

  // TC-DB-05
  test("TC-DB-05: sends destination in save_selected body", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.destination).toBe(AI_META.destination);
  });

  // TC-DB-06
  test("TC-DB-06: sends city in save_selected body", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.city).toBe(AI_META.city);
  });

  // TC-DB-07
  test("TC-DB-07: sends vehicleType in save_selected body", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.vehicleType).toBe(AI_META.vehicleType);
  });

  // TC-DB-08
  test("TC-DB-08: sends fuelType in save_selected body", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.fuelType).toBe(AI_META.fuelType);
  });

  // TC-DB-09
  test("TC-DB-09: sends modelYear as a number (not string)", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    // meta.modelYear is "2022" (string) — component must coerce it with Number()
    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(typeof body.modelYear).toBe("number");
    expect(body.modelYear).toBe(2022);
  });

  // TC-DB-10
  test("TC-DB-10: saves the AI-selected best route (index 0 = Highway Express)", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.summary).toBe("Highway Express");
  });

  // TC-DB-11
  test("TC-DB-11: saves the user-selected route when manually changed before pressing View Route", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();

    // Wait for AI to auto-select Highway Express
    await waitFor(() => getByText("Selected route"));

    // User manually picks City Road
    fireEvent.press(getByText("City Road"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.summary).toBe("City Road");
  });

  // TC-DB-12
  test("TC-DB-12: route body includes distance field", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.distance).toBeDefined();
  });

  // TC-DB-13
  test("TC-DB-13: route body includes duration field", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.duration).toBeDefined();
  });

  // TC-DB-14
  test("TC-DB-14: route body includes emissions object with co2e", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.emissions).toBeDefined();
    expect(body.route.emissions.co2e).toBeDefined();
  });

  // TC-DB-15
  test("TC-DB-15: route body includes color field", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.color).toBe("green"); // Highway Express = green
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB INTEGRATION — save_selected Error & Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe("RoutesScreen — DB Integration: save_selected Error & Edge Cases", () => {
  const mockNavigate = jest.fn();

  function renderWithNav(routes = AI_ROUTES, meta = AI_META) {
    return render(
      <RoutesScreen
        navigation={{ navigate: mockNavigate }}
        route={{ params: { routes, meta } }}
      />
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  // TC-DB-16
  test("TC-DB-16: does not call save_selected when no route is selected", async () => {
    // AI fetch fails so no auto-select happens → selectedIndex stays null
    mockAIFetchError("AI down");

    const { getByTestId } = renderWithNav();

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledTimes(1) // only the AI call
    );

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    // Only the AI call; save_selected must NOT be called
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Select a Route",
      "Please select a route first."
    );
  });

  // TC-DB-17
  test("TC-DB-17: does not call save_selected when token is missing", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue(null);

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    // save_selected (2nd fetch) must not be called
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // TC-DB-18
  test("TC-DB-18: shows alert with server detail on non-ok save response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analysis: MOCK_AI_ANALYSIS }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Database write error" }),
      });

    AsyncStorage.getItem.mockResolvedValue("token-xyz");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(Alert.alert).toHaveBeenCalledWith("Error", "Database write error");
  });

  // TC-DB-19
  test("TC-DB-19: shows fallback alert message when detail field is missing in save error", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analysis: MOCK_AI_ANALYSIS }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // no detail key
      });

    AsyncStorage.getItem.mockResolvedValue("token-xyz");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(Alert.alert).toHaveBeenCalledWith("Error", "Failed to save trip");
  });

  // TC-DB-20
  test("TC-DB-20: shows alert on network failure during save_selected", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analysis: MOCK_AI_ANALYSIS }),
      })
      .mockRejectedValueOnce(new Error("Connection refused"));

    AsyncStorage.getItem.mockResolvedValue("token-xyz");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(Alert.alert).toHaveBeenCalledWith("Error", "Connection refused");
  });

  // TC-DB-21
  test("TC-DB-21: does not navigate to NavigationScreen on save network failure", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analysis: MOCK_AI_ANALYSIS }),
      })
      .mockRejectedValueOnce(new Error("Timeout"));

    AsyncStorage.getItem.mockResolvedValue("token-xyz");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(mockNavigate).not.toHaveBeenCalledWith(
      "NavigationScreen",
      expect.anything()
    );
  });

  // TC-DB-22
  test("TC-DB-22: save_selected is called exactly once per button press", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    // Total: 1 AI call + 1 save call
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  // TC-DB-23
  test("TC-DB-23: AsyncStorage.getItem is called with the key 'token'", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("token-abc");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith("token");
  });

  // TC-DB-24
  test("TC-DB-24: navigates to Login screen (not NavigationScreen) when token is null", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue(null);

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(mockNavigate).toHaveBeenCalledWith("Login");
    expect(mockNavigate).not.toHaveBeenCalledWith(
      "NavigationScreen",
      expect.anything()
    );
  });

  // TC-DB-25
  test("TC-DB-25: navigation to NavigationScreen includes preview:true flag", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("valid-token");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "NavigationScreen",
      expect.objectContaining({ preview: true })
    );
  });

  // TC-DB-26
  test("TC-DB-26: navigation to NavigationScreen passes meta object", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("valid-token");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "NavigationScreen",
      expect.objectContaining({ meta: AI_META })
    );
  });

  // TC-DB-27
  test("TC-DB-27: navigation to NavigationScreen passes the selected routeData", async () => {
    mockBothFetchSuccess();
    AsyncStorage.getItem.mockResolvedValue("valid-token");

    const { getByTestId, getByText } = renderWithNav();
    await waitFor(() => getByText("Selected route"));

    await act(async () => {
      fireEvent.press(getByTestId("view-route-button"));
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "NavigationScreen",
      expect.objectContaining({ routeData: AI_ROUTES[0] })
    );
  });
});