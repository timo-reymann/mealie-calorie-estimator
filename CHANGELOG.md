## [1.6.0](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.5.4...v1.6.0) (2026-06-24)

### Features

* add getMealieToken helper and relax startup guard ([f9438f6](https://github.com/timo-reymann/mealie-calorie-estimator/commit/f9438f6c0711b1c989d66ee4011c5e951908cce3))
* add householdId to MealieRecipe type ([bbf9a1c](https://github.com/timo-reymann/mealie-calorie-estimator/commit/bbf9a1c8a2095ae780f1ef597bd944124cf1eb11))
* thread per-household token through route handlers ([9f59ec4](https://github.com/timo-reymann/mealie-calorie-estimator/commit/9f59ec472b74d33037bc72ef16ffbe811013f287))
* thread per-household tokens through mealie-client ([d4cbfd9](https://github.com/timo-reymann/mealie-calorie-estimator/commit/d4cbfd9817e5952cdd4264bb28ae283f6680b0c0))
* thread per-household tokens through tagging service ([0f9f422](https://github.com/timo-reymann/mealie-calorie-estimator/commit/0f9f42272c98c6ab8da945b57ca93d5d49c0c319))

### Bug Fixes

* accept null householdId in function params ([d7dd7b0](https://github.com/timo-reymann/mealie-calorie-estimator/commit/d7dd7b067f6ab0ecaa93d9fc1ff5fa8d7bec4cfc))

## [1.5.4](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.5.3...v1.5.4) (2026-06-21)

### Bug Fixes

* bump package.json version on release for accurate user agent ([#9](https://github.com/timo-reymann/mealie-calorie-estimator/issues/9)) ([7f1def0](https://github.com/timo-reymann/mealie-calorie-estimator/commit/7f1def098c598e05f8fbecd02aa5f6840c6f1dc2)), closes [#7](https://github.com/timo-reymann/mealie-calorie-estimator/issues/7)

## [1.5.3](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.5.2...v1.5.3) (2026-06-21)

### Bug Fixes

* use actual package version in user agent ([d4dfa23](https://github.com/timo-reymann/mealie-calorie-estimator/commit/d4dfa2391332d56afd1d0bda5bcf33e28cad1512))

## [1.5.2](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.5.1...v1.5.2) (2026-06-21)

### Bug Fixes

* use OFF Search-a-licious API with retry and backoff ([#6](https://github.com/timo-reymann/mealie-calorie-estimator/issues/6)) ([#8](https://github.com/timo-reymann/mealie-calorie-estimator/issues/8)) ([722e03b](https://github.com/timo-reymann/mealie-calorie-estimator/commit/722e03b23732ee239a699d0a90a40b5ad433b9ed))

## [1.5.1](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.5.0...v1.5.1) (2026-06-21)

### Bug Fixes

* use actual package version in user agent ([#7](https://github.com/timo-reymann/mealie-calorie-estimator/issues/7)) ([ae9ad44](https://github.com/timo-reymann/mealie-calorie-estimator/commit/ae9ad443483a7cdcdc54fe50370d743f447a319e))

## [1.5.0](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.4.0...v1.5.0) (2026-06-14)

### Features

* add Digest:Moderate tag for middle-ground recipes ([ad39eee](https://github.com/timo-reymann/mealie-calorie-estimator/commit/ad39eee1ab3a3e956e6b0afc4518b8cff24dff20))

## [1.4.0](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.3.1...v1.4.0) (2026-06-13)

### Features

* auto-tagging with calorie ranges and digestibility classification ([#5](https://github.com/timo-reymann/mealie-calorie-estimator/issues/5)) ([92adf4b](https://github.com/timo-reymann/mealie-calorie-estimator/commit/92adf4b71c6fcc8ee856ec500bdac9ff48d075b9))

## [1.3.1](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.3.0...v1.3.1) (2026-06-13)

### Bug Fixes

* replace node:22-alpine with wolfi-base + nodejs-22 ([#4](https://github.com/timo-reymann/mealie-calorie-estimator/issues/4)) ([a058322](https://github.com/timo-reymann/mealie-calorie-estimator/commit/a0583222550829d9d43eae42e685197c3b6bb2c6))

## [1.3.0](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.2.1...v1.3.0) (2026-06-13)

### Features

* replace ORT with license-checker, add NOTICE to container image ([#3](https://github.com/timo-reymann/mealie-calorie-estimator/issues/3)) ([fd62322](https://github.com/timo-reymann/mealie-calorie-estimator/commit/fd623224288bc3bba33ff68bc2ae586ceda853d8))

## [1.2.1](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.2.0...v1.2.1) (2026-06-13)

### Bug Fixes

* add @vitest/coverage-v8 as devDependency ([7199943](https://github.com/timo-reymann/mealie-calorie-estimator/commit/71999436742891c47d5361d3b204546d1dc4f8e0))

## [1.2.0](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.1.0...v1.2.0) (2026-06-13)

### Features

* use docker orb for readme update, default to mistral ([e69af1d](https://github.com/timo-reymann/mealie-calorie-estimator/commit/e69af1d925b6162d275ea5a349785be7dd1b8343))

## [1.1.0](https://github.com/timo-reymann/mealie-calorie-estimator/compare/v1.0.1...v1.1.0) (2026-06-13)

### Features

* update Docker Hub description on release ([980b86b](https://github.com/timo-reymann/mealie-calorie-estimator/commit/980b86b951b828982e9a039ea0c0c29007f3e023))

## 1.0.0 (2026-06-13)

### Bug Fixes

* add rolldown linux-x64 binding as optional dep for CI ([0db057b](https://github.com/timo-reymann/mealie-calorie-estimator/commit/0db057b22b09241edc4aabf2d5aaf792b124ba89))
* work around npm optional dep bug in CI and Docker ([a086f44](https://github.com/timo-reymann/mealie-calorie-estimator/commit/a086f44a4ddcb6252eb43cc191a6a68acef03c9d))
