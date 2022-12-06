import React from "react";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

test("renders event link", () => {
  render(<App />);
  const linkElement = screen.getByText(/Loading.../i);
  expect(linkElement).toBeInTheDocument();
});

test("renders objectives link", () => {
  render(<App />);
  const linkElement = screen.getByText(/objectives/i);
  expect(linkElement).toBeInTheDocument();
});

test("renders exchanges link", () => {
  render(<App />);
  const linkElement = screen.getByText(/exchanges/i);
  expect(linkElement).toBeInTheDocument();
});
