import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { EventShell } from "@/components/EventShell";
import { Layout } from "@/components/Layout";
import { getActiveEvent } from "@/lib/events";
import { ExchangesPage } from "@/pages/ExchangesPage";
import { ObjectivesPage } from "@/pages/ObjectivesPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { PlannerPage } from "@/pages/PlannerPage";
import { SettingsPage } from "@/pages/SettingsPage";

const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const active = getActiveEvent(new Date());
    if (active) {
      throw redirect({ to: "/$eventId/overview", params: { eventId: active.id } });
    }
  },
});

const eventRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$eventId",
  component: EventShell,
});

const overviewRoute = createRoute({ getParentRoute: () => eventRoute, path: "/overview", component: OverviewPage });
const objectivesRoute = createRoute({ getParentRoute: () => eventRoute, path: "/objectives", component: ObjectivesPage });
const plannerRoute = createRoute({ getParentRoute: () => eventRoute, path: "/planner", component: PlannerPage });
const exchangesRoute = createRoute({ getParentRoute: () => eventRoute, path: "/exchanges", component: ExchangesPage });
const settingsRoute = createRoute({ getParentRoute: () => eventRoute, path: "/settings", component: SettingsPage });

const routeTree = rootRoute.addChildren([
  indexRoute,
  eventRoute.addChildren([overviewRoute, objectivesRoute, plannerRoute, exchangesRoute, settingsRoute]),
]);

export function createAppRouter() {
  // Cross-fade page swaps via the View Transitions API; falls back to a plain
  // startTransition where the browser lacks it (Firefox).
  return createRouter({ routeTree, defaultViewTransition: true });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
