import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readOrgRepositoryAuthority } from "../readOrgRepositoryAuthority";
const fetcher = vi.fn();
const data = {
  id: 123,
  full_name: "recoupable/org-synthetic",
  html_url: "https://github.com/recoupable/org-synthetic",
  permissions: { push: true },
};
beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "synthetic-unused");
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockResolvedValue({ ok: true, json: async () => data });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("requires provider identity and explicit push permission", async () => {
  expect(await readOrgRepositoryAuthority("org-synthetic")).toMatchObject({
    id: 123,
    name: "org-synthetic",
  });
  expect(fetcher.mock.calls[0][1].redirect).toBe("error");
});
it.each([
  { ...data, permissions: { push: false } },
  { ...data, permissions: undefined },
  { ...data, id: 0 },
  { ...data, full_name: "other/org-synthetic" },
  { ...data, html_url: "https://github.com/recoupable/replacement" },
])("denies ambiguous provider authority %j", async (payload) => {
  fetcher.mockResolvedValueOnce({ ok: true, json: async () => payload });
  expect(await readOrgRepositoryAuthority("org-synthetic")).toBeUndefined();
});
it("does not infer permission from a request failure", async () => {
  fetcher.mockRejectedValueOnce(new Error("provider unavailable"));
  expect(await readOrgRepositoryAuthority("org-synthetic")).toBeUndefined();
});
