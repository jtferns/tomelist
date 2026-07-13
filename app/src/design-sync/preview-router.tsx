import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";

/**
 * design-sync-only router stand-in (never imported by the real app). The
 * router-dependent components (EventShell, ProgressHud, the pages, …) call
 * `useParams({ from: "/$eventId" })` and render `Link`s to
 * `/$eventId/<tab>`, so previews must mount them inside a live TanStack
 * Router whose matched route is `/$eventId`. This provider builds a minimal
 * memory-history router: the `/$eventId` route renders the preview children
 * (plus an Outlet so EventShell's own Outlet matches the splat child and
 * renders nothing), navigated to `/{eventId}/{tab}`.
 *
 * Event data comes from the preview-data shim (globalThis registry) — see
 * preview-data.tsx and the fallback in lib/events.ts.
 */
export function PreviewRouter({
  eventId = "2026-03-mogmog-collection",
  tab = "overview",
  children,
}: {
  eventId?: string;
  tab?: string;
  children?: ReactNode;
}) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute();
    const eventRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/$eventId",
      component: () => (
        <>
          {children}
          <Outlet />
        </>
      ),
    });
    const tabRoute = createRoute({
      getParentRoute: () => eventRoute,
      path: "$",
      component: () => null,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([eventRoute.addChildren([tabRoute])]),
      history: createMemoryHistory({ initialEntries: [`/${eventId}/${tab}`] }),
    });
    // children intentionally captured once — previews are static mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, tab]);
  return <RouterProvider router={router} />;
}
