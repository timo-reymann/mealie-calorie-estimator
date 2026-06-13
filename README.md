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
| `MEALIE_API_TOKEN` | — | **Required.** Mealie service account token |
| `OFF_LANGUAGE` | `de` | Open Food Facts language |
| `OFF_BASE_URL` | `https://world.openfoodfacts.org` | Open Food Facts base URL |
| `LLM_ENABLED` | `false` | Enable LLM fallback for custom units and unmatched foods |
| `LLM_API_KEY` | — | API key for OpenAI-compatible endpoint |
| `LLM_BASE_URL` | `https://api.mistral.ai/v1` | LLM API base URL |
| `LLM_MODEL` | `mistral-small-latest` | Model name |
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
