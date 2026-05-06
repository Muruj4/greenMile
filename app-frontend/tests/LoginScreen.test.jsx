// tests/LoginScreen.test.jsx
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginScreen from "../screens/LoginScreen";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem:    jest.fn(),
  setItem:    jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("../Style/LoginScreenStyles", () => ({ styles: {} }), { virtual: true });
jest.mock("../config", () => ({ API_BASE_URL: "http://192.168.3.214:8000" }), { virtual: true });

beforeAll(() => {
  if (!global.fetch) global.fetch = jest.fn();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

function renderScreen() {
  return render(<LoginScreen navigation={{ navigate: mockNavigate }} />);
}

function switchToSignUp(getByText) {
  fireEvent.press(getByText("Sign Up"));
}

// Sign In submit button is the LAST "Sign In" text in the DOM
function pressSubmitSignIn(getAllByText) {
  fireEvent.press(getAllByText("Sign In").at(-1));
}

function fillSignIn({ email = "driver@test.com", password = "Pass123!" } = {}, getByPlaceholderText) {
  fireEvent.changeText(getByPlaceholderText("you@example.com"), email);
  fireEvent.changeText(getByPlaceholderText("••••••••"), password);
}

async function fillSignUp(
  { name = "Ahmed Ali", company = "Aramex", email = "ahmed@test.com", password = "Pass123!" } = {},
  utils
) {
  const { getByPlaceholderText, getByText } = utils;
  fireEvent.changeText(getByPlaceholderText("Enter your name"), name);
  fireEvent.press(getByText("Select your Company"));
  fireEvent.press(getByText(company));
  fireEvent.changeText(getByPlaceholderText("you@example.com"), email);
  fireEvent.changeText(getByPlaceholderText("••••••••"), password);
}

// The Sign Up submit button now says "Send OTP" not "Create Account"
function pressSubmitSignUp(getByText) {
  fireEvent.press(getByText("Send OTP"));
}

function mockSignInSuccess(role = "driver") {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok:   true,
    json: async () => ({ token: "jwt-token-abc", role }),
  });
}

function mockSignInError(detail = "Invalid credentials") {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok:   false,
    json: async () => ({ detail }),
  });
}

// Sign Up now calls /request-otp endpoint and navigates to OTP screen
function mockSignUpSuccess() {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok:   true,
    json: async () => ({ message: "OTP sent" }),
  });
}

