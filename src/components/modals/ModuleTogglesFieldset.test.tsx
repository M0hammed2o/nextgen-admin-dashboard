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

  // Digital Receipts (BUG-0072, now fixed in admin_api commit 264aac4):
  // digital_receipts_enabled is accepted by BusinessUpdate/
  // ONBOARDER_PATCH_ALLOWED_FIELDS and returned by BusinessAdminResponse/
  // BusinessOnboarderResponse now, exactly like inventory_enabled -- so it's
  // a real ModuleFlagKey and must behave identically to the other flags:
  // an interactive control (the tri-state Leave/On/Off buttons here, since
  // this harness passes no `current`), and clicking On/Off must add it to
  // `changes` like any other flag.
  it("renders Digital Receipts as a real, interactive control, and clicking On adds it to `changes`", () => {
    let latest: Partial<Record<ModuleFlagKey, boolean>> = {};
    render(<Harness onChangesUpdate={(c) => (latest = c)} />);

    const digitalReceiptsRow = screen.getByText("Digital Receipts").closest("div")!.parentElement!;
    const onButton = Array.from(digitalReceiptsRow.querySelectorAll("button")).find((b) => b.textContent === "On")!;
    expect(onButton).toBeDefined();
    fireEvent.click(onButton);

    expect(latest).toEqual({ digital_receipts_enabled: true });
    expect(Object.keys(latest)).toHaveLength(1);

    const leaveButton = Array.from(digitalReceiptsRow.querySelectorAll("button")).find((b) => b.textContent === "Leave")!;
    fireEvent.click(leaveButton);
    expect(latest).toEqual({});
  });
});

