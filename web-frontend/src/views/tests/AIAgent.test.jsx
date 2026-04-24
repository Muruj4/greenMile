import { render, screen, fireEvent } from '@testing-library/react';
import AIAgentButton from '../AIAgent/AIAgentButton';
window.HTMLElement.prototype.scrollIntoView = function() {};

describe('AI Agent UI Tests', () => {

  test('renders AI Agent button', () => {
    render(<AIAgentButton companyId={1} companyName="Test" dashboardData={{}} />);  
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('opens chat when button is clicked', () => {
    render(<AIAgentButton companyId={1} companyName="Test" dashboardData={{}} />);  
    const button = screen.getByRole('button');
    fireEvent.click(button);
    const title = screen.getByText(/GreenMile Assistant/i);
    expect(title).toBeInTheDocument();
  });

  test('shows initial welcome message', () => {
    render(<AIAgentButton companyId={1} companyName="Test" dashboardData={{}} />);  
    const button = screen.getByRole('button');
    fireEvent.click(button);
    const welcome = screen.getByText(/مرحبًا!/i);
    expect(welcome).toBeInTheDocument();
  });

});