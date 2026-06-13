mealie-calorie-estimator
===

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

## Purpose

This small service enriches [Mealie](https://mealie.io/) (self-hosted recipe manager) with nutritional data by:

1. **Listening for webhooks** triggered when a recipe is created or updated.
2. **Resolving ingredients** — each `food.name` is searched on Open Food Facts, with an optional LLM estimate per 100g when there is no match.
3. **Patching nutrition** back into Mealie's nutrition fields.

Unit conversion uses a built-in table for common units. Custom units are estimated via LLM when enabled. A SHA256 hash of the ingredients skips re-estimation when nothing changed, and manually entered calories are preserved.

## Installation

It's recommended to install it next to your Mealie instance using docker-compose.

### Prerequisites

- A Mealie service account with an API token (`Settings > Users > Create User`)

1. Configure the estimator next to mealie
   ```yaml
   services:
     mealie:
       # mealie configuration
     calorie-estimator:
       build: .
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
   docker compose up --build -d
   ```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MEALIE_URL` | `http://mealie:9000` | Mealie instance URL |
| `MEALIE_API_TOKEN` | — | **Required.** Mealie service account token |
| `OFF_LANGUAGE` | `de` | Open Food Facts language |
| `OFF_BASE_URL` | `https://world.openfoodfacts.org` | Open Food Facts base URL |
| `LLM_ENABLED` | `false` | Enable LLM fallback for custom units and unmatched foods |
| `LLM_API_KEY` | — | API key for OpenAI-compatible endpoint |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | LLM API base URL |
| `LLM_MODEL` | `gpt-4o-mini` | Model name |
| `PORT` | `8000` | Server port |
| `LOG_LEVEL` | `info` | Pino log level |

See [`.env.example`](./.env.example) for the full list, including rate-limit and cache tuning.

## Usage

1. Navigate to your Mealie instance
2. Go to `Settings > Group > Event Notifiers`
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
docker compose -f docker-compose.test.yml up -d
npm test
```

The test compose starts Mealie (SQLite), a mock Open Food Facts server, and the estimator.

### Build

<!-- Add building instructions -->

```sh
npm run build
```
