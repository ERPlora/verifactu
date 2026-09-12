/**
 * **Calling a core route from a module screen** — the one seam this module has to the shell.
 *
 * `X-Hub-Session` is what `auth::require_user_session` reads on every core route, and the shell
 * keeps it under this key (`apps/web/src/lib/session.ts`). The SDK has no door for core REST —
 * `ErploraClient` never exposes its transport and `coreRequest` is private by design — and this
 * screen runs inside the shell's page, same origin, so the route that exists for a module is the
 * document it lives in. `printing` documents the same seam for the same reason.
 *
 * This file is the ONE implementation on purpose. Two copies of «call a core route» is how one of
 * them forgets the session header and fails only for the customer who locked their browser down.
 * The day the shell offers a proper door, this is the single file to swap.
 *
 * Nothing here throws. A network failure, a proxy page and a refusal are all ANSWERS with a status
 * the caller can paint: a screen that has to catch as well as branch ends up with a path nobody
 * wrote, and that path is always the one a customer hits.
 */

/** Where the shell keeps the runtime session. Same key its own `runtimeHeaders()` reads. */
export const HUB_SESSION_KEY = 'erplora.hub_session';

/** How a call names the module it acts for. Read by the runtime's capability gate, nowhere else. */
export const MODULE_HEADER = 'X-Erplora-Module';

/**
 * This module's id, exactly as the manifest declares it.
 *
 * 🔴 It is not decoration. `flows_api::require_module_capability` resolves the owner's grant from
 * this header on EVERY request: a call that names no module passes —the shell is not a module— and
 * one that names this module needs `certificate` declared in `module.json` and granted by the owner
 * in Settings → Permissions (ADR-0079, default-deny). Without the header, opening the certificate
 * door to a module screen would open it to every installed module.
 *
 * Honest limit, the same one the kernel writes down for `X-Erplora-Module`: in the browser the id
 * is DECLARED, not authenticated. It is one gap and not two — a module that would lie here can
 * already read the session out of the same document — and it closes when module components are
 * isolated.
 */
export const MODULE_ID = 'verifactu';

/** What a call to a core route came back with. `status: 0` = the request never left. */
export interface CoreReply {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

/** What a call that expects BYTES came back with. `blob` is null on anything but a 2xx. */
export interface CoreBlobReply extends CoreReply {
  blob: Blob | null;
}

/** How to make the call. No `json` and no `form` = a bare `GET`. */
export interface CoreRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Serialised as JSON with its `Content-Type`. */
  json?: unknown;
  /**
   * Sent verbatim. **No `Content-Type` is set for it**: `multipart/form-data` needs the `boundary`
   * the browser generates, and writing the header by hand strips it — the runtime then cannot
   * separate the parts and the signed document is lost.
   */
  form?: FormData;
}

/** The hub session the shell keeps, or `null` where there is none to read (locked-down browser). */
function hubSession(): string | null {
  try {
    return globalThis.localStorage?.getItem(HUB_SESSION_KEY) ?? null;
  } catch {
    return null;
  }
}

function headersFor(opts: CoreRequestOptions): Record<string, string> {
  const headers: Record<string, string> = { [MODULE_HEADER]: MODULE_ID };
  const session = hubSession();
  if (session) headers['X-Hub-Session'] = session;
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';
  return headers;
}

function initFor(opts: CoreRequestOptions): RequestInit {
  return {
    method: opts.method ?? (opts.json !== undefined || opts.form ? 'POST' : 'GET'),
    headers: headersFor(opts),
    credentials: 'same-origin',
    ...(opts.form ? { body: opts.form } : {}),
    ...(opts.json !== undefined ? { body: JSON.stringify(opts.json) } : {}),
  };
}

/** Reads a JSON body without inventing one: anything unparseable leaves `{}` and keeps the status. */
async function jsonBody(res: Response): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await res.json();
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Same-origin call to a core route, carrying the session the runtime expects. */
export async function coreFetch(
  path: string,
  opts: CoreRequestOptions = {},
): Promise<CoreReply> {
  let res: Response;
  try {
    res = await fetch(path, initFor(opts));
  } catch {
    return { ok: false, status: 0, body: {} };
  }
  return { ok: res.ok, status: res.status, body: await jsonBody(res) };
}

/**
 * The same call for a route that answers **bytes** — today the pre-filled official model, which is
 * a PDF.
 *
 * A refusal is NOT read as a blob: it carries a `code` the screen turns into a sentence (ADR-0055),
 * and reading it as bytes would hand the customer a broken file instead of a reason.
 */
export async function coreFetchBlob(path: string, json: unknown): Promise<CoreBlobReply> {
  let res: Response;
  try {
    res = await fetch(path, initFor({ method: 'POST', json }));
  } catch {
    return { ok: false, status: 0, body: {}, blob: null };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, body: await jsonBody(res), blob: null };
  }
  return { ok: true, status: res.status, body: {}, blob: await res.blob() };
}
