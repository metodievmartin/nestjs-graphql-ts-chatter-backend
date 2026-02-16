# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev database (MongoDB 8 via Docker)
npm run dev:db:up

# Start app in watch mode
npm run start:dev

# Build
npm run build

# Lint (with auto-fix)
npm run lint

# Run all unit tests
npm run test

# Run a single test file
npx jest --testPathPattern=users.service.spec

# Run e2e tests
npm run test:e2e

# Format code
npm run format
```

## Environment Variables

Required env vars (validated on startup via Joi in `src/common/config/app.config.ts`):
- `MONGODB_URI` - MongoDB connection string
- `DB_NAME` - database name
- `PORT` - server port (defaults to 8080)
- `JWT_SECRET`, `JWT_EXPIRATION` - auth token config
- `AWS_ACCESS_KEY`, `AWS_SECRET_ACCESS_KEY` - S3 credentials (dev only; auto-provided in prod)

## Architecture

NestJS backend with **GraphQL (code-first)** via Apollo Server and **MongoDB** via Mongoose. REST endpoints exist only for auth (login/logout) and file uploads.

### Entity Pattern (Document vs Entity Split)

Each domain has two class layers:
- **Document** (`*.document.ts`) — Mongoose schema class with `@Prop()` decorators, includes DB-only fields like `password` or `userId` as ObjectId. Schema is created via `SchemaFactory.createForClass()`.
- **Entity** (`*.entity.ts`) — GraphQL type class with `@Field()` decorators, represents the public API shape. Services transform documents to entities (e.g., `UsersService.toEntity()` strips password, resolves S3 image URL).

Both extend `AbstractEntity` which provides the `_id: Types.ObjectId` field with both `@Prop()` and `@Field(() => ID)` decorators.

### Repository Pattern

`AbstractRepository<T>` wraps Mongoose `Model<T>` with standard CRUD operations (`create`, `findOne`, `find`, `findOneAndUpdate`, `findOneAndDelete`). Each domain has a concrete repository (e.g., `ChatsRepository`). Complex queries use `model.aggregate()` directly on the repository's public `model` property.

### Module Structure

- **UsersModule** — User CRUD (GraphQL resolver + REST controller for image upload via S3)
- **AuthModule** — JWT-based auth with httpOnly cookies. Passport strategies: `LocalStrategy` (login), `JwtStrategy` (protected routes). Guards: `LocalAuthGuard` (REST), `JwtAuthGuard` (REST), `GqlAuthGuard` (GraphQL)
- **ChatsModule** — Chat rooms with membership-based access control (`isPrivate` + `userIds`). Imports `MessagesModule`
- **ChatsModule > MessagesModule** — Messages in a separate MongoDB collection. Real-time via `graphql-subscriptions` PubSub (`messageCreated` subscription). Circular dependency with ChatsModule resolved via `forwardRef()`
- **DatabaseModule** — Mongoose connection setup + auto-migration on startup via `migrate-mongo`. Exposes `forFeature()` static method wrapping `MongooseModule.forFeature()`
- **PubSubModule** — Global module providing `PubSub` instance via `PUB_SUB` injection token
- **S3Module** — AWS S3 file uploads for user profile images

### Pagination

Cursor-based pagination following the Relay Connection spec. Cursors encode `{d: date, i: objectId}` as base64 (see `src/common/utils/cursor.util.ts`). Chats use forward pagination (`first`/`after`), messages use backward pagination (`last`/`before`).

### Database Migrations

Migration files live in `src/migrations/` and use `migrate-mongo`. They run automatically on app startup via `DbMigrationService` (OnModuleInit lifecycle hook). Migration files must compile to JS since they run from `dist/`.

### API Paths

All routes are prefixed with `/v1/api`. GraphQL endpoint: `/v1/api/graphql`. WebSocket subscriptions use `graphql-ws` on the same path.

### Auth Flow

Login is REST (`POST /v1/api/auth/login`) — sets an httpOnly `Authentication` cookie containing the JWT. GraphQL operations use `GqlAuthGuard` which reads the JWT from the cookie. WebSocket connections authenticate on connect by parsing the cookie from the upgrade request.

## Gotchas

- All repository queries use `.lean()`, so results are plain JavaScript objects — not Mongoose documents. Do not call Mongoose instance methods (e.g. `.save()`, `.populate()`) on them.
- Services must always call `toEntity()` before returning data. Never return raw documents from service methods — entities strip sensitive fields (like `password`) and resolve derived values (like S3 image URLs).
- ChatsModule and MessagesModule have a circular dependency. When one imports the other, it must use `forwardRef(() => TargetModule)`. Forgetting this will cause a runtime crash.
- Migration files in `src/migrations/` are executed from `dist/migrations/` after compilation. They must be valid JavaScript post-compile — avoid TypeScript-only constructs that don't survive `tsc` (e.g. `import type` used as a value).
- The in-memory `PubSub` instance does not scale beyond a single process. This is intentional for this project.

## Key Base Classes & Utilities

- `src/common/database/abstract.entity.ts` — Base class for all documents and entities. Provides the `_id` field with both Mongoose and GraphQL decorators.
- `src/common/database/abstract.repository.ts` — Generic repository with CRUD methods. Extend this for each new domain. Exposes the Mongoose `model` for custom aggregations.
- `src/common/utils/cursor.util.ts` — `encodeCursor()` / `decodeCursor()` for Relay-style cursor pagination.
- `src/common/config/app.config.ts` — Joi validation schema for all environment variables.
- `src/common/constants.ts` — Shared constants (`API_PREFIX`, `GRAPHQL_PATH`, injection tokens).