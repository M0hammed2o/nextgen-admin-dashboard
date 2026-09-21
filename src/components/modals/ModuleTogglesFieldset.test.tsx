import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { ModuleTogglesFieldset } from "./ModuleTogglesFieldset";
import { MODULE_FLAGS, type ModuleFlagKey } from "@/lib/modules";

// Mirrors the exact dirty-tracking logic used in CreateBusinessModal and
// EditBusinessModal: a key only appears in `changes` once the admin
// explicitly picks On/Off; picking "Leave" removes it again. This is the
// request-building logic fix #1 depends on -- an untouched flag must never
// be sent in the PATCH payload (it would overwrite a module state this UI
// cannot see), and a touched-then-un-touched flag must not leak back in.
function Harness({ onChangesUpdate }: { onChangesUpdate: (c: Partial<Record<ModuleFlagKey, boolean>>) => void }) {
  const [changes, setChanges] = useState<Partial<Record<ModuleFlagKey, boolean>>>({});
  const setFlag = (key: ModuleFlagKey, value: boolean | undefined) => {
    setChanges((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[key];
      else next[key] = value;
      onChangesUpdate(next);
      return next;
    });
  };
  return <ModuleTogglesFieldset changes={changes} onChange={setFlag} />;
}

describe("ModuleTogglesFieldset dirty-tracking", () => {
  it("starts with no flags touched (nothing would be sent in a PATCH)", () => {
    let latest: Partial<Record<ModuleFlagKey, boolean>> = {};
    render(<Harness onChangesUpdate={(c) => (latest = c)} />);
    expect(latest).toEqual({});
    // Every flag's default segment ("Leave") should be the active one.
    for (const flag of MODULE_FLAGS) {
      expect(screen.getAllByText(flag.label).length).toBeGreaterThan(0);
    }
  });

  it("only includes a flag in `changes` once its On/Off button is clicked", () => {
    let latest: Partial<Record<ModuleFlagKey, boolean>> = {};
    render(<Harness onChangesUpdate={(c) => (latest = c)} />);

    const inventoryRow = screen.getByText("Inventory").closest("div")!.parentElement!;
    const onButton = Array.from(inventoryRow.querySelectorAll("button")).find((b) => b.textContent === "On")!;
    fireEvent.click(onButton);

    expect(latest).toEqual({ inventory_enabled: true });
    // Every other flag must remain untouched/absent.
    expect(Object.keys(latest)).toHaveLength(1);
  });

  it("clicking Leave after On/Off removes the key entirely (does not send `false`)", () => {
    let latest: Partial<Record<ModuleFlagKey, boolean>> = {};
    render(<Harness onChangesUpdate={(c) => (latest = c)} />);

    const whatsappRow = screen.getByText("WhatsApp Ordering").closest("div")!.parentElement!;
    const offButton = Array.from(whatsappRow.querySelectorAll("button")).find((b) => b.textContent === "Off")!;
    fireEvent.click(offButton);
    expect(latest).toEqual({ is_whatsapp_enabled: false });

    const leaveButton = Array.from(whatsappRow.querySelectorAll("button")).find((b) => b.textContent === "Leave")!;
    fireEvent.click(leaveButton);
    expect(latest).toEqual({});
  });
});
