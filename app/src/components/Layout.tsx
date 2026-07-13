import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function Layout() {
  const theme = useAppStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme.mode;
    document.documentElement.dataset.palette = theme.palette;
    document.documentElement.dataset.ornament = theme.ornament;
    document.documentElement.dataset.density = theme.density;
  }, [theme]);
  return <Outlet />;
}
