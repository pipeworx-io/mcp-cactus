interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * NCI CACTUS Chemical Identifier Resolver MCP.
 *
 * Keyless, plain-text API (NOT JSON). Converts between chemical identifiers
 * (name, CAS, SMILES, InChI, InChIKey) and computes basic properties.
 */


const BASE = 'https://cactus.nci.nih.gov/chemical/structure';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const REPRESENTATIONS = [
  'smiles',
  'stdinchi',
  'stdinchikey',
  'iupac_name',
  'names',
  'formula',
  'mw',
  'cas',
];

const tools: McpToolExport['tools'] = [
  {
    name: 'resolve',
    description:
      'NCI CACTUS chemical identifier resolver. Convert one chemical identifier (a drug/chemical name, CAS number, SMILES, InChI, or InChIKey) into a single representation: smiles (canonical SMILES), stdinchi (standard InChI), stdinchikey (standard InChIKey), iupac_name, names (synonym list), formula (molecular formula), mw (molecular weight), or cas (CAS registry number(s)). Keyless, plain-text API.',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'Chemical name, CAS number, SMILES, InChI, or InChIKey (e.g. "aspirin", "50-78-2", "CC(=O)Oc1ccccc1C(O)=O").',
        },
        representation: {
          type: 'string',
          description: 'One of: smiles, stdinchi, stdinchikey, iupac_name, names, formula, mw, cas.',
        },
      },
      required: ['identifier', 'representation'],
    },
  },
  {
    name: 'identify',
    description:
      'NCI CACTUS one-shot lookup: given any chemical identifier (name, CAS, SMILES, InChI, or InChIKey), return SMILES, InChIKey, IUPAC name, molecular formula, molecular weight, and CAS number in a single call. Fields that cannot be resolved are returned as null. Keyless, plain-text API.',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'Chemical name, CAS number, SMILES, InChI, or InChIKey (e.g. "ibuprofen", "15687-27-1").',
        },
      },
      required: ['identifier'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'resolve':
        return await resolve(args);
      case 'identify':
        return await identify(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function resolve(args: Record<string, unknown>): Promise<unknown> {
  const identifier = args.identifier;
  if (typeof identifier !== 'string' || !identifier.trim()) {
    return { error: 'identifier is required (a chemical name, CAS, SMILES, InChI, or InChIKey)' };
  }
  const representation = args.representation;
  if (typeof representation !== 'string' || !REPRESENTATIONS.includes(representation)) {
    return { error: 'invalid representation', valid: REPRESENTATIONS };
  }

  const text = await fetchRep(identifier, representation);
  if (text === null) {
    return { error: 'could not resolve', identifier, representation };
  }
  const value = text.trim();
  if (representation === 'names' || representation === 'cas') {
    const values = value.split('\n').map((s) => s.trim()).filter(Boolean);
    return { identifier, representation, value: values.join('\n'), values };
  }
  return { identifier, representation, value };
}

async function identify(args: Record<string, unknown>): Promise<unknown> {
  const identifier = args.identifier;
  if (typeof identifier !== 'string' || !identifier.trim()) {
    return { error: 'identifier is required (a chemical name, CAS, SMILES, InChI, or InChIKey)' };
  }

  const reps = ['smiles', 'stdinchikey', 'iupac_name', 'formula', 'mw', 'cas'] as const;
  const settled = await Promise.allSettled(reps.map((rep) => fetchRep(identifier, rep)));

  const get = (i: number): string | null => {
    const r = settled[i];
    if (r.status !== 'fulfilled' || r.value === null) return null;
    const v = r.value.trim();
    return v ? v : null;
  };

  const smiles = get(0);
  let inchikey = get(1);
  if (inchikey && inchikey.startsWith('InChIKey=')) inchikey = inchikey.slice('InChIKey='.length);
  const iupac_name = get(2);
  const formula = get(3);
  const mwRaw = get(4);
  const casRaw = get(5);

  if (smiles === null && inchikey === null && iupac_name === null && formula === null && mwRaw === null && casRaw === null) {
    return { error: 'could not resolve any properties', identifier };
  }

  let mw: number | string | null = null;
  if (mwRaw !== null) {
    const n = Number(mwRaw);
    mw = Number.isFinite(n) ? n : mwRaw;
  }

  const cas = casRaw !== null ? casRaw.split('\n')[0].trim() || null : null;

  return { identifier, smiles, inchikey, iupac_name, formula, mw, cas };
}

/**
 * Fetch a single representation as plain text. Returns the text on HTTP 200,
 * or null on any non-200 (not resolvable) or fetch/parse error.
 */
async function fetchRep(identifier: string, representation: string): Promise<string | null> {
  try {
    const url = `${BASE}/${encodeURIComponent(identifier)}/${representation}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
