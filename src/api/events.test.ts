import { describe, it, expect, vi, beforeEach } from "vitest";
import { eventsApi } from "./events";
import { apiClient } from "./client";

vi.mock("./client", () => ({ apiClient: { get: vi.fn() } }));
const get = vi.mocked(apiClient.get);

describe("eventsApi.listVendors query string", () => {
  beforeEach(() => get.mockReset().mockResolvedValue({ items: [], total: 0 }));

  it("sends suspended=true/false only when set, never status=SUSPENDED", async () => {
    await eventsApi.listVendors("ev-1", { suspended: true, limit: 25, offset: 0 });
    expect(get).toHaveBeenLastCalledWith("/v1/admin/admin/events/ev-1/vendors?suspended=true&limit=25&offset=0");
    await eventsApi.listVendors("ev-1", { status: "ACTIVE", suspended: false, limit: 25, offset: 0 });
    expect(get).toHaveBeenLastCalledWith("/v1/admin/admin/events/ev-1/vendors?status=ACTIVE&suspended=false&limit=25&offset=0");
    await eventsApi.listVendors("ev-1", { limit: 25, offset: 0 });
    expect(get).toHaveBeenLastCalledWith("/v1/admin/admin/events/ev-1/vendors?limit=25&offset=0");
  });
});
