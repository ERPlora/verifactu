"""Plumbing shared by the `*.hub.test.py` batteries — the ones that talk to a REAL kernel.

`erplora test <dir> --against-hub` (module-toolkit#110) starts the published hub image with its
own Postgres, installs the module through `POST /api/modules/install` and hands the url over in
`ERPLORA_HUB_BASE_URL`. Everything below is the thin layer between a battery and that runtime:
the two doors (`/api/query`, `/api/command`), the fiscal setup `verifactu` cannot work without,
and one piece of bookkeeping every battery needs — a `check()` that records a failure instead of
dying on it, so a red run names EVERY broken assertion and not just the first.

Why HTTP and not a scratch Postgres: these batteries replace the hub's own
`verifactu_desglose_e2e.rs` (ERPlora/hub#1264, contract «El Hub se CIERRA como KERNEL» §5). What
they assert is the SEAM — the breakdown `invoice` writes with its real WASM handler is the one the
VeriFactu engine reads and seals into the fiscal record — and that seam only exists inside a live
runtime: the engine is a first-party NATIVE plugin baked into the hub (ADR-0009,
`hub/crates/verifactu`), reached through `verifactu.records.ingest_invoice`, and the invoice that
feeds it is minted by another module's WASM. Neither end exists in a hand-written harness that
binds `:hub_id` itself. The Postgres batteries next door (`*.postgres.test.py`) keep proving this
module's own SQL — its CHECK constraints, its gates — in isolation.

Three facts of the runtime a battery has to know, all resolved here so no battery hard-codes them:

  * THE TENANT. Module seeds land under the RUNTIME's own `hub_id`, not under whatever `X-Hub-Id`
    a request carries (that is how hub#594 was found). `GET /api/hub/context` says which id that
    is, and every request goes out under it.
  * THE SESSION USER. Dev auth trusts `X-User-Id`. Each run mints its own, because batteries share
    one hub for the length of the run and a fixed id would mix this run's rows with a previous
    one's under the same shared hub.
  * THE CHAIN IS SHARED AND APPEND-ONLY. `verifactu_record` is one hash chain per
    `(hub_id, issuer_nif, environment)`, so `sequence_number`, `previous_hash` and
    `is_first_record` depend on everything that ran before. A battery asserts what belongs to ITS
    OWN invoice — amounts, rate, the link back to the invoice — never a position in the chain.

`verifactu` needs TWO doors open before it does anything, and both are set once per run here:
[`ensure_business_identity`] (the hub's fiscal identity — the `IDEmisorFactura` that anchors the
chain; without it `ingest_invoice` refuses with `missing_issuer_nif`) and
[`grant_fiscal_signing`] (the `certificate` capability the manifest requests — without the grant
the kernel denies the listener and `invoice.created` dies in the outbox as
`module.capability_denied`, which is a SILENT no-record).

It refuses to skip. Without a runtime a battery FAILS: a check that excuses itself is the green
that proves nothing this whole toolkit exists to remove (module-toolkit#50).
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = (
    os.environ.get("VERIFACTU_HUB_BASE_URL")
    or os.environ.get("ERPLORA_HUB_BASE_URL")
    or ""
).rstrip("/")

# Quantities travel in 10^6 fixed point (ADR-0147); money in integer cents (ADR-0007/0123).
ONE = 1_000_000

# The whole chain `verifactu` sits on top of: it declares `depends_on: ["invoice"]`, and `invoice`
# pulls `taxes`+`sales`, which pull `inventory`+`customers`. The engine reads an invoice row that
# only the real `invoice` handler can produce, so every one of them has to be live.
FISCAL_CHAIN = ("taxes", "inventory", "customers", "sales", "invoice", "verifactu")


def cents(value) -> int:
    """A money amount the way Postgres hands it back: a `bigint` aggregate is NUMERIC, so a total
    may arrive as a JSON string (`"1500"`) instead of a number. Either form is the same cents."""
    if isinstance(value, bool):
        raise AssertionError(f"not a money amount: {value!r}")
    if isinstance(value, (int, float)):
        return int(round(value))
    if isinstance(value, str):
        return int(round(float(value)))
    raise AssertionError(f"not a money amount: {value!r}")


class Hub:
    """One battery's view of the live runtime."""

    def __init__(self, battery: str, needs: tuple[str, ...] = FISCAL_CHAIN):
        self.battery = battery
        self.failures: list[str] = []
        if not BASE:
            print(
                f"{battery}: no runtime at the other end (ERPLORA_HUB_BASE_URL is empty)."
            )
            print(
                "Run it with `erplora test <dir> --against-hub`; without a hub this is NOT a skip, "
                "it is a failure."
            )
            sys.exit(1)
        self.user = f"u-{uuid.uuid4().hex[:8]}"
        self.hub_id = self._runtime_hub_id()
        self._require_installed(needs)

    # ── transport ────────────────────────────────────────────────────────────────────────

    def _request(self, method: str, path: str, body=None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(
            f"{BASE}{path}",
            data=data,
            headers={
                "content-type": "application/json",
                "x-hub-id": self.hub_id,
                "x-user-id": self.user,
            },
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.status, json.loads(res.read().decode() or "null")
        except urllib.error.HTTPError as err:
            raw = err.read().decode()
            try:
                return err.code, json.loads(raw or "null")
            except json.JSONDecodeError:
                return err.code, {"raw": raw}

    def _runtime_hub_id(self) -> str:
        req = urllib.request.Request(f"{BASE}/api/hub/context", method="GET")
        with urllib.request.urlopen(req, timeout=60) as res:
            body = json.loads(res.read().decode())
        hub_id = body.get("hub_id")
        if not hub_id:
            print(
                f"{self.battery}: GET /api/hub/context did not say the hub_id: {body}"
            )
            sys.exit(1)
        return hub_id

    def _require_installed(self, needs: tuple[str, ...]) -> None:
        status, body = self._request("GET", "/api/modules")
        installed = (
            {m["id"] for m in (body or {}).get("data", [])} if status == 200 else set()
        )
        missing = [m for m in needs if m not in installed]
        if missing:
            print(
                f"{self.battery}: the runtime at {BASE} does not have {missing} installed "
                f"(installed: {sorted(installed)}). `verifactu` declares `depends_on: "
                '["invoice"]`, and that pulls `taxes`/`sales`/`inventory`/`customers`, so the whole '
                "chain has to go in through the same door before the module. Not a skip: nothing "
                "below can be trusted without it."
            )
            sys.exit(1)

    # ── the two doors ────────────────────────────────────────────────────────────────────

    def query(self, name: str, params: dict | None = None) -> list:
        """Rows of a query. A query with a `list` block answers `{rows,total,…}`; the rest answer
        the bare array. Both come back as the list of rows."""
        status, body = self._request(
            "POST", "/api/query", {"name": name, "params": params or {}}
        )
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"query {name} answered {status}: {body}")
        data = body["data"]
        if isinstance(data, dict) and "rows" in data:
            return data["rows"]
        return data

    def command(self, name: str, payload: dict):
        """`(status, body)` of a command, whatever the runtime answered."""
        return self._request("POST", "/api/command", {"name": name, "payload": payload})

    def run(self, name: str, payload: dict) -> dict:
        """A command that MUST succeed. Its `data` (`operations`, `new_ids`, …)."""
        status, body = self.command(name, payload)
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"command {name} answered {status}: {body}")
        return body["data"]

    # ── bookkeeping ──────────────────────────────────────────────────────────────────────

    def check(self, label: str, got, want) -> None:
        if got != want:
            self.failures.append(f"{label} — expected [{want!r}], got [{got!r}]")
            print(f"  FAIL: {label} — expected [{want!r}], got [{got!r}]")
        else:
            print(f"  ok: {label} = {got!r}")

    def check_true(self, label: str, condition: bool, detail="") -> None:
        if not condition:
            self.failures.append(f"{label} — {detail}" if detail else label)
            print(f"  FAIL: {label} {detail}")
        else:
            print(f"  ok: {label}")

    def finish(self, verdict: str) -> int:
        print()
        if self.failures:
            print(f"✗ {self.battery}: {len(self.failures)} failure(s):")
            for f in self.failures:
                print(f"  - {f}")
            return 1
        print(f"✓ {self.battery}: {verdict}")
        return 0


