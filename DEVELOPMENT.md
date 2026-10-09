# Development

## Requirements

- Node.js/npm
- Docker for image builds
- Access to a Mealie instance for integration testing

## Install

```bash
npm ci
```

## Checks

Run the complete test suite:

```bash
npm test
```

Type-check:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

## Referenced-recipe development

The main implementation is in `src/services/estimator.ts`.

Referenced recipe data is exposed through `src/types.ts`.

The important behavior is:

```text
parent quantity × referenced-recipe nutrition per referenced-recipe serving
```

The referenced recipe's own serving/yield value is used to derive its per-serving nutrition. The parent recipe's serving count is applied only after all ingredient and referenced-recipe contributions have been accumulated.

Nested references are evaluated recursively. A recursion stack prevents circular references from causing infinite recursion.

## Docker image

Build a local test image:

```bash
docker build -t mealie-calorie-estimator:local .
```

## Production test

The production endpoint accepts:

```json
{"content":{"slug":"recipe-slug"}}
```

Example:

```bash
curl -i -X POST http://<estimator-container-ip>:8000/estimate \
  -H 'Content-Type: application/json' \
  -d '{"content":{"slug":"tonkotsu-ramen-mit-chashu"}}'
```

The endpoint returns `202 Accepted`; the actual result is visible in the estimator logs.

## Important

Never commit Mealie API tokens, private SSH keys, production environment files, passwords, or local Docker environment dumps.