function mockSignUpError(detail = "Email already registered") {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok:   false,
    json: async () => ({ detail }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Unit Tests — Rendering & Initial State
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — Rendering & Initial State", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-LS-01: renders GreenMile brand title", () => {
    const { getByText } = renderScreen();
    getByText("Green");
    getByText("Mile");
  });

  test("TC-LS-02: renders brand tagline", () => {
    const { getByText } = renderScreen();
    getByText("Sustainable Last-Mile Delivery Platform");
  });

  test("TC-LS-03: renders Sign In and Sign Up tabs", () => {
    const { getAllByText } = renderScreen();
    expect(getAllByText("Sign In").length).toBeGreaterThanOrEqual(1);
    expect(getAllByText("Sign Up").length).toBeGreaterThanOrEqual(1);
  });

  test("TC-LS-04: Sign In tab is active by default", () => {
    const { getAllByText } = renderScreen();
    expect(getAllByText("Sign In").length).toBeGreaterThanOrEqual(1);
  });

  test("TC-LS-05: renders email and password inputs on Sign In", () => {
    const { getByPlaceholderText } = renderScreen();
    getByPlaceholderText("you@example.com");
    getByPlaceholderText("••••••••");
  });

  test("TC-LS-06: renders Remember me text on Sign In", () => {
    const { getByText } = renderScreen();
    getByText("Remember me");
  });

  test("TC-LS-07: renders Forgot password link on Sign In", () => {
    const { getByText } = renderScreen();
    getByText("Forgot password?");
  });

  test("TC-LS-08: does not show Full Name input on Sign In", () => {
    const { queryByPlaceholderText } = renderScreen();
    expect(queryByPlaceholderText("Enter your name")).toBeNull();
  });

  test("TC-LS-09: does not show company dropdown on Sign In", () => {
    const { queryByText } = renderScreen();
    expect(queryByText("Select your Company")).toBeNull();
  });

  test("TC-LS-10: does not show email error on initial render", () => {
    const { queryByText } = renderScreen();
    expect(queryByText("Email is required")).toBeNull();
    expect(queryByText("Please enter a valid email address")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Unit Tests — Tab Switching
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — Tab Switching", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-LS-11: switching to Sign Up shows Full Name input", () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    switchToSignUp(getByText);
    getByPlaceholderText("Enter your name");
  });

  test("TC-LS-12: switching to Sign Up shows company dropdown placeholder", () => {
    const { getByText } = renderScreen();
    switchToSignUp(getByText);
    getByText("Select your Company");
  });

  test("TC-LS-13: switching to Sign Up shows Send OTP button", () => {
    const { getByText } = renderScreen();
    switchToSignUp(getByText);
    getByText("Send OTP");
  });

  test("TC-LS-14: switching to Sign Up hides Remember me", () => {
    const { getByText, queryByText } = renderScreen();
    switchToSignUp(getByText);
    expect(queryByText("Remember me")).toBeNull();
  });

  test("TC-LS-15: switching to Sign Up hides Forgot password", () => {
    const { getByText, queryByText } = renderScreen();
    switchToSignUp(getByText);
    expect(queryByText("Forgot password?")).toBeNull();
  });

  test("TC-LS-16: switching back to Sign In from Sign Up hides Full Name", () => {
    const { getByText, getAllByText, queryByPlaceholderText } = renderScreen();
    switchToSignUp(getByText);
    fireEvent.press(getAllByText("Sign In")[0]);
    expect(queryByPlaceholderText("Enter your name")).toBeNull();
  });

  test("TC-LS-17: switching back to Sign In restores Remember me", () => {
    const { getByText, getAllByText } = renderScreen();
    switchToSignUp(getByText);
    fireEvent.press(getAllByText("Sign In")[0]);
    getByText("Remember me");
  });

  test("TC-LS-18: switching tabs clears email error", () => {
    const { getByText, queryByText, getAllByText } = renderScreen();
    pressSubmitSignIn(getAllByText);
    switchToSignUp(getByText);
    expect(queryByText("Email is required")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Unit Tests — Email Validation
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — Email Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test("TC-LS-19: shows Email is required when submitting with empty email", async () => {
    const { getAllByText, findByText } = renderScreen();
    await act(async () => { pressSubmitSignIn(getAllByText); });
    await findByText("Email is required");
  });

  test("TC-LS-20: shows invalid email error for malformed email", async () => {
    const { getAllByText, getByPlaceholderText, findByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "notanemail");
    await act(async () => { pressSubmitSignIn(getAllByText); });
    await findByText("Please enter a valid email address");
  });

  test("TC-LS-21: clears email error when user starts typing in email field", async () => {
    const { getAllByText, getByPlaceholderText, findByText, queryByText } = renderScreen();
    await act(async () => { pressSubmitSignIn(getAllByText); });
    await findByText("Email is required");
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "a");
    expect(queryByText("Email is required")).toBeNull();
  });

  test("TC-LS-22: does not show email error for a valid email", async () => {
    const { getAllByText, getByPlaceholderText, queryByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "valid@email.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "pass");
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true, json: async () => ({ token: "t", role: "driver" }),
    });
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(queryByText("Email is required")).toBeNull();
    expect(queryByText("Please enter a valid email address")).toBeNull();
  });

  test("TC-LS-23: trims whitespace before validating email", async () => {
    const { getAllByText, getByPlaceholderText, queryByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "  valid@email.com  ");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "pass");
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true, json: async () => ({ token: "t", role: "driver" }),
    });
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(queryByText("Please enter a valid email address")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Unit Tests — Company Dropdown (Sign Up)
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — Company Dropdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-LS-24: pressing company field opens dropdown", () => {
    const { getByText } = renderScreen();
    switchToSignUp(getByText);
    fireEvent.press(getByText("Select your Company"));
    getByText("Aramex");
    getByText("Saudi Post (SPL)");
  });

  test("TC-LS-25: selecting a company closes dropdown and shows selected value", () => {
    const { getByText, queryByText } = renderScreen();
    switchToSignUp(getByText);
    fireEvent.press(getByText("Select your Company"));
    fireEvent.press(getByText("Aramex"));
    expect(queryByText("Saudi Post (SPL)")).toBeNull();
    getByText("Aramex");
  });

  test("TC-LS-26: pressing company field again toggles dropdown closed", () => {
    const { getByText, queryByText } = renderScreen();
    switchToSignUp(getByText);
    fireEvent.press(getByText("Select your Company"));
    getByText("Aramex");
    fireEvent.press(getByText("Select your Company"));
    expect(queryByText("Aramex")).toBeNull();
  });

  test("TC-LS-27: dropdown contains all 17 company options", () => {
    const { getByText } = renderScreen();
    switchToSignUp(getByText);
    fireEvent.press(getByText("Select your Company"));
    [
      "Saudi Post (SPL)", "Aramex", "Naqel Express", "SMSA Express",
      "DHL Saudi Arabia", "UPS Saudi Arabia", "FedEx Saudi Arabia",
      "Amazon Saudi Arabia", "Noon", "Ninja", "HungerStation",
      "Jahez", "Mrsool", "Keeta", "ToYou", "Jtex", "Nana",
    ].forEach((c) => getByText(c));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Unit Tests — Sign In Client-Side Validation
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — Sign In Client-Side Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test("TC-LS-31: shows password error when password is empty on Sign In", async () => {
    const { getAllByText, getByPlaceholderText, findByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "driver@test.com");
    await act(async () => { pressSubmitSignIn(getAllByText); });
    await findByText("Please enter your password");
  });

  test("TC-LS-32: does not call fetch when password is missing on Sign In", async () => {
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "driver@test.com");
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("TC-LS-33: does not call fetch when email is empty on Sign In", async () => {
    const { getAllByText } = renderScreen();
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Unit Tests — Sign Up Client-Side Validation
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — Sign Up Client-Side Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test("TC-LS-34: shows name error when name is missing on Sign Up", async () => {
    const utils = renderScreen();
    const { getByText, getByPlaceholderText, findByText } = utils;
    switchToSignUp(getByText);
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "a@b.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "Pass123!");
    await act(async () => { pressSubmitSignUp(getByText); });
    await findByText("Please enter your name");
  });

  test("TC-LS-35: shows company error when company is missing on Sign Up", async () => {
    const utils = renderScreen();
    const { getByText, getByPlaceholderText, findByText } = utils;
    switchToSignUp(getByText);
    fireEvent.changeText(getByPlaceholderText("Enter your name"), "Ahmed");
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "a@b.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "Pass123!");
    await act(async () => { pressSubmitSignUp(getByText); });
    await findByText("Please select your company");
  });

  test("TC-LS-36: shows password error when password is missing on Sign Up", async () => {
    const utils = renderScreen();
    const { getByText, getByPlaceholderText, findByText } = utils;
    switchToSignUp(getByText);
    fireEvent.changeText(getByPlaceholderText("Enter your name"), "Ahmed");
    fireEvent.press(getByText("Select your Company"));
    fireEvent.press(getByText("Aramex"));
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "a@b.com");
    await act(async () => { pressSubmitSignUp(getByText); });
    await findByText("Please enter your password");
  });

  test("TC-LS-37: does not call fetch when name is missing on Sign Up", async () => {
    const utils = renderScreen();
    const { getByText, getByPlaceholderText } = utils;
    switchToSignUp(getByText);
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "a@b.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "Pass123!");
    await act(async () => { pressSubmitSignUp(getByText); });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. DB Integration — Sign In HTTP Request
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — DB Integration: Sign In Request", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-LS-38: POSTs to the correct Sign In endpoint", async () => {
    mockSignInSuccess();
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(global.fetch.mock.calls[0][0]).toBe("http://192.168.3.214:8000/auth/signin");
  });

  test("TC-LS-39: uses POST method for Sign In", async () => {
    mockSignInSuccess();
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(global.fetch.mock.calls[0][1].method).toBe("POST");
  });

  test("TC-LS-40: sends Content-Type application/json header on Sign In", async () => {
    mockSignInSuccess();
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(global.fetch.mock.calls[0][1].headers["Content-Type"]).toBe("application/json");
  });

  test("TC-LS-41: sends email trimmed in Sign In body", async () => {
    mockSignInSuccess();
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText("you@example.com"), "  driver@test.com  ");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "Pass123!");
    await act(async () => { pressSubmitSignIn(getAllByText); });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.email).toBe("driver@test.com");
  });

  test("TC-LS-42: sends password in Sign In body", async () => {
    mockSignInSuccess();
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({ email: "driver@test.com", password: "Pass123!" }, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.password).toBe("Pass123!");
  });

  test("TC-LS-43: Sign In body contains exactly email and password keys", async () => {
    mockSignInSuccess();
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(["email", "password"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. DB Integration — Sign In Response Handling
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — DB Integration: Sign In Response", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-LS-44: stores token in AsyncStorage on successful Sign In", async () => {
    mockSignInSuccess("driver");
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("token", "jwt-token-abc");
  });

  test("TC-LS-45: stores role in AsyncStorage on successful Sign In", async () => {
    mockSignInSuccess("driver");
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("role", "driver");
  });

  test("TC-LS-46: navigates to Trip screen on successful driver Sign In", async () => {
    mockSignInSuccess("driver");
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(mockNavigate).toHaveBeenCalledWith("Trip");
  });

  test("TC-LS-47: blocks manager role and shows error", async () => {
    mockSignInSuccess("manager");
    const { getAllByText, getByPlaceholderText, findByText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    await findByText("This app is for drivers only. Please use the manager web portal.");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("TC-LS-48: does not navigate on Sign In server error", async () => {
    mockSignInError("Invalid credentials");
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("TC-LS-49: shows error message with server detail on Sign In failure", async () => {
    mockSignInError("Account not found");
    const { getAllByText, getByPlaceholderText, findByText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    await findByText("Account not found");
  });

  test("TC-LS-50: shows fallback error message when server detail is missing", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const { getAllByText, getByPlaceholderText, findByText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    await findByText("Sign in failed");
  });

  test("TC-LS-51: shows error message on network failure during Sign In", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("No internet"));
    const { getAllByText, getByPlaceholderText, findByText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    await findByText("No internet");
  });

  test("TC-LS-52: stores rememberMe flag when Remember Me is checked", async () => {
    mockSignInSuccess("driver");
    const { getByText, getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    fireEvent.press(getByText("Remember me"));
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("rememberMe", "1");
  });

  test("TC-LS-53: removes rememberMe flag when Remember Me is unchecked", async () => {
    mockSignInSuccess("driver");
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fillSignIn({}, getByPlaceholderText);
    await act(async () => { pressSubmitSignIn(getAllByText); });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("rememberMe");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. DB Integration — Sign Up HTTP Request
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — DB Integration: Sign Up Request", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-LS-54: POSTs to the correct Sign Up (request-otp) endpoint", async () => {
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    expect(global.fetch.mock.calls[0][0]).toBe(
      "http://192.168.3.214:8000/auth/driver/signup/request-otp"
    );
  });

  test("TC-LS-55: uses POST method for Sign Up", async () => {
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    expect(global.fetch.mock.calls[0][1].method).toBe("POST");
  });

  test("TC-LS-56: sends Content-Type application/json header on Sign Up", async () => {
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    expect(global.fetch.mock.calls[0][1].headers["Content-Type"]).toBe("application/json");
  });

  test("TC-LS-57: sends name trimmed in Sign Up body", async () => {
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({ name: "  Ahmed Ali  " }, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.name).toBe("Ahmed Ali");
  });

  test("TC-LS-58: sends company in Sign Up body", async () => {
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({ company: "Aramex" }, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.company).toBe("Aramex");
  });

  test("TC-LS-59: sends email trimmed in Sign Up body", async () => {
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({ email: "  ahmed@test.com  " }, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.email).toBe("ahmed@test.com");
  });

  test("TC-LS-60: sends password in Sign Up body", async () => {
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({ password: "Pass123!" }, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.password).toBe("Pass123!");
  });

  test("TC-LS-61: Sign Up body contains exactly name, company, email, password", async () => {
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(["company", "email", "name", "password"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. DB Integration — Sign Up Response Handling
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginScreen — DB Integration: Sign Up Response", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-LS-62: navigates to OTP screen after successful Sign Up", async () => {
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    expect(mockNavigate).toHaveBeenCalledWith("OTP", expect.objectContaining({
      email: "ahmed@test.com",
    }));
  });

  test("TC-LS-63: does not navigate to OTP when Sign Up fails", async () => {
    mockSignUpError("Email already registered");
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("TC-LS-64: shows error message with server detail on Sign Up failure", async () => {
    mockSignUpError("Email already registered");
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    await waitFor(() =>
      expect(utils.getByText("Email already registered")).toBeTruthy()
    );
  });

  test("TC-LS-65: shows fallback error when server detail is missing on Sign Up failure", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    await waitFor(() =>
      expect(utils.getByText("Failed to send OTP")).toBeTruthy()
    );
  });

  test("TC-LS-66: shows error message on network failure during Sign Up", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Connection refused"));
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    await waitFor(() =>
      expect(utils.getByText("Connection refused")).toBeTruthy()
    );
  });

  test("TC-LS-67: does not navigate on successful Sign Up before OTP", async () => {
    // On success it navigates to OTP, not Trip
    mockSignUpSuccess();
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    expect(mockNavigate).not.toHaveBeenCalledWith("Trip");
  });

  test("TC-LS-68: stays on Sign Up tab when Sign Up fails", async () => {
    mockSignUpError("Server error");
    const utils = renderScreen();
    switchToSignUp(utils.getByText);
    await fillSignUp({}, utils);
    await act(async () => { pressSubmitSignUp(utils.getByText); });
    await waitFor(() =>
      expect(utils.queryByText("Send OTP")).not.toBeNull()
    );
  });
});