# ── the fiscal setup the module cannot work without ──────────────────────────────────────


def ensure_business_identity(
    hub: Hub, tax_id="B12345674", legal_name="Bar Paco SL", country="ES"
) -> None:
    """Sets the hub's fiscal identity through the real admin door (`PUT /api/settings`).

    Three things hang off it. The kernel's fiscal precondition (ADR-0203, hub#328) refuses every
    `invoice.*` command that stamps an issuer until the hub has one. `invoice` copies the NIF onto
    the row, and `verifactu.records.ingest_invoice` refuses with `missing_issuer_nif` when it
    arrives empty — that NIF is the `IDEmisorFactura` the whole hash chain is anchored to. And the
    COUNTRY is what makes `taxes`' seeded Spanish rules resolve at all (ADR-0085: no country → no
    rule → the browser would pick the VAT).

    Dev auth grants admin to any `X-User-Id` (`crates/server/src/auth.rs::require_admin_session`),
    so this is exactly the write the fiscal setup wizard would make. Idempotent."""
    status, body = hub._request(
        "PUT",
        "/api/settings",
        {
            "business_tax_id": tax_id,
            "business_legal_name": legal_name,
            "country_code": country,
        },
    )
    if status != 200:
        print(
            f"{hub.battery}: PUT /api/settings (business identity) answered {status}: {body}"
        )
        sys.exit(1)


