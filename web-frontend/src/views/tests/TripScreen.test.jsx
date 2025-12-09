import React from "react";
import { render, screen } from "@testing-library/react";
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

