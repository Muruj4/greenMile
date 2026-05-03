import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TripScreen from "../TripView/TripScreen";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("react-icons/io5", () => ({
  IoCarSportOutline:    () => <svg />,
  IoCalendarOutline:    () => <svg />,
  IoLocationOutline:    () => <svg />,
  IoFlagOutline:        () => <svg />,
  IoMapOutline:         () => <svg />,
  IoChevronDownOutline: () => <svg />,
}));

jest.mock("../Dashboard/Nav", () => () => <div data-testid="nav" />);
jest.mock("../TripView/TripProgressBar", () => () => <div data-testid="progress" />);

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/**
 * Opens a CustomSelect dropdown and picks an option.
 * placeholder = the button text before selection (e.g. "Vehicle Type")
 */
async function pickOption(placeholder, option) {
  const btn = screen.getByRole("button", { name: new RegExp(placeholder, "i") });
  await userEvent.click(btn);
  await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${option}$`, "i") }));
}

/**
 * Fill the whole form with defaults or overrides.
 */
async function fillForm({
  vehicle     = "Car",
  year        = "2024",
  fuel        = null,
  city        = "Jeddah",
  origin      = "Origin location",
  destination = "Destination location",
} = {}) {
  await pickOption("Vehicle Type", vehicle);
  await pickOption("Model Year",   year);
  await pickOption("Select City",  city);

  await userEvent.type(screen.getByPlaceholderText(/origin/i),      origin);
  await userEvent.type(screen.getByPlaceholderText(/destination/i), destination);

  if (fuel === "Diesel") {
    await userEvent.click(screen.getByRole("button", { name: /^Diesel$/i }));
  } else if (fuel === "Petrol") {
    await userEvent.click(screen.getByRole("button", { name: /^Petrol$/i }));
  }

  return screen.getByRole("button", { name: /Create Trip/i });
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering & Initial State
// ─────────────────────────────────────────────────────────────────────────────

describe("TripScreen — Rendering & Initial State", () => {
  test("renders Create Trip heading", () => {
    renderWithRouter(<TripScreen />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent(/Create a/i);
    expect(heading).toHaveTextContent(/Trip/i);
  });

  test("renders subtitle text", () => {
    renderWithRouter(<TripScreen />);
    expect(
      screen.getByText(/Enter your trip details to generate eco-friendly routes/i)
    ).toBeInTheDocument();
  });

  test("renders Vehicle Type dropdown button", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByRole("button", { name: /Vehicle Type/i })).toBeInTheDocument();
  });

  test("renders Model Year dropdown button", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByRole("button", { name: /Model Year/i })).toBeInTheDocument();
  });

  test("renders Select City dropdown button", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByRole("button", { name: /Select City/i })).toBeInTheDocument();
  });

  test("renders Origin and Destination text inputs", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByPlaceholderText(/origin/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/destination/i)).toBeInTheDocument();
  });

  test("renders Petrol and Diesel fuel toggle buttons", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByRole("button", { name: /^Petrol$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Diesel$/i })).toBeInTheDocument();
  });

  test("Petrol is selected by default", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByRole("button", { name: /^Petrol$/i })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /^Diesel$/i })).not.toHaveClass("active");
  });

  test("origin input is empty on mount", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByPlaceholderText(/origin/i)).toHaveValue("");
  });

  test("destination input is empty on mount", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByPlaceholderText(/destination/i)).toHaveValue("");
  });

  test("does not show error message on initial render", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });

  test("no loading text shown on initial render", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.queryByText(/Fetching routes/i)).not.toBeInTheDocument();
  });

  test("vehicle dropdown includes all 7 vehicle types", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Vehicle Type/i }));
    ["Car", "SUV", "Van", "Bus", "Pickup Truck", "Truck", "Motorcycle"].forEach((v) => {
      expect(screen.getByRole("button", { name: new RegExp(`^${v}$`, "i") })).toBeInTheDocument();
    });
  });

  test("year dropdown includes year 2025", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Model Year/i }));
    expect(screen.getByRole("button", { name: /^2025$/ })).toBeInTheDocument();
  });

  test("year dropdown includes year 1960", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Model Year/i }));
    // scroll to bottom to find 1960
    expect(screen.getByRole("button", { name: /^1960$/ })).toBeInTheDocument();
  });

  test("city dropdown includes all 14 Saudi cities", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Select City/i }));
    [
      "Riyadh", "Jeddah", "Dammam", "Khobar", "Dhahran",
      "Makkah", "Madinah", "Taif", "Tabuk", "Abha",
      "Khamis Mushait", "Jubail", "Hail", "Yanbu",
    ].forEach((c) => {
      expect(screen.getByRole("button", { name: new RegExp(`^${c}$`, "i") })).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// User Interactions
// ─────────────────────────────────────────────────────────────────────────────

describe("TripScreen — User Interactions", () => {
  test("selecting a vehicle type updates the button text", async () => {
    renderWithRouter(<TripScreen />);
    await pickOption("Vehicle Type", "SUV");
    expect(screen.getByRole("button", { name: /SUV/i })).toBeInTheDocument();
  });

  test("selecting a model year updates the button text", async () => {
    renderWithRouter(<TripScreen />);
    await pickOption("Model Year", "2020");
    expect(screen.getByRole("button", { name: /2020/ })).toBeInTheDocument();
  });

  test("selecting a city updates the button text", async () => {
    renderWithRouter(<TripScreen />);
    await pickOption("Select City", "Riyadh");
    expect(screen.getByRole("button", { name: /Riyadh/i })).toBeInTheDocument();
  });

  test("typing in Origin updates its value", async () => {
    renderWithRouter(<TripScreen />);
    const input = screen.getByPlaceholderText(/origin/i);
    await userEvent.type(input, "King Fahd Road");
    expect(input).toHaveValue("King Fahd Road");
  });

  test("typing in Destination updates its value", async () => {
    renderWithRouter(<TripScreen />);
    const input = screen.getByPlaceholderText(/destination/i);
    await userEvent.type(input, "Al-Andalus Mall");
    expect(input).toHaveValue("Al-Andalus Mall");
  });

  test("clicking Diesel toggles fuel type to Diesel", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /^Diesel$/i }));
    expect(screen.getByRole("button", { name: /^Diesel$/i })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /^Petrol$/i })).not.toHaveClass("active");
  });

  test("clicking Petrol after Diesel switches back to Petrol", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /^Diesel$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Petrol$/i }));
    expect(screen.getByRole("button", { name: /^Petrol$/i })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /^Diesel$/i })).not.toHaveClass("active");
  });

  test("clicking Petrol when already active keeps Petrol active", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /^Petrol$/i }));
    expect(screen.getByRole("button", { name: /^Petrol$/i })).toHaveClass("active");
  });

  test("dropdown closes after selecting an option", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Vehicle Type/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Car$/i }));
    expect(screen.queryByRole("button", { name: /^SUV$/i })).not.toBeInTheDocument();
  });

  test("dropdown closes on Escape key", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Vehicle Type/i }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: /^Car$/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB Integration — Request Payload
// ─────────────────────────────────────────────────────────────────────────────

describe("TripScreen — DB Integration: Request Payload", () => {
  test("sends origin in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm({ origin: "King Fahd Road" });
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.origin).toBe("King Fahd Road");
  });

  test("sends destination in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm({ destination: "Al-Andalus Mall" });
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.destination).toBe("Al-Andalus Mall");
  });

  test("sends city in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm({ city: "Riyadh" });
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.city).toBe("Riyadh");
  });

  test("sends vehicleType in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm({ vehicle: "Truck" });
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.vehicleType).toBe("Truck");
  });

  test("sends fuelType as Petrol by default", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.fuelType).toBe("Petrol");
  });

  test("sends fuelType as Diesel when Diesel is selected", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm({ fuel: "Diesel" });
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.fuelType).toBe("Diesel");
  });

  test("sends modelYear in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm({ year: "2019" });
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.modelYear).toBe("2019");
  });

  test("sends all six required fields in a single request", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(Object.keys(body)).toEqual(
      expect.arrayContaining(["origin", "destination", "city", "vehicleType", "fuelType", "modelYear"])
    );
  });

  test("sends exactly the six required keys — no extras", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(
      ["city", "destination", "fuelType", "modelYear", "origin", "vehicleType"]
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB Integration — Loading State
// ─────────────────────────────────────────────────────────────────────────────

describe("TripScreen — DB Integration: Loading State", () => {
  test("shows Fetching routes… while request is pending", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockReturnValueOnce(new Promise(() => {}));
    const btn = await fillForm();
    await userEvent.click(btn);
    expect(await screen.findByText(/Fetching routes/i)).toBeInTheDocument();
  });

  test("submit button is disabled while request is pending", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockReturnValueOnce(new Promise(() => {}));
    const btn = await fillForm();
    await userEvent.click(btn);
    expect(await screen.findByRole("button", { name: /Fetching routes/i })).toBeDisabled();
  });

  test("loading text disappears after successful response", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() =>
      expect(screen.queryByText(/Fetching routes/i)).not.toBeInTheDocument()
    );
  });

  test("loading text disappears after a failed response", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Server error" }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() =>
      expect(screen.queryByText(/Fetching routes/i)).not.toBeInTheDocument()
    );
  });

  test("button label returns to Create Trip after response arrives", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "err" }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Create Trip/i })).not.toBeDisabled()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB Integration — Error Handling
// ─────────────────────────────────────────────────────────────────────────────

describe("TripScreen — DB Integration: Error Handling", () => {
  test("shows error when res.ok is false with no error field", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const btn = await fillForm();
    await userEvent.click(btn);
    expect(await screen.findByText(/Failed to fetch routes/i)).toBeInTheDocument();
  });

  test("shows error when res.ok is true but data.error is set", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ error: "Route service down" }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    expect(await screen.findByText(/Route service down/i)).toBeInTheDocument();
  });

  test("shows error on network failure", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockRejectedValueOnce(new Error("Network timeout"));
    const btn = await fillForm();
    await userEvent.click(btn);
    expect(await screen.findByText(/Network timeout/i)).toBeInTheDocument();
  });

  test("error message is prefixed with ⚠️", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Something went wrong" }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/⚠️/)).toBeInTheDocument());
  });

  test("clears previous error when a new submission starts", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "First error" }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await screen.findByText(/First error/i);

    global.fetch.mockReturnValueOnce(new Promise(() => {}));
    await userEvent.click(screen.getByRole("button", { name: /Create Trip/i }));
    expect(screen.queryByText(/First error/i)).not.toBeInTheDocument();
  });

  test("does not show error when request succeeds", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() =>
      expect(screen.queryByText(/Fetching routes/i)).not.toBeInTheDocument()
    );
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });

  test("shows validation error when vehicle is not selected", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.type(screen.getByPlaceholderText(/origin/i), "A");
    await userEvent.type(screen.getByPlaceholderText(/destination/i), "B");
    await userEvent.click(screen.getByRole("button", { name: /Create Trip/i }));
    expect(await screen.findByText(/Please select a vehicle type/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("shows validation error when city is not selected", async () => {
    renderWithRouter(<TripScreen />);
    await pickOption("Vehicle Type", "Car");
    await pickOption("Model Year", "2024");
    await userEvent.type(screen.getByPlaceholderText(/origin/i), "A");
    await userEvent.type(screen.getByPlaceholderText(/destination/i), "B");
    await userEvent.click(screen.getByRole("button", { name: /Create Trip/i }));
    expect(await screen.findByText(/Please select a city/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB Integration — Navigation
// ─────────────────────────────────────────────────────────────────────────────

describe("TripScreen — DB Integration: Navigation", () => {
  test("does not navigate when backend returns error", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Bad request" }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await screen.findByText(/Bad request/i);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  test("does not navigate on network failure", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockRejectedValueOnce(new Error("Offline"));
    const btn = await fillForm();
    await userEvent.click(btn);
    await screen.findByText(/Offline/i);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  test("fetch is called with POST method", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch.mock.calls[0][1].method).toBe("POST");
  });

  test("fetch is called with correct Content-Type header", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch.mock.calls[0][1].headers["Content-Type"]).toBe("application/json");
  });

  test("fetch is called exactly once per submission", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });
    const btn = await fillForm();
    await userEvent.click(btn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  test("fetch is NOT called before form is submitted", () => {
    renderWithRouter(<TripScreen />);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});