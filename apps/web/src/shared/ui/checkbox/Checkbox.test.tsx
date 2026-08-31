import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./Checkbox";

function Example() {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox checked={checked} onChange={setChecked} description="Hide completed items">
      Open only
    </Checkbox>
  );
}

describe("Checkbox", () => {
  it("keeps native, labeled checkbox behavior", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const checkbox = screen.getByRole("checkbox", { name: "Open only" });
    expect(checkbox).toHaveAccessibleDescription("Hide completed items");
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("supports an accessible icon-only label", () => {
    render(<Checkbox checked={false} onChange={() => undefined} ariaLabel="Select row" />);
    expect(screen.getByRole("checkbox", { name: "Select row" })).toBeInTheDocument();
  });
});
