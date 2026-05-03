import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MyTrips from "../TripView/MyTrips";
import { useNavigate, useLocation } from "react-router-dom";

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function setToken(token = "test-jwt-token") {
  localStorage.setItem("token", token);
}

function clearStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

const MOCK_TRIPS = [
  {
    id: 1,
    origin: "السلامه",
    destination: "الصفا",
    city: "Jeddah",
    vehicle_type: "SUV",
    fuel_type: "Petrol",
    model_year: 2024,
    route_summary: "طريق الملك عبدالعزيز",
    distance_km: 8.04,
    duration_min: 24,
    color: "green",
    co2: 1200.5,
    ch4: 0.032,
    n2o: 0.018,
    co2e: 1250.3,
    created_at: "2026-04-15T10:30:00",
    saved_by_role: "manager",
    driver_id: null,
  },
  {
    id: 2,
    origin: "حي النزهة",
    destination: "طريق المدينة",
    city: "Riyadh",
    vehicle_type: "Truck",
    fuel_type: "Diesel",
    model_year: 2022,
    route_summary: "طريق الأمير سلطان",
    distance_km: 15.2,
    duration_min: 35,
    color: "orange",
    co2: 2800.1,
    ch4: 0.071,
    n2o: 0.041,
    co2e: 2950.8,
    created_at: "2026-04-10T08:00:00",
    saved_by_role: "manager",
    driver_id: null,
  },
  {
    id: 3,
    origin: "العزيزية",
    destination: "الروضة",
    city: "Jeddah",
    vehicle_type: "Car",
    fuel_type: "Petrol",
    model_year: 2020,
    route_summary: "طريق الكورنيش",
    distance_km: 5.6,
    duration_min: 18,
    color: "red",
    co2: 900.0,
    ch4: 0.024,
    n2o: 0.012,
    co2e: 950.2,
    created_at: "2026-03-28T14:00:00",
    saved_by_role: "driver",
    driver_id: 5,
  },
];

const MOCK_FILTER_OPTIONS = {
  cities: ["Jeddah", "Riyadh"],
  vehicle_types: ["Car", "SUV", "Truck"],
  fuel_types: ["Diesel", "Petrol"],
  colors: ["green", "orange", "red"],
};

function mockFetchSuccess(trips = MOCK_TRIPS, filterOptions = MOCK_FILTER_OPTIONS) {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => filterOptions,
    })
    .mockResolvedValue({
      ok: true,
      json: async () => ({ total: trips.length, trips }),
    });
}

function mockFetchEmpty() {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cities: [], vehicle_types: [], fuel_types: [], colors: [] }),
    })
    .mockResolvedValue({
      ok: true,
      json: async () => ({ total: 0, trips: [] }),
    });
}

function mockFetchError() {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_FILTER_OPTIONS,
    })
    .mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
}

function mockFetchNetworkError() {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_FILTER_OPTIONS,
    })
    .mockRejectedValue(new Error("Network error"));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Basic Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("MyTrips — Basic Rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ pathname: "/trips" });
  });

  test("renders page title", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    expect(screen.getByText("My ", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(/Trips/i).length).toBeGreaterThan(0);
  });

  test("renders subtitle", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    expect(screen.getByText(/All trips saved by your company/i)).toBeInTheDocument();
  });

  test("renders New Trip button", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    expect(screen.getByRole("button", { name: /\+ New Trip/i })).toBeInTheDocument();
  });

  test("shows skeleton cards while loading", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<MyTrips />);
    expect(document.querySelectorAll(".mt-skeleton").length).toBeGreaterThan(0);
  });

  test("hides skeleton cards after data loads", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(document.querySelectorAll(".mt-skeleton").length).toBe(0)
    );
  });

  test("renders correct number of trip cards", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(document.querySelectorAll(".mt-card").length).toBe(MOCK_TRIPS.length)
    );
  });

  test("shows trip count after loading", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getAllByText(/3 trips/i).length).toBeGreaterThan(0)
    );
  });

  test("shows singular trip when only one result", async () => {
    mockFetchSuccess([MOCK_TRIPS[0]]);
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getAllByText(/1 trip$/i).length).toBeGreaterThan(0)
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Trip Card Content
// ─────────────────────────────────────────────────────────────────────────────

describe("MyTrips — Trip Card Content", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ pathname: "/trips" });
  });

  test("shows route summary on card", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText("طريق الملك عبدالعزيز")).toBeInTheDocument()
    );
  });

  test("shows origin on card", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/السلامه/)).toBeInTheDocument()
    );
  });

  test("shows destination on card", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/الصفا/)).toBeInTheDocument()
    );
  });

  test("shows GREEN badge on green route", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText("GREEN")).toBeInTheDocument()
    );
  });

  test("shows ORANGE badge on orange route", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText("ORANGE")).toBeInTheDocument()
    );
  });

  test("shows RED badge on red route", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText("RED")).toBeInTheDocument()
    );
  });

  test("shows CO₂e emissions on card", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/1250\.30 kg CO₂e/)).toBeInTheDocument()
    );
  });

  test("shows vehicle type and model year", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/SUV.*2024/)).toBeInTheDocument()
    );
  });

  test("shows fuel type on card", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getAllByText(/Petrol/i).length).toBeGreaterThan(0)
    );
  });

  test("shows distance and duration on card", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/8\.04 km.*24 min/)).toBeInTheDocument()
    );
  });

  test("shows formatted date on card", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/15 Apr 2026/i)).toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Empty State