def grant_fiscal_signing(hub: Hub) -> None:
    """Grants `verifactu` the `certificate` capability its manifest requests, through the real
    Settings → Permissions door (`PUT /api/modules/verifactu/capabilities`).

    Not optional plumbing: the kernel gates a module's commands on its granted capabilities, and
    the `invoice.created` listener is one of them. Without the grant the event does not fail
    loudly — it dies in the OUTBOX with `module.capability_denied`, and the battery would see a
    hub that simply never wrote a record. Granting first is what makes a missing record mean what
    the assertion says it means."""
    status, body = hub._request(
        "PUT", "/api/modules/verifactu/capabilities", {"grants": {"certificate": True}}
    )
    granted = {
        c["id"]: c.get("granted")
        for c in (body or {}).get("capabilities", [])
        if isinstance(c, dict)
    }
    if status != 200 or not granted.get("certificate"):
        print(
            f"{hub.battery}: granting the `certificate` capability answered {status}: {body}. "
            "Without it every `invoice.created` dies in the outbox as `module.capability_denied` "
            "and no record is ever written."
        )
        sys.exit(1)


def fiscal_setup(hub: Hub) -> None:
    """Both doors, in the order the runtime needs them. Every `hub` battery starts here."""
    ensure_business_identity(hub)
    grant_fiscal_signing(hub)


# ── driving the chain ────────────────────────────────────────────────────────────────────


def unique_series(tag: str) -> str:
    """A series code unique to THIS run. `invoice`'s series are keyed `(hub_id, code, year)`, so a
    fresh code always starts its counter at 0 — the only way to reason about a number on a hub
    SHARED with every other run this battery has ever had."""
    return f"VF{tag.upper()}{uuid.uuid4().hex[:6].upper()}"


def charge_key(tag: str) -> str:
    """A charge-attempt key unique to THIS run (`sales.complete_sale` requires one, sales#20)."""
    return f"verifactu-battery-{tag}-{uuid.uuid4().hex[:8]}"


