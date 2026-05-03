import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../Dashboard/Dashboard";

// ── Chart.js mock ─────────────────────────────────────────────────────────────
// Use a stable object outside jest.fn() so destroy() is never cleared
const chartInstance = { destroy: function() {}, update: function() {} };
jest.mock("chart.js/auto", () => function Chart() { return chartInstance; });

// ── AIAgentButton mock ────────────────────────────────────────────────────────
jest.mock("../AIAgent/AIAgentButton", () => () => null);

// ── Canvas mock ───────────────────────────────────────────────────────────────
// Re-applied in beforeEach using a plain function (not jest.fn())
// so it survives jest.clearAllMocks()
function applyCanvasMock() {
  HTMLCanvasElement.prototype.getContext = function() {
    return {
      clearRect:            function() {},
      beginPath:            function() {},
      arc:                  function() {},
      stroke:               function() {},
      fill:                 function() {},
      moveTo:               function() {},
      lineTo:               function() {},
      closePath:            function() {},
      save:                 function() {},
      restore:              function() {},
      translate:            function() {},
      rotate:               function() {},
      scale:                function() {},
      fillText:             function() {},
      strokeText:           function() {},
      measureText:          function() { return { width: 0 }; },
      createLinearGradient: function() { return { addColorStop: function() {} }; },
      createRadialGradient: function() { return { addColorStop: function() {} }; },
      fillStyle: "", strokeStyle: "", lineWidth: 0,
      font: "", textAlign: "", textBaseline: "",
      globalAlpha: 1, lineCap: "",
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  applyCanvasMock();
  global.fetch = jest.fn();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("company", "Green Mile");
  const payload = btoa(JSON.stringify({ id: 1, company_id: 1, role: "manager" }));
  localStorage.setItem("token", `header.${payload}.signature`);
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

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Dashboard — Unit Tests", () => {
  test("renders section titles", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockData });
    renderDashboard();
    expect(await screen.findByText(/core kpis/i)).toBeInTheDocument();
    expect(screen.getByText("Efficiency & Sustainability")).toBeInTheDocument();
    expect(screen.getByText("Financial")).toBeInTheDocument();
  });

  test("shows error when API fails", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    renderDashboard();
    expect(await screen.findByText(/failed to load dashboard data/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Dashboard — Integration Tests", () => {
  test("calls backend API correctly", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockData });
    renderDashboard();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/http:\/\/127\.0\.0\.1:8000\/dashboard\/\d+/);
    expect(options.headers.Authorization).toMatch(/^Bearer /);
  });

  test("displays backend data correctly", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockData });
    renderDashboard();
    const fifties = await screen.findAllByText("50");
    expect(fifties.length).toBeGreaterThan(0);
    const tens = await screen.findAllByText("10");
    expect(tens.length).toBeGreaterThan(0);
    const fives = await screen.findAllByText("5");
    expect(fives.length).toBeGreaterThan(0);
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
    const zeros = await screen.findAllByText("0");
    expect(zeros.length).toBeGreaterThan(0);
  });
});