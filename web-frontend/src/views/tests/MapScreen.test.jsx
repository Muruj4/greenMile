import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MapScreen from "../TripView/MapScreen";
import { useLocation } from "react-router-dom";

jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
}));


// Helpers

function mockRoutes(routes) {
  if (routes) {
    useLocation.mockReturnValue({ state: { routes } });
  } else {
    useLocation.mockReturnValue({ state: undefined });
  }
}

/** Like mockRoutes but also injects trip metadata (city, vehicleType, fuelType) */
function mockRoutesWithMeta(routes, extraState = {}) {
  useLocation.mockReturnValue({ state: { routes, ...extraState } });
}


const BASE_ROUTES = [
  {
    summary: "Fastest route",
    distance: "10 km",
    duration: "15 min",
    color: "green",
    emissions: { co2e: 12.3 },
    coordinates: [
      [39.1, 21.5],
      [39.2, 21.6],
    ],
  },
  {
    summary: "Eco-friendly route",
    distance: "12 km",
    duration: "18 min",
    color: "orange",
    emissions: { co2e: 10.7 },
    coordinates: [
      [39.1, 21.5],
      [39.25, 21.65],
    ],
  },
];

const BASE_META = {
  origin: "King Fahd Road",
  destination: "Al-Andalus Mall",
  city: "Jeddah",
  vehicleType: "Light-Duty Trucks",
  fuelType: "Diesel",
  modelYear: 2020,
};

// Mirrors the shape of data.analysis returned by the backend
const MOCK_AI_ANALYSIS = {
  all_routes: [
    {
      route_name: "Fastest route",
      predicted_co2e_kg: 4.5,
      category: "Green",
      fuel_consumption: { fuel_liters: 1.68, fuel_unit: "L" },
    },
    {
      route_name: "Eco-friendly route",
      predicted_co2e_kg: 8.2,
      category: "Yellow",
      fuel_consumption: { fuel_liters: 3.06, fuel_unit: "L" },
    },
  ],
  best_route: {
    route_name: "Fastest route",
    predicted_co2e_kg: 4.5,
    fuel_consumption: { fuel_liters: 1.68, fuel_unit: "L" },
  },
  worst_route: { route_name: "Eco-friendly route", predicted_co2e_kg: 8.2 },
  co2e_saving_kg: 3.7,
  co2e_saving_percent: 45.1,
  fuel_saving_liters: 1.38,
  fuel_saving_percent: 45.1,
  cost_saving_sar: 0.65,
  recommendations: ["Maintain steady speed for optimal efficiency."],
  reasons: ["Fastest route has the lowest predicted CO₂e emissions."],
  generated_at: "2025-05-01 10:00:00",
};


/**
 * Set up global.fetch so the FIRST call (AI analysis) succeeds and any
 * subsequent call (save trip) also succeeds by default.
 */
function mockFetchSuccess(analysis = MOCK_AI_ANALYSIS) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ analysis }),
  });
}

function mockFetchError(detail = "AI service unavailable") {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ detail }),
  });
}

function mockFetchNetworkError(message = "Network error") {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}


function mockFetchBothSuccess(analysis = MOCK_AI_ANALYSIS, savePayload = { id: 99 }) {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysis }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => savePayload,
    });
}


function mockFetchSaveError(analysis = MOCK_AI_ANALYSIS, detail = "Server error") {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analysis }),
    })
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail }),
    });
}


// Auth helpers

function setToken(token = "test-jwt-token") {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}


// Basic rendering

describe("MapScreen — Basic Rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearToken();
  });

  test("renders empty routes list when there are no routes", () => {
    mockRoutes(null);
    render(<MapScreen />);
    expect(screen.getByRole("heading", { name: /^routes$/i })).toBeInTheDocument();
    expect(document.querySelectorAll(".route-card").length).toBe(0);
  });

  test("renders title and route cards when routes are provided", () => {
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    expect(screen.getByRole("heading", { name: /^routes$/i })).toBeInTheDocument();
    expect(screen.getByText(/Fastest route/i)).toBeInTheDocument();
    expect(screen.getByText(/Eco-friendly route/i)).toBeInTheDocument();
  });

  test("shows distance and duration on each route card", () => {
    const routes = [
      {
        summary: "Eco route",
        distance: "8 km",
        duration: "12 min",
        color: "green",
        emissions: { co2e: 9.4 },
        coordinates: [[39.1, 21.5], [39.15, 21.55]],
      },
    ];
    mockRoutes(routes);
    render(<MapScreen />);
    expect(screen.getByText(/Eco route/i)).toBeInTheDocument();
    expect(screen.getByText("8 km")).toBeInTheDocument();
    expect(screen.getByText("12 min")).toBeInTheDocument();
  });

  test("renders Save Selected Route button", () => {
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    expect(
      screen.getByRole("button", { name: /Save Selected Route/i })
    ).toBeInTheDocument();
  });

  test("Save button is disabled when there are no routes", () => {
    mockRoutes(null);
    render(<MapScreen />);
    expect(
      screen.getByRole("button", { name: /Save Selected Route/i })
    ).toBeDisabled();
  });

  test("renders the correct number of route cards", () => {
    mockRoutes(BASE_ROUTES);
    render(<MapScreen />);
    expect(document.querySelectorAll(".route-card").length).toBe(BASE_ROUTES.length);
  });
});

