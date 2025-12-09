// src/App.test.js
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Trip screen as default view", () => {
  render(<App />);

  // heading: "Create a Trip"
  const heading = screen.getByRole("heading", { name: /Create a/i });
  expect(heading).toBeInTheDocument();

  // "Create Trip" button
  const button = screen.getByRole("button", { name: /Create Trip/i });
  expect(button).toBeInTheDocument();
});
