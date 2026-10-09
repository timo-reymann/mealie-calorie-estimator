mealie-calorie-estimator
===
[![GitHub Release](https://img.shields.io/github/v/tag/timo-reymann/mealie-calorie-estimator?label=version)](https://github.com/timo-reymann/mealie-calorie-estimator/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/timoreymann/mealie-calorie-estimator?style=flat)](https://hub.docker.com/r/timoreymann/mealie-calorie-estimator)
[![GitHub all releases download count](https://img.shields.io/github/downloads/timo-reymann/mealie-calorie-estimator/total)](https://github.com/timo-reymann/mealie-calorie-estimator/releases)
[![LICENSE](https://img.shields.io/github/license/timo-reymann/mealie-calorie-estimator)](https://github.com/timo-reymann/mealie-calorie-estimator/blob/main/LICENSE)
[![CircleCI](https://circleci.com/gh/timo-reymann/mealie-calorie-estimator.svg?style=shield)](https://app.circleci.com/pipelines/github/timo-reymann/mealie-calorie-estimator)
[![Renovate](https://img.shields.io/badge/renovate-enabled-green?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNjkgMzY5Ij48Y2lyY2xlIGN4PSIxODkuOSIgY3k9IjE5MC4yIiByPSIxODQuNSIgZmlsbD0iI2ZmZTQyZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTUgLTYpIi8+PHBhdGggZmlsbD0iIzhiYjViNSIgZD0iTTI1MSAyNTZsLTM4LTM4YTE3IDE3IDAgMDEwLTI0bDU2LTU2YzItMiAyLTYgMC03bC0yMC0yMWE1IDUgMCAwMC03IDBsLTEzIDEyLTktOCAxMy0xM2ExNyAxNyAwIDAxMjQgMGwyMSAyMWM3IDcgNyAxNyAwIDI0bC01NiA1N2E1IDUgMCAwMDAgN2wzOCAzOHoiLz48cGF0aCBmaWxsPSIjZDk1NjEyIiBkPSJNMzAwIDI4OGwtOCA4Yy00IDQtMTEgNC0xNiAwbC00Ni00NmMtNS01LTUtMTIgMC0xNmw4LThjNC00IDExLTQgMTUgMGw0NyA0N2M0IDQgNCAxMSAwIDE1eiIvPjxwYXRoIGZpbGw9IiMyNGJmYmUiIGQ9Ik04MSAxODVsMTgtMTggMTggMTgtMTggMTh6Ii8+PHBhdGggZmlsbD0iIzI1YzRjMyIgZD0iTTIyMCAxMDBsMjMgMjNjNCA0IDQgMTEgMCAxNkwxNDIgMjQwYy00IDQtMTEgNC0xNSAwbC0yNC0yNGMtNC00LTQtMTEgMC0xNWwxMDEtMTAxYzUtNSAxMi01IDE2IDB6Ii8+PHBhdGggZmlsbD0iIzFkZGVkZCIgZD0iTTk5IDE2N2wxOC0xOCAxOCAxOC0xOCAxOHoiLz48cGF0aCBmaWxsPSIjMDBhZmIzIiBkPSJNMjMwIDExMGwxMyAxM2M0IDQgNCAxMSAwIDE2TDE0MiAyNDBjLTQgNC0xMSA0LTE1IDBsLTEzLTEzYzQgNCAxMSA0IDE1IDBsMTAxLTEwMWM1LTUgNS0xMSAwLTE2eiIvPjxwYXRoIGZpbGw9IiMyNGJmYmUiIGQ9Ik0xMTYgMTQ5bDE4LTE4IDE4IDE4LTE4IDE4eiIvPjxwYXRoIGZpbGw9IiMxZGRlZGQiIGQ9Ik0xMzQgMTMxbDE4LTE4IDE4IDE4LTE4IDE4eiIvPjxwYXRoIGZpbGw9IiMxYmNmY2UiIGQ9Ik0xNTIgMTEzbDE4LTE4IDE4IDE4LTE4IDE4eiIvPjxwYXRoIGZpbGw9IiMyNGJmYmUiIGQ9Ik0xNzAgOTVsMTgtMTggMTggMTgtMTggMTh6Ii8+PHBhdGggZmlsbD0iIzFiY2ZjZSIgZD0iTTYzIDE2N2wxOC0xOCAxOCAxOC0xOCAxOHpNOTggMTMxbDE4LTE4IDE4IDE4LTE4IDE4eiIvPjxwYXRoIGZpbGw9IiMzNGVkZWIiIGQ9Ik0xMzQgOTVsMTgtMTggMTggMTgtMTggMTh6Ii8+PHBhdGggZmlsbD0iIzFiY2ZjZSIgZD0iTTE1MyA3OGwxOC0xOCAxOCAxOC0xOCAxOHoiLz48cGF0aCBmaWxsPSIjMzRlZGViIiBkPSJNODAgMTEzbDE4LTE3IDE4IDE3LTE4IDE4ek0xMzUgNjBsMTgtMTggMTggMTgtMTggMTh6Ii8+PHBhdGggZmlsbD0iIzk4ZWRlYiIgZD0iTTI3IDEzMWwxOC0xOCAxOCAxOC0xOCAxOHoiLz48cGF0aCBmaWxsPSIjYjUzZTAyIiBkPSJNMjg1IDI1OGw3IDdjNCA0IDQgMTEgMCAxNWwtOCA4Yy00IDQtMTEgNC0xNiAwbC02LTdjNCA1IDExIDUgMTUgMGw4LTdjNC01IDQtMTIgMC0xNnoiLz48cGF0aCBmaWxsPSIjODgzMTAwIiBkPSJNMjQwIDI0OGwtNyA3Yy00IDQtMTEgNC0xNiAwbC02LTdjNCA1IDExIDUgMTUgMGw3LTdjNC01IDQtMTIgMC0xNnoiLz48L3N2Zz4=)](https://github.com/timo-reymann/mealie-calorie-estimator)
[![codecov](https://codecov.io/gh/timo-reymann/mealie-calorie-estimator/graph/badge.svg?token=lTQRwxnxYl)](https://codecov.io/gh/timo-reymann/mealie-calorie-estimator)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=timo-reymann_mealie-calorie-estimator&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=timo-reymann_mealie-calorie-estimator)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=timo-reymann_mealie-calorie-estimator&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=timo-reymann_mealie-calorie-estimator)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=timo-reymann_mealie-calorie-estimator&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=timo-reymann_mealie-calorie-estimator)

<p align="center">
    <img width="300" src="./.github/images/logo.png">
    <br />
    Automatic nutrition estimation for recipes hosted on a <a href="https://mealie.io/">Mealie</a> instance
</p>

## Features

<!-- List features as bullet points -->

- Estimates nutrition from [Open Food Facts](https://world.openfoodfacts.org/) (configurable language)
- Optional LLM fallback for unmatched foods and custom units (Dose, Glas, Päckchen, Bund)
- Built-in unit conversion (g, kg, tbsp, tsp, cup, oz, lb)
- Skips re-estimation via a SHA256 ingredient hash and preserves manually entered calories
- Webhook, on-demand, and bulk backfill entry points
- **Auto-tags** recipes with calorie range and digestibility tags
- **Execution history** at `/estimator/history` — live view of what was processed, skipped or failed

## Purpose

This small service enriches [Mealie](https://mealie.io/) (self-hosted recipe manager) with nutritional data by:

1. **Listening for webhooks** triggered when a recipe is created or updated.
2. **Resolving ingredients** — each `food.name` is searched on Open Food Facts, with an optional LLM estimate per 100g when there is no match.
3. **Patching nutrition** back into Mealie's nutrition fields.

Unit conversion uses a built-in table for common units. Custom units are estimated via LLM when enabled. A SHA256 hash of the ingredients skips re-estimation when nothing changed, and manually entered calories are preserved.

### Auto-Tagging

Every estimated recipe gets up to two auto-tags applied in Mealie: one for calorie range and one for digestibility.

**Calorie tags** (per serving):

| Tag | Range (kcal) |
|---|---|
| `Calories:Light` | < 350 |
| `Calories:Moderate` | 350 – 600 |
| `Calories:Hearty` | 600 – 850 |
| `Calories:Heavy` | > 850 |

**Digestibility tags** (based on macronutrient ratios):

| Tag | Criteria |
|---|---|
| `Digest:Easy` | fat < 30% of calories AND kcal ≤ 600 |
| `Digest:Slow` | fat ≥ 40% of calories |
| `Digest:Moderate` | anything in between (e.g. fat 30–40%, or low-fat but calorie-dense) |
| `Digest:Unknown` | missing fat or calorie data |

The digestibility heuristic relies on per-serving fat and calorie data — high fat indicates slow digestion, low fat with moderate calories indicates a lighter meal.

Tags are created automatically in Mealie when first needed. On re-estimation, old auto-tags are replaced but user-applied tags are preserved. If a recipe already has nutrition data but is missing auto-tags (e.g. after upgrading), they are added without re-estimating.

## Installation

It's recommended to install it next to your Mealie instance using docker-compose.

### Prerequisites

- A Mealie service account with an API token (`Settings > Users > Create User`)

1. Configure the estimator next to mealie
   ```yaml
   services:
     mealie:
       image: ghcr.io/mealie-recipes/mealie:latest
       environment:
         # Required by Mealie 3.26.0+ for Recipe Actions targeting this
         # Docker-internal hostname.
         HTTP_ALLOW_LIST: calorie-estimator
     calorie-estimator:
       image: timoreymann/mealie-calorie-estimator:latest
       container_name: mealie-calorie-estimator
       restart: unless-stopped
       depends_on:
         - mealie
       environment:
         MEALIE_URL: http://mealie:9000
         MEALIE_API_TOKEN: ${MEALIE_API_TOKEN}
         OFF_LANGUAGE: de
         LLM_ENABLED: ${LLM_ENABLED:-false}
         LLM_API_KEY: ${LLM_API_KEY:-}
   ```
2. Or run standalone
   ```bash
   docker compose up -d
   ```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MEALIE_URL` | `http://mealie:9000` | Mealie instance URL |
| `MEALIE_API_TOKEN` | — | **Required.** Default Mealie service account token. Used unless a per-household token matches |
| `MEALIE_API_TOKEN_<HOUSEHOLD_ID>` | — | Optional per-household token override. Set e.g. `MEALIE_API_TOKEN_my_household` to use a different token for recipes in that household. Non-alphanumeric characters in the household ID are replaced with `_` for lookup (e.g. a UUID `f0d4ec80-a7ae-4315-8c43-a3e4ed0ca01f` becomes `MEALIE_API_TOKEN_f0d4ec80_a7ae_4315_8c43_a3e4ed0ca01f`) |
| `OFF_LANGUAGE` | `de` | Open Food Facts search language(s) |
| `OFF_SEARCH_BASE_URL` | `https://search.openfoodfacts.org` | Open Food Facts search API base URL |
| `OFF_BASE_URL` | `https://world.openfoodfacts.org` | Open Food Facts base URL |
| `OFF_MAX_RETRIES` | `3` | Retries for transient OFF search errors (429/5xx) |
| `OFF_RETRY_BACKOFF_MS` | `500` | Base backoff between retries (doubles each attempt) |
| `OFF_TIMEOUT_MS` | `60000` | Timeout per Open Food Facts request. A timed-out request counts as a failed attempt and is retried |
| `LLM_ENABLED` | `false` | Enable LLM fallback for custom units and unmatched foods |
| `LLM_API_KEY` | — | API key for OpenAI-compatible endpoint |
| `LLM_BASE_URL` | `https://api.mistral.ai/v1` | LLM API base URL |
| `LLM_ENDPOINT_URL` | `/chat/completions` | LLM API endpoint path (supports OpenAI-compatible providers) |
| `LLM_MODEL` | `mistral-small-latest` | Model name |
| `LLM_TEMPERATURE` | `0.1` | LLM sampling temperature |
| `LLM_MAX_TOKENS_GRAMS` | `10` | Max tokens for gram estimation responses |
| `LLM_MAX_TOKENS_NUTRIENTS` | `200` | Max tokens for nutrient estimation responses |
| `LLM_TIMEOUT_MS` | `300000` | Timeout per LLM request (5 minutes, enough for a cold start of a local model). A timed-out request counts as no estimate for that ingredient |
| `PROGRESS_ENABLED` | `true` | Show the progress of a running estimation in the recipe notes |
| `PROGRESS_INTERVAL_MS` | `10000` | Minimum time between two progress updates. Estimations that finish faster write no progress at all |
| `ESTIMATE_STRATEGY` | `all` | Estimation strategy: `all` (estimate every recipe) or `tagged` (only estimate recipes with the `ESTIMATE_TAG` tag) |
| `ESTIMATE_TAG` | `estimate` | Tag name to check when `ESTIMATE_STRATEGY=tagged` |
| `EVENT_DEBOUNCE_MS` | `2000` | Quiet period before a recipe event is processed. Bursts of rapid saves for the same recipe are coalesced into one run and all writes for a recipe are serialized, so concurrent patches cannot duplicate ingredients |
| `MEALIE_RECIPE_URL_TEMPLATE` | `${MEALIE_URL}/recipe/{slug}` | URL template for recipe links on the history page, `{slug}` is replaced with the recipe slug |
| `HISTORY_MAX_ENTRIES` | `200` | Maximum number of in-memory execution records kept for `/estimator/history` |
| `DEV_SEED_HISTORY` | `false` | Seed the history with synthetic sample data on startup (for local development only) |
| `PORT` | `8000` | Server port |
| `LOG_LEVEL` | `info` | Pino log level |

See [`.env.example`](./.env.example) for the full list, including rate-limit and cache tuning.

> **Note for GPT-5 models:** GPT-5 requires a minimum temperature of `1.0` and uses larger default token limits. When using a GPT-5 model, set `LLM_TEMPERATURE=1.0` and increase `LLM_MAX_TOKENS_GRAMS` and `LLM_MAX_TOKENS_NUTRIENTS` as needed (e.g. `LLM_MAX_TOKENS_NUTRIENTS=400`).

### Servings Resolution

Per-serving nutrition is calculated by dividing total nutrients by the first available value in this order:

1. `recipeServings` — the numeric servings field from Mealie
2. `recipeYieldQuantity` — the yield quantity field from Mealie
3. Defaults to `1` if neither is set

## Usage

1. Navigate to your Mealie instance
2. Go to `Settings > User Settings > Notifiers`
3. Click `Create`
4. Fill out the form
    - **Apprise URL**: `json://calorie-estimator:8000/webhook`
    - **Events**: `Recipe Created`, `Recipe Updated`
5. Create or update a recipe — nutrition is estimated and patched back automatically

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/webhook` | Apprise webhook for recipe created/updated events |
| `POST` | `/estimate` | On-demand estimation for a single recipe |
| `POST` | `/backfill` | Estimate nutrition for all existing recipes |
| `GET` | `/estimator/history` | HTML page listing recent executions |
| `GET` | `/estimator/history.json` | Recent executions as JSON |

### Estimator History

Open `http://localhost:8000/estimator/history` to troubleshoot what the service did to each recipe. The table shows the recipe (linked to your Mealie instance), the trigger (`webhook`, `estimate`, `backfill`), a status badge and what changed:

| Badge | Meaning |
|---|---|
| `processed` | Nutrition and auto-tags were estimated and patched into Mealie |
| `tags added` | Ingredients unchanged, only missing auto-tags were applied |
| `manual` | Manually entered calories were preserved (hash acknowledged) |
| `skipped` | Already up to date — nothing to do |
| `filtered` | Recipe does not match `ESTIMATE_STRATEGY` / `ESTIMATE_TAG` |
| `error` | Processing failed (error message shown in the Changes column) |
| `running` | Currently queued or being processed, duration counts up live |

The page polls `/estimator/history.json` every 2 seconds. The initial request returns all records; subsequent requests use a `since` timestamp and only return records created or updated after that point. This keeps in-flight jobs current without requiring a long-lived SSE connection through Keycloak or Traefik. The history lives in memory only (last `HISTORY_MAX_ENTRIES` entries, default 200) and is lost on restart.

The page adopts the colors configured on your Mealie instance by loading them from `GET /api/app/about/theme` (the `THEME_*` environment variables), and follows your device's light/dark preference. If the endpoint is unreachable, it falls back to Mealie's default orange palette.

To preview the page with sample data:

```sh
DEV_SEED_HISTORY=true MEALIE_API_TOKEN=dev-token npm run dev
```

### Publishing the History UI

The history page is served at `/estimator/history`. The service does not
provide authentication for this UI. Keep it on a trusted internal network or
protect `/estimator/` with the same authentication proxy used for your Mealie
instance before exposing it publicly.

The `/estimator` prefix is part of the application routes. Reverse proxies
must preserve that prefix and must not strip it. Configure
`MEALIE_RECIPE_URL_TEMPLATE` separately when the browser needs public recipe
links, for example:

```dotenv
MEALIE_RECIPE_URL_TEMPLATE=https://recipes.example.com/g/default/r/{slug}
```

#### Nginx

```nginx
location /estimator/ {
    proxy_pass http://calorie-estimator:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Add auth_request, auth_basic, or your trusted auth proxy here.
}
```

The `proxy_pass` URL intentionally has no trailing slash, preserving
`/estimator/...` when forwarding to the service.

#### Traefik

```yaml
services:
  calorie-estimator:
    labels:
      - traefik.enable=true
      - traefik.http.routers.calorie-estimator.rule=Host(`recipes.example.com`) && PathPrefix(`/estimator`)
      - traefik.http.routers.calorie-estimator.entrypoints=websecure
      - traefik.http.routers.calorie-estimator.tls=true
      - traefik.http.services.calorie-estimator.loadbalancer.server.port=8000
      # Attach your forward-auth/basic-auth middleware here when required.
```

Do not attach a `StripPrefix` middleware to this router. For Mealie 3.26.0+
installations, the Mealie service must allow the Docker-internal hostname used
by the Recipe Action URL via `HTTP_ALLOW_LIST`; use the exact service name if
it differs from `calorie-estimator`. See Mealie's [HTTP allow-list security
configuration](https://mealie.io/documentation/getting-started/installation/backend-config/#security).

## Motivation

<!-- Add bit of context why the project has been created -->

Mealie stores nutrition only when entered by hand. Maintaining that for every recipe is tedious, so this service fills the gap automatically from Open Food Facts (and an optional LLM) while leaving manual entries untouched.

## Contributing

Contributions are welcome, whether it's:

- Reporting a bug
- Discussing the current state of the configuration
- Submitting a fix
- Proposing new features

## Development

### Requirements

<!-- Delete the ones not required -->

- [Node.js](https://nodejs.org/) 22+
- [Docker](https://docs.docker.com/get-docker/)

### Test

<!-- Add testing instructions -->

```sh
docker compose --profile test up -d
npm test
```

The test profile starts Mealie (SQLite), a mock Open Food Facts server, and the estimator.

### Build

<!-- Add building instructions -->

```sh
npm run build
```


## Fork: referenced recipe nutrition

This fork adds recursive nutrition estimation for Mealie ingredients that reference another recipe.

### Behavior

- Referenced recipes are estimated recursively from their own ingredients. Nutrition stored on the referenced recipe (including manual values) is ignored.
- The referenced recipe's own servings/yield are used to calculate nutrition per portion.
- The quantity on the parent recipe is the number of referenced-recipe portions that are included. The unit is ignored.
- Nested referenced recipes are supported.
- Circular references are detected and ignored safely.
- The ingredient hash includes the ingredients and servings of referenced recipes (recursively), so processing the parent after a change in a referenced recipe re-estimates it. The parent is not re-estimated automatically when only the referenced recipe is saved.

### When a recipe is estimated again

A recipe is only estimated again when its ingredient hash changes. The hash covers quantities, units, foods, linked recipes, the servings, the ingredient notes, the standard values of the units from Mealie and a calculation version. So saving a recipe after changing any of these is enough, and after an update of the estimator that changes the calculation (the version is raised) every recipe is estimated again the next time it is saved. Saving without a change does nothing; use `POST /estimate` to force a new estimation.

### Nutrition calculation details

- The recipe notes get a "Nutrition calculation details" entry as a Markdown table with quantity, weight in grams and calories per ingredient. Weights that were not given in grams are marked with their source (`Zutat` = weight from the food description, `Open Food Facts` = serving size from Open Food Facts, `LLM` = estimated by the LLM). It is replaced on every estimation, other notes stay untouched.
- Open Food Facts results are ranked: exact name matches and products with calories are preferred, processed forms (e.g. powder, sauce) are penalized.
- For piece units (e.g. "Stück") the search prefers fresh products by adding "frisch" to the query.

### Edible share of an ingredient

Some ingredients are only partly eaten, e.g. bones in a stock or a marinade that is poured away. Put a percentage in square brackets into the ingredient's note field in Mealie to count only that share:

- `[30%]` counts 30 % of the ingredient (`am besten Spitzbein [30%]` works too, other text in the note is ignored)
- `[0%]` or `nicht mitrechnen` leaves the ingredient out completely
- Ingredients without a marker are counted in full

The marker works for normal ingredients and for linked recipes. The share is listed in the "Nutrition calculation details" note and is part of the ingredient hash, so changing it triggers a new estimation.

### Weights in the Mealie food description

Piece units like "Stück" or "Bund" have no fixed weight. You can store it with the food in Mealie (Settings → Data Management → Foods → description) so it is maintained in one place:

```text
[Stück=55g] [Bund=30g] [Esslöffel=13g]
```

- The entry whose name matches the unit used in the ingredient is taken (case and umlauts do not matter, `Stk` and `Stueck` count as `Stück`). Other text in the description is ignored.
- Allowed are `g`, `kg` and decimals with a comma or dot, e.g. `[Stück=1,5kg]`.
- Order of the weight sources: food description, unit standard values from Mealie, Open Food Facts serving size, LLM. The "Nutrition calculation details" table marks the first case as `(Zutat)`.
- Changing the description changes the ingredient hash, so the recipe is estimated again the next time it is saved.

### Ingredient notes and weight estimates

When a weight has to be estimated by the LLM (for example for "Stück"), the ingredient's note field is passed along, so "klein", "gross" or "ohne Knochen" are taken into account. Markers like `[30%]` are removed first. Estimates are cached per ingredient and note.

### Progress of a running estimation

Estimating a recipe can take several minutes because Open Food Facts allows only a limited number of searches per minute. While it runs, the recipe notes show a "Nutrition calculation progress" entry such as `█████░░░░░ 50 % (7 von 14 Zutaten, 2 Min 10 s)`. Reload the recipe page in Mealie to see the current state. The entry is replaced by the "Nutrition calculation details" table when the estimation is done, or removed if it fails. Linked recipes count with their own ingredients.

If an estimation fails, the same ingredients are not retried automatically for one minute, so the progress updates cannot trigger an endless loop of new runs.

### Fork documentation

- [UPSTREAM.md](./UPSTREAM.md) — upstream relationship and synchronization workflow
- [CHANGELOG.md](./CHANGELOG.md) — fork changes and validation history
- [DEVELOPMENT.md](./DEVELOPMENT.md) — development and testing
- [DEPLOYMENT.md](./DEPLOYMENT.md) — production deployment and verification

### Fork Docker image

The feature image is published to GHCR:

```text
ghcr.io/m00nhunter/mealie-calorie-estimator:referenced-recipe-nutrition
```

Every build is also published with a fixed tag `sha-<commit>`. Releases get a version number: pushing the git tag `v1.14.0` publishes `ghcr.io/m00nhunter/mealie-calorie-estimator:1.14.0`. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the release and rollback procedure.

GitHub Actions runs the test suite and typecheck before publishing the Docker image.