def cash_method_id(hub: Hub) -> str:
    """Id of the CASH method from the hub's seeded catalogue, through the public query — never
    composed by hand (sales#20: «the client proposes, the server disposes»)."""
    rows = hub.query("sales.payment_methods")
    cash = next((r for r in rows if r.get("type") == "cash"), None)
    if cash is None:
        raise AssertionError(f"the hub's catalogue must carry the `cash` method: {rows}")
    return cash["id"]


def issue_ticket(hub: Hub, tag: str, items: list[tuple[str, int, int, float, str]]) -> dict:
    """Issues a simplified ticket (F2) with `items` = `(description, units, unit_price_cents,
    tax_rate_pct, tax_category_key)` and returns the invoice row, breakdown included."""
    lines = [
        {
            "description": desc,
            "quantity": units * ONE,  # fixed point, scale 10^6 (ADR-0147)
            "unit_price": price,
            "tax_rate": rate,
            "tax_category_key": category,
        }
        for (desc, units, price, rate, category) in items
    ]
    data = hub.run(
        "invoice.create",
        {
            "series_code": unique_series(tag),
            "customer_name": "Cliente",
            "items": lines,
        },
    )
    invoice_id = data["new_ids"][0]
    return invoice_of(hub, invoice_id)


def invoice_of(hub: Hub, invoice_id: str) -> dict:
    rows = hub.query("invoice.get", {"invoice_id": invoice_id})
    if not rows:
        raise AssertionError(f"invoice.get found no invoice {invoice_id}")
    return rows[0]


def breakdown_of(invoice: dict) -> list[dict]:
    """Parses `invoice_invoice.tax_breakdown`. **Array only**: the rate-keyed object is history
    that only `aeat::desglose` still has to read (invoices already chained into the hash), never
    something the module may produce today (ADR-0186)."""
    raw = invoice.get("tax_breakdown")
    if not isinstance(raw, str):
        raise AssertionError(f"tax_breakdown is a string column: {raw!r}")
    parsed = json.loads(raw)
    if not isinstance(parsed, list):
        raise AssertionError(
            "`tax_breakdown` must be the ARRAY of full fiscal keys (ADR-0186); "
            f"got {parsed!r}"
        )
    return parsed


def at_rate(entries: list[dict], rate: float) -> dict:
    """The entry declared at `rate`, or a failure naming the whole breakdown."""
    found = [e for e in entries if abs(float(e.get("rate", -1)) - rate) < 0.01]
    if len(found) != 1:
        raise AssertionError(
            f"expected exactly one breakdown entry at {rate}%, found {len(found)}: {entries}"
        )
    return found[0]


def wait_for_record(hub: Hub, invoice_id: str, timeout: float = 20.0) -> dict:
    """Polls `verifactu.records.by_invoice` until the record that `invoice.created` →
    `verifactu.records.ingest_invoice` seals for this invoice lands, then returns its FULL detail
    (`verifactu.records.get`).

    The relay delivers a listener ASYNCHRONOUSLY (the outbox's own tick, `crates/server/src/lib.rs`)
    — there is no HTTP door to drain it on demand the way the hub's own e2e used
    `rt.drain_outbox()`. `by_invoice` is scoped to ONE `invoice_id` by its own SQL, so polling it is
    safe on a hub SHARED with every other run this battery has ever had."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        rows = hub.query("verifactu.records.by_invoice", {"invoice_id": invoice_id})
        if rows:
            detail = hub.query("verifactu.records.get", {"record_id": rows[0]["id"]})
            if detail:
                return detail[0]
        time.sleep(0.2)
    raise AssertionError(
        f"timed out after {timeout}s waiting for the VeriFactu record of invoice {invoice_id}. "
        "An `invoice.created` that never becomes a record is the silent non-compliance this "
        "battery exists to catch — check the outbox for `module.capability_denied` or "
        "`missing_issuer_nif`."
    )
