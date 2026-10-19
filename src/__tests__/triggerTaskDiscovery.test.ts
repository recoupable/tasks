import { expect, it } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import config from "../../trigger.config";

it("discovers real tasks without indexing test fixtures using installed Trigger rules", async () => {
  const cliModule = pathToFileURL(
    resolve("node_modules/trigger.dev/dist/esm/build/entryPoints.js"),
  ).href;
  const { createEntryPointManager } = await import(cliModule);
  const manager = await createEntryPointManager(
    config.dirs,
    { ...config, workingDir: process.cwd() },
    "deploy",
    false,
  );
  try {
    const taskEntries = (manager.entryPoints as string[]).filter((path) =>
      path.startsWith("src/tasks/"),
    );
    expect(taskEntries).toContain("src/tasks/setupSandboxTask.ts");
    expect(taskEntries.length).toBeGreaterThan(1);
    expect(taskEntries.filter((path) => path.includes("/__tests__/"))).toEqual(
      [],
    );
  } finally {
    await manager.stop();
  }
});
