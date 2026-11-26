"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { APPLICATION_SIDEBAR_COOKIE, rememberPreference, SIDEBAR_COOKIE } from "@/lib/ui-preferences";

const CollapsedContext = createContext<{ collapsed: boolean; expand: () => void }>({ collapsed: false, expand: () => {} });

/** Whether the sidebar is collapsed to its icons, for the parts that need more than CSS. */
export function useSidebarCollapsed(): boolean {
  return use(CollapsedContext).collapsed;
}

/** Opens a collapsed sidebar, for a part that needs its full width (the update notice). */
export function useExpandSidebar(): () => void {
  return use(CollapsedContext).expand;
}

/** An application's own screen, where the sidebar keeps its own state (E27-8); not the list, nor New application. */
const isApplicationScreen = (pathname: string | null) => /^\/applications\/[^/]+/.test(pathname ?? "");

/**
 * The sidebar's frame, collapsible to a strip of icons.
 * The choice is kept in a cookie, so the server renders the next page the
 * same way. An application's screen has its own, collapsed until the user
 * opens it there, so the document gets the room (E27-8); toggling one never
 * changes the other. Inside, `group-data-collapsed/sidebar:` variants hide
 * what doesn't fit, so the server-rendered parts need no state of their own.
 */
export function SidebarFrame({
  initialCollapsed,
  initialApplicationCollapsed = true,
  brand,
  phoneActions,
  children,
}: {
  initialCollapsed: boolean;
  /** On an application's screen. */
  initialApplicationCollapsed?: boolean;
  /** The logo, which the expand button replaces on hover while collapsed. */
  brand: ReactNode;
  /** On phones, next to the menu button in the top bar, e.g. "+ New application". */
  phoneActions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const onApplication = isApplicationScreen(pathname);
  const [elsewhere, setElsewhere] = useState(initialCollapsed);
  const [onScreen, setOnScreen] = useState(initialApplicationCollapsed);
  // Below md the sidebar is a drawer behind the top bar's menu button, always at full width.
  const [drawer, setDrawer] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);
  const closeButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const collapsed = !drawer && (onApplication ? onScreen : elsewhere);
  // Going somewhere closes it.
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawer(false);
  }
  useEffect(() => {
    if (!drawer) return;
    const menu = menuButton.current;
    closeButton.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
    };
    // Widening past the phone layout leaves the drawer behind.
    const wide = window.matchMedia("(min-width: 48rem)");
    const onWide = () => wide.matches && setDrawer(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      menu?.focus();
    };
  }, [drawer]);
  const change = (next: boolean) => {
    (onApplication ? setOnScreen : setElsewhere)(next);
    rememberPreference(onApplication ? APPLICATION_SIDEBAR_COOKIE : SIDEBAR_COOKIE, next ? "collapsed" : "expanded");
  };
  const toggle = () => change(!collapsed);
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <CollapsedContext value={{ collapsed, expand: () => change(false) }}>
      {/* Phones: a top bar with the logo and the menu that opens the sidebar. */}
      <div className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-2 border-b border-line bg-sidebar px-3 md:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2 [&>span]:text-[19px]">{brand}</div>
        {phoneActions}
        <button
          ref={menuButton}
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
          aria-expanded={drawer}
          aria-controls="sidebar"
          className="grid size-9 shrink-0 place-items-center rounded-control text-ink hover:bg-hover"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      </div>
      {drawer && <div aria-hidden="true" onClick={() => setDrawer(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" />}
      <aside
        id="sidebar"
        aria-label="Sidebar"
        data-collapsed={collapsed || undefined}
        className={cn(
          "group/sidebar sticky top-0 flex h-screen shrink-0 flex-col self-start overflow-x-hidden overflow-y-auto border-r border-line bg-sidebar motion-safe:transition-[width] motion-safe:duration-200",
          collapsed ? "w-[60px]" : "w-[264px]",
          // Phones: hidden until the menu opens it as a drawer from the left.
          drawer ? "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:h-dvh max-md:w-[min(85vw,320px)] max-md:shadow-dialog" : "max-md:hidden",
        )}
      >
        <div
          className={cn(
            "group/header relative flex items-center gap-2 border-b border-line",
            collapsed ? "justify-center px-1 py-3" : "pt-3 pr-3 pb-4 pl-4",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2",
              // Collapsed, the logo and the expand button share one slot.
              collapsed &&
                "flex-none group-hover/header:opacity-0 group-has-[button:focus-visible]/header:opacity-0 motion-safe:transition-opacity",
            )}
          >
            {brand}
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={() => setDrawer(false)}
            aria-label="Close menu"
            className="grid size-8 shrink-0 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink md:hidden"
          >
            <X size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink max-md:hidden",
              collapsed &&
                "absolute inset-0 m-auto size-8 bg-surface opacity-0 group-hover/header:opacity-100 focus-visible:opacity-100 motion-safe:transition-opacity",
            )}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        </div>
        {children}
      </aside>
    </CollapsedContext>
  );
}
