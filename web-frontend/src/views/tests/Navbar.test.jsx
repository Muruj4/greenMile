import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Navbar from "../Nav";

function renderNavbar(route = "/dashboard", companyName = "Green Mile Logistics") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Navbar companyName={companyName} />
    </MemoryRouter>
  );
}

describe("Navbar — Unit Tests", () => {

  test("renders company name", () => {
    renderNavbar();
    expect(screen.getByText("Green Mile Logistics")).toBeInTheDocument();
  });

  test("renders initials correctly", () => {
    renderNavbar();
    expect(screen.getByText("GM")).toBeInTheDocument();
  });

  test("renders default company name when none provided", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  test("highlights dashboard when on /dashboard", () => {
    renderNavbar("/dashboard");
    expect(screen.getByRole("button", { name: /dashboard/i }))
      .toHaveClass("navbar__btn--on");
  });

  test("highlights Create Trip when on /trip", () => {
    renderNavbar("/trip");
    expect(screen.getByRole("button", { name: /create a trip/i }))
      .toHaveClass("navbar__btn--on");
  });

  test("highlights My Trips when on /trips", () => {
    renderNavbar("/trips");
    expect(screen.getByRole("button", { name: /my trips/i }))
      .toHaveClass("navbar__btn--on");
  });

  test("renders current month label", () => {
    renderNavbar();
    const month = new Date().toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
    expect(screen.getByText(month)).toBeInTheDocument();
  });

  test("clicking buttons does not crash", async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole("button", { name: /dashboard/i }));
    await user.click(screen.getByRole("button", { name: /create a trip/i }));
    await user.click(screen.getByRole("button", { name: /my trips/i }));

    expect(screen.getByText("GreenMile")).toBeInTheDocument();
  });

});