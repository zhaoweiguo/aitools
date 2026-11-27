# AITools

A collection of browser-local developer tools, published at
<https://aitool.zhaoweiguo.com/>.

## Tools

| Route | Description |
|---|---|
| `/` | Tool portal and index for future utilities |
| `/entry/` | Directory alias of the tool portal |
| `/atif-view/` | ATIF v1.x trajectory viewer |
| `/json-view/` | JSON formatter, validator, and tolerant repair preview |
| `/markdown-view/` | Markdown editor and live GFM preview |
| `/time-view/` | Unix timestamp, Gregorian, and lunar calendar converter |

All file parsing happens in the browser. Uploaded content is not sent to an
application server.

## Structure

```text
entry/          Portal source
atif-view/      Existing trajectory viewer
json-view/      JSON formatter
markdown-view/  Markdown editor and live preview
time-view/      Timestamp and calendar converter
public/         Shared static assets
```

The portal is available from both `index.html` and `entry/index.html`. Vite
builds all four HTML entries into `dist/`.

## Development

```bash
npm install
npm run dev
```

Local routes:

- <http://localhost:5173/>
- <http://localhost:5173/entry/>
- <http://localhost:5173/atif-view/>
- <http://localhost:5173/json-view/>
- <http://localhost:5173/markdown-view/>
- <http://localhost:5173/time-view/>

## Verification

```bash
npm test
npm run build
```

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which tests,
builds all routes, and publishes `dist/` to Netlify.

Netlify project: `xinxi-aitool`

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 22
- Production domain: `aitool.zhaoweiguo.com`
- Netlify origin: <https://xinxi-aitool.netlify.app/>
- GitHub secret: `NETLIFY_AUTH_TOKEN`
