import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

function Example() {
  const [value, setValue] = useState("");
  return (
    <Select
      value={value}
      onChange={setValue}
      ariaLabel="Status"
      options={[
        { value: "group", label: "Statuses", kind: "group" },
        { value: "new", label: "New" },
        { value: "blocked", label: "Blocked", disabled: true },
        { value: "resolved", label: "Resolved", description: "Completed work" },
      ]}
    />
  );
}

describe("Select", () => {
  it("supports Home/End and keyboard selection while skipping non-options", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("combobox", { name: "Status" });
    await user.click(trigger);
    await user.keyboard("{End}{Enter}");
    expect(trigger).toHaveTextContent("Resolved");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes with Escape without changing the selection", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("combobox", { name: "Status" });
    trigger.focus();
    await user.keyboard("{Enter}{ArrowDown}{Escape}");
    expect(trigger).toHaveTextContent("Выберите значение");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
