# n8n-nodes-fred

This is an n8n community node. It lets you retrieve economic data from [FRED®](https://fred.stlouisfed.org/) (Federal Reserve Economic Data, Federal Reserve Bank of St. Louis) through the [FRED API v2](https://fred.stlouisfed.org/docs/api/fred/v2/index.html) in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Usage](#usage)
- [Development](#development)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install `n8n-nodes-fred`.

## Operations

| Resource | Operation        | Endpoint                           |
| -------- | ---------------- | ---------------------------------- |
| Release  | Get Observations | `GET fred/v2/release/observations` |

### Release → Get Observations

Gets the observations for all series on a release of economic data.

| Parameter  | Description                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Release ID | ID of the release (e.g. `53` = Gross Domestic Product, `52` = Z.1 Financial Accounts). It appears in the release URL, e.g. `https://fred.stlouisfed.org/release?rid=53`.                                     |
| Return All | Follows `next_cursor` until `has_more` is `false`, retrieving the whole release (500,000 observations per request).                                                                                          |
| Limit      | When _Return All_ is off: maximum number of **observations** (not series) to return (1–500,000).                                                                                                             |
| Output     | **One Item per Series** (metadata + `observations` array), **One Item per Observation** (flattened with series metadata) or **Raw Response** (one item per API page, includes `has_more` and `next_cursor`). |

Options:

- **Convert Values to Numbers** (default on): converts values to numbers; FRED's missing value marker `"."` becomes `null`.
- **Include Series Notes** (default on): turn off to drop the long `notes` field.
- **Next Cursor**: continue from a cursor returned by a previous request. Combine with _Raw Response_ output to paginate manually (e.g. in a loop).

When _Return All_ is on, a series split across two pages is merged back into a single item. Requests are spaced to respect FRED's limit of 2 requests per second, and HTTP 429 responses are retried with exponential backoff.

> **Note:** large releases are big. The GDP release (53) returns ~12,700 series and ~1.4M observations (~60 MB of JSON). Prefer _One Item per Series_ over _One Item per Observation_ for whole releases.

## Credentials

1. Sign in at [fredaccount.stlouisfed.org](https://fredaccount.stlouisfed.org/) and [request an API key](https://fredaccount.stlouisfed.org/apikeys).
2. In n8n, create a **FRED API** credential and paste the key.

The key is sent as an HTTP header: `Authorization: Bearer <api key>`.

## Usage

Example: get the latest data for the GDP release, one item per series, without notes.

- Resource: `Release`, Operation: `Get Observations`
- Release ID: `53`, Return All: on
- Output: `One Item per Series`, Options → Include Series Notes: off

The node is marked `usableAsTool`, so it can also be used by n8n AI Agents.

## Development

```bash
npm install
npm run dev     # starts n8n locally with this node loaded (http://localhost:5678)
npm run build
npm run lint
```

### Adding new FRED v2 endpoints

The node is organized by resource and operation so new endpoints can be added without touching existing ones:

```
nodes/Fred/
├── Fred.node.ts                  # node definition + generic execute() router
├── resources/
│   ├── index.ts                  # registry: resource -> operation -> handler
│   └── release/
│       ├── index.ts              # Operation options for the "Release" resource
│       └── getObservations.ts    # UI properties + handler for fred/v2/release/observations
└── shared/
    ├── transport.ts              # authenticated requests, 429 retries
    └── utils.ts
```

1. Create `resources/<resource>/<operation>.ts` exporting its `INodeProperties[]` (with `displayOptions` for its resource/operation) and a handler `(this: IExecuteFunctions, itemIndex) => Promise<IDataObject[]>` that uses `fredApiRequest`.
2. Add the operation to `resources/<resource>/index.ts`.
3. For a new resource, register it in `resources/index.ts` and add it to the _Resource_ options in `Fred.node.ts`.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [FRED API v2 documentation](https://fred.stlouisfed.org/docs/api/fred/v2/index.html)
- [FRED Terms of Use](https://fred.stlouisfed.org/legal/)

This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.
