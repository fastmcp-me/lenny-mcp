import FlexSearch from "flexsearch";
import { Episode, extractSnippet } from "./loader.js";

export interface SearchResult {
  guest: string;
  snippet: string;
  relevance: number;
}

// FlexSearch document index
let index: FlexSearch.Document<Episode, string[]> | null = null;
let episodes: Episode[] = [];

export function initializeIndex(loadedEpisodes: Episode[]): void {
  episodes = loadedEpisodes;

  // Create a document index
  index = new FlexSearch.Document<Episode, string[]>({
    document: {
      id: "guest",
      index: ["guest", "content"],
      store: ["guest", "content"],
    },
    tokenize: "forward",
    resolution: 9,
    cache: true,
  });

  // Add all episodes to the index
  for (const episode of episodes) {
    index.add(episode);
  }

  console.error(`Search index initialized with ${episodes.length} episodes.`);
}

export async function searchTranscripts(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  if (!index) {
    throw new Error("Search index not initialized");
  }

  // Search both guest names and content
  const results = index.search(query, {
    limit: limit * 2, // Get more results to deduplicate
    enrich: true,
  });

  // Collect unique guests from results
  const seenGuests = new Set<string>();
  const searchResults: SearchResult[] = [];
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  // Process results from both fields (guest and content)
  for (const fieldResult of results) {
    if (!fieldResult.result) continue;

    for (const item of fieldResult.result) {
      // Handle both enriched and non-enriched results
      const guest = typeof item === "string" ? item : (item as any).id || (item as any).doc?.guest;

      if (!guest || seenGuests.has(guest)) continue;
      seenGuests.add(guest);

      // Find the full episode
      const episode = episodes.find((e) => e.guest === guest);
      if (!episode) continue;

      const snippet = extractSnippet(episode.content, searchTerms, 600);

      searchResults.push({
        guest,
        snippet,
        relevance: searchResults.length + 1, // Simple relevance ranking by order
      });

      if (searchResults.length >= limit) break;
    }

    if (searchResults.length >= limit) break;
  }

  // If FlexSearch didn't find enough, do a simple text search as fallback
  if (searchResults.length < limit) {
    for (const episode of episodes) {
      if (seenGuests.has(episode.guest)) continue;

      const lowerContent = episode.content.toLowerCase();
      const hasMatch = searchTerms.some((term) => lowerContent.includes(term));

      if (hasMatch) {
        seenGuests.add(episode.guest);
        const snippet = extractSnippet(episode.content, searchTerms, 600);

        searchResults.push({
          guest: episode.guest,
          snippet,
          relevance: searchResults.length + 1,
        });

        if (searchResults.length >= limit) break;
      }
    }
  }

  return searchResults;
}

export function getEpisode(guest: string): Episode | null {
  // Try exact match first
  let episode = episodes.find(
    (e) => e.guest.toLowerCase() === guest.toLowerCase()
  );

  // Try partial match
  if (!episode) {
    episode = episodes.find((e) =>
      e.guest.toLowerCase().includes(guest.toLowerCase())
    );
  }

  return episode || null;
}

export function listEpisodes(): string[] {
  return episodes.map((e) => e.guest).sort();
}
