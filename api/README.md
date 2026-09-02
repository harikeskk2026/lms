# LMS API (Java Spring Boot)

Java 21 + Spring Boot 3 + Maven service, backed by PostgreSQL. Currently exposes only the Login API; new modules should follow the same layered pattern.

## Structure

```
src/main/java/com/careerlabs/lms/api/
  config/          # Security, CORS, health check, sample data purge runner
  common/
    response/      # ApiResponse / ApiErrorResponse - shared envelopes for every endpoint
    exception/     # ApiException hierarchy + GlobalExceptionHandler
  security/        # JwtService (token issuing)
  user/
    entity/        # JPA entities (User, Role)
    repository/    # Spring Data repositories
  auth/
    controller/    # REST controllers
    service/       # Interfaces + impl/
    dto/           # request/ and response/ payloads
    validation/    # Custom validation annotations + validators, message constants
```

Each future module (courses, enrollments, etc.) should get its own top-level package with the same `controller / service / dto / repository / entity` shape, and reuse `common.response` / `common.exception` for consistent output.

## Setup

1. `cp .env.example .env` and fill in real values (never commit `.env`).
2. Create the Postgres database named in `DB_NAME`.
3. Run the app:

```bash
mvn spring-boot:run
```

On first run, sample data is purged if `PURGE_SAMPLE_DATA=true` (default), ensuring a clean database with active Admin user account.

## API

### `POST /api/auth/login`

Request:
```json
{ "email": "admin@careerlabs.com", "password": "ChangeMe123!" }
```

Success (`200`):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "...",
    "tokenType": "Bearer",
    "expiresInSeconds": 3600,
    "user": { "id": 1, "name": "Admin User", "email": "admin@careerlabs.com", "role": "ADMIN" }
  },
  "timestamp": "..."
}
```

Error (`401`/`400`/...):
```json
{
  "success": false,
  "message": "Invalid email or password",
  "status": 401,
  "path": "/api/auth/login",
  "timestamp": "..."
}
```

## Tests

```bash
mvn test
```

Tests run against an in-memory H2 database (`src/test/resources/application-test.yml`), so no Postgres instance is required locally to run them.
