# Instructions for AI coding agents

This is a [mealie-calorie-estimator](https://github.com/timo-reymann/mealie-calorie-estimator) project — a TypeScript/Node.js service using Fastify that estimates nutrition for Mealie recipes.

## Commands

- `npm run dev` — Start dev server with hot reload via `tsx watch`
- `npm run build` — Compile TypeScript
- `npm run start` — Run compiled JS
- `npm run typecheck` — Type-check with `tsc --noEmit`
- `npm test` — Run vitest tests (run before/after changes)
- `npm run test:watch` — Run vitest in watch mode

## Code style

- TypeScript strict mode (check tsconfig for exact settings)
- Use ES module imports (`import`/`export`)
- Prefer `const` over `let` where possible
- No unnecessary comments in code
- Follow existing patterns in the codebase

## Workflow

- Always run `npm run typecheck` and `npm test` after making changes
- Keep commits focused and use conventional commit messages
- Run typecheck before committing to catch type errors
