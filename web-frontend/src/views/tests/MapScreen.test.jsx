import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MapScreen from "../TripView/MapScreen";
import { useLocation, useNavigate } from "react-router-dom";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
}));

jest.mock("../Dashboard/Nav",            () => () => <div data-testid="nav" />);
jest.mock("../TripView/TripProgressBar", () => () => <div data-testid="progress" />);

// ── Data fixtures ─────────────────────────────────────────────────────────────

const BASE_ROUTES = [
  {
    summary:     "Fastest route",
    distance:    "10 km",
    duration:    "15 min",
    color:       "green",
    emissions:   { co2e: 12.3 },
    coordinates: [[39.1, 21.5], [39.2, 21.6]],
  },
  {
    summary:     "Eco-friendly route",
    distance:    "12 km",
    duration:    "18 min",
    color:       "orange",
    emissions:   { co2e: 10.7 },
    coordinates: [[39.1, 21.5], [39.25, 21.65]],
  },
];

const BASE_META = {
  origin:      "King Fahd Road",
  destination: "Al-Andalus Mall",
  city:        "Jeddah",
  vehicleType: "Light-Duty Trucks",
  fuelType:    "Diesel",
  modelYear:   2020,
};

const MOCK_AI_ANALYSIS = {
  all_routes: [
    {
      route_name:        "Fastest route",
      predicted_co2e_kg: 4.5,
      category:          "Green",
      fuel_consumption:  { fuel_liters: 1.68, fuel_unit: "L" },
    },
    {
      route_name:        "Eco-friendly route",
      predicted_co2e_kg: 8.2,
      category:          "Yellow",
      fuel_consumption:  { fuel_liters: 3.06, fuel_unit: "L" },
    },
  ],
  best_route: {
    route_name:        "Fastest route",
    predicted_co2e_kg: 4.5,
    fuel_consumption:  { fuel_liters: 1.68, fuel_unit: "L" },
  },
  worst_route:          { route_name: "Eco-friendly route", predicted_co2e_kg: 8.2 },
  co2e_saving_kg:       3.7,
  co2e_saving_percent:  45.1,
  fuel_saving_liters:   1.38,
  fuel_saving_percent:  45.1,
  recommendations:      ["Maintain steady speed for optimal efficiency."],
  reasons:              ["Fastest route has the lowest predicted CO₂e emissions."],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockRoutes(routes, extraState = {}) {
  useLocation.mockReturnValue({
    state: routes ? { routes, ...extraState } : undefined,
  });
}

function mockFetchSuccess(analysis = MOCK_AI_ANALYSIS) {
  global.fetch = jest.fn().mockResolvedValue({
    ok:   true,
    json: async () => ({ analysis }),
  });
}

function mockFetchError() {
  global.fetch = jest.fn().mockResolvedValue({
    ok:   false,
    json: async () => ({}),
  });
}

function mockFetchNetworkError(message = "Network error") {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Basic Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("MapScreen — Basic Rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ state: { routes: BASE_ROUTES, meta: BASE_META } });
  });

  test("renders 0 Routes Found when no routes", () => {
    global.fetch = jest.fn();
    useLocation.mockReturnValue({ state: undefined });
    render(<MapScreen />);
    expect(screen.getByText(/0 Routes? Found/i)).toBeInTheDocument();
  });

  test("renders 2 Routes Found when two routes provided", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MapScreen />);
    expect(screen.getByText(/2 Routes Found/i)).toBeInTheDocument();
  });

  test("renders both route summaries on cards", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MapScreen />);
    expect(screen.getByText("Fastest route")).toBeInTheDocument();
    expect(screen.getByText("Eco-friendly route")).toBeInTheDocument();
  });

  test("renders distance and duration on each card", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MapScreen />);
    expect(screen.getByText("10 km")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();
    expect(screen.getByText("12 km")).toBeInTheDocument();
    expect(screen.getByText("18 min")).toBeInTheDocument();
  });

  test("renders correct number of route cards", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MapScreen />);
    expect(document.querySelectorAll(".route-card").length).toBe(BASE_ROUTES.length);
  });

  test("renders Next: Review → button", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MapScreen />);
    expect(screen.getByRole("button", { name: /Next: Review/i })).toBeInTheDocument();
  });

  test("renders GREEN badge for green route", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MapScreen />);
    expect(screen.getByText("GREEN")).toBeInTheDocument();
  });

  test("renders ORANGE badge for orange route", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MapScreen />);
    expect(screen.getByText("ORANGE")).toBeInTheDocument();
  });

  test("shows CO₂e from route.emissions.co2e on card", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MapScreen />);
    expect(screen.getByText(/12\.30 kg CO₂e/)).toBeInTheDocument();
    expect(screen.getByText(/10\.70 kg CO₂e/)).toBeInTheDocument();
  });

  test("shows Tap to preview on map subtitle", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MapScreen />);
    expect(screen.getByText(/Tap to preview on map/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AI Loading State
// ─────────────────────────────────────────────────────────────────────────────

describe("MapScreen — AI Loading State", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(jest.fn());
  });

  test("shows Analyzing routes with AI while AI request is pending", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    expect(screen.getByText(/Analyzing routes with AI/i)).toBeInTheDocument();
  });

  test("loading indicator disappears once AI response arrives", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );
  });

  test("shows AI Ready badge after AI response arrives", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/AI Ready/i)).toBeInTheDocument()
    );
  });

  test("does not call fetch when there are no routes", () => {
    global.fetch = jest.fn();
    mockRoutes(null);
    render(<MapScreen />);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AI API Call
// ─────────────────────────────────────────────────────────────────────────────

describe("MapScreen — AI API Call", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(jest.fn());
  });

  test("calls the correct endpoint with POST method", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/ai/analyze_routes");
    expect(options.method).toBe("POST");
  });

  test("sends Content-Type: application/json header", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch.mock.calls[0][1].headers["Content-Type"]).toBe("application/json");
  });

  test("sends routes array in request body", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.routes).toHaveLength(BASE_ROUTES.length);
  });

  test("sends trip_metadata object in request body", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata).toBeDefined();
  });

  test("uses city from location state in trip_metadata", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES, { city: "Jeddah" });
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.city).toBe("Jeddah");
  });

  test("uses vehicleType from location state in trip_metadata", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES, { vehicleType: "Truck" });
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.vehicleType).toBe("Truck");
  });

  test("uses fuelType from location state in trip_metadata", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES, { fuelType: "Electric" });
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.fuelType).toBe("Electric");
  });

  test("defaults city to Riyadh when not in location state", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.city).toBe("Riyadh");
  });

  test("defaults vehicleType to Light-Duty Trucks when not in state", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.vehicleType).toBe("Light-Duty Trucks");
  });

  test("defaults fuelType to Diesel when not in location state", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.fuelType).toBe("Diesel");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. AI Error State