// ─────────────────────────────────────────────────────────────────────────────

describe("MyTrips — Empty State", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ pathname: "/trips" });
  });

  test("shows No trips found when list is empty", async () => {
    mockFetchEmpty();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/No trips found/i)).toBeInTheDocument()
    );
  });

  test("shows Create a Trip CTA when no trips and no filters", async () => {
    mockFetchEmpty();
    render(<MyTrips />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /\+ Create a Trip/i })
      ).toBeInTheDocument()
    );
  });

  test("shows adjust filters message when empty with active filter", async () => {
    mockFetchSuccess([], MOCK_FILTER_OPTIONS);
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🟢 Green/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /🟢 Green/i }));

    await waitFor(() =>
      expect(screen.getByText(/Try adjusting your filters/i)).toBeInTheDocument()
    );
  });

  test("does not show Create a Trip CTA when filters are active", async () => {
    mockFetchSuccess([], MOCK_FILTER_OPTIONS);
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🟢 Green/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /🟢 Green/i }));

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /\+ Create a Trip/i })
      ).not.toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Error State
// ─────────────────────────────────────────────────────────────────────────────

describe("MyTrips — Error State", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ pathname: "/trips" });
  });

  test("shows error message when API returns non-ok", async () => {
    mockFetchError();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to load trips/i)).toBeInTheDocument()
    );
  });

  test("shows error message on network failure", async () => {
    mockFetchNetworkError();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    );
  });

  test("does not show trip cards when fetch fails", async () => {
    mockFetchError();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to load trips/i)).toBeInTheDocument()
    );
    expect(document.querySelectorAll(".mt-card").length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Toolbar Filters
// ─────────────────────────────────────────────────────────────────────────────

describe("MyTrips — Toolbar Filters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ pathname: "/trips" });
  });

  test("renders Green Orange Red buttons", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /🟢 Green/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /🟠 Orange/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /🔴 Red/i })).toBeInTheDocument();
    });
  });

  test("sends color=green query param when Green clicked", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🟢 Green/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /🟢 Green/i }));

    await waitFor(() => {
      const tripsCall = global.fetch.mock.calls.find(([url]) =>
        url.includes("color=green")
      );
      expect(tripsCall).toBeDefined();
    });
  });

  test("sends color=orange query param when Orange clicked", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🟠 Orange/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /🟠 Orange/i }));

    await waitFor(() => {
      const tripsCall = global.fetch.mock.calls.find(([url]) =>
        url.includes("color=orange")
      );
      expect(tripsCall).toBeDefined();
    });
  });

  test("sends color=red query param when Red clicked", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🔴 Red/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /🔴 Red/i }));

    await waitFor(() => {
      const tripsCall = global.fetch.mock.calls.find(([url]) =>
        url.includes("color=red")
      );
      expect(tripsCall).toBeDefined();
    });
  });

  test("sends date_range=week when This Week clicked", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /📅 This Week/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /📅 This Week/i }));

    await waitFor(() => {
      const tripsCall = global.fetch.mock.calls.find(([url]) =>
        url.includes("date_range=week")
      );
      expect(tripsCall).toBeDefined();
    });
  });

  test("sends date_range=month when This Month clicked", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /📅 This Month/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /📅 This Month/i }));

    await waitFor(() => {
      const tripsCall = global.fetch.mock.calls.find(([url]) =>
        url.includes("date_range=month")
      );
      expect(tripsCall).toBeDefined();
    });
  });

  test("does not send date_range param by default", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(document.querySelectorAll(".mt-card").length).toBe(MOCK_TRIPS.length)
    );

    const tripsCall = global.fetch.mock.calls.find(([url]) =>
      url.includes("/trips/my-trips")
    );
    expect(tripsCall[0]).not.toContain("date_range");
  });

  test("Clear button not visible when no filters active", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(document.querySelectorAll(".mt-card").length).toBeGreaterThan(0)
    );

    expect(screen.queryByRole("button", { name: /✕ Clear/i })).not.toBeInTheDocument();
  });

  test("Clear button appears after filter activated", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🟢 Green/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /🟢 Green/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /✕ Clear/i })).toBeInTheDocument()
    );
  });

  test("clicking Clear removes all filters", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🟢 Green/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /🟢 Green/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /✕ Clear/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /✕ Clear/i }));

    await waitFor(() => {
      const lastCall = [...global.fetch.mock.calls]
        .reverse()
        .find(([url]) => url.includes("/trips/my-trips"));
      expect(lastCall[0]).not.toContain("color=");
    });
  });

  test("Clear button disappears after clearing", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🟢 Green/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /🟢 Green/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /✕ Clear/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /✕ Clear/i }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /✕ Clear/i })).not.toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. API Integration
