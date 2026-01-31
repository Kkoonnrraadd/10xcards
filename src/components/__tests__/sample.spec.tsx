import { render, screen } from "@testing-library/react";
import React from "react";

function Hello() {
  return <div>Hello Tests</div>;
}

describe("sample unit test", () => {
  it("renders hello", () => {
    render(<Hello />);
    expect(screen.getByText("Hello Tests")).toBeInTheDocument();
  });
});
