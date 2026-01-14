# Lenny's Podcast MCP

Search 284 episodes of [Lenny's Podcast](https://www.lennysnewsletter.com/podcast) transcripts directly from Claude. Get instant access to product wisdom from guests like Shreyas Doshi, Julie Zhuo, Brian Chesky, and hundreds more.

## Quick Start

### Option 1: Claude Desktop / Cowork (Easiest)

1. Open Claude Desktop or Cowork
2. Go to **Settings → Connectors → Add custom connector**
3. Enter:
   - **Name:** `Lenny's Podcast`
   - **URL:** `https://lenny-mcp.onrender.com/sse`
4. Click **Add**
5. Start asking questions!

### Option 2: Claude Code CLI

```bash
claude mcp add lenny-transcripts --url https://lenny-mcp.onrender.com/sse
```

Then restart Claude Code.

---

## What You Can Ask

Once connected, try asking Claude things like:

- "What do product leaders say about pricing strategy?"
- "How should I think about user onboarding?"
- "What has Shreyas Doshi said about prioritization?"
- "Search Lenny's podcast for advice on building growth teams"
- "What do guests say about the transition from IC to manager?"

## Available Tools

| Tool | Description |
|------|-------------|
| `search_transcripts` | Search all 284 episodes by topic/keyword |
| `get_episode` | Get full transcript for a specific guest |
| `list_episodes` | List all available episodes |

## Self-Hosting

Want to run your own instance?

### Deploy to Render (One Click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/lenny-mcp)

### Run Locally

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/lenny-mcp
cd lenny-mcp

# Install and build
npm install
npm run build

# Run in SSE mode (for remote connections)
npm run start:sse

# Or run in stdio mode (for local Claude Code)
npm start
```

For local Claude Code usage with your own transcripts:

```bash
# Download transcripts from Lenny's Dropbox
# Set the path
export LENNY_TRANSCRIPTS_PATH="/path/to/your/transcripts"

# Add to Claude Code
claude mcp add lenny-transcripts -- node /path/to/lenny-mcp/dist/index.js
```

## Credits

- Transcripts from [Lenny Rachitsky's public archive](https://twitter.com/lennysan)
- Built with [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT - See [LICENSE](LICENSE) for details.

The podcast transcripts are property of Lenny Rachitsky and are used with his public permission.
