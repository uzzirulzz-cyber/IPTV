---
Task ID: build-playbeat-digital
Agent: main (Super Z)
Task: Build Playbeat Digital IPTV app with MongoDB integration, full clean lint build with no errors

Work Log:
- Read uploaded JSON file (hercules-2026-07-06.json) — conversation history from previous session showing Playbeat Digital IPTV app built on Convex/React with these features: IPTV player, channels browser, video player (HLS.js), user accounts, favorites, watch history, admin panel at /admin (founder@playbeat.live / playbeat123), MongoDB URI added to IPTV config
- Initialized fullstack-dev skill — Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma
- Installed hls.js@1.6.16 and bcryptjs@3.0.3
- Configured MongoDB Atlas as Prisma datasource (mongodb+srv://max11:...@playbeat.umqpdyx.mongodb.net/playbeat)
  - System DATABASE_URL was overriding .env file, so used MONGODB_URL env var in schema.prisma
  - Schema includes: User, Favorite, WatchHistory, AdminSession models with proper relations and indexes
  - Ran `bun run db:push` successfully — collections created in MongoDB Atlas
- Built complete IPTV backend library (src/lib/iptv.ts) — Xtream Codes API client with auth, categories, streams, health check, stream URL builder, proper User-Agent headers
- Built auth library (src/lib/auth.ts) — HMAC-signed user tokens + database-backed admin sessions, HTTP-only cookies
- Built 11 API routes:
  - /api/iptv/catalog, /api/iptv/stream, /api/iptv/health
  - /api/auth/signin, /api/auth/signout, /api/auth/me
  - /api/favorites (GET/POST/DELETE)
  - /api/watch-history (GET/POST/DELETE)
  - /api/admin/verify, /api/admin/signout, /api/admin/stats, /api/admin/users (GET/DELETE), /api/admin/iptv-config
- Built Zustand store for view-state navigation (home/channels/favorites/player/admin)
- Built useAuth hook with global subscription pattern so all components share auth state
- Built UI components:
  - AppHeader (logo, LIVE indicator, nav, admin button, sign-in/avatar dropdown)
  - HomeView (hero with "Stream the world" headline, Continue Watching section for signed-in users, 3 feature cards)
  - ChannelBrowser (category sidebar, search, responsive channel grid, favorite heart toggle, error state for IPTV failures)
  - VideoPlayer (HLS.js with low-latency mode, auto-recovery from network/media errors, fullscreen, quality selector, volume control, buffering indicator)
  - FavoritesView (grid of saved channels, empty state for unsigned-in users)
  - AdminLogin (email/password form)
  - AdminDashboard (4 tabs: Overview/Users/Server/IPTV Config) — shows MongoDB config with masked connection string, IPTV credentials, streaming config, channel categories
- Updated globals.css with dark premium theme (always-dark, rose accent)
- Updated layout.tsx with Playbeat Digital metadata
- Wired up page.tsx with view-state routing (single-page app per skill rules — only / route is user-visible)
- Fixed all lint errors:
  - Removed setState-in-effect by extracting AdminView component
  - Fixed duplicate className props on Button
  - Removed 7 unused eslint-disable directives
  - Fixed TypeScript type error in iptv.ts params
- Verified with Agent Browser:
  - Home page renders correctly with hero, Continue Watching (for signed-in users), feature cards
  - Channels page shows clear error message when IPTV server is blocked by Cloudflare (403)
  - Sign-in flow works — user stored in MongoDB, avatar shows in header, home view updates reactively
  - Admin login works with founder@playbeat.live / playbeat123
  - Admin Dashboard shows: Overview (user/favorite/history counts, IPTV status), Users (list from MongoDB with delete), Server (IPTV server info), IPTV Config (streaming config + MongoDB database config with masked connection string + IPTV credentials + categories)
- Final verification:
  - `bun run lint` — PASSES (0 errors, 0 warnings)
  - `bunx tsc --noEmit` — 0 errors in src/ (only pre-existing errors in examples/ and skills/ which are not part of this project)
  - Dev server running on port 3000, all API routes return 200 (admin routes return 401 without auth, correct)
  - MongoDB Atlas connection confirmed working — 2 users stored, favorites/watch-history tables operational

Stage Summary:
- Playbeat Digital IPTV app fully built on Next.js 16 with MongoDB Atlas integration
- All features from the original conversation implemented: IPTV player, channels browser, video player (HLS.js with auto-recovery), user accounts, favorites, watch history, admin panel at /admin
- MongoDB Atlas is the active database (replacing the original Convex backend) — connection string mongodb+srv://max11:n3lSs2xcyaCSGH9O@playbeat.umqpdyx.mongodb.net/playbeat configured and verified
- Full clean lint build with NO errors and NO warnings
- IPTV server (opplex.ch:8080) returns HTTP 403 from this sandbox — Cloudflare is blocking the sandbox IP (same issue as previous session). App gracefully shows a clear error message guiding users to check the admin panel.
- Preview link: https://preview-<bot-id>.space-z.ai/
- Screenshots saved to /home/z/my-project/download/: home-page.png, channels-error-state.png, admin-login.png, admin-iptv-config.png
