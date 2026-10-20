export interface GitCommandResult {
  exitCode: number;
  stdout: () => Promise<string>;
  stderr: () => Promise<string>;
}
export interface GitCommandRunner {
  runCommand: (command: {
    cmd: "git";
    args: string[];
  }) => Promise<GitCommandResult>;
}
