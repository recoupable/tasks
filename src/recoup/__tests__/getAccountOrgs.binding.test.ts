import { afterEach, expect, it, vi } from "vitest";
import { getAccountOrgs } from "../getAccountOrgs";
vi.mock("@trigger.dev/sdk/v3", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));
afterEach(() => vi.unstubAllGlobals());
it("retains unnamed memberships for the binding planner to reject explicitly", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: "success",
        organizations: [{ organization_id: "org", organization_name: null }],
      }),
    })),
  );
  expect(await getAccountOrgs("account")).toEqual([
    { organizationId: "org", organizationName: "" },
  ]);
});
it("does not turn malformed memberships into an empty authorized list", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: "success",
        organizations: [{ organization_id: "", organization_name: "Team" }],
      }),
    })),
  );
  expect(await getAccountOrgs("account")).toBeUndefined();
});
