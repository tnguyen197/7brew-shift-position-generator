import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

test("renders the app title", () => {
  render(<App />);
  expect(screen.getByText(/Shift Position Generator/i)).toBeInTheDocument();
});

test("allows adding and deleting times", () => {
  render(<App />);
  const addButton = screen.getByText("+ Add Time");
  fireEvent.click(addButton);
  // Expect one more input
  const inputs = screen.getAllByRole("textbox");
  expect(inputs.length).toBeGreaterThan(1);
});

test("shows alert when not enough names", () => {
  window.alert = jest.fn();
  render(<App />);
  const generateButton = screen.getByText("Generate Random Shift");
  fireEvent.click(generateButton);
  expect(window.alert).toHaveBeenCalledWith("Not enough names for all positions!");
});

test("copies message to clipboard", async () => {
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn(),
    },
  });

  render(<App />);
  const copyButton = screen.getByText("Copy Message");
  fireEvent.click(copyButton);
  expect(navigator.clipboard.writeText).toHaveBeenCalled();
});
