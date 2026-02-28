import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TripScreen from "../TripView/TripScreen";

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}


// Helper
async function fillForm({
  vehicle = "Car",
  year = "2024",
  fuel = null,       // null → keep default (Petrol); pass "Diesel" to click toggle
  city = "Jeddah",
  origin = "Origin location",
  destination = "Destination location",
} = {}) {
  const [vehicleSelect, yearSelect, citySelect] = screen.getAllByRole("combobox");

  await userEvent.selectOptions(vehicleSelect, vehicle);
  await userEvent.selectOptions(yearSelect, year);
  await userEvent.selectOptions(citySelect, city);
  await userEvent.type(screen.getByPlaceholderText(/origin/i), origin);
  await userEvent.type(screen.getByPlaceholderText(/destination/i), destination);

  if (fuel === "Diesel") {
    await userEvent.click(screen.getByRole("button", { name: /Diesel/i }));
  } else if (fuel === "Petrol") {
    await userEvent.click(screen.getByRole("button", { name: /Petrol/i }));
  }

  return screen.getByRole("button", { name: /create trip/i });
}


test("renders Create Trip heading", () => {
  renderWithRouter(<TripScreen />);

  const heading = screen.getByRole("heading", { level: 2 });

  expect(heading).toHaveTextContent(/Create a/i);
  expect(heading).toHaveTextContent(/Trip/i);
});

test("submits trip when form is filled and calls backend once", async () => {
  renderWithRouter(<TripScreen />);

  const [vehicleSelect, yearSelect, citySelect] =
    screen.getAllByRole("combobox");

  const originInput = screen.getByPlaceholderText(/origin/i);
  const destinationInput = screen.getByPlaceholderText(/destination/i);
  const submitBtn = screen.getByRole("button", { name: /create trip/i });

  await userEvent.selectOptions(vehicleSelect, "Car");
  await userEvent.selectOptions(yearSelect, "2024");
  await userEvent.selectOptions(citySelect, "Jeddah");
  await userEvent.type(originInput, "Origin location");
  await userEvent.type(destinationInput, "Destination location");

  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ routes: [] }),
  });

  await userEvent.click(submitBtn);

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith(
    "http://127.0.0.1:8000/process_trip",
    expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
  );
});

test("shows error message when backend returns an error", async () => {
  renderWithRouter(<TripScreen />);

  const vehicleSelect = screen.getAllByRole("combobox")[0];
  const yearSelect = screen.getAllByRole("combobox")[1];
  const citySelect = screen.getAllByRole("combobox")[2];
  const originInput = screen.getByPlaceholderText(/origin/i);
  const destinationInput = screen.getByPlaceholderText(/destination/i);
  const submitBtn = screen.getByRole("button", { name: /create trip/i });

  await userEvent.selectOptions(vehicleSelect, "Car");
  await userEvent.selectOptions(yearSelect, "2024");
  await userEvent.selectOptions(citySelect, "Jeddah");
  await userEvent.type(originInput, "Origin");
  await userEvent.type(destinationInput, "Destination");

  global.fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: "Failed to fetch routes" }),
  });

  await userEvent.click(submitBtn);

  expect(global.fetch).toHaveBeenCalledTimes(1);

  const errorMessage = await screen.findByText(/failed to fetch routes/i);
  expect(errorMessage).toBeInTheDocument();
});


// Unit Tests — Rendering & Initial State


