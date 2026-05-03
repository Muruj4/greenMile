import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import fetchMock from "jest-fetch-mock";
import AuthPage from "../Auth/AuthPage";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../assets/logo.png", () => "logo.png", { virtual: true });

jest.mock("react-icons/io5", () => ({
  IoPersonOutline:      () => <svg data-testid="icon-person" />,
  IoBusinessOutline:    () => <svg data-testid="icon-business" />,
  IoMailOutline:        () => <svg data-testid="icon-mail" />,
  IoLockClosedOutline:  () => <svg data-testid="icon-lock" />,
  IoEyeOutline:         () => <svg data-testid="icon-eye" />,
  IoEyeOffOutline:      () => <svg data-testid="icon-eye-off" />,
  IoCheckmark:          () => <svg data-testid="icon-check" />,
  IoChevronDownOutline: () => <svg data-testid="icon-chevron" />,
  IoArrowBackOutline:   () => <svg data-testid="icon-back" />,
}));

jest.mock("./AuthPage.css", () => ({}), { virtual: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

fetchMock.enableMocks();

const renderAuth = () =>
  render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>
  );

const getEmailInput    = () => screen.getByPlaceholderText("you@example.com");
const getPasswordInput = () => screen.getByPlaceholderText("••••••••");
const getSubmitBtn     = () => document.querySelector("button.gm-submit");

beforeEach(() => {
  fetchMock.resetMocks();
  mockNavigate.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS — Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("Rendering", () => {
  test("renders Sign In tab as active by default", () => {
    renderAuth();
    expect(document.querySelector("button.gm-tab.gm-tab--active")).toHaveTextContent("Sign In");
    expect(screen.getByRole("button", { name: "Sign Up" })).not.toHaveClass("gm-tab--active");
  });

  test("renders brand name and tagline", () => {
    renderAuth();
    expect(screen.getByText("Green")).toBeInTheDocument();
    expect(screen.getByText("Mile")).toBeInTheDocument();
    expect(screen.getByText(/Sustainable Last-Mile Delivery Platform/i)).toBeInTheDocument();
  });

  test("renders email and password fields on Sign In", () => {
    renderAuth();
    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
  });

  test("does NOT render Name or Company fields on Sign In", () => {
    renderAuth();
    expect(screen.queryByPlaceholderText("Enter your name")).not.toBeInTheDocument();
    expect(screen.queryByText("Company Name")).not.toBeInTheDocument();
  });

  test("renders Remember Me and Forgot Password only on Sign In", () => {
    renderAuth();
    expect(screen.getByText("Remember me")).toBeInTheDocument();
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });

  test("renders logo image", () => {
    renderAuth();
    expect(screen.getByAltText("GreenMile Logo")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS — Tab Switching
// ─────────────────────────────────────────────────────────────────────────────

describe("Tab switching", () => {
  test("switches to Sign Up view when Sign Up tab clicked", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    expect(screen.getByRole("button", { name: "Sign Up" })).toHaveClass("gm-tab--active");
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
    expect(screen.getByText("Company Name")).toBeInTheDocument();
  });

  test("Sign Up hides Remember Me and Forgot Password", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    expect(screen.queryByText("Remember me")).not.toBeInTheDocument();
    expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();
  });

  test("switches back to Sign In via bottom link", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    await userEvent.click(screen.getByRole("button", { name: /already have an account/i }));
    expect(document.querySelector("button.gm-tab.gm-tab--active")).toHaveTextContent("Sign In");
  });

  test("name field starts empty when switching to Sign Up", async () => {
    renderAuth();
    await userEvent.type(getEmailInput(), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    expect(screen.getByPlaceholderText("Enter your name")).toHaveValue("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS — Email Validation
// ─────────────────────────────────────────────────────────────────────────────

describe("Email validation", () => {
  test("shows error when email is empty on submit", async () => {
    renderAuth();
    await userEvent.type(getPasswordInput(), "somepass");
    await userEvent.click(getSubmitBtn());
    // Component validates client-side and shows this message
    expect(await screen.findByText("Please enter your email")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("shows error for invalid email format", async () => {
    renderAuth();
    await userEvent.type(getEmailInput(), "notanemail");
    await userEvent.type(getPasswordInput(), "somepass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("clears email error when user corrects the value", async () => {
    renderAuth();
    await userEvent.type(getEmailInput(), "bad");
    await userEvent.type(getPasswordInput(), "somepass");
    await userEvent.click(getSubmitBtn());
    await screen.findByText("Please enter a valid email address");

    await userEvent.clear(getEmailInput());
    await userEvent.type(getEmailInput(), "good@example.com");
    await waitFor(() =>
      expect(screen.queryByText("Please enter a valid email address")).not.toBeInTheDocument()
    );
  });

  test("does not show error before field is touched", () => {
    renderAuth();
    expect(screen.queryByText("Please enter your email")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS — Password Toggle
// ─────────────────────────────────────────────────────────────────────────────

describe("Password visibility toggle", () => {
  test("password is hidden by default", () => {
    renderAuth();
    expect(getPasswordInput()).toHaveAttribute("type", "password");
  });

  test("clicking eye button reveals password", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(getPasswordInput()).toHaveAttribute("type", "text");
  });

  test("clicking eye button again hides password", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: /show password/i }));
    await userEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(getPasswordInput()).toHaveAttribute("type", "password");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS — Remember Me
// ─────────────────────────────────────────────────────────────────────────────

describe("Remember Me checkbox", () => {
  test("is unchecked by default", () => {
    renderAuth();
    const checkBtn = screen.getByRole("button", { name: /remember me/i });
    expect(checkBtn.querySelector(".gm-check--on")).not.toBeInTheDocument();
  });

  test("toggles on when clicked", async () => {
    renderAuth();
    const checkBtn = screen.getByRole("button", { name: /remember me/i });
    await userEvent.click(checkBtn);
    expect(checkBtn.querySelector(".gm-check--on")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS — Company Dropdown
// ─────────────────────────────────────────────────────────────────────────────

describe("Company dropdown (Sign Up)", () => {
  const goToSignUp = async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
  };

  test("dropdown is hidden by default", async () => {
    await goToSignUp();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  test("opens dropdown when button clicked", async () => {
    await goToSignUp();
    await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  test("renders all 17 company options", async () => {
    await goToSignUp();
    await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
    expect(screen.getAllByRole("option")).toHaveLength(17);
  });

  test("selects a company and closes dropdown", async () => {
    await goToSignUp();
    await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
    await userEvent.click(screen.getByRole("option", { name: "Aramex" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText("Aramex")).toBeInTheDocument();
  });

  test("closes dropdown on Escape key", async () => {
    await goToSignUp();
    await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  test("closes dropdown when clicking outside", async () => {
    await goToSignUp();
    await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION TESTS — Sign In
// ─────────────────────────────────────────────────────────────────────────────

describe("Sign In – API integration", () => {
  const fillSignIn = async (email = "user@example.com", password = "Secret1!") => {
    await userEvent.type(getEmailInput(), email);
    await userEvent.type(getPasswordInput(), password);
  };

  test("calls /auth/signin with correct payload", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ token: "tok123", role: "manager", company_id: 1, company: "Aramex" }),
      { status: 200 }
    );
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/auth/signin");
    expect(JSON.parse(opts.body)).toEqual({
      email: "user@example.com",
      password: "Secret1!",
    });
  });

  test("navigates to /dashboard on successful sign in", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ token: "tok123", role: "manager", company_id: 1, company: "Aramex" }),
      { status: 200 }
    );
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard"));
  });

  test("stores token in sessionStorage when Remember Me is OFF", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ token: "tok123", role: "manager", company_id: 1, company: "Aramex" }),
      { status: 200 }
    );
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());
    await waitFor(() => expect(sessionStorage.getItem("token")).toBe("tok123"));
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("stores token in localStorage when Remember Me is ON", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ token: "tok123", role: "manager", company_id: 1, company: "Aramex" }),
      { status: 200 }
    );
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: /remember me/i }));
    await fillSignIn();
    await userEvent.click(getSubmitBtn());
    await waitFor(() => expect(localStorage.getItem("token")).toBe("tok123"));
    expect(sessionStorage.getItem("token")).toBeNull();
  });

  test("stores role alongside token", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ token: "tok123", role: "manager", company_id: 1, company: "Aramex" }),
      { status: 200 }
    );
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());
    await waitFor(() => expect(sessionStorage.getItem("role")).toBe("manager"));
  });

  test("displays API error message on failed sign in", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ detail: "Invalid credentials" }),
      { status: 401 }
    );
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  test("displays generic error when server returns no detail", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({}), { status: 500 });
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Sign in failed")).toBeInTheDocument();
  });

  test("handles network failure gracefully", async () => {
    fetchMock.mockRejectOnce(new Error("Network error"));
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  test("shows error when non-manager tries to sign in", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ token: "tok123", role: "driver", company_id: 1, company: "Aramex" }),
      { status: 200 }
    );
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText(/managers only/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION TESTS — Sign Up (OTP flow)
// ─────────────────────────────────────────────────────────────────────────────

describe("Sign Up – OTP flow", () => {
  const goToSignUp = async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
  };

  const fillSignUp = async ({
    name     = "Alice Smith",
    company  = "Aramex",
    email    = "alice@example.com",
    password = "Pass1@3x",
  } = {}) => {
    if (name) await userEvent.type(screen.getByPlaceholderText("Enter your name"), name);
    if (company) {
      await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
      await userEvent.click(screen.getByRole("option", { name: company }));
    }
    await userEvent.type(getEmailInput(), email);
    await userEvent.type(getPasswordInput(), password);
  };

  test("calls /auth/manager/signup/request-otp with correct payload", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ message: "OTP sent" }), { status: 200 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/auth/manager/signup/request-otp");
    const body = JSON.parse(opts.body);
    expect(body.name).toBe("Alice Smith");
    expect(body.company).toBe("Aramex");
    expect(body.email).toBe("alice@example.com");
  });

  test("shows OTP screen after successful request", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ message: "OTP sent" }), { status: 200 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText(/Enter OTP Code/i)).toBeInTheDocument();
  });

  test("shows pending email on OTP screen", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ message: "OTP sent" }), { status: 200 });
    await fillSignUp({ email: "alice@example.com" });
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
  });

  test("displays API error on failed OTP request", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(
      JSON.stringify({ detail: "Email already registered" }),
      { status: 409 }
    );
    await fillSignUp();
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Email already registered")).toBeInTheDocument();
  });

  test("verifies OTP and switches to Sign In", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ message: "OTP sent" }), { status: 200 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());
    await screen.findByText(/Enter OTP Code/i);

    fetchMock.mockResponseOnce(
      JSON.stringify({ token: "tok999", role: "manager" }),
      { status: 200 }
    );
    await userEvent.type(screen.getByPlaceholderText("0000"), "1234");
    await userEvent.click(getSubmitBtn());

    await waitFor(() =>
      expect(document.querySelector("button.gm-tab.gm-tab--active")).toHaveTextContent("Sign In")
    );
  });

  test("shows error for incorrect OTP", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ message: "OTP sent" }), { status: 200 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());
    await screen.findByText(/Enter OTP Code/i);

    fetchMock.mockResponseOnce(
      JSON.stringify({ detail: "Invalid OTP" }),
      { status: 400 }
    );
    await userEvent.type(screen.getByPlaceholderText("0000"), "9999");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Invalid OTP")).toBeInTheDocument();
  });

  test("shows error when OTP is less than 4 digits", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ message: "OTP sent" }), { status: 200 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());
    await screen.findByText(/Enter OTP Code/i);

    await userEvent.type(screen.getByPlaceholderText("0000"), "12");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText(/4-digit OTP/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the request-otp call
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION TESTS — Client-Side Validation
// ─────────────────────────────────────────────────────────────────────────────

describe("Client-side validation on submit", () => {
  test("Sign In: shows error when email is empty", async () => {
    renderAuth();
    await userEvent.type(getPasswordInput(), "pass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please enter your email")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("Sign In: shows error when password is empty", async () => {
    renderAuth();
    await userEvent.type(getEmailInput(), "user@example.com");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please enter your password")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("Sign Up: shows error when name is missing", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
    await userEvent.click(screen.getByRole("option", { name: "Ninja" }));
    await userEvent.type(getEmailInput(), "x@x.com");
    await userEvent.type(getPasswordInput(), "pass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please enter your name")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("Sign Up: shows error when company is missing", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    await userEvent.type(screen.getByPlaceholderText("Enter your name"), "Alice");
    await userEvent.type(getEmailInput(), "x@x.com");
    await userEvent.type(getPasswordInput(), "pass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please select your company")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("Sign Up: shows error when password is missing", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    await userEvent.type(screen.getByPlaceholderText("Enter your name"), "Alice");
    await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
    await userEvent.click(screen.getByRole("option", { name: "Ninja" }));
    await userEvent.type(getEmailInput(), "x@x.com");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please enter your password")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("Sign Up: shows error for invalid email format", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    await userEvent.type(screen.getByPlaceholderText("Enter your name"), "Alice");
    await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
    await userEvent.click(screen.getByRole("option", { name: "Ninja" }));
    await userEvent.type(getEmailInput(), "not-an-email");
    await userEvent.type(getPasswordInput(), "pass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCESSIBILITY
// ─────────────────────────────────────────────────────────────────────────────

describe("Accessibility", () => {
  test("password toggle has descriptive aria-label", () => {
    renderAuth();
    expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();
  });

  test("company dropdown button has aria-expanded=false by default", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    const ddBtn = screen.getByRole("button", { name: /select your company/i });
    expect(ddBtn).toHaveAttribute("aria-expanded", "false");
  });

  test("company dropdown button has aria-expanded=true when open", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    const ddBtn = screen.getByRole("button", { name: /select your company/i });
    await userEvent.click(ddBtn);
    expect(ddBtn).toHaveAttribute("aria-expanded", "true");
  });

  test("error message visible in DOM for screen readers", async () => {
    renderAuth();
    await userEvent.type(getEmailInput(), "notvalid");
    await userEvent.type(getPasswordInput(), "somepass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument();
  });
});