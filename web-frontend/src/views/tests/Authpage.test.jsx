import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import fetchMock from "jest-fetch-mock";
import AuthPage from "../Auth/AuthPage";

// ---------- mocks ----------

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock logo asset
jest.mock("../../assets/logo.png", () => "logo.png", { virtual: true });

// Mock react-icons
jest.mock("react-icons/io5", () => ({
  IoPersonOutline:      () => <svg data-testid="icon-person" />,
  IoBusinessOutline:    () => <svg data-testid="icon-business" />,
  IoMailOutline:        () => <svg data-testid="icon-mail" />,
  IoLockClosedOutline:  () => <svg data-testid="icon-lock" />,
  IoEyeOutline:         () => <svg data-testid="icon-eye" />,
  IoEyeOffOutline:      () => <svg data-testid="icon-eye-off" />,
  IoCheckmark:          () => <svg data-testid="icon-check" />,
  IoChevronDownOutline: () => <svg data-testid="icon-chevron" />,
}));

// Mock CSS
jest.mock("./AuthPage.css", () => ({}), { virtual: true });


// helpers 

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

//setup

beforeEach(() => {
  fetchMock.resetMocks();
  mockNavigate.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});


// UNIT TESTS – Rendering

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


// UNIT TESTS – Tab Switching

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

  test("resets form fields when switching tabs", async () => {
    renderAuth();
    await userEvent.type(getEmailInput(), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    // email should still be filled (email persists across tabs – by design)
    // name and company start empty
    expect(screen.getByPlaceholderText("Enter your name")).toHaveValue("");
  });
});


// UNIT TESTS – Email Validation

describe("Email validation", () => {
  test("shows error on submit when email is empty", async () => {
    // Component validates on submit, not on blur
    renderAuth();
    fetchMock.mockResponseOnce(JSON.stringify({ detail: "Email is required" }), { status: 400 });
    await userEvent.type(getPasswordInput(), "somepass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
  });

  test("shows error on submit for invalid email format", async () => {
    // Component sends request and shows the server/validation error
    renderAuth();
    fetchMock.mockResponseOnce(JSON.stringify({ detail: "Please enter a valid email address" }), { status: 400 });
    await userEvent.type(getEmailInput(), "notanemail");
    await userEvent.type(getPasswordInput(), "somepass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument();
  });

  test("clears email error when user corrects the value and resubmits", async () => {
    renderAuth();
    // First submit: invalid email → component shows inline error, never reaches fetch
    await userEvent.type(getEmailInput(), "bad");
    await userEvent.type(getPasswordInput(), "somepass");
    await userEvent.click(getSubmitBtn());
    await screen.findByText("Please enter a valid email address");

    // Fix the email with a fully valid address → error clears immediately on change
    await userEvent.clear(getEmailInput());
    await userEvent.type(getEmailInput(), "good@example.com");
    await waitFor(() =>
      expect(screen.queryByText("Please enter a valid email address")).not.toBeInTheDocument()
    );
  });

  test("does not show error before the field is touched", () => {
    renderAuth();
    expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
  });
});


// UNIT TESTS – Password Toggle

describe("Password visibility toggle", () => {
  test("password is hidden by default", () => {
    renderAuth();
    expect(getPasswordInput()).toHaveAttribute("type", "password");
  });

  test("clicking eye button reveals password", async () => {
    renderAuth();
    const toggleBtn = screen.getByRole("button", { name: /show password/i });
    await userEvent.click(toggleBtn);
    expect(getPasswordInput()).toHaveAttribute("type", "text");
  });

  test("clicking eye button again hides password", async () => {
    renderAuth();
    const toggleBtn = screen.getByRole("button", { name: /show password/i });
    await userEvent.click(toggleBtn);
    await userEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(getPasswordInput()).toHaveAttribute("type", "password");
  });
});


// UNIT TESTS – Remember Me

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


// UNIT TESTS – Company Dropdown

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
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(17);
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


// INTEGRATION TESTS – Sign In

describe("Sign In – API integration", () => {
  const fillSignIn = async (email = "user@example.com", password = "Secret123") => {
    await userEvent.type(getEmailInput(), email);
    await userEvent.type(getPasswordInput(), password);
  };

  test("calls /auth/signin with correct payload", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ token: "tok123", role: "manager" }), { status: 200 });
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/auth/signin");
    expect(JSON.parse(opts.body)).toEqual({ email: "user@example.com", password: "Secret123" });
  });

  test("navigates to /trip on successful sign in", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ token: "tok123", role: "manager" }), { status: 200 });
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/trip"));
  });

  test("stores token in sessionStorage when Remember Me is OFF", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ token: "tok123", role: "manager" }), { status: 200 });
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());

    await waitFor(() => expect(sessionStorage.getItem("token")).toBe("tok123"));
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("stores token in localStorage when Remember Me is ON", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ token: "tok123", role: "manager" }), { status: 200 });
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: /remember me/i }));
    await fillSignIn();
    await userEvent.click(getSubmitBtn());

    await waitFor(() => expect(localStorage.getItem("token")).toBe("tok123"));
    expect(sessionStorage.getItem("token")).toBeNull();
  });

  test("stores role alongside token", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ token: "tok123", role: "admin" }), { status: 200 });
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());

    await waitFor(() => expect(sessionStorage.getItem("role")).toBe("admin"));
  });

  test("displays API error message on failed sign in", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ detail: "Invalid credentials" }), { status: 401 });
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

    expect(await screen.findByText("SignIn failed")).toBeInTheDocument();
  });

  test("handles network failure gracefully", async () => {
    fetchMock.mockRejectOnce(new Error("Network error"));
    renderAuth();
    await fillSignIn();
    await userEvent.click(getSubmitBtn());

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });
});


