# Upstream and fork maintenance

This repository is a fork of [timo-reymann/mealie-calorie-estimator](https://github.com/timo-reymann/mealie-calorie-estimator).

## Repositories

- Upstream: `timo-reymann/mealie-calorie-estimator`
- Fork: `m00nhunter/mealie-calorie-estimator`
- Feature branch: `feature/referenced-recipe-nutrition`

## Fork-specific feature

This fork adds recursive nutrition estimation for Mealie ingredients that reference another recipe.

A referenced recipe is treated as a component of the parent recipe:

1. The referenced recipe is estimated recursively.
2. Its total nutrition is divided by its own servings/yield.
3. The parent ingredient quantity determines how many portions of the referenced recipe are included.
4. The resulting nutrition is added to the parent recipe.
5. Nested referenced recipes are supported.
6. Circular references are prevented by a recursion stack.

The ingredient hash also includes the referenced recipe slug, so changing a recipe reference invalidates the cached estimation.

## Upstream synchronization

The local checkout should have two remotes:

```bash
git remote add upstream https://github.com/timo-reymann/mealie-calorie-estimator.git
git remote -v
```

Update upstream information with:

```bash
git fetch upstream
```

Before merging upstream changes into the feature branch:

```bash
git fetch upstream
git checkout feature/referenced-recipe-nutrition
git merge upstream/main
npm ci
npm test
```

Resolve conflicts carefully, especially in:

- `src/services/estimator.ts`
- `src/types.ts`
- `tests/estimate-recipe.test.ts`

Do not overwrite the referenced-recipe implementation merely to make an upstream merge clean.

## Recommended maintenance model

Keep upstream synchronization and fork-specific work separate:

- `main`: stable fork baseline.
- `feature/referenced-recipe-nutrition`: fork feature branch and production image source.
- Upstream changes are merged into the feature branch after tests pass.
- Fork-specific commits remain identifiable and documented.

When the feature is eventually accepted upstream, the fork-specific code and deployment workflow can be retired in favor of the upstream implementation.
