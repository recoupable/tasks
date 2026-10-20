import { expect, it } from "vitest";
import { normalizeOrgRepositoryUrl } from "../git/org/normalizeOrgRepositoryUrl";
it.each([
  "https://github.com/recoupable/repo.git",
  "https://github.com/recoupable/repo.git/",
  "https://github.com/recoupable/repo.GIT",
])("normalizes the declared repository suffix: %s", (url) => {
  expect(normalizeOrgRepositoryUrl(url)).toBe(
    "https://github.com/recoupable/repo",
  );
});
it.each([
  "https://github.com/recoupable/.git",
  "https://github.com/recoupable/repo//",
])("rejects an ambiguous repository path: %s", (url) => {
  expect(normalizeOrgRepositoryUrl(url)).toBeNull();
});
