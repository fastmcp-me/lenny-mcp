import { readdir, readFile, mkdir, access } from "fs/promises";
import { join } from "path";
import { createWriteStream } from "fs";

export interface Episode {
  guest: string;
  content: string;
  path: string;
}

// Dropbox download URL (dl=1 for direct download)
const DROPBOX_URL =
  "https://www.dropbox.com/scl/fo/yxi4s2w998p1gvtpu4193/AMdNPR8AOw0lMklwtnC0TrQ?rlkey=mwwj2oygno72le23o6kvzq5wq&dl=1";

// Default paths
const DEFAULT_LOCAL_PATH =
  process.env.LENNY_TRANSCRIPTS_PATH ||
  "/Users/venkatakshaychintalapati/Downloads/Lenny's Podcast Transcripts Archive [public]";

const HOSTED_TRANSCRIPTS_PATH = "./transcripts";

// Determine which path to use
function getTranscriptsPath(): string {
  if (process.env.MCP_MODE === "sse") {
    return HOSTED_TRANSCRIPTS_PATH;
  }
  return DEFAULT_LOCAL_PATH;
}

// Download transcripts from Dropbox (for hosted mode)
export async function downloadTranscripts(): Promise<void> {
  const targetPath = HOSTED_TRANSCRIPTS_PATH;

  // Check if transcripts already exist
  try {
    await access(targetPath);
    const files = await readdir(targetPath);
    if (files.length > 100) {
      console.error(
        `Transcripts already exist at ${targetPath} (${files.length} files)`
      );
      return;
    }
  } catch {
    // Directory doesn't exist, we need to download
  }

  console.error("Downloading transcripts from Dropbox...");

  try {
    // Create target directory
    await mkdir(targetPath, { recursive: true });

    // Download the zip file
    const response = await fetch(DROPBOX_URL, {
      redirect: "follow",
      headers: {
        "User-Agent": "lenny-mcp/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }

    const zipPath = "/tmp/lenny-transcripts.zip";
    const fileStream = createWriteStream(zipPath);

    // Write response to file
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    let receivedBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(value);
      receivedBytes += value.length;
      if (receivedBytes % (1024 * 1024) === 0) {
        console.error(`Downloaded ${Math.round(receivedBytes / 1024 / 1024)}MB...`);
      }
    }
    fileStream.end();

    console.error(`Download complete (${Math.round(receivedBytes / 1024 / 1024)}MB)`);

    // Extract the zip file using unzip command (simpler and more reliable)
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    console.error("Extracting transcripts...");
    // Use -o to overwrite, -j to junk paths (flatten), ignore warnings (exit code 1 or 2)
    try {
      await execAsync(`unzip -o -j "${zipPath}" -d "${targetPath}"`);
    } catch (unzipError: any) {
      // unzip returns exit code 1 for warnings, 2 for minor errors - check if files exist
      const extractedFiles = await readdir(targetPath);
      if (extractedFiles.filter(f => f.endsWith('.txt')).length < 50) {
        throw unzipError; // Real error, not enough files extracted
      }
      console.error("Unzip completed with warnings (this is normal for this archive)");
    }

    // Clean up zip file
    try {
      await execAsync(`rm "${zipPath}"`);
    } catch {
      // Ignore cleanup errors
    }

    const files = await readdir(targetPath);
    console.error(`Extracted ${files.length} transcript files`);
  } catch (error) {
    console.error("Error downloading transcripts:", error);
    throw error;
  }
}

export async function loadTranscripts(): Promise<Episode[]> {
  const episodes: Episode[] = [];
  const transcriptsPath = getTranscriptsPath();

  try {
    const files = await readdir(transcriptsPath);
    const txtFiles = files.filter((f) => f.endsWith(".txt"));

    console.error(
      `Loading ${txtFiles.length} transcripts from ${transcriptsPath}...`
    );

    for (const file of txtFiles) {
      const filePath = join(transcriptsPath, file);
      const content = await readFile(filePath, "utf-8");
      const guest = file.replace(".txt", "");

      episodes.push({
        guest,
        content,
        path: filePath,
      });
    }

    console.error(`Loaded ${episodes.length} episodes successfully.`);
  } catch (error) {
    console.error(`Error loading transcripts: ${error}`);
    throw error;
  }

  return episodes;
}

// Extract a snippet around a match position
export function extractSnippet(
  content: string,
  searchTerms: string[],
  snippetLength: number = 500
): string {
  const lowerContent = content.toLowerCase();

  // Find the first occurrence of any search term
  let bestPosition = -1;
  for (const term of searchTerms) {
    const pos = lowerContent.indexOf(term.toLowerCase());
    if (pos !== -1 && (bestPosition === -1 || pos < bestPosition)) {
      bestPosition = pos;
    }
  }

  if (bestPosition === -1) {
    // No match found, return the beginning (skip first ~2000 chars which are usually ads)
    const startAfterAds = Math.min(2000, content.length);
    return content.slice(startAfterAds, startAfterAds + snippetLength) + "...";
  }

  // Extract snippet centered around the match
  const halfLength = Math.floor(snippetLength / 2);
  const start = Math.max(0, bestPosition - halfLength);
  const end = Math.min(content.length, bestPosition + halfLength);

  let snippet = content.slice(start, end);

  // Try to start at a sentence/paragraph boundary
  if (start > 0) {
    const newlinePos = snippet.indexOf("\n");
    if (newlinePos !== -1 && newlinePos < 100) {
      snippet = snippet.slice(newlinePos + 1);
    }
    snippet = "..." + snippet;
  }

  if (end < content.length) {
    snippet = snippet + "...";
  }

  return snippet.trim();
}

// Parse timestamp from transcript line (e.g., "Lenny (00:03:42):" -> "00:03:42")
export function extractTimestamp(text: string): string | null {
  const match = text.match(/\((\d{2}:\d{2}:\d{2})\)/);
  return match ? match[1] : null;
}