// 2. AI Loading State

describe("MapScreen — AI Loading State", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shows loading indicator while AI request is in progress", () => {
    global.fetch = jest.fn(() => new Promise(() => {})); // never resolves
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    expect(screen.getByText(/Analyzing routes with AI/i)).toBeInTheDocument();
  });

  test("loading indicator disappears once AI response arrives", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );
  });

  test("does not call fetch when there are no routes", () => {
    global.fetch = jest.fn();
    mockRoutes(null);
    render(<MapScreen />);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});



// 3. AI API Call
describe("MapScreen — AI API Call", () => {
  beforeEach(() => jest.clearAllMocks());

  test("calls the correct endpoint with POST method", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/ai/analyze_routes");
    expect(options.method).toBe("POST");
  });

  test("sends Content-Type: application/json header", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  test("sends routes array in request body", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.routes).toHaveLength(BASE_ROUTES.length);
  });

  test("sends trip_metadata object in request body", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata).toBeDefined();
  });

  test("uses city from location state in trip_metadata", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES, { city: "Jeddah" });
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.city).toBe("Jeddah");
  });

  test("uses vehicleType from location state in trip_metadata", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES, { vehicleType: "Truck" });
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.vehicleType).toBe("Truck");
  });

  test("uses fuelType from location state in trip_metadata", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES, { fuelType: "Electric" });
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.fuelType).toBe("Electric");
  });

  test("defaults city to Riyadh when not in location state", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.city).toBe("Riyadh");
  });

  test("defaults vehicleType to Light-Duty Trucks when not in location state", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.vehicleType).toBe("Light-Duty Trucks");
  });

  test("defaults fuelType to Diesel when not in location state", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.trip_metadata.fuelType).toBe("Diesel");
  });
});


// AI Error State

describe("MapScreen — AI Error State", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shows error message when API returns a non-ok response", async () => {
    mockFetchError("AI service unavailable");
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/AI Error:.*AI service unavailable/i)).toBeInTheDocument()
    );
  });

  test("shows error message on network failure", async () => {
    mockFetchNetworkError("Network error");
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/AI Error:.*Network error/i)).toBeInTheDocument()
    );
  });

  test("does not show Smart Recommendation block when fetch fails", async () => {
    mockFetchError("Bad request");
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/AI Error/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Smart Recommendation/i)).not.toBeInTheDocument();
  });

  test("still renders all route cards when AI fails", async () => {
    mockFetchError("Service down");
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/AI Error/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/Fastest route/i)).toBeInTheDocument();
    expect(screen.getByText(/Eco-friendly route/i)).toBeInTheDocument();
  });
});


// 5. AI Summary Block

describe("MapScreen — AI Summary Block", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders Smart Recommendation heading after successful fetch", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
  });

  test("shows best route colour badge in uppercase (Best: GREEN)", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Best: GREEN/i)).toBeInTheDocument()
    );
  });

  test("shows best route name inside the summary paragraph", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/Choose.*Fastest route/)
    );
  });

  test("shows CO₂e saving formatted to 2 decimal places", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/3\.70 kg CO₂e/)
    );
  });

  test("shows percentage reduction when co2e_saving_percent > 0", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/45\.1% reduction/)
    );
  });

  test("does not show percentage reduction when co2e_saving_percent is 0", async () => {
    mockFetchSuccess({ ...MOCK_AI_ANALYSIS, co2e_saving_percent: 0 });
    mockRoutesWithMeta(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
    expect(container.textContent).not.toMatch(/reduction/);
  });

  test("shows fuel saving banner text when fuel_saving_liters > 0", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/Save.*1\.38.*L.*of fuel/s)
    );
  });

  test("does not show fuel saving banner when fuel_saving_liters is 0", async () => {
    mockFetchSuccess({ ...MOCK_AI_ANALYSIS, fuel_saving_liters: 0 });
    mockRoutesWithMeta(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
    expect(container.textContent).not.toMatch(/Save.*of fuel/);
  });

  test("shows fuel saving percentage inside the banner when > 0", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    const { container } = render(<MapScreen />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/45\.1%/)
    );
  });

  test("renders Smart Suggestions heading and list items", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Suggestions/i)).toBeInTheDocument()
    );
    expect(
      screen.getByText(/Maintain steady speed for optimal efficiency/i)
    ).toBeInTheDocument();
  });

  test("renders Why this route? heading and reason items", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Why this route\?/i)).toBeInTheDocument()
    );
    expect(
      screen.getByText(/lowest predicted CO₂e emissions/i)
    ).toBeInTheDocument();
  });

  test("does not render Smart Suggestions when recommendations list is empty", async () => {
    mockFetchSuccess({ ...MOCK_AI_ANALYSIS, recommendations: [] });
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Smart Suggestions/i)).not.toBeInTheDocument();
  });

  test("does not render Why this route when reasons list is empty", async () => {
    mockFetchSuccess({ ...MOCK_AI_ANALYSIS, reasons: [] });
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Smart Recommendation/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Why this route\?/i)).not.toBeInTheDocument();
  });
});


