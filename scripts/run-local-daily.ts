import { spawn } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { getDefaultTargetDate } from "./lib/business-date.js";
import { parseRuntimeOptions } from "./lib/runtime-options.js";

export interface LocalDailyArgs {
  pipelineArgs: string[];
  push: boolean;
  sendLark: boolean;
}

interface CommandResult {
  code: number;
  stdout: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

export function parseLocalDailyArgs(argv: string[]): LocalDailyArgs {
  const pipelineArgs: string[] = [];
  let push = false;
  let sendLark = true;

  for (const arg of argv) {
    if (arg === "--push") {
      push = true;
      continue;
    }
    if (arg === "--skip-lark") {
      sendLark = false;
      continue;
    }
    pipelineArgs.push(arg);
  }

  return { pipelineArgs, push, sendLark };
}

export function buildLocalDailyEnv(
  env: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  return {
    ...env,
    TZ: env.TZ?.trim() || "Asia/Shanghai",
    LLM_PROVIDERS: env.LLM_PROVIDERS?.trim() || "codex",
  };
}

export function resolveLocalDailyTargetDate(
  pipelineArgs: string[],
  env: NodeJS.ProcessEnv = process.env,
  now = new Date()
): string {
  const options = parseRuntimeOptions(pipelineArgs, env);
  return options.date ?? getDefaultTargetDate(now);
}

export function formatLocalDailyHeader(params: {
  targetDate: string;
  providers: string;
}): string[] {
  return [
    "=== 本地日报流水线 ===",
    `目标日期：${params.targetDate}`,
    `LLM 提供商：${params.providers}`,
  ];
}

function runCommand(
  command: string,
  args: string[],
  opts: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    inherit?: boolean;
  }
): Promise<CommandResult> {
  return new Promise((resolveCommand, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: opts.env,
      stdio: opts.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    if (!opts.inherit) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      const result = { code: code ?? 1, stdout };
      if (result.code === 0) {
        resolveCommand(result);
        return;
      }

      const details = stderr.trim() || stdout.trim();
      reject(
        new Error(
          `${command} ${args.join(" ")} 执行失败，退出码 ${result.code}${
            details ? `\n${details}` : ""
          }`
        )
      );
    });
  });
}

function runStatus(
  command: string,
  args: string[],
  opts: { cwd: string; env: NodeJS.ProcessEnv }
): Promise<CommandResult> {
  return new Promise((resolveCommand, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolveCommand({ code: code ?? 1, stdout });
    });
  });
}

async function hasStagedChanges(env: NodeJS.ProcessEnv): Promise<boolean> {
  const result = await runStatus("git", ["diff", "--staged", "--quiet"], {
    cwd: repoRoot,
    env,
  });
  if (result.code === 0) return false;
  if (result.code === 1) return true;
  throw new Error(`git diff --staged --quiet failed with exit code ${result.code}`);
}

async function getCurrentBranch(env: NodeJS.ProcessEnv): Promise<string> {
  const result = await runCommand("git", ["branch", "--show-current"], {
    cwd: repoRoot,
    env,
  });
  return result.stdout.trim();
}

export async function runLocalDaily(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const args = parseLocalDailyArgs(argv);
  const runEnv = buildLocalDailyEnv(env);
  const targetDate = resolveLocalDailyTargetDate(args.pipelineArgs, runEnv);

  for (const line of formatLocalDailyHeader({
    targetDate,
    providers: runEnv.LLM_PROVIDERS ?? "",
  })) {
    console.log(line);
  }

  await runCommand("npx", ["tsx", "graph.ts", ...args.pipelineArgs], {
    cwd: __dirname,
    env: runEnv,
    inherit: true,
  });

  await runCommand("npx", ["tsx", "generate-index.ts"], {
    cwd: __dirname,
    env: runEnv,
    inherit: true,
  });

  await runCommand("git", ["add", "reports/", "content/"], {
    cwd: repoRoot,
    env: runEnv,
    inherit: true,
  });

  if (await hasStagedChanges(runEnv)) {
    await runCommand("git", ["commit", "-m", `daily: ${targetDate}`], {
      cwd: repoRoot,
      env: runEnv,
      inherit: true,
    });
  } else {
    console.log("没有新的生成内容需要提交。");
  }

  if (args.sendLark) {
    await runCommand("npx", ["tsx", "send-lark-daily.ts", "--date", targetDate], {
      cwd: __dirname,
      env: runEnv,
      inherit: true,
    });
  }

  if (args.push) {
    const branch = await getCurrentBranch(runEnv);
    if (!branch) {
      throw new Error("当前处于 detached HEAD，无法执行 git push。");
    }
    await runCommand("git", ["push"], {
      cwd: repoRoot,
      env: runEnv,
      inherit: true,
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLocalDaily().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
