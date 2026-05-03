import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ConfirmScreen from "../TripView/ConfirmScreen";
import { useLocation, useNavigate } from "react-router-dom";

jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
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

const MOCK_ROUTE = {
  summary:    "طريق الملك عبدالعزيز",
  distance:   "8.04 km",
  duration:   "24 mins",
  color:      "green",
  emissions:  { co2e: 1250.3 },
  coordinates: [[39.1, 21.5], [39.2, 21.6]],
};

const MOCK_META = {
  origin:      "السلامه",
  destination: "الصفا",
  city:        "Jeddah",
  vehicleType: "SUV",
  fuelType:    "Petrol",
  modelYear:   "2024",
};

function mockState(route = MOCK_ROUTE, meta = MOCK_META) {
  useLocation.mockReturnValue({ state: { route, meta } });
}

function mockEmptyState() {
  useLocation.mockReturnValue({ state: null });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Basic Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("ConfirmScreen — Basic Rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ state: { route: MOCK_ROUTE, meta: MOCK_META } });
  });

  test("renders page title Review Your Selection", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText(/Review Your/i)).toBeInTheDocument();
    expect(screen.getByText("Selection")).toBeInTheDocument();
  });

  test("renders subtitle text", () => {
    render(<ConfirmScreen />);
    expect(
      screen.getByText(/Check your details before saving the route/i)
    ).toBeInTheDocument();
  });

  test("renders Save Route button", () => {
    render(<ConfirmScreen />);
    expect(
      screen.getByRole("button", { name: /Save Route/i })
    ).toBeInTheDocument();
  });

  test("renders Back button", () => {
    render(<ConfirmScreen />);
    expect(
      screen.getByRole("button", { name: /← Back/i })
    ).toBeInTheDocument();
  });

  test("renders progress bar at step 3", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText(/Confirm & Save/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Route Box
// ─────────────────────────────────────────────────────────────────────────────

describe("ConfirmScreen — Route Box", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ state: { route: MOCK_ROUTE, meta: MOCK_META } });
  });

  test("shows route summary", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("طريق الملك عبدالعزيز")).toBeInTheDocument();
  });

  test("shows GREEN badge for green route", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("GREEN")).toBeInTheDocument();
  });

  test("shows ORANGE badge for orange route", () => {
    useLocation.mockReturnValue({
      state: { route: { ...MOCK_ROUTE, color: "orange" }, meta: MOCK_META },
    });
    render(<ConfirmScreen />);
    expect(screen.getByText("ORANGE")).toBeInTheDocument();
  });

  test("shows RED badge for red route", () => {
    useLocation.mockReturnValue({
      state: { route: { ...MOCK_ROUTE, color: "red" }, meta: MOCK_META },
    });
    render(<ConfirmScreen />);
    expect(screen.getByText("RED")).toBeInTheDocument();
  });

  test("shows distance from route.distance", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("8.04 km")).toBeInTheDocument();
  });

  test("shows distance from route.distance_km when route.distance missing", () => {
    useLocation.mockReturnValue({
      state: {
        route: { ...MOCK_ROUTE, distance: undefined, distance_km: 12.5 },
        meta: MOCK_META,
      },
    });
    render(<ConfirmScreen />);
    expect(screen.getByText("12.5 km")).toBeInTheDocument();
  });

  test("shows duration from route.duration", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("24 mins")).toBeInTheDocument();
  });

  test("shows duration from route.duration_min when route.duration missing", () => {
    useLocation.mockReturnValue({
      state: {
        route: { ...MOCK_ROUTE, duration: undefined, duration_min: 35 },
        meta: MOCK_META,
      },
    });
    render(<ConfirmScreen />);
    expect(screen.getByText("35 mins")).toBeInTheDocument();
  });

  test("does not show route box when route is null", () => {
    useLocation.mockReturnValue({ state: { route: null, meta: MOCK_META } });
    render(<ConfirmScreen />);
    expect(screen.queryByText("طريق الملك عبدالعزيز")).not.toBeInTheDocument();
  });

  test("shows CO2e from route.emissions.co2e", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("1250.30 kg")).toBeInTheDocument();
  });

  test("shows CO2e from route.co2e when emissions object missing", () => {
    useLocation.mockReturnValue({
      state: {
        route: { ...MOCK_ROUTE, emissions: undefined, co2e: 999.99 },
        meta: MOCK_META,
      },
    });
    render(<ConfirmScreen />);
    expect(screen.getByText("999.99 kg")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Details Table
// ─────────────────────────────────────────────────────────────────────────────

describe("ConfirmScreen — Details Table", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ state: { route: MOCK_ROUTE, meta: MOCK_META } });
  });

  test("shows Origin row", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("Origin")).toBeInTheDocument();
    expect(screen.getByText("السلامه")).toBeInTheDocument();
  });

  test("shows Destination row", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("Destination")).toBeInTheDocument();
    expect(screen.getByText("الصفا")).toBeInTheDocument();
  });

  test("shows City row", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("City")).toBeInTheDocument();
    expect(screen.getByText("Jeddah")).toBeInTheDocument();
  });

  test("shows Vehicle row with type and year", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("Vehicle")).toBeInTheDocument();
    expect(screen.getByText(/SUV.*2024/)).toBeInTheDocument();
  });

  test("shows Fuel Type row", () => {
    render(<ConfirmScreen />);
    expect(screen.getByText("Fuel Type")).toBeInTheDocument();
    expect(screen.getByText("Petrol")).toBeInTheDocument();
  });

  test("shows dashes when meta is null", () => {
    useLocation.mockReturnValue({ state: { route: MOCK_ROUTE, meta: null } });
    render(<ConfirmScreen />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Save — Auth & Validation
// ─────────────────────────────────────────────────────────────────────────────

describe("ConfirmScreen — Save: Auth & Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ state: { route: MOCK_ROUTE, meta: MOCK_META } });
  });

  test("shows session expired error when no token", async () => {
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() =>
      expect(screen.getByText(/Session expired/i)).toBeInTheDocument()
    );
  });

  test("reads token from sessionStorage when localStorage empty", async () => {
    sessionStorage.setItem("token", "session-token");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "saved", trip_id: 1 }),
    });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() =>
      expect(screen.getByText(/Route saved successfully/i)).toBeInTheDocument()
    );
  });

  test("shows missing trip data error when both route and meta are null", async () => {
    setToken();
    useLocation.mockReturnValue({ state: null });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() =>
      expect(screen.getByText(/Missing trip data/i)).toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Save — Happy Path
// ─────────────────────────────────────────────────────────────────────────────

describe("ConfirmScreen — Save: Happy Path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ state: { route: MOCK_ROUTE, meta: MOCK_META } });
  });

  test("POSTs to correct endpoint", async () => {
    setToken();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "saved", trip_id: 1 }),
    });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/trips/save_selected");
  });

  test("sends Authorization Bearer token", async () => {
    setToken("my-jwt");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "saved", trip_id: 1 }),
    });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer my-jwt");
  });

  test("sends correct trip fields in body", async () => {
    setToken();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "saved", trip_id: 1 }),
    });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.origin).toBe(MOCK_META.origin);
    expect(body.destination).toBe(MOCK_META.destination);
    expect(body.city).toBe(MOCK_META.city);
    expect(body.vehicleType).toBe(MOCK_META.vehicleType);
    expect(body.fuelType).toBe(MOCK_META.fuelType);
  });

  test("sends modelYear as number not string", async () => {
    setToken();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "saved", trip_id: 1 }),
    });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(typeof body.modelYear).toBe("number");
    expect(body.modelYear).toBe(2024);
  });

  test("shows success message after save", async () => {
    setToken();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "saved", trip_id: 1 }),
    });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() =>
      expect(screen.getByText(/Route saved successfully/i)).toBeInTheDocument()
    );
  });

  test("shows Saving... while in progress", async () => {
    setToken();
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    expect(await screen.findByRole("button", { name: /Saving\.\.\./i })).toBeInTheDocument();
  });

  test("save button is disabled while saving", async () => {
    setToken();
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    const btn = await screen.findByRole("button", { name: /Saving\.\.\./i });
    expect(btn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Save — Error Handling
// ─────────────────────────────────────────────────────────────────────────────

describe("ConfirmScreen — Save: Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useNavigate.mockReturnValue(jest.fn());
    useLocation.mockReturnValue({ state: { route: MOCK_ROUTE, meta: MOCK_META } });
  });

  test("shows error when server returns non-ok", async () => {
    setToken();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Server error" }),
    });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() =>
      expect(screen.getByText(/Server error/i)).toBeInTheDocument()
    );
  });

  test("shows error on network failure", async () => {
    setToken();
    global.fetch = jest.fn().mockRejectedValue(new Error("Network timeout"));
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() =>
      expect(screen.getByText(/Network timeout/i)).toBeInTheDocument()
    );
  });

  test("does not show success message when save fails", async () => {
    setToken();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Failed" }),
    });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() =>
      expect(screen.getByText(/Failed/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Route saved successfully/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Navigation
// ─────────────────────────────────────────────────────────────────────────────

describe("ConfirmScreen — Navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorage();
    useLocation.mockReturnValue({ state: { route: MOCK_ROUTE, meta: MOCK_META } });
  });

  test("clicking Back calls navigate(-1)", () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /← Back/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test("navigates to /dashboard after successful save", async () => {
    jest.useFakeTimers();
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    setToken();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "saved", trip_id: 1 }),
    });
    render(<ConfirmScreen />);
    fireEvent.click(screen.getByRole("button", { name: /Save Route/i }));
    await waitFor(() =>
      expect(screen.getByText(/Route saved successfully/i)).toBeInTheDocument()
    );
    jest.advanceTimersByTime(1800);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    jest.useRealTimers();
  });
});