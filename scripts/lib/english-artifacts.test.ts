import { describe, expect, it } from "vitest";
import {
  ENGLISH_ARTIFACTS,
  getEnglishArtifactFileName,
  getEnglishArtifactKind,
} from "./english-artifacts.js";

describe("english artifact helpers", () => {
  it("maps known markdown files to english companions", () => {
    expect(ENGLISH_ARTIFACTS).toEqual([
      { kind: "daily", fileName: "daily.md" },
      { kind: "podcast-script", fileName: "podcast-script.md" },
      { kind: "brief", fileName: "brief.md" },
      { kind: "douyin", fileName: "douyin.md" },
      { kind: "xhs", fileName: "xhs.md" },
    ]);
  });

  it("derives english file names", () => {
    expect(getEnglishArtifactFileName("daily.md")).toBe("daily.en.md");
    expect(getEnglishArtifactFileName("podcast-script.md")).toBe(
      "podcast-script.en.md"
    );
  });

  it("returns kinds for translatable files", () => {
    expect(getEnglishArtifactKind("daily.md")).toBe("daily");
    expect(getEnglishArtifactKind("xhs.md")).toBe("xhs");
    expect(getEnglishArtifactKind("meta.json")).toBeNull();
  });
});
