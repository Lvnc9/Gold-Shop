# Data model

## Product (`src/domain/types.ts`)
| Field | Meaning |
|---|---|
| `slug`, `name`, `category`, `model` | identity, collection, 3D factory |
| `colors`, `karats` | allowed alloys (24k is yellow only, enforced by `colorAllowed`) |
| `variants[]` | `{label, grams, dims, scale}` — grams at the base size; `scale` drives geometry |
| `sizes?` | `{kind: ring|length|wrist, options, default, base}` |
| `finishes` | polished / satin / hammered |
| `engraving?` | `{maxChars, where}` |
| `making?` / `premium?` | jewellery labour (pct of metal or flat USD) / bullion premium (fraction) |
| `stones?` | `{label, price}` flat USD |
| `defaults` | the `Config` a card and the product page start from |

## Pricing (`src/domain/pricing.ts`)
```
grams      = variant.grams × sizeFactor      (ring: +3% per US size; chains/bracelets: length / base)
pureGrams  = grams × purity                 (24k .9999 · 22k .916 · 18k .750 · 14k .585)
metal      = pureGrams × spot (USD per gram of 24k)
making     = metal × premium (bullion) | metal × pct | flat
total      = round(metal + making + stones + engraving $35)
```
Spot default: **$133.23/g** (Oct 6, 2026 close, $4,143.94/ozt). Overridden live by DB doc `config/spot`.

## Shipping
Insured courier free from $500 subtotal, else $25; express $45.

## Artifact DB (Artifact build)
Capabilities declared at publish:
```json
{
  "db": {
    "rules": [
      { "path": "", "read": "view", "write": "owner" },
      { "path": "orders", "read": "owner", "write": "owner" },
      { "path": "orders/{self}", "write": "interact" }
    ]
  },
  "user": {}
}
```
| Path | Shape | Who |
|---|---|---|
| (root) | — | everyone reads; only the owner writes anything not covered below |
| `config/spot` | `{ perGram: number, asOf: "YYYY-MM-DD" }` | everyone reads; owner writes |
| `orders/<viewer id>` | `{ lastOrder, lastOrderAt, name }` index doc | customer writes own; owner reads all |
| `orders/<viewer id>/items/<code>` | `OrderRecord` (`src/services/orders.ts`) | customer writes own; owner reads all |

Order codes: `SLN-` + 6 chars from an unambiguous alphabet.

### Who can save an order
Only signed-in viewers at **Contributor** level or above can write. Outside visitors on a public link hold `view`
and signed-out visitors have no DB, so `saveOrder()` returns `{saved:false}` and the confirmation page shows the
order code, a copyable text summary and the concierge address (`SHOP_CONTACT`). Browsing, configuring, bag and
checkout work for everyone.

### Updating the spot price
Owner (or Claude via ArtifactData `set`): `config/spot` → `{ "perGram": 134.10, "asOf": "2026-10-12" }`.
All open pages reprice live.

## Postgres (API build)
The Django models mirror the shapes above; the API serialises them back to the same camelCase `OrderRecord`.
| Table | Columns (main) | Notes |
|---|---|---|
| `catalog_product` | `slug` PK, `name`, `category`, `data` JSON | loaded from `backend/catalog/fixtures/catalog.json` by `seed_catalog` |
| `catalog_spotprice` | `per_gram` decimal(8,2), `as_of`, `created_at`, `created_by` | append-only; newest row is live; cached 5 min in Redis |
| `orders_order` | `code` unique, customer fields, `delivery`, `spot_per_gram`, `spot_as_of`, `subtotal`, `shipping`, `total` (whole USD), `status`, `payload_hash`, `created_at` | indexes `(-created_at, -id)`, `(status, -created_at)` |
| `orders_orderline` | `order` FK, `position`, `slug`, `name`, `summary`, `qty`, `unit`, `config` JSON | unique `(order, position)` |
| `monitoring_metricbucket` | `minute`, `method`, `route`, `count`, `errors`, `client_errors`, `total_ms`, `max_ms` | unique `(minute, method, route)`; written by the Kafka consumer |
| `monitoring_orderevent` | `ts`, `type`, `code`, `total`, `payload` | `order.created` / `spot.updated` as consumed |

Order `status`: `received` → `confirmed` | `cancelled`; `confirmed` → `shipped` | `cancelled`. The server re-prices
every order (see `backend.md`), so a stored total is always the server's.

## Local storage keys
`solenne.cart`, `solenne.wish`, `solenne.customer` (contact details for the next checkout), `solenne.lastOrder`,
`solenne.ownerSession` (API build: an owner signed in on this browser, so try a silent token refresh).
