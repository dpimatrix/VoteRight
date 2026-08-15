import { describe, expect, it } from "vitest";
import { contentTypeFor, extensionFor, mediaFilePath, mediaUrlPath } from "./media";

// Pure helpers only, same pattern as jurisdictions.test.ts — the actual
// ffmpeg/ffprobe spawning in saveMediaUpload is I/O, not unit-tested here.
describe("media format helpers", () => {
  it("maps video to mp4 and audio to m4a", () => {
    expect(extensionFor("video")).toBe("mp4");
    expect(extensionFor("audio")).toBe("m4a");
  });

  it("maps content types matching the stored container", () => {
    expect(contentTypeFor("video")).toBe("video/mp4");
    expect(contentTypeFor("audio")).toBe("audio/mp4");
  });

  it("builds a disk path under the media dir named by id + extension", () => {
    expect(mediaFilePath("abc-123", "video")).toMatch(/[\\/]debate-media[\\/]abc-123\.mp4$/);
    expect(mediaFilePath("abc-123", "audio")).toMatch(/[\\/]debate-media[\\/]abc-123\.m4a$/);
  });

  it("builds the gated serving URL from the argument id alone (no extension leaked)", () => {
    expect(mediaUrlPath("abc-123")).toBe("/api/debates/media/abc-123");
  });
});
