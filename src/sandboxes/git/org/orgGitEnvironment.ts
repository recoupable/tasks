/** Credentials remain per-command environment data, never Git URLs/config files. */
export function orgGitEnvironment(
  objectDirectory?: string,
): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Organization Git transport unavailable");
  return {
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ALLOW_PROTOCOL: "https",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_COUNT: "4",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
    GIT_CONFIG_KEY_1: "core.hooksPath",
    GIT_CONFIG_VALUE_1: "/dev/null",
    GIT_CONFIG_KEY_2: "http.followRedirects",
    GIT_CONFIG_VALUE_2: "false",
    GIT_CONFIG_KEY_3: "credential.helper",
    GIT_CONFIG_VALUE_3: "",
    ...(objectDirectory
      ? { GIT_ALTERNATE_OBJECT_DIRECTORIES: objectDirectory }
      : {}),
  };
}
