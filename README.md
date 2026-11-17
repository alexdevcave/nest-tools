# Nx NestJS API Template

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

A production-ready NestJS REST API starter powered by Nx - built for teams who want a solid monorepo foundation with shared libraries and module boundaries.

The app builds with webpack through `@nx/webpack` (`apps/nest-tools-app/webpack.config.js`, `tsc` compiler), orchestrated by Nx.

## Finish your Nx platform setup

🚀 [Finish setting up your workspace](https://cloud.nx.app/connect/1ci4IdQVCV) to get faster builds with remote caching, distributed task execution, and self-healing CI. [Learn more about Nx Cloud](https://nx.dev/ci/intro/why-nx-cloud).

## Quick Start

Clone this template into a new workspace:

```sh
npx create-nx-workspace@latest my-workspace --template nrwl/nestjs-template
cd my-workspace
```

### Dev server (hot reload)

```sh
pnpm nx run nest-tools-app:serve
```

The API starts at `http://localhost:3000/api`.

Endpoints available out of the box:

- `GET /api` - hello message

### Build for production

```sh
pnpm nx run nest-tools-app:build
```

This runs webpack via Nx and emits `dist/apps/nest-tools-app/main.js`. Run it directly with `node dist/apps/nest-tools-app/main.js`.

### Run all builds

```sh
pnpm nx run-many -t build
```

### Run tests

```sh
pnpm nx run-many -t test
```

### Lint

```sh
pnpm nx run-many -t lint
```

### Visualize the project graph

```sh
pnpm nx graph
```

---

## What's Inside

```
nestjs-template/
|- apps/
|  |- nest-tools-app/      # NestJS application (webpack build via @nx/webpack)
|  |  |- webpack.config.js
|  |  |- src/app/          # Root module, controller and service
|  |- nest-tools-app-e2e/  # Jest + axios e2e tests against the running app
|- libs/
|  |- nest-tools/          # NestJS library, imported as @brickstodev/nest-tools
|- packages/
   |- types/               # Shared DTOs and interfaces (scope:shared tag)
```

### Module Boundary Tags

| Project        | Tags                   | May depend on           |
| -------------- | ---------------------- | ----------------------- |
| nest-tools-app | scope:api, type:app    | scope:api, scope:shared |
| nest-tools     | scope:shared, type:lib | scope:shared            |
| types          | scope:shared, type:lib | scope:shared            |

`@nx/enforce-module-boundaries` is configured in `eslint.config.mjs` so violations are caught at lint time, not at runtime.

---

## Featured Nx Capabilities

### Smart Computation Caching

Every build, test, and lint result is cached locally (and remotely via Nx Cloud). Re-running unchanged tasks is instant.

```sh
pnpm nx run nest-tools-app:build   # second run: < 100 ms from cache
```

### Affected Commands

Only run what actually changed since your last commit or PR base:

```sh
pnpm nx affected -t build,test,lint
```

### Code Generation

Scaffold new resources without boilerplate:

```sh
# New NestJS app
pnpm nx g @nx/nest:app my-service

# New shared library
pnpm nx g @nx/js:lib packages/my-lib --bundler=tsc

# NestJS resource (CRUD module, controller, service, DTOs)
pnpm nx g @nx/nest:resource --project=nest-tools-app --name=users
```

### Module Boundaries

Enforce architectural rules at lint time. A `scope:api` library can never accidentally import from another app - only from `scope:shared` libs. Configure the rules in `eslint.config.mjs`.

---

## Nx Cloud

[Nx Cloud](https://nx.dev/nx-cloud) makes distributed CI simple:

- **Remote cache** - Shares the computation cache across all machines - one build warms the cache for everyone else.
- **Distributed task execution (DTE)** - Splits tasks across N CI agents automatically - no manual job matrix required.
- **Flaky task detection** - Tracks pass/fail history per task, reruns flaky tasks so one bad agent doesn't fail the PR.
- **PR insights** - Shows exactly which tasks ran, which were cache hits, and what slowed down your pipeline.

Docs -> https://nx.dev/nx-cloud

---

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/docs/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## 🔗 Learn More

- [Nx Documentation](https://nx.dev/docs)
- [Crafting Your Workspace Tutorial](https://nx.dev/docs/getting-started/tutorials/crafting-your-workspace)
- [Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries)
- [NestJS Documentation](https://docs.nestjs.com)
- [Docker Integration](https://nx.dev/docs/guides/nx-release/release-docker-images)
- [Nx Cloud](https://nx.dev/nx-cloud)

## 💬 Community

Join the Nx community:

- [Discord](https://go.nx.dev/community)
- [X (Twitter)](https://twitter.com/nxdevtools)
- [LinkedIn](https://www.linkedin.com/company/nrwl)
- [YouTube](https://www.youtube.com/@nxdevtools)
- [Blog](https://nx.dev/blog)