// ─────────────────────────────────────────────────────────────────────────────

describe("MyTrips — API Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ pathname: "/trips" });
  });

  test("calls /trips/my-trips/filters on mount", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/trips/my-trips/filters",
        expect.objectContaining({ headers: expect.any(Object) })
      )
    );
  });

  test("calls /trips/my-trips on mount", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() => {
      const called = global.fetch.mock.calls.some(([url]) =>
        url.includes("/trips/my-trips")
      );
      expect(called).toBe(true);
    });
  });

  test("sends Authorization header with Bearer token", async () => {
    setToken("my-jwt");
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() => {
      const call = global.fetch.mock.calls.find(([url]) =>
        url.includes("/trips/my-trips")
      );
      expect(call[1].headers["Authorization"]).toBe("Bearer my-jwt");
    });
  });

  test("reads token from sessionStorage when localStorage is empty", async () => {
    sessionStorage.setItem("token", "session-token");
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() => {
      const call = global.fetch.mock.calls.find(([url]) =>
        url.includes("/trips/my-trips")
      );
      expect(call[1].headers["Authorization"]).toBe("Bearer session-token");
    });
    sessionStorage.removeItem("token");
  });

  test("renders City dropdown when cities returned from filters", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🗺 City/i })).toBeInTheDocument()
    );
  });

  test("renders Vehicle dropdown when vehicle_types returned", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🚗 Vehicle/i })).toBeInTheDocument()
    );
  });

  test("renders Fuel dropdown when fuel_types returned", async () => {
    mockFetchSuccess();
    render(<MyTrips />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /⛽ Fuel/i })).toBeInTheDocument()
    );
  });

  test("does not render City dropdown when cities list empty", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cities: [], vehicle_types: [], fuel_types: [], colors: [] }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ total: 0, trips: [] }),
      });

    render(<MyTrips />);

    await waitFor(() =>
      expect(document.querySelectorAll(".mt-skeleton").length).toBe(0)
    );

    expect(screen.queryByRole("button", { name: /🗺 City/i })).not.toBeInTheDocument();
  });

  test("refetches trips when filter changes", async () => {
    mockFetchSuccess();
    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /🟢 Green/i })).toBeInTheDocument()
    );

    const countBefore = global.fetch.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /🟢 Green/i }));

    await waitFor(() =>
      expect(global.fetch.mock.calls.length).toBeGreaterThan(countBefore)
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Navigation
// ─────────────────────────────────────────────────────────────────────────────

describe("MyTrips — Navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useLocation.mockReturnValue({ pathname: "/trips" });
  });

  test("clicking New Trip navigates to /trip", async () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    mockFetchSuccess();

    render(<MyTrips />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /\+ New Trip/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ New Trip/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/trip");
  });

  test("clicking Create a Trip in empty state navigates to /trip", async () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    mockFetchEmpty();

    render(<MyTrips />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /\+ Create a Trip/i })
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ Create a Trip/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/trip");
  });
});