// Delivery entitlements (delivery_platforms_enabled/uber_eats_enabled/
// mrd_enabled, migration 0044) are SUPER_ADMIN-writable only (excluded from
// ONBOARDER_PATCH_ALLOWED_FIELDS server-side) -- an ONBOARDER-reachable call
// site sending one of these would get a whole-request 403. These tests are
// the "an ONBOARDER never sees an editable control that would 403" honesty
// guarantee for the admin suite.
describe("ModuleTogglesFieldset SUPER_ADMIN-only gating", () => {
  const DELIVERY_FLAGS = [
    "delivery_platforms_enabled", "uber_eats_enabled", "mrd_enabled", "advanced_analytics_enabled",
  ] as const;

  it("defaults to locked (isSuperAdmin unset): no Switch/tri-state control for delivery flags, and clicking never fires onChange for them", () => {
    let latest: Partial<Record<ModuleFlagKey, boolean>> = {};
    render(<Harness onChangesUpdate={(c) => (latest = c)} />);

    for (const key of DELIVERY_FLAGS) {
      const label = MODULE_FLAGS.find((f) => f.key === key)!.label;
      const row = screen.getByText(label).closest("div")!.parentElement!;
      // No Switch, no Leave/On/Off buttons -- just a locked info row.
      expect(row.querySelectorAll("button")).toHaveLength(0);
      expect(row.querySelector('[role="switch"]')).toBeNull();
      expect(screen.getAllByText("Only a NextGen super admin can change this.").length).toBeGreaterThan(0);
    }
    expect(latest).toEqual({});
  });

  it("shows the flag's real current state as a read-only badge when locked, never lets it be toggled", () => {
    render(
      <ModuleTogglesFieldset
        changes={{}}
        onChange={() => {
          throw new Error("onChange must never be called for a locked SUPER_ADMIN-only flag");
        }}
        current={{ uber_eats_enabled: true, mrd_enabled: false }}
      />
    );
    const uberRow = screen.getByText("Uber Eats").closest("div")!.parentElement!;
    expect(uberRow.textContent).toContain("On");
    const mrdRow = screen.getByText("Mr D").closest("div")!.parentElement!;
    expect(mrdRow.textContent).toContain("Off");
  });

  it("isSuperAdmin=true renders delivery flags as real interactive controls, same as any other flag", () => {
    let latest: Partial<Record<ModuleFlagKey, boolean>> = {};
    render(
      <ModuleTogglesFieldset
        changes={{}}
        onChange={(key, value) => {
          latest = { ...latest, ...(value === undefined ? {} : { [key]: value }) };
        }}
        isSuperAdmin
      />
    );
    const uberRow = screen.getByText("Uber Eats").closest("div")!.parentElement!;
    const onButton = Array.from(uberRow.querySelectorAll("button")).find((b) => b.textContent === "On")!;
    expect(onButton).toBeDefined();
    fireEvent.click(onButton);
    expect(latest).toEqual({ uber_eats_enabled: true });
  });

  // Advanced Analytics (advanced_analytics_enabled, migration 0047) follows
  // the exact same SUPER_ADMIN-only pattern as the delivery entitlements
  // above -- an ONBOARDER must see its current value read-only (never an
  // editable control that would 403 against ONBOARDER_PATCH_ALLOWED_FIELDS).
  it("shows Advanced Analytics' real current state as a read-only badge when locked, never lets it be toggled", () => {
    render(
      <ModuleTogglesFieldset
        changes={{}}
        onChange={() => {
          throw new Error("onChange must never be called for a locked SUPER_ADMIN-only flag");
        }}
        current={{ advanced_analytics_enabled: true }}
      />
    );
    const row = screen.getByText("Advanced Analytics").closest("div")!.parentElement!;
    expect(row.querySelectorAll("button")).toHaveLength(0);
    expect(row.querySelector('[role="switch"]')).toBeNull();
    expect(row.textContent).toContain("On");
  });

  it("isSuperAdmin=true renders Advanced Analytics as a real interactive control, same as any other flag", () => {
    let latest: Partial<Record<ModuleFlagKey, boolean>> = {};
    render(
      <ModuleTogglesFieldset
        changes={{}}
        onChange={(key, value) => {
          latest = { ...latest, ...(value === undefined ? {} : { [key]: value }) };
        }}
        isSuperAdmin
      />
    );
    const row = screen.getByText("Advanced Analytics").closest("div")!.parentElement!;
    const onButton = Array.from(row.querySelectorAll("button")).find((b) => b.textContent === "On")!;
    expect(onButton).toBeDefined();
    fireEvent.click(onButton);
    expect(latest).toEqual({ advanced_analytics_enabled: true });
  });

  // Loyalty (loyalty_enabled, migration 0051, KNOWN_BUGS.md BUG-0107) follows
  // the exact same SUPER_ADMIN-only pattern as Advanced Analytics/delivery
  // entitlements above -- an ONBOARDER must see its current value read-only
  // (never an editable control that would 403 against
  // ONBOARDER_PATCH_ALLOWED_FIELDS). This is the "ONBOARDER cannot submit
  // loyalty_enabled" guarantee for the admin suite.
  it("shows Loyalty's real current state as a read-only badge when locked, never lets it be toggled", () => {
    render(
      <ModuleTogglesFieldset
        changes={{}}
        onChange={() => {
          throw new Error("onChange must never be called for a locked SUPER_ADMIN-only flag");
        }}
        current={{ loyalty_enabled: true }}
      />
    );
    const row = screen.getByText("Loyalty").closest("div")!.parentElement!;
    expect(row.querySelectorAll("button")).toHaveLength(0);
    expect(row.querySelector('[role="switch"]')).toBeNull();
    expect(row.textContent).toContain("On");
    expect(screen.getAllByText("Only a NextGen super admin can change this.").length).toBeGreaterThan(0);
  });

  it("defaults to locked (isSuperAdmin unset): no control for Loyalty, and clicking never fires onChange for it", () => {
    let latest: Partial<Record<ModuleFlagKey, boolean>> = {};
    render(<Harness onChangesUpdate={(c) => (latest = c)} />);

    const row = screen.getByText("Loyalty").closest("div")!.parentElement!;
    expect(row.querySelectorAll("button")).toHaveLength(0);
    expect(row.querySelector('[role="switch"]')).toBeNull();
    expect(latest).toEqual({});
  });

  it("isSuperAdmin=true renders Loyalty as a real interactive control, same as any other flag", () => {
    let latest: Partial<Record<ModuleFlagKey, boolean>> = {};
    render(
      <ModuleTogglesFieldset
        changes={{}}
        onChange={(key, value) => {
          latest = { ...latest, ...(value === undefined ? {} : { [key]: value }) };
        }}
        isSuperAdmin
      />
    );
    const row = screen.getByText("Loyalty").closest("div")!.parentElement!;
    const onButton = Array.from(row.querySelectorAll("button")).find((b) => b.textContent === "On")!;
    expect(onButton).toBeDefined();
    fireEvent.click(onButton);
    expect(latest).toEqual({ loyalty_enabled: true });
  });
});
