import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../Dashboard";

jest.mock("chart.js/auto", () => {
  return jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  }));
});

HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  stroke: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();

  localStorage.clear();
  sessionStorage.clear();

  localStorage.setItem("company_id", "1");
  localStorage.setItem("company", "Green Mile");
  localStorage.setItem("token", "fake-token");
});

const mockData = {
  totalDrivers: 10,
  get_fuel_cost_savings_percentage: 20,
  totalTrips: 50,
  totalVehicles: 5,
  totalCO2e: 900,
  routeDistribution: { green: 20, orange: 15, red: 10 },
  emissionsBreakdown: { co2: 800, ch4: 0.1, n2o: 0.05 },
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe("Dashboard — Unit Tests", () => {
  test("renders section titles", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    renderDashboard();

    expect(await screen.findByText(/core kpis/i)).toBeInTheDocument();
    expect(screen.getByText(/efficiency/i)).toBeInTheDocument();
    expect(screen.getByText(/financial/i)).toBeInTheDocument();
  });

  test("shows error when API fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "error" }),
    });

    renderDashboard();

    expect(await screen.findByText(/failed to load dashboard data/i))
      .toBeInTheDocument();
  });
});

describe("Dashboard — Integration Tests", () => {
  test("calls backend API correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    renderDashboard();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/dashboard/1",
      {
        headers: {
          Authorization: "Bearer fake-token",
        },
      }
    );
  });

  test("displays backend data correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    renderDashboard();

    expect(await screen.findByText("50")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("handles empty data safely", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalDrivers: 0,
        get_fuel_cost_savings_percentage: 0,
        totalTrips: 0,
        totalVehicles: 0,
        totalCO2e: 0,
        routeDistribution: { green: 0, orange: 0, red: 0 },
        emissionsBreakdown: { co2: 0, ch4: 0, n2o: 0 },
      }),
    });

    renderDashboard();

    expect(await screen.findByText("0")).toBeInTheDocument();
  });
});