// Route Cards AI Data

describe("MapScreen — Route Cards AI Data", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shows AI Recommended ribbon on the best route card", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/AI Recommended/i)).toBeInTheDocument()
    );
  });

  test("only one route card gets the AI Recommended ribbon", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getAllByText(/AI Recommended/i)).toHaveLength(1)
    );
  });

  test("shows predicted CO₂e on best route card formatted to 2dp", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText("4.50 kg CO₂e")).toBeInTheDocument()
    );
  });

  test("shows predicted CO₂e on non-best route card formatted to 2dp", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText("8.20 kg CO₂e")).toBeInTheDocument()
    );
  });

  test("shows Best Choice tag on the best route card", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Best Choice/i)).toBeInTheDocument()
    );
  });

  test("only one route card shows the Best Choice tag", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    await waitFor(() =>
      expect(screen.getAllByText(/Best Choice/i)).toHaveLength(1)
    );
  });

  test("shows +X.XX kg extra emissions on non-best route card", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    // 8.2 − 4.5 = 3.70
    await waitFor(() =>
      expect(screen.getByText("+3.70 kg")).toBeInTheDocument()
    );
  });

  test("shows fuel consumption litres on the best route card", async () => {
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    // best route fuel_liters: 1.68
    await waitFor(() =>
      expect(screen.getByText("1.68 L")).toBeInTheDocument()
    );
  });

  test("does not show AI prediction lines before fetch completes", () => {
    global.fetch = jest.fn(() => new Promise(() => {})); // never resolves
    mockRoutesWithMeta(BASE_ROUTES);
    render(<MapScreen />);
    expect(screen.queryByText("4.50 kg CO₂e")).not.toBeInTheDocument();
    expect(screen.queryByText("8.20 kg CO₂e")).not.toBeInTheDocument();
  });
});


// Database Integration — Save Selected Route (handleSaveSelected حقت)