// ─────────────────────────────────────────────────────────────────────────────

describe("MapScreen — AI Error State", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(jest.fn());
  });

  test("shows AI Error when API returns non-ok response", async () => {
    mockFetchError();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/AI Error/i)).toBeInTheDocument()
    );
  });

  test("shows AI Error on network failure", async () => {
    mockFetchNetworkError("Network error");
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/AI Error.*Network error/i)).toBeInTheDocument()
    );
  });

  test("does not show Smart Recommendation when fetch fails", async () => {
    mockFetchError();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(screen.getByText(/AI Error/i)).toBeInTheDocument());
    expect(screen.queryByText(/Smart Recommendation/i)).not.toBeInTheDocument();
  });

  test("still renders all route cards when AI fails", async () => {
    mockFetchError();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(screen.getByText(/AI Error/i)).toBeInTheDocument());
    expect(screen.getByText("Fastest route")).toBeInTheDocument();
    expect(screen.getByText("Eco-friendly route")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Smart Recommendation Block
// ─────────────────────────────────────────────────────────────────────────────

describe("MapScreen — Smart Recommendation Block", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(jest.fn());
  });

  test("renders Smart Recommendation heading after successful fetch", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
  });

  test("shows Best: GREEN badge for best route that is green", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Best: GREEN/i)).toBeInTheDocument()
    );
  });

  test("shows best route name in summary", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/Choose.*Fastest route/)
    );
  });

  test("shows CO₂e saving formatted to 2 decimal places", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/3\.70 kg CO₂e/)
    );
  });

  test("shows percentage reduction when co2e_saving_percent > 0", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/45\.1% reduction/)
    );
  });

  test("does not show percentage reduction when co2e_saving_percent is 0", async () => {
    mockFetchSuccess({ ...MOCK_AI_ANALYSIS, co2e_saving_percent: 0 });
    mockRoutes(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
    expect(container.textContent).not.toMatch(/reduction/);
  });

  test("shows fuel saving banner when fuel_saving_liters > 0", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/Save.*1\.38.*L.*of fuel/s)
    );
  });

  test("does not show fuel saving banner when fuel_saving_liters is 0", async () => {
    mockFetchSuccess({ ...MOCK_AI_ANALYSIS, fuel_saving_liters: 0 });
    mockRoutes(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
    expect(container.textContent).not.toMatch(/Save.*of fuel/);
  });

  test("renders Smart Suggestions heading and items", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Suggestions/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/Maintain steady speed for optimal efficiency/i)).toBeInTheDocument();
  });

  test("renders Why this route? heading and reason items", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Why this route\?/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/lowest predicted CO₂e emissions/i)).toBeInTheDocument();
  });

  test("does not render Smart Suggestions when recommendations is empty", async () => {
    mockFetchSuccess({ ...MOCK_AI_ANALYSIS, recommendations: [] });
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Smart Suggestions/i)).not.toBeInTheDocument();
  });

  test("does not render Why this route when reasons is empty", async () => {
    mockFetchSuccess({ ...MOCK_AI_ANALYSIS, reasons: [] });
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Why this route\?/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Route Cards AI Data
// ─────────────────────────────────────────────────────────────────────────────

describe("MapScreen — Route Cards AI Data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(jest.fn());
  });

  test("shows ⭐ AI Pick ribbon on best route card", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/AI Pick/i)).toBeInTheDocument()
    );
  });

  test("only one route card gets the AI Pick ribbon", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getAllByText(/AI Pick/i)).toHaveLength(1)
    );
  });

  test("shows Best Choice on best route card", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Best Choice/i)).toBeInTheDocument()
    );
  });

  test("shows +X.XX kg extra emissions on non-best route card", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    // 8.2 − 4.5 = 3.70
    await waitFor(() =>
      expect(screen.getByText("+3.70 kg")).toBeInTheDocument()
    );
  });

  test("shows fuel litres on best route card", async () => {
    mockFetchSuccess();
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText("1.68 L")).toBeInTheDocument()
    );
  });

  test("does not show AI Pick before fetch completes", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    expect(screen.queryByText(/AI Pick/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Navigation
// ─────────────────────────────────────────────────────────────────────────────

describe("MapScreen — Navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("clicking Next: Review → calls navigate with /confirm", async () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    global.fetch = jest.fn(() => new Promise(() => {}));
    mockRoutes(BASE_ROUTES, { meta: BASE_META });
    render(<MapScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Next: Review/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/confirm", expect.objectContaining({
      state: expect.objectContaining({ meta: BASE_META }),
    }));
  });

  test("navigates with the first route selected by default", async () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    global.fetch = jest.fn(() => new Promise(() => {}));
    mockRoutes(BASE_ROUTES, { meta: BASE_META });
    render(<MapScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Next: Review/i }));
    const { state } = mockNavigate.mock.calls[0][1];
    expect(state.route.summary).toBe(BASE_ROUTES[0].summary);
  });

  test("navigates with second route when user selects it first", async () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    global.fetch = jest.fn(() => new Promise(() => {}));
    mockRoutes(BASE_ROUTES, { meta: BASE_META });
    render(<MapScreen />);
    const cards = document.querySelectorAll(".route-card");
    fireEvent.click(cards[1]);
    fireEvent.click(screen.getByRole("button", { name: /Next: Review/i }));
    const { state } = mockNavigate.mock.calls[0][1];
    expect(state.route.summary).toBe(BASE_ROUTES[1].summary);
  });
});