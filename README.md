# mcp-cactus

NCI CACTUS Chemical Identifier Resolver MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `resolve` | NCI CACTUS chemical identifier resolver. Convert one chemical identifier (a drug/chemical name, CAS number, SMILES, InChI, or InChIKey) into a single representation: smiles (canonical SMILES), stdinchi (standard InChI), stdinchikey (standard InChIKey), iupac_name, names (synonym list), formula (molecular formula), mw (molecular weight), or cas (CAS registry number(s)). Keyless, plain-text API. |
| `identify` | NCI CACTUS one-shot lookup: given any chemical identifier (name, CAS, SMILES, InChI, or InChIKey), return SMILES, InChIKey, IUPAC name, molecular formula, molecular weight, and CAS number in a single call. Fields that cannot be resolved are returned as null. Keyless, plain-text API. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "cactus": {
      "url": "https://gateway.pipeworx.io/cactus/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Cactus data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
