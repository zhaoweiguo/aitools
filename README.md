# ATIF Lens

ATIF Lens is a browser-based trajectory explorer for Agent Trajectory Interchange
Format (ATIF v1.x) documents. It parses files locally in the browser and presents
steps, tool calls, run metrics, and embedded subagent trajectories.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
npm run build:standalone
```

`build:standalone` writes `standalone/index.html`, a self-contained build with
CSS, JavaScript, and the favicon inlined for single-file static hosting.

Public preview: <https://c8727w.csb.app/>

## Custom domain

GitHub Pages serves this project at `zhaoweiguo.github.io/aitools/` and is
configured to use `aitool.zhaoweiguo.com` (see `public/CNAME`). The Aliyun DNS
record for `aitool` must be a CNAME pointing to `zhaoweiguo.github.io`; do not
use an A record for this account subdomain. HTTPS is issued by GitHub Pages
after DNS propagation.

## Supported input

- Standard ATIF JSON documents
- ATIF JSONL exports with one `trajectory` header line and one `step` per line
- Arrays of trajectories or an object with a `trajectories` array
- Embedded `subagent_trajectories` and `subagent_trajectory_ref` links

The viewer tolerates absent optional ATIF fields, but requires the root `agent`
and `steps` fields. Tool argument keys support camelCase and snake_case variants.
