import dayjs from "dayjs";

export interface PipelineRuntimeOptions {
  date?: string;
  resumeFromRaw: boolean;
}

function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function assertValidDate(value: string, flagName: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ${flagName} value "${value}". Expected YYYY-MM-DD.`);
  }
  return value;
}

export function parseRuntimeOptions(
  argv: string[],
  env: NodeJS.ProcessEnv
): PipelineRuntimeOptions {
  let date = env.PIPELINE_DATE?.trim() || undefined;
  let resumeFromRaw = parseBooleanFlag(env.PIPELINE_RESUME_FROM_RAW);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--resume-from-raw") {
      resumeFromRaw = true;
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        date = next;
        i++;
      }
      continue;
    }

    if (arg === "--date") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("Missing value for --date. Expected YYYY-MM-DD.");
      }
      date = next;
      i++;
    }
  }

  return {
    date: date ? assertValidDate(date, "--date") : undefined,
    resumeFromRaw,
  };
}

let cachedOptions: PipelineRuntimeOptions | null = null;

export function getRuntimeOptions(): PipelineRuntimeOptions {
  if (!cachedOptions) {
    cachedOptions = parseRuntimeOptions(process.argv.slice(2), process.env);
  }
  return cachedOptions;
}

/**
 * Returns the date the report covers. When no explicit --date is given,
 * this is yesterday's date because the pipeline fetches the previous
 * calendar day's news.
 */
export function getTargetDate(): string {
  return getRuntimeOptions().date ?? dayjs().subtract(1, "day").format("YYYY-MM-DD");
}

export function shouldResumeFromRaw(date?: string): boolean {
  const options = getRuntimeOptions();
  if (!options.resumeFromRaw) return false;
  if (!options.date || !date) return true;
  return options.date === date;
}
