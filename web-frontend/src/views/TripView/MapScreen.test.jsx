import React from "react";
import { render, screen } from "@testing-library/react";
import MapScreen from "./MapScreen";
import { useLocation } from "react-router-dom";

jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
}));

function mockRoutes(routes) {
  if (routes) {
    useLocation.mockReturnValue({ state: { routes } });
  } else {
    useLocation.mockReturnValue({ state: undefined });
  }
}

describe("MapScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows 'No routes available.' when there are no routes", () => {
    mockRoutes(null); 

    render(<MapScreen />);

    expect(
      screen.getByText(/No routes available\./i)
    ).toBeInTheDocument();
  });

  test("renders title and route cards when routes are provided", () => {
    const fakeRoutes = [
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

    mockRoutes(fakeRoutes);

    render(<MapScreen />);

    expect(screen.getByText(/Routes/i)).toBeInTheDocument();

    
    expect(screen.getByText(/Fastest route/i)).toBeInTheDocument();
    expect(screen.getByText(/Eco-friendly route/i)).toBeInTheDocument();
  });

  test("shows emissions with one decimal and CO₂e suffix", () => {
    const fakeRoutes = [
      {
        summary: "Eco route",
        distance: "8 km",
        duration: "12 min",
        color: "green",
        emissions: { co2e: 9.4 },
        coordinates: [
          [39.1, 21.5],
          [39.15, 21.55],
        ],
      },
    ];

    mockRoutes(fakeRoutes); 

    render(<MapScreen />);

   
    expect(screen.getByText("9.4 CO₂e")).toBeInTheDocument();
  });
});

