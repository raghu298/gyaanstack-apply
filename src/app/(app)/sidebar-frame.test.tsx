import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NavLinks } from "./nav-links";
import { SidebarFrame } from "./sidebar-frame";
import { ThemeToggle } from "./theme-toggle";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useSearchParams: () => new URLSearchParams() }));
vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a">) => <a href={href} {...props} />,
}));

let systemDark = false;
beforeEach(() => {
  systemDark = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("dark") && systemDark,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  pathname = "/";
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
  document.cookie = "gyaanstack_theme=; max-age=0; path=/";
  document.cookie = "gyaanstack_sidebar=; max-age=0; path=/";
  document.cookie = "gyaanstack_sidebar_application=; max-age=0; path=/";
});

function renderSidebar(initialCollapsed = false, initialApplicationCollapsed?: boolean) {
  return render(
    <SidebarFrame initialCollapsed={initialCollapsed} initialApplicationCollapsed={initialApplicationCollapsed} brand={<span>GyaanStack Apply</span>}>
      <NavLinks />
      <ThemeToggle />
    </SidebarFrame>,
  );
}

describe("SidebarFrame", () => {
  it("opens as a drawer from the phone menu, at full width, and closes on Escape, the backdrop or a new page", async () => {
    const { rerender } = renderSidebar(true);
    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("complementary")).not.toHaveAttribute("data-collapsed");
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("complementary")).toHaveAttribute("data-collapsed", "true");
    expect(document.body.style.overflow).toBe("");

    await userEvent.click(menu);
    pathname = "/applications";
    rerender(
      <SidebarFrame initialCollapsed brand={<span>GyaanStack Apply</span>}>
        <NavLinks />
        <ThemeToggle />
      </SidebarFrame>,
    );
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  it("collapses to icons, keeps every link named, and remembers it", async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByRole("complementary")).toHaveAttribute("data-collapsed", "true");
    // The labels are only visually hidden, so links keep their names.
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute("title", "Applications");
    expect(document.cookie).toContain("gyaanstack_sidebar=collapsed");

    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByRole("complementary")).not.toHaveAttribute("data-collapsed");
    expect(document.cookie).toContain("gyaanstack_sidebar=expanded");
  });

  it("starts collapsed when it was left that way", () => {
    renderSidebar(true);
    expect(screen.getByRole("complementary")).toHaveAttribute("data-collapsed", "true");
  });
});

describe("ThemeToggle", () => {
  it("offers the other scheme to the system's, then switches and remembers", async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: "Dark mode" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.cookie).toContain("gyaanstack_theme=dark");
    await userEvent.click(screen.getByRole("button", { name: "Light mode" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("follows a dark system until a choice is made", () => {
    systemDark = true;
    renderSidebar();
    expect(screen.getByRole("button", { name: "Light mode" })).toBeInTheDocument();
  });

  describe("on an application's screen (E27-8)", () => {
    it("starts collapsed there, whatever the other pages do", () => {
      pathname = "/applications/abc";
      renderSidebar(false);
      expect(screen.getByRole("complementary")).toHaveAttribute("data-collapsed", "true");
    });

    it("keeps its own choice: opening it there leaves the other pages alone", async () => {
      pathname = "/applications/abc";
      renderSidebar(false);
      await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
      expect(screen.getByRole("complementary")).not.toHaveAttribute("data-collapsed");
      expect(document.cookie).toContain("gyaanstack_sidebar_application=expanded");
      expect(document.cookie).not.toContain("gyaanstack_sidebar=");
    });

    it("isn't the list or New application", () => {
      for (const path of ["/applications", "/new"]) {
        pathname = path;
        const { unmount } = renderSidebar(false, true);
        expect(screen.getByRole("complementary")).not.toHaveAttribute("data-collapsed");
        unmount();
      }
    });
  });
});