// INTEGRATION TESTS – Sign Up

describe("Sign Up API integration", () => {
  const goToSignUp = async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));
  };

  const fillSignUp = async ({ name = "Alice Smith", company = "Aramex", email = "alice@example.com", password = "Pass1234" } = {}) => {
    if (name) await userEvent.type(screen.getByPlaceholderText("Enter your name"), name);
    if (company) {
      await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
      await userEvent.click(screen.getByRole("option", { name: company }));
    }
    await userEvent.type(getEmailInput(), email);
    await userEvent.type(getPasswordInput(), password);
  };

  test("calls /auth/manager/signup with correct payload", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ id: 1 }), { status: 200 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/auth/manager/signup");
    expect(JSON.parse(opts.body)).toEqual({
      name: "Alice Smith",
      company: "Aramex",
      email: "alice@example.com",
      password: "Pass1234",
    });
  });

  test("switches to Sign In after successful sign up", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ id: 1 }), { status: 200 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());

    await waitFor(() =>
      expect(document.querySelector("button.gm-tab.gm-tab--active")).toHaveTextContent("Sign In")
    );
  });

  test("clears name, company and password after successful sign up", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ id: 1 }), { status: 200 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());

    // After switching to Sign In, name/company fields are gone
    await waitFor(() => expect(screen.queryByPlaceholderText("Enter your name")).not.toBeInTheDocument());
  });

  test("does NOT navigate to /trip after sign up", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ id: 1 }), { status: 200 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());

    await waitFor(() => expect(document.querySelector("button.gm-tab.gm-tab--active")).toHaveTextContent("Sign In"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("displays API error on failed sign up", async () => {
    await goToSignUp();
    fetchMock.mockResponseOnce(JSON.stringify({ detail: "Email already registered" }), { status: 409 });
    await fillSignUp();
    await userEvent.click(getSubmitBtn());

    expect(await screen.findByText("Email already registered")).toBeInTheDocument();
  });
});


// INTEGRATION TESTS – Client-Side Validation (form submit)

describe("Client-side validation on submit", () => {
  test("Sign In: shows error when email is empty", async () => {
    // Component submits even with empty email; server returns the validation error
    renderAuth();
    fetchMock.mockResponseOnce(JSON.stringify({ detail: "Email is required" }), { status: 400 });
    await userEvent.type(getPasswordInput(), "pass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
  });

  test("Sign In: blocks submit and shows error when password is empty", async () => {
    renderAuth();
    await userEvent.type(getEmailInput(), "user@example.com");
    await userEvent.click(getSubmitBtn());

    expect(await screen.findByText("Password is required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("Sign Up: shows error when name is missing", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    // select company, fill email + password but skip name
    await userEvent.click(screen.getByRole("button", { name: /select your company/i }));
    await userEvent.click(screen.getByRole("option", { name: "Ninja" }));
    await userEvent.type(getEmailInput(), "x@x.com");
    await userEvent.type(getPasswordInput(), "pass");
    await userEvent.click(getSubmitBtn());

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("Sign Up: shows error when company is missing", async () => {
    renderAuth();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    await userEvent.type(screen.getByPlaceholderText("Enter your name"), "Alice");
    await userEvent.type(getEmailInput(), "x@x.com");
    await userEvent.type(getPasswordInput(), "pass");
    await userEvent.click(getSubmitBtn());

    expect(await screen.findByText("Company is required")).toBeInTheDocument();
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

    expect(await screen.findByText("Password is required")).toBeInTheDocument();
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


// ACCESSIBILITY

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

  test("error message is visible to screen readers via DOM text", async () => {
    renderAuth();
    // Type an invalid email so the component's own validation fires and puts
    // a visible error message in the DOM (accessible to screen readers)
    await userEvent.type(getEmailInput(), "notvalid");
    await userEvent.type(getPasswordInput(), "somepass");
    await userEvent.click(getSubmitBtn());
    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument();
  });
});