describe("TripScreen — Rendering & Initial State", () => {
  test("renders subtitle text", () => {
    renderWithRouter(<TripScreen />);
    expect(
      screen.getByText(/Enter your trip details to generate eco-friendly routes/i)
    ).toBeInTheDocument();
  });

  test("renders three dropdowns (vehicle, year, city)", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
  });

  test("renders Origin and Destination text inputs", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByPlaceholderText(/origin/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/destination/i)).toBeInTheDocument();
  });

  test("renders Petrol and Diesel fuel toggle buttons", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByRole("button", { name: /Petrol/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Diesel/i })).toBeInTheDocument();
  });

  test("Petrol is selected by default", () => {
    renderWithRouter(<TripScreen />);
    expect(screen.getByRole("button", { name: /Petrol/i })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /Diesel/i })).not.toHaveClass("active");
  });

  test("vehicle select defaults to empty placeholder option", () => {
    renderWithRouter(<TripScreen />);
    const [vehicleSelect] = screen.getAllByRole("combobox");
    expect(vehicleSelect).toHaveValue("");
  });

  test("year select defaults to empty placeholder option", () => {
    renderWithRouter(<TripScreen />);
    const yearSelect = screen.getAllByRole("combobox")[1];
    expect(yearSelect).toHaveValue("");
  });

  test("city select defaults to empty placeholder option", () => {
    renderWithRouter(<TripScreen />);
    const citySelect = screen.getAllByRole("combobox")[2];
    expect(citySelect).toHaveValue("");
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

  test("year dropdown includes year 2025", () => {
    renderWithRouter(<TripScreen />);
    const yearSelect = screen.getAllByRole("combobox")[1];
    expect(yearSelect).toContainElement(
      screen.getByRole("option", { name: "2025" })
    );
  });

  test("year dropdown includes year 1960", () => {
    renderWithRouter(<TripScreen />);
    const yearSelect = screen.getAllByRole("combobox")[1];
    expect(yearSelect).toContainElement(
      screen.getByRole("option", { name: "1960" })
    );
  });

  test("vehicle dropdown includes all 7 vehicle types", () => {
    renderWithRouter(<TripScreen />);
    const [vehicleSelect] = screen.getAllByRole("combobox");
    const options = Array.from(vehicleSelect.options).map((o) => o.value);
    ["Car", "SUV", "Van", "Bus", "Pickup Truck", "Truck", "Motorcycle"].forEach(
      (v) => expect(options).toContain(v)
    );
  });

  test("city dropdown includes all 14 Saudi cities", () => {
    renderWithRouter(<TripScreen />);
    const citySelect = screen.getAllByRole("combobox")[2];
    const options = Array.from(citySelect.options).map((o) => o.value);
    [
      "Riyadh", "Jeddah", "Dammam", "Khobar", "Dhahran",
      "Makkah", "Madinah", "Taif", "Tabuk", "Abha",
      "Khamis Mushait", "Jubail", "Hail", "Yanbu",
    ].forEach((c) => expect(options).toContain(c));
  });
});


// Unit Tests — User Interactions

describe("TripScreen — User Interactions", () => {
  test("selecting a vehicle type updates the dropdown value", async () => {
    renderWithRouter(<TripScreen />);
    const [vehicleSelect] = screen.getAllByRole("combobox");
    await userEvent.selectOptions(vehicleSelect, "SUV");
    expect(vehicleSelect).toHaveValue("SUV");
  });

  test("selecting a model year updates the dropdown value", async () => {
    renderWithRouter(<TripScreen />);
    const yearSelect = screen.getAllByRole("combobox")[1];
    await userEvent.selectOptions(yearSelect, "2020");
    expect(yearSelect).toHaveValue("2020");
  });

  test("selecting a city updates the dropdown value", async () => {
    renderWithRouter(<TripScreen />);
    const citySelect = screen.getAllByRole("combobox")[2];
    await userEvent.selectOptions(citySelect, "Riyadh");
    expect(citySelect).toHaveValue("Riyadh");
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
    await userEvent.click(screen.getByRole("button", { name: /Diesel/i }));
    expect(screen.getByRole("button", { name: /Diesel/i })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /Petrol/i })).not.toHaveClass("active");
  });

  test("clicking Petrol after Diesel switches back to Petrol", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Diesel/i }));
    await userEvent.click(screen.getByRole("button", { name: /Petrol/i }));
    expect(screen.getByRole("button", { name: /Petrol/i })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /Diesel/i })).not.toHaveClass("active");
  });

  test("clicking Petrol when already active keeps Petrol active", async () => {
    renderWithRouter(<TripScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Petrol/i }));
    expect(screen.getByRole("button", { name: /Petrol/i })).toHaveClass("active");
  });
});


// DB Integration — HTTP Request Payload