describe("MapScreen — DB Integration: Save Selected Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearToken();
  });



  test("shows auth error when no token is in storage", async () => {
    // AI fetch succeeds; save should never be called because token is absent
    mockFetchSuccess();
    mockRoutesWithMeta(BASE_ROUTES, { meta: BASE_META });

    render(<MapScreen />);

   
    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() =>
      expect(screen.getByText(/Session expired/i)).toBeInTheDocument()
    );
  });

  test("reads token from sessionStorage when localStorage is empty", async () => {
    sessionStorage.setItem("token", "session-jwt");
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() =>
      expect(screen.getByText(/Your Route Is Saved Successfully/i)).toBeInTheDocument()
    );

    sessionStorage.removeItem("token");
  });


  test("shows missing trip info error when meta is absent", async () => {
    setToken();
    mockFetchSuccess();
    // No meta in state
    mockRoutesWithMeta(BASE_ROUTES);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Missing trip info/i)
      ).toBeInTheDocument()
    );
  });

  // Happy path

  test("POSTs to the correct save endpoint", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const [saveUrl] = global.fetch.mock.calls[1];
    expect(saveUrl).toBe("http://127.0.0.1:8000/trips/save_selected");
  });

  test("sends Authorization Bearer token in save request", async () => {
    setToken("my-jwt-token");
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const [, saveOptions] = global.fetch.mock.calls[1];
    expect(saveOptions.headers["Authorization"]).toBe("Bearer my-jwt-token");
  });

  test("sends correct trip fields in save request body", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);

    expect(body.origin).toBe(BASE_META.origin);
    expect(body.destination).toBe(BASE_META.destination);
    expect(body.city).toBe(BASE_META.city);
    expect(body.vehicleType).toBe(BASE_META.vehicleType);
    expect(body.fuelType).toBe(BASE_META.fuelType);
    expect(body.modelYear).toBe(BASE_META.modelYear);
  });

  test("saves the currently selected route (index 0 by default)", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.summary).toBe(BASE_ROUTES[0].summary);
  });

  test("saves the second route when user selects it before saving", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    // Click the second route card to select it
    const cards = document.querySelectorAll(".route-card");
    fireEvent.click(cards[1]);

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.summary).toBe(BASE_ROUTES[1].summary);
  });

  test("modelYear is sent as a number (not a string)", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, { ...BASE_META, modelYear: "2021" }); // string in state

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(typeof body.modelYear).toBe("number");
    expect(body.modelYear).toBe(2021);
  });

  // Happy path

  test("shows success message after route is saved", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Your Route Is Saved Successfully/i)
      ).toBeInTheDocument()
    );
  });

  test("shows Saving... text on button while save is in progress", async () => {
    setToken();
    // AI resolves instantly; save request is pending
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ analysis: MOCK_AI_ANALYSIS }) })
      .mockReturnValueOnce(new Promise(() => {})); // save never resolves

    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    expect(await screen.findByRole("button", { name: /Saving\.\.\./i })).toBeInTheDocument();
  });

  test("save button is disabled while save is in progress", async () => {
    setToken();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ analysis: MOCK_AI_ANALYSIS }) })
      .mockReturnValueOnce(new Promise(() => {}));

    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    const btn = await screen.findByRole("button", { name: /Saving\.\.\./i });
    expect(btn).toBeDisabled();
  });

  //Server / network errors

  test("shows error banner when server returns a non-ok save response", async () => {
    setToken();
    mockFetchSaveError(MOCK_AI_ANALYSIS, "Database write failed");
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() =>
      expect(screen.getByText(/Database write failed/i)).toBeInTheDocument()
    );
  });

  test("shows error banner on network failure during save", async () => {
    setToken();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ analysis: MOCK_AI_ANALYSIS }) })
      .mockRejectedValueOnce(new Error("Network timeout"));

    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() =>
      expect(screen.getByText(/Network timeout/i)).toBeInTheDocument()
    );
  });

  test("does not show success message when save fails", async () => {
    setToken();
    mockFetchSaveError(MOCK_AI_ANALYSIS, "Internal server error");
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() =>
      expect(screen.getByText(/Internal server error/i)).toBeInTheDocument()
    );

    expect(
      screen.queryByText(/Your Route Is Saved Successfully/i)
    ).not.toBeInTheDocument();
  });

  // DB payload integrity

  test("save payload includes route coordinates array", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(Array.isArray(body.route.coordinates)).toBe(true);
    expect(body.route.coordinates.length).toBeGreaterThan(0);
  });

  test("save payload includes route distance", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.distance).toBeDefined();
  });

  test("save payload includes route duration", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.duration).toBeDefined();
  });

  test("save payload includes route emissions", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.emissions).toBeDefined();
    expect(body.route.emissions.co2e).toBeDefined();
  });

  test("save payload includes route color", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const body = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(body.route.color).toBe("green"); // index 0 = Fastest route = green
  });


  test("clears previous save error when a new save attempt starts", async () => {
    setToken();
    // First save fails
    mockFetchSaveError(MOCK_AI_ANALYSIS, "Timeout");
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));
    await waitFor(() => expect(screen.getByText(/Timeout/i)).toBeInTheDocument());

    // Second save succeeds
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42 }),
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));

    await waitFor(() =>
      expect(screen.getByText(/Your Route Is Saved Successfully/i)).toBeInTheDocument()
    );

    expect(screen.queryByText(/Timeout/i)).not.toBeInTheDocument();
  });

  test("clears previous success message when a new save attempt starts", async () => {
    setToken();
    mockFetchBothSuccess();
    mockRoutesWithMeta(BASE_ROUTES, BASE_META);

    render(<MapScreen />);

    await waitFor(() =>
      expect(screen.queryByText(/Analyzing routes with AI/i)).not.toBeInTheDocument()
    );

    // First save succeeds
    fireEvent.click(screen.getByRole("button", { name: /Save Selected Route/i }));
    await waitFor(() =>
      expect(screen.getByText(/Your Route Is Saved Successfully/i)).toBeInTheDocument()
    );

    // Second save is pending
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: /Saving\.\.\./i }));

    // Success message should be cleared immediately
    expect(
      screen.queryByText(/Your Route Is Saved Successfully/i)
    ).not.toBeInTheDocument();
  });
});