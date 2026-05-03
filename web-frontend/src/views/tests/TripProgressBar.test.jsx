import React from "react";
import { render, screen } from "@testing-library/react";
import TripProgressBar from "../TripView/TripProgressBar";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("TripProgressBar — Rendering", () => {
  test("renders all 3 step labels", () => {
    render(<TripProgressBar currentStep={1} />);
    expect(screen.getByText("Trip Details")).toBeInTheDocument();
    expect(screen.getByText("Route Results")).toBeInTheDocument();
    expect(screen.getByText("Confirm & Save")).toBeInTheDocument();
  });

  test("renders all 3 step subtitles", () => {
    render(<TripProgressBar currentStep={1} />);
    expect(screen.getByText("Vehicle & route")).toBeInTheDocument();
    expect(screen.getByText("AI recommendations")).toBeInTheDocument();
    expect(screen.getByText("Review selection")).toBeInTheDocument();
  });

  test("renders 3 step circles", () => {
    render(<TripProgressBar currentStep={1} />);
    expect(document.querySelectorAll(".tpb-circle").length).toBe(3);
  });

  test("renders 2 connector lines between steps", () => {
    render(<TripProgressBar currentStep={1} />);
    expect(document.querySelectorAll(".tpb-line").length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Step 1 active
// ─────────────────────────────────────────────────────────────────────────────

describe("TripProgressBar — Step 1 active", () => {
  beforeEach(() => render(<TripProgressBar currentStep={1} />));

  test("step 1 circle has tpb-active class", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[0].classList.contains("tpb-active")).toBe(true);
  });

  test("step 2 circle has no active or done class", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[1].classList.contains("tpb-active")).toBe(false);
    expect(circles[1].classList.contains("tpb-done")).toBe(false);
  });

  test("step 3 circle has no active or done class", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[2].classList.contains("tpb-active")).toBe(false);
    expect(circles[2].classList.contains("tpb-done")).toBe(false);
  });

  test("step 1 label has tpb-label--active class", () => {
    const labels = document.querySelectorAll(".tpb-label");
    expect(labels[0].classList.contains("tpb-label--active")).toBe(true);
  });

  test("step 1 circle shows number 1", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[0].textContent).toBe("1");
  });

  test("no connector lines are done", () => {
    expect(document.querySelectorAll(".tpb-line--done").length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Step 2 active
// ─────────────────────────────────────────────────────────────────────────────

describe("TripProgressBar — Step 2 active", () => {
  beforeEach(() => render(<TripProgressBar currentStep={2} />));

  test("step 1 circle has tpb-done class", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[0].classList.contains("tpb-done")).toBe(true);
  });

  test("step 2 circle has tpb-active class", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[1].classList.contains("tpb-active")).toBe(true);
  });

  test("step 3 circle has no active or done class", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[2].classList.contains("tpb-active")).toBe(false);
    expect(circles[2].classList.contains("tpb-done")).toBe(false);
  });

  test("step 1 circle shows checkmark", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[0].textContent).toBe("✓");
  });

  test("step 2 circle shows number 2", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[1].textContent).toBe("2");
  });

  test("step 1 label has tpb-label--done class", () => {
    const labels = document.querySelectorAll(".tpb-label");
    expect(labels[0].classList.contains("tpb-label--done")).toBe(true);
  });

  test("step 2 label has tpb-label--active class", () => {
    const labels = document.querySelectorAll(".tpb-label");
    expect(labels[1].classList.contains("tpb-label--active")).toBe(true);
  });

  test("first connector line has tpb-line--done class", () => {
    const lines = document.querySelectorAll(".tpb-line");
    expect(lines[0].classList.contains("tpb-line--done")).toBe(true);
  });

  test("second connector line does not have tpb-line--done class", () => {
    const lines = document.querySelectorAll(".tpb-line");
    expect(lines[1].classList.contains("tpb-line--done")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Step 3 active
// ─────────────────────────────────────────────────────────────────────────────

describe("TripProgressBar — Step 3 active", () => {
  beforeEach(() => render(<TripProgressBar currentStep={3} />));

  test("step 1 circle has tpb-done class", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[0].classList.contains("tpb-done")).toBe(true);
  });

  test("step 2 circle has tpb-done class", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[1].classList.contains("tpb-done")).toBe(true);
  });

  test("step 3 circle has tpb-active class", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[2].classList.contains("tpb-active")).toBe(true);
  });

  test("step 1 and 2 circles show checkmark", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[0].textContent).toBe("✓");
    expect(circles[1].textContent).toBe("✓");
  });

  test("step 3 circle shows number 3", () => {
    const circles = document.querySelectorAll(".tpb-circle");
    expect(circles[2].textContent).toBe("3");
  });

  test("both connector lines have tpb-line--done class", () => {
    const lines = document.querySelectorAll(".tpb-line");
    expect(lines[0].classList.contains("tpb-line--done")).toBe(true);
    expect(lines[1].classList.contains("tpb-line--done")).toBe(true);
  });

  test("step 1 and 2 labels have tpb-label--done class", () => {
    const labels = document.querySelectorAll(".tpb-label");
    expect(labels[0].classList.contains("tpb-label--done")).toBe(true);
    expect(labels[1].classList.contains("tpb-label--done")).toBe(true);
  });

  test("step 3 label has tpb-label--active class", () => {
    const labels = document.querySelectorAll(".tpb-label");
    expect(labels[2].classList.contains("tpb-label--active")).toBe(true);
  });
});