describe("TripScreen — DB Integration: Request Payload", () => {
  test("sends origin in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm({ origin: "King Fahd Road" });
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.origin).toBe("King Fahd Road");
  });

  test("sends destination in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm({ destination: "Al-Andalus Mall" });
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.destination).toBe("Al-Andalus Mall");
  });

  test("sends city in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm({ city: "Riyadh" });
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.city).toBe("Riyadh");
  });

  test("sends vehicleType in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm({ vehicle: "Truck" });
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.vehicleType).toBe("Truck");
  });

  test("sends fuelType as Petrol by default", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.fuelType).toBe("Petrol");
  });

  test("sends fuelType as Diesel when Diesel is selected", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm({ fuel: "Diesel" });
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.fuelType).toBe("Diesel");
  });

  test("sends modelYear in request body", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm({ year: "2019" });
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.modelYear).toBe("2019");
  });

  test("sends all six required fields in a single request", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(Object.keys(body)).toEqual(
      expect.arrayContaining(["origin", "destination", "city", "vehicleType", "fuelType", "modelYear"])
    );
  });

  test("does not send any extra unexpected keys", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(
      ["city", "destination", "fuelType", "modelYear", "origin", "vehicleType"]
    );
  });
});



// 4. DB Integration — Loading & Button State

describe("TripScreen — DB Integration: Loading State", () => {
  test("shows Fetching routes… while request is pending", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockReturnValueOnce(new Promise(() => {})); // never resolves

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    expect(await screen.findByText(/Fetching routes/i)).toBeInTheDocument();
  });

  test("submit button is disabled while request is pending", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockReturnValueOnce(new Promise(() => {}));

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    expect(
      await screen.findByRole("button", { name: /Fetching routes/i })
    ).toBeDisabled();
  });

  test("loading text disappears after successful response", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(screen.queryByText(/Fetching routes/i)).not.toBeInTheDocument()
    );
  });

  test("loading text disappears after a failed response", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(screen.queryByText(/Fetching routes/i)).not.toBeInTheDocument()
    );
  });

  test("button label returns to Create Trip after response arrives", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "err" }),
    });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Create Trip/i })).not.toBeDisabled()
    );
  });
});


// DB Integration — Error Handling

describe("TripScreen — DB Integration: Error Handling", () => {
  test("shows error when res.ok is false with no error field", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // no error key → fallback message
    });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    const err = await screen.findByText(/Failed to fetch routes/i);
    expect(err).toBeInTheDocument();
  });

  test("shows error when res.ok is true but data.error is set", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "Route service down" }),
    });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    const err = await screen.findByText(/Route service down/i);
    expect(err).toBeInTheDocument();
  });

  test("shows error on network failure (fetch rejects)", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockRejectedValueOnce(new Error("Network timeout"));

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    const err = await screen.findByText(/Network timeout/i);
    expect(err).toBeInTheDocument();
  });

  test("error message is prefixed with the warning emoji ⚠️", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Something went wrong" }),
    });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(screen.getByText(/⚠️/)).toBeInTheDocument()
    );
  });

  test("clears previous error when a new submission starts", async () => {
    renderWithRouter(<TripScreen />);

    // First call fails
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "First error" }),
    });
    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);
    await screen.findByText(/First error/i);

    // Second call is pending — error should be cleared immediately
    global.fetch.mockReturnValueOnce(new Promise(() => {}));
    await userEvent.click(screen.getByRole("button", { name: /Create Trip/i }));

    expect(screen.queryByText(/First error/i)).not.toBeInTheDocument();
  });

  test("does not show error message when request succeeds", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(screen.queryByText(/Fetching routes/i)).not.toBeInTheDocument()
    );
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });
});


// DB Integration — Navigation After Success

describe("TripScreen — DB Integration: Navigation", () => {
  test("does not navigate when the backend returns an error", async () => {
    // If navigation happened the TripScreen would unmount; we verify it stays mounted.
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Bad request" }),
    });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await screen.findByText(/Bad request/i);
    // TripScreen heading still in the DOM → no navigation occurred
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  test("does not navigate on network failure", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockRejectedValueOnce(new Error("Offline"));

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await screen.findByText(/Offline/i);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  test("fetch is called with POST method on submit", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch.mock.calls[0][1].method).toBe("POST");
  });

  test("fetch is called with correct Content-Type header", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch.mock.calls[0][1].headers["Content-Type"]).toBe(
      "application/json"
    );
  });

  test("fetch is called exactly once per submission", async () => {
    renderWithRouter(<TripScreen />);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ routes: [] }) });

    const submitBtn = await fillForm();
    await userEvent.click(submitBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  test("fetch is NOT called before the form is submitted", () => {
    renderWithRouter(<TripScreen />);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});