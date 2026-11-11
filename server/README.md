# Smart Cash authentication API

This NestJS service provides email one-time-code authentication for **existing, active** records in `sk.users`. It sends codes through the Gmail API using OAuth2 with the `https://www.googleapis.com/auth/gmail.send` scope. This proves control of an email inbox; it is not Google OIDC sign-in. It does not create accounts, assign roles, or provide access to the prototype's local financial data.

## Local setup

1. Create a PostgreSQL database and apply `db/schema.sql`, then `server/db/auth.sql`. The auth migration requires active user emails to be unique across tenants; it stops rather than silently selecting an ambiguous account.
2. Copy `.env.example` to `.env`; configure the database, frontend origin, and distinct random secrets for `JWT_SECRET` and `OTP_PEPPER` (at least 32 characters each).
3. Configure a Google OAuth client with Gmail send scope and save its refresh token as `GMAIL_REFRESH_TOKEN`. Keep all credentials in local environment variables or the hosting provider's secret settings; never commit `.env`.
4. Create active `sk.users` records with unique email addresses. The API intentionally sends codes only to matching, active records.
5. Run `npm ci`, `npm run build`, then `npm start`.

The API listens under `/api`:

- `GET /api/health`
- `POST /api/auth/request-code` with `{ "email": "user@gmail.com" }`
- `POST /api/auth/verify-code` with `{ "email": "user@gmail.com", "code": "123456" }`
- `GET /api/auth/me` with `Authorization: Bearer <accessToken>`
- `POST /api/auth/logout` with the same bearer token

Request responses do not disclose whether an account exists. Codes are HMACed (never stored or logged in plaintext), expire in 10 minutes, can be requested no more than once per minute or five times per hour, and permit at most five guesses. A process-wide request throttle limits abuse by source; keep Render to one instance unless a shared rate-limit store is added. Access tokens last 15 minutes; logout revokes the associated session.

## Render deployment

Create a Render Web Service rooted at `server`, with build command `npm ci && npm run build` and start command `npm start`. Use a managed Render PostgreSQL database. Apply the schema files manually through a private database connection, then add all values from `.env.example` as Render environment secrets. `WEB_ORIGIN` must exactly match the deployed frontend origin. Set `SC_AUTH_API` in `prototype/js/prototype-config.js` to the HTTPS API origin before rebuilding the static app. Do not expose the database URL, Gmail OAuth values, or signing secrets to GitHub Pages.

## Prototype limitation

The current GitHub Pages application is still a browser-only prototype: its sample records, roles, and permissions are not backed by this API. This service is an authentication foundation only; do not use the prototype for real financial or personal data. Production use requires moving financial reads, writes, and authorization checks to authenticated server endpoints before trusting a login.
