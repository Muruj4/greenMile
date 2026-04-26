import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIAgentButton from '../AIAgent/AIAgentButton';

window.HTMLElement.prototype.scrollIntoView = function () {};

describe("Sprint 4 Integration Testing - AI Agent Frontend", () => {

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
  // Test 1: Open chat window (integration between Button and Chat component)
  test("opens chat window when AI Agent button is clicked", () => {
    render(<AIAgentButton companyId={1} companyName="Test Company" dashboardData={{}} />);

    fireEvent.click(screen.getByLabelText("Open AI Assistant"));

    expect(screen.getByText(/GreenMile Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Arabic & English/i)).toBeInTheDocument();
  });
  // Test 2: Send message -> fetch called -> reply displayed
  test("sends user message and displays AI response", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: "This is an AI response",
        updated_history: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "This is an AI response" }
        ]
      })
    });

    render(<AIAgentButton companyId={1} companyName="Test Company" dashboardData={{ totalTrips: 5 }} />);

    fireEvent.click(screen.getByLabelText("Open AI Assistant"));

    const textarea = screen.getByPlaceholderText(/Ask me anything/i);
    fireEvent.change(textarea, { target: { value: "Hello" } });

    fireEvent.click(screen.getByLabelText("Send message"));

    await waitFor(() => {
      expect(screen.getByText(/This is an AI response/i)).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });


  // Test 3: Validate correct payload is sent to backend
  test("sends correct API payload with company and dashboard data", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: "OK",
        updated_history: []
      })
    });

    const dashboardData = { totalTrips: 10, totalCO2e: 50 };

    render(<AIAgentButton companyId={7} companyName="GreenMile" dashboardData={dashboardData} />);

    fireEvent.click(screen.getByLabelText("Open AI Assistant"));

    const textarea = screen.getByPlaceholderText(/Ask me anything/i);
    fireEvent.change(textarea, { target: { value: "Analyze dashboard" } });

    fireEvent.click(screen.getByLabelText("Send message"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    const url = fetch.mock.calls[0][0];
    const options = fetch.mock.calls[0][1];
    const body = JSON.parse(options.body);

    expect(url).toBe("http://localhost:8000/api/ai-agent/chat");
    expect(options.method).toBe("POST");

    expect(body.company_id).toBe(7);
    expect(body.company_name).toBe("GreenMile");
    expect(body.message).toBe("Analyze dashboard");
    expect(body.dashboard_snapshot).toEqual(dashboardData);
  });


  // Test 4: API failure should show bilingual error message
  test("shows error message if backend connection fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false
    });

    render(<AIAgentButton companyId={1} companyName="Test Company" dashboardData={{}} />);

    fireEvent.click(screen.getByLabelText("Open AI Assistant"));

    const textarea = screen.getByPlaceholderText(/Ask me anything/i);
    fireEvent.change(textarea, { target: { value: "Test failure" } });

    fireEvent.click(screen.getByLabelText("Send message"));

    await waitFor(() => {
      expect(screen.getByText(/عذراً، لم أتمكن من الاتصال/i)).toBeInTheDocument();
    });
  });

});