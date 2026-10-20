import { afterEach, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { publicationFixture } from "./publicationFixture";
import { registerPublishedOrgs } from "../git/registerPublishedOrgs";
import type { OrgPublicationResult } from "../git/org/types";
const fixtures: ReturnType<typeof publicationFixture>[] = [];
afterEach(() => {
  for (const f of fixtures.splice(0))
    rmSync(f.root, { recursive: true, force: true });
});
it("keeps confirmed gitlinks staged after root add -A", async () => {
  const f = publicationFixture();
  fixtures.push(f);
  const sha = f.git(f.worker, "rev-parse", "HEAD");
  const receipt = {
    state: "confirmed",
    commitSha: sha,
    target: {
      alias: "team",
      repository: { url: "https://github.com/recoupable/synthetic" },
    },
  } as OrgPublicationResult;
  expect(await registerPublishedOrgs(f.sandbox, [receipt])).toBe(true);
  f.git(f.worker, "add", "-A");
  expect(
    f.git(f.worker, "ls-files", "--stage", ".openclaw/workspace/orgs/team"),
  ).toContain(`160000 ${sha}`);
});
it("refuses unconfirmed receipts and stale root gitlinks", async () => {
  const f = publicationFixture();
  fixtures.push(f);
  expect(
    await registerPublishedOrgs(f.sandbox, [
      { state: "unconfirmed" } as OrgPublicationResult,
    ]),
  ).toBe(false);
  const sha = f.git(f.worker, "rev-parse", "HEAD");
  f.git(
    f.worker,
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${sha},.openclaw/workspace/orgs/unbound`,
  );
  expect(await registerPublishedOrgs(f.sandbox, [])).toBe(false);
});
