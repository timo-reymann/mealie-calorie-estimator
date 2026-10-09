# Production deployment

## Architecture

The production deployment uses GitHub as the source of truth for the Portainer stack:

```text
m00nhunter/mealie-calorie-estimator
        |
        | GitHub Actions
        v
GHCR
        |
        | Docker image
        v
Portainer GitOps
        |
        v
HOMEDOMENAS06
        |
        +-- mealie
        +-- mealie-calorie-estimator
        +-- mealie-postgres
```

## Docker image

Current production image:

```text
ghcr.io/m00nhunter/mealie-calorie-estimator:referenced-recipe-nutrition
```

It is built by `.github/workflows/docker-ghcr.yml` whenever `feature/referenced-recipe-nutrition` is pushed or a version tag such as `v1.14.0` is pushed. The workflow can also be started manually.

## Portainer

The production stack is stored in:

```text
m00nhunter/Portainer-stacks
10.0.10.20/mealie/compose.yml
```

The estimator service points to the feature image above.

Deployment procedure:

1. Push and validate estimator changes.
2. Confirm GitHub Actions succeeds.
3. Update the Portainer stack from Git.
4. Pull and redeploy.
5. Verify the running image.
6. Trigger an estimation for a recipe containing referenced recipes.
7. Verify logs and the resulting Mealie nutrition.

## Verification

```bash
docker inspect mealie-calorie-estimator --format '{{.Config.Image}}'
docker ps --filter name=mealie-calorie-estimator
docker logs --tail 50 mealie-calorie-estimator
```

Expected image:

```text
ghcr.io/m00nhunter/mealie-calorie-estimator:referenced-recipe-nutrition
```

## Production validation

The referenced-recipe implementation was validated with `tonkotsu-ramen-mit-chashu`.

The production logs demonstrated recursive processing of:

- chashu-gerollter-schweinebauch
- ramen-eier
- miso-tare
- tonkotsu-japanische-schweinebruhe-fur-ramen-nudelsuppen
- tonkotsu-ramen-mit-chashu

The parent recipe was successfully updated in Mealie.

## Image tags and releases

Every build is published with these tags:

| Tag | Meaning |
|---|---|
| `referenced-recipe-nutrition` | Moving tag, always the latest push to the feature branch. Built on branch pushes only |
| `sha-<commit>` | Fixed tag of one commit, built on every push |
| `1.14.0` | Fixed release version, built when a git tag `v1.14.0` is pushed |

Production can follow the moving tag (always the newest) or be pinned to a fixed tag in the Portainer stack.

### Creating a release

```bash
git tag v1.14.0
git push origin v1.14.0
```

GitHub Actions runs the tests and publishes `ghcr.io/m00nhunter/mealie-calorie-estimator:1.14.0`. Version numbers follow `MAJOR.MINOR.PATCH`: a new feature raises MINOR, a fix raises PATCH.

### Rolling back

Set the image in the Portainer stack to the previous fixed tag (a version such as `1.13.1` or a `sha-<commit>` tag) and use Pull and redeploy.
