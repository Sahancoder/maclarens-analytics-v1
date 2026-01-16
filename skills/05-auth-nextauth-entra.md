# Skill: Frontend Auth (NextAuth + Entra ID)

## Goal

Entra login using NextAuth, then pass token to API (Apollo).

## Tasks

1. Configure NextAuth provider for Entra:
   - tenant id
   - client id/secret
2. Implement session callback to store access token
3. Protect routes by role:
   - load `me` query after login
   - redirect to correct dashboard by role
4. Store token for Apollo link Authorization header

## Acceptance checks

- User can login/logout
- After login, UI calls `me` successfully
- Unregistered users get “Not authorized” page
