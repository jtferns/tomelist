import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function Layout() {
  const theme = useAppStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme.mode;
    document.documentElement.dataset.palette = theme.palette;
  }, [theme]);
  return <Outlet />;
}
