# Next.js Upgrade Plan: 14.x to 16.x

## Why

`npm audit` reports **4 high-severity vulnerabilities** in Next.js 14.2.x:

| CVE | Severity | Description |
|-----|----------|-------------|
| CVE-2024-46982 | HIGH | DoS via Image Optimizer — crafted requests cause unbounded memory usage |
| CVE-2024-47831 | HIGH | HTTP request smuggling via malformed headers |
| CVE-2024-56332 | HIGH | Unbounded disk cache growth — no eviction, fills disk |
| CVE-2025-29927 | HIGH | HTTP deserialization DoS — malformed body crashes server |

All 4 are fixed in Next.js 15.x+. The recommended target is **Next.js 16.x** (latest stable as of April 2026).

Additionally, `npm audit` shows:
- `glob 10.2.0-10.4.5` (HIGH) — command injection via `--cmd` flag (transitive via `eslint-config-next`)
- `prismjs <1.30.0` (MODERATE) — DOM Clobbering (transitive via `react-syntax-highlighter`)

---

## Breaking Changes to Address

### Next.js 14 to 15

1. **Async `params` in route handlers**
   - All dynamic route handlers (`[owner]/[repo]/logs/route.ts`) must `await params` before destructuring.
   - Before: `{ params }: { params: { owner: string } }`
   - After: `{ params }: { params: Promise<{ owner: string }> }` + `const { owner } = await params;`
   - **Files:** `portal/src/app/api/repos/[owner]/[repo]/logs/route.ts`

2. **`fetch()` caching default changed**
   - Default changed from `force-cache` to `no-store`.
   - Our routes already use `export const dynamic = "force-dynamic"`, so **no impact**.

3. **`experimental.serverComponentsExternalPackages` renamed**
   - Renamed to `serverExternalPackages` (top-level, no longer under `experimental`).
   - **File:** `portal/next.config.mjs`
   - Before: `experimental: { serverComponentsExternalPackages: ["@prisma/client"] }`
   - After: `serverExternalPackages: ["@prisma/client"]`

4. **React 19 required**
   - Next.js 15+ requires React 19.
   - Update: `"react": "^19.0.0"`, `"react-dom": "^19.0.0"`
   - Update: `"@types/react": "^19.0.0"`, `"@types/react-dom": "^19.0.0"`

5. **`useSearchParams()` requires Suspense boundary**
   - Already a pre-existing build warning on `/analytics` page.
   - **Must fix:** Wrap the analytics page component in `<Suspense>`.
   - **File:** `portal/src/app/analytics/page.tsx`

### Next.js 15 to 16

6. **Turbopack is the default** (replaces Webpack in dev)
   - Already using `--turbo` flag in `npm run dev`. Should be seamless.

7. **App Router is the only router**
   - Already using App Router exclusively. **No impact.**

8. **`next.config.mjs` → `next.config.ts`** (optional)
   - TypeScript config is now natively supported. Optional migration.

---

## Dependency Compatibility Matrix

| Package | Current | React 19 Compatible? | Action |
|---------|---------|---------------------|--------|
| `@tanstack/react-query` | ^5.60.0 | Yes (v5.x supports React 19) | None |
| `framer-motion` | ^11.11.0 | Yes (v11+ supports React 19) | None |
| `recharts` | ^2.13.0 | Check — may need ^2.15.0 | Test |
| `@radix-ui/*` | ^1.x | Yes (v1.1+ supports React 19) | None |
| `react-markdown` | ^9.0.0 | Yes | None |
| `react-syntax-highlighter` | ^15.6.0 | Unclear — uses `prismjs` with known vuln | Consider replacing with `shiki` |
| `zustand` | ^5.0.0 | Yes (v5 supports React 19) | None |
| `lucide-react` | ^0.460.0 | Yes | None |
| `eslint-config-next` | ^14.2.0 | Must upgrade to ^16.x | Update |

---

## Migration Steps

### Phase 1: Fix pre-existing issues
```bash
# Fix the Suspense boundary warning (required for Next.js 15+)
# Wrap analytics page in Suspense
```

**File: `portal/src/app/analytics/page.tsx`**
```tsx
import { Suspense } from "react";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}
```

### Phase 2: Upgrade React
```bash
cd portal
npm install react@^19.0.0 react-dom@^19.0.0
npm install -D @types/react@^19.0.0 @types/react-dom@^19.0.0
```

### Phase 3: Upgrade Next.js
```bash
npm install next@^16.0.0
npm install -D eslint-config-next@^16.0.0
```

### Phase 4: Fix breaking changes
1. Update `next.config.mjs`:
   ```js
   const nextConfig = {
     output: "standalone",
     serverExternalPackages: ["@prisma/client"],
   };
   ```

2. Update async params in `repos/[owner]/[repo]/logs/route.ts`:
   ```ts
   export async function GET(
     _request: NextRequest,
     { params }: { params: Promise<{ owner: string; repo: string }> }
   ) {
     const { owner, repo } = await params;
     // ... rest unchanged
   }
   ```

### Phase 5: Fix transitive vulnerabilities
```bash
# Replace react-syntax-highlighter (pulls in vulnerable prismjs)
npm uninstall react-syntax-highlighter @types/react-syntax-highlighter
npm install shiki
# Update StreamingText.tsx to use shiki for syntax highlighting
```

### Phase 6: Test
```bash
npx tsc --noEmit          # Type check
npm run build             # Production build
npm run dev               # Dev server smoke test
# Manual: verify /, /analytics, /activity, /repos, /chat, /live
```

---

## Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| 1. Suspense fix | 15 min | Low |
| 2. React upgrade | 5 min | Low |
| 3. Next.js upgrade | 5 min | Medium — may surface hidden issues |
| 4. Breaking changes | 30 min | Low — well-documented changes |
| 5. Transitive vulns | 1-2 hrs | Medium — `react-syntax-highlighter` → `shiki` is a rewrite of `StreamingText.tsx` |
| 6. Testing | 30 min | Low |

**Total: ~2-3 hours**

---

## Rollback Plan

If the upgrade introduces regressions:
1. `git revert` the upgrade commit
2. `rm -rf node_modules portal/.next`
3. `npm install`
4. The 4 Next.js CVEs are only exploitable by authenticated users on localhost (low real-world risk for this portal)
