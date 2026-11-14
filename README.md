# FindBack

Lost something? Let's bring it back.

FindBack is a JavaScript MERN application for reporting lost and found items, reviewing attribute-based match suggestions, privately messaging reporters, and submitting ownership claims.

## What works

- Email/password registration and login with bcrypt hashing, HttpOnly JWT cookies, and CSRF protection for cookie-authenticated changes.
- Responsive Vite/React UI for reports, browsing/search, dashboards, claims, matches, private messages, notifications, profile, and admin moderation.
- Lost/found reports with 1–5 validated JPG, PNG, or WebP photos (up to 5 MB each), image previews, and upload progress.
- Local photo storage for development; optional Cloudinary uploads for deployment.
- Weighted attribute matching with transparent reasons; an optional image-embedding HTTP adapter adds cosine-similarity ranking when configured. Without embeddings, scores are based only on report attributes.
- Private ownership claims, finder review, safe conversation creation, notification records, and audit logs for moderation/status changes.
- Socket.IO messaging rooms are authenticated and authorized against conversation membership; message REST APIs enforce the same access check.
- Admin routes for platform statistics, user account status, reports, and item moderation.

Image similarity is not enabled unless `IMAGE_EMBEDDING_URL` is explicitly configured. The adapter expects `POST { "imageUrl": "..." }` and a JSON response shaped as `{ "embedding": [0.1, 0.2] }`. Use a trusted service you control; image URLs are sent to that configured service. Set `PUBLIC_API_URL` when local uploads need to be reachable by the embedding service. Invalid or unavailable embeddings are not fabricated, and matching continues with attributes.

Attribute weights, minimum match score, and the optional visual-score share can be tuned with the `MATCH_*` settings in `backend/.env.example`.

## Requirements

- Node.js 20.19+ (Node.js 24 recommended)
- npm
- MongoDB locally, or a MongoDB Atlas connection string

## Local setup

1. Install workspace dependencies:

   ```sh
   npm install
   ```

2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` and a unique random `JWT_SECRET` of at least 32 characters. For local MongoDB, the example URI works when MongoDB is listening on port 27017.

3. Copy `frontend/.env.example` to `frontend/.env`. The default API URL targets the local backend.

4. Start the API and frontend in separate terminals:

   ```sh
   npm run dev:backend
   npm run dev:frontend
   ```

   Open the Vite URL printed in the frontend terminal (normally `http://localhost:5173`). Check API readiness at `http://localhost:4000/api/health`.

5. To enable Cloudinary, set all three `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` values in `backend/.env`. If Cloudinary is not configured, uploaded files are stored in `backend/uploads/` and are excluded from Git.

During local development, the API allows the Vite origins `localhost:5173` and `127.0.0.1:5173`. The frontend defaults its API and Socket.IO hosts to the hostname used to open Vite, keeping credentialed local cookies same-site. Development rate limits remain enabled (1,500 API and 120 authentication requests per IP per 15 minutes); production keeps the stricter limits (300 API and 30 authentication requests). A 429 response includes `X-RateLimit-Scope` (`api` or `auth`).

## Tests and production build

```sh
npm test
npm run build
```

The backend tests cover match scoring and its transparent fallback. The build compiles the React application; end-to-end flows require a running MongoDB and configured environment.

## Admin access

1. Register an account normally.
2. Set `ADMIN_EMAIL` in `backend/.env` to that account's email.
3. Run `npm --workspace backend run promote-admin`.
4. Sign out and sign back in to refresh the role in the session.

The script only promotes an existing account; public registration never accepts an admin role.

## Deployment

### MongoDB Atlas

1. Create a cluster and database user, then add the Render service's outbound IP policy (or the narrowest policy your deployment supports).
2. Set Render's `MONGODB_URI` to the Atlas connection string and URL-encode special characters in the database password.

### Render API

1. Create a Web Service from this repository.
2. Set the root directory to `backend`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Configure `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (32+ random characters), `CLIENT_ORIGIN` (the exact Vercel origin), and Cloudinary credentials.
6. If using a custom embedding service, configure `IMAGE_EMBEDDING_URL` and its optional token. Otherwise, attribute matching remains active.
7. Health check path: `/api/health`.

### Vercel frontend

1. Import the repository into Vercel and set the project root to `frontend`.
2. Set `VITE_API_URL` to the Render API origin plus `/api`, for example `https://your-service.onrender.com/api`.
3. Deploy. Add the final Vercel origin to the Render `CLIENT_ORIGIN` environment variable and redeploy the API.

The API uses credentialed CORS and secure, HttpOnly cookies in production. Vercel and Render must use HTTPS. Socket.IO shares the API origin and the same cookie session. Before going live, test sign-up/sign-in, image uploads, matching, claims, private messages, admin authorization, and deployed refresh/deep links using real Atlas and Cloudinary credentials.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/profile`
- `GET /api/items`, `GET /api/items/mine`, `POST /api/items/lost`, `POST /api/items/found`, `GET /api/items/:id`
- `GET /api/matches`, `POST /api/matches/:id/accept`, `POST /api/matches/:id/reject`
- `POST /api/claims`, `GET /api/claims`, `PATCH /api/claims/:id/status`
- `GET /api/conversations`, `POST /api/conversations`, `GET/POST /api/conversations/:id/messages`
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- Admin-only routes under `/api/admin`

Sensitive item verification data and claim answers are not returned by public item endpoints. Arrange handovers safely and verify ownership before returning an item.
