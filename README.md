# Chatter Backend

A real-time chat API where users can register, create and join public or private
rooms, exchange messages instantly, and upload profile images - built as the
backend half of a full-stack TypeScript chat application.

The backend focuses on **GraphQL (code-first)**, **WebSocket subscriptions** (with GraphQL subscriptions),
**cursor-based** pagination, and **NestJS** architecture patterns - with Passport
JWT auth, AWS S3 for file storage, and MongoDB.

> **Frontend client:** https://github.com/metodievmartin/react-ts-graphql-chatter-ui

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) 11 (Typescript)
- **API**: GraphQL (code-first) via [Apollo Server](https://www.apollographql.com/docs/apollo-server/) 5, with REST
  endpoints for auth and file uploads
- **Database**: [MongoDB](https://www.mongodb.com/) 8 via [Mongoose](https://mongoosejs.com/) 9
- **Real-time**: GraphQL subscriptions via [`graphql-ws`](https://github.com/enisdenjo/graphql-ws) and [
  `graphql-subscriptions`](https://github.com/apollographql/graphql-subscriptions)
- **Authentication**: JWT with httpOnly cookies via [Passport](http://www.passportjs.org/)
- **File Storage**: AWS S3 (user profile images)
- **Validation**: `class-validator` + `class-transformer`, Joi (env vars)
- **Logging**: Pino (pretty-printed in dev, structured JSON in prod)
- **Testing**: Jest + Supertest

## Getting Started

### Prerequisites

- Node.js +22
- Docker & Docker Compose (for the dev database)
- An AWS account with S3 access (for profile image uploads)

### Environment Variables

Create a `.env` file in the project root. All variables are validated on startup via Joi — the app will fail fast if any
required variable is missing.

| Variable                | Description                                              | Example                                                          |
|-------------------------|----------------------------------------------------------|------------------------------------------------------------------|
| `MONGODB_URI`           | MongoDB connection string                                | `mongodb://admin:admin@localhost:27017/chatter?authSource=admin` |
| `DB_NAME`               | Database name                                            | `chatter`                                                        |
| `JWT_SECRET`            | Secret key for signing JWTs                              | `my-super-strong-secret`                                         |
| `JWT_EXPIRATION`        | Token expiration in seconds                              | `36000` (10 hours)                                               |
| `AWS_ACCESS_KEY`        | AWS access key (dev only; auto-provided in prod via IAM) | —                                                                |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key (dev only)                                | —                                                                |
| `PORT`                  | Server port (optional, defaults to `8080`)               | `8080`                                                           |

### Installation & Running

```bash
# Install dependencies
npm install

# Start the dev MongoDB instance (Docker)
npm run dev:db:up

# Start the app in watch mode
npm run start:dev
```

The server starts at `http://localhost:8080`. Database migrations run automatically on startup.

### Available Scripts

| Script                | Description                                  |
|-----------------------|----------------------------------------------|
| `npm run start:dev`   | Start in watch mode (auto-reload on changes) |
| `npm run build`       | Compile TypeScript to `dist/`                |
| `npm run start:prod`  | Run the compiled app                         |
| `npm run dev:db:up`   | Start MongoDB 8 via Docker Compose           |
| `npm run dev:db:down` | Stop the Docker containers                   |
| `npm run dev:db:logs` | View Docker container logs                   |
| `npm run test`        | Run unit tests                               |
| `npm run test:e2e`    | Run end-to-end tests                         |
| `npm run test:cov`    | Generate test coverage report                |
| `npm run lint`        | Lint with ESLint (auto-fix)                  |
| `npm run format`      | Format with Prettier                         |

## API

All routes are prefixed with `/v1/api`.

### GraphQL

**Endpoint**: `POST /v1/api/graphql`
**WebSocket**: `ws://localhost:8080/v1/api/graphql` (using the `graphql-transport-ws` subprotocol)

All GraphQL operations require authentication (JWT cookie) except `createUser`.

#### Queries

```graphql
# Get the currently authenticated user
me: User!

# Get a user by ID
user(_id: String!): User!

# List all users
users: [User!]!

# Get a chat by ID
chat(_id: String!): Chat!

# List chats with cursor-based forward pagination
chats(first: Int!, after: String): ChatConnection!

# List messages for a chat with cursor-based backward pagination
messages(chatId: String!, last: Int!, before: String): MessageConnection!
```

#### Mutations

```graphql
createUser(createUserInput: CreateUserInput!): User!
updateUser(updateUserInput: UpdateUserInput!): User!
removeUser: User!
createChat(createChatInput: CreateChatInput!): Chat!
createMessage(createMessageInput: CreateMessageInput!): Message!
```

#### Subscriptions

```graphql
# Subscribe to new messages across one or more chats
messageCreated(chatIds: [String!]!): Message!
```

The subscription filters events so that only messages belonging to the specified `chatIds` are delivered, and the
message author does not receive their own messages.

#### Types

```graphql
type User {
    _id: ID!
    email: String!
    username: String!
}

type Chat {
    _id: ID!
    name: String!
    latestMessage: Message
    createdAt: DateTime!
}

type Message {
    _id: ID!
    content: String!
    chatId: String!
    user: User!
    createdAt: DateTime!
}
```

Pagination responses follow the [Relay Connection spec](https://relay.dev/graphql/connections.htm):

```graphql
# Forward pagination (chats)
type ChatConnection {
    edges: [ChatEdge!]!
    pageInfo: PageInfo!          # { hasNextPage, endCursor }
}

# Backward pagination (messages)
type MessageConnection {
    edges: [MessageEdge!]!
    pageInfo: MessagePageInfo!   # { hasPreviousPage, hasNextPage, startCursor, endCursor }
}
```

### REST Endpoints

REST is used only for authentication and file uploads.

| Method | Path                  | Description                                                                       | Auth |
|--------|-----------------------|-----------------------------------------------------------------------------------|------|
| `POST` | `/v1/api/auth/login`  | Log in with `{ email, password }`. Sets an httpOnly `Authentication` cookie.      | No   |
| `POST` | `/v1/api/auth/logout` | Log out. Clears the authentication cookie.                                        | Yes  |
| `POST` | `/v1/api/users/image` | Upload a profile image. Multipart form data, field `file`. JPEG only, max 100 KB. | Yes  |

## Architecture

### Project Structure

```
src/
├── main.ts                        # App bootstrap (prefix, pipes, logger)
├── app.module.ts                  # Root module
├── auth/                          # Authentication
│   ├── guards/                    # LocalAuthGuard, JwtAuthGuard, GqlAuthGuard
│   ├── strategies/                # LocalStrategy, JwtStrategy (Passport)
│   ├── decorators/                # @CurrentUser() parameter decorator
│   ├── auth.controller.ts         # REST login/logout
│   └── auth.service.ts            # JWT signing & verification
├── users/                         # User management
│   ├── entities/                  # user.document.ts, user.entity.ts
│   ├── dto/                       # CreateUserInput, UpdateUserInput
│   ├── users.repository.ts
│   ├── users.service.ts           # Business logic + toEntity() transform
│   ├── users.resolver.ts          # GraphQL resolver
│   └── users.controller.ts        # REST image upload
├── chats/                         # Chat rooms
│   ├── entities/                  # chat.document.ts, chat.entity.ts
│   ├── dto/
│   ├── chats.repository.ts
│   ├── chats.service.ts           # Aggregation pipelines for pagination
│   ├── chats.resolver.ts
│   └── messages/                  # Nested messages module
│       ├── entities/              # message.document.ts, message.entity.ts
│       ├── dto/
│       ├── messages.repository.ts
│       ├── messages.service.ts    # PubSub integration for subscriptions
│       └── messages.resolver.ts   # messageCreated subscription
├── common/
│   ├── database/                  # DatabaseModule, AbstractRepository, AbstractEntity
│   │   └── db-migration.service.ts
│   ├── s3/                        # S3Service for file uploads
│   ├── pubsub/                    # Global PubSubModule (PUB_SUB token)
│   ├── config/                    # App config, GraphQL config, logger config
│   ├── dto/                       # Shared pagination args
│   ├── utils/                     # Cursor encoding, error utilities
│   └── constants/                 # API_PREFIX, GRAPHQL_PATH, tokens
└── migrations/                    # MongoDB migrations (migrate-mongo)
```

### Document / Entity Pattern

Each domain model is split into two classes:

- **Document** (`*.document.ts`) — The Mongoose schema class decorated with `@Prop()`. Contains database-only fields
  like `password` or `userId` stored as `ObjectId`. The Mongoose schema is generated via
  `SchemaFactory.createForClass()`.
- **Entity** (`*.entity.ts`) — The GraphQL type class decorated with `@Field()`. Represents the public API shape.
  Services transform documents to entities via `toEntity()` methods, which strip sensitive fields and resolve derived
  values (e.g. S3 image URLs).

Both extend `AbstractEntity`, which provides the shared `_id: Types.ObjectId` field with both `@Prop()` and
`@Field(() => ID)` decorators.

### Repository Pattern

`AbstractRepository<T>` wraps Mongoose's `Model<T>` with standard CRUD methods (`create`, `findOne`, `find`,
`findOneAndUpdate`, `findOneAndDelete`). All queries use `.lean()` for performance. Each domain has a concrete
repository (e.g. `ChatsRepository`), and the underlying `model` is exposed for complex operations like aggregation
pipelines.

### Authentication Flow

1. **Login**: `POST /v1/api/auth/login` with `{ email, password }`. The `LocalStrategy` validates credentials (bcrypt
   comparison), then a JWT is generated and set as an httpOnly `Authentication` cookie.
2. **Authenticated requests**: GraphQL operations use `GqlAuthGuard`, which reads the JWT from the cookie. The
   `JwtStrategy` verifies the token and attaches the user to the request context, accessible via the `@CurrentUser()`
   decorator.
3. **WebSocket auth**: On connection, the JWT is parsed from the HTTP upgrade request's cookies and verified. The
   authenticated user is attached to the subscription context.

### Cursor-Based Pagination

Cursors encode `{ d: ISO8601_date, i: objectId }` as base64, providing a stable compound sort key that avoids issues
with duplicate timestamps.

- **Chats** use forward pagination (`first` / `after`) — sorted newest-first.
- **Messages** use backward pagination (`last` / `before`) — fetches the most recent messages and reverses them into
  chronological order. Newer messages arrive via the subscription rather than pagination.

Page sizes are validated to the range 1–100.

### Chat Access Control

Chats support a privacy model:

- **Public chats** — accessible to all authenticated users.
- **Private chats** — restricted to members listed in the chat's `userIds` array.

Access control is enforced on chat queries, message operations, and subscription setup.

### Real-Time Subscriptions

The `messageCreated` subscription uses an in-memory `PubSub` instance (provided globally via `PubSubModule`). When a
message is created, it is published to the `MESSAGE_CREATED` topic. The subscription resolver filters events by `chatId`
membership and excludes the message author.

The WebSocket connection uses the `graphql-transport-ws` subprotocol.

### Database Migrations

Migrations are managed by [`migrate-mongo`](https://github.com/seppevs/migrate-mongo) and run automatically on app
startup via `DbMigrationService` (using the `OnModuleInit` lifecycle hook). Migration source files live in
`src/migrations/` and are compiled to JavaScript in `dist/migrations/` before execution.

Current migrations:

1. **user-email-index** — Unique index on `users.email`
2. **messages-to-collection** — Migrates messages from embedded chat arrays to a separate `messages` collection
3. **chat-private-fields** — Adds `isPrivate` and `userIds` fields for access control

### Validation

- **DTOs**: Decorated with `class-validator` constraints (`@IsEmail()`, `@IsStrongPassword()`, `@IsMongoId()`, custom
  patterns for usernames and chat names). A global `ValidationPipe` auto-validates all inputs.
- **Environment**: Joi schema validates all required env vars at startup — the app fails fast if anything is missing.

## Key Exploration Areas

This project was built to experiment with:

- **NestJS fundamentals** — modules, providers, guards, interceptors, decorators, lifecycle hooks
- **GraphQL code-first approach** — schema generation from TypeScript decorators, resolvers, input types
- **GraphQL subscriptions** — real-time messaging over WebSockets with `graphql-ws`
- **Cursor-based pagination** — Relay Connection spec with MongoDB aggregation pipelines
- **Authentication patterns** — Passport strategies, WebSocket auth
- **AWS S3 integration** — file uploads with presigned operations

## Scope & Limitations

This project was built to explore specific backend patterns rather than to be a
feature-complete product. Some things deliberately left out that a production
system would need:

- **PubSub scaling** — the current in-memory PubSub works for a single instance but wouldn't survive horizontal scaling;
  a Redis adapter (e.g. `@nestjs/redis` + `graphql-redis-subscriptions`) would be the next step
- **Chat filtering** — the `chats` query returns all accessible chats without
  filtering by visibility; querying public or private chats separately is not
  currently supported
- **Rate limiting** — no throttling on queries, mutations, or subscriptions
- **Email verification** — user registration has no email confirmation flow
- **Test coverage** — unit and e2e test scaffolding is in place but coverage is
  minimal

These are known trade-offs, not oversights.