import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CoffeeLink, GyaanStackLink, RepositoryLink } from "./repository-link";
import { SidebarFrame } from "./sidebar-frame";

afterEach(() => {
  document.cookie = "gyaanstack_sidebar=; max-age=0; path=/";
});

function renderLinks(initialCollapsed = false) {
  render(
    <SidebarFrame initialCollapsed={initialCollapsed} brand={<span>GyaanStack Apply</span>}>
      <GyaanStackLink />
      <RepositoryLink />
      <CoffeeLink />
    </SidebarFrame>,
  );
  return {
    discord: screen.getByRole("link", { name: "Learn on GyaanStack (opens in a new tab)" }),
    repository: screen.getByRole("link", { name: "Star on GitHub (opens in a new tab)" }),
    coffee: screen.getByRole("link", { name: "Buy me a coffee (opens in a new tab)" }),
  };
}

describe("GyaanStackLink, RepositoryLink and CoffeeLink", () => {
  it("open GyaanStack, the repository and the Buy Me a Coffee page in a new tab", () => {
    const { discord, repository, coffee } = renderLinks();
    expect(discord).toHaveAttribute("href", "https://gyaanstack.com");
    expect(repository).toHaveAttribute("href", "https://github.com/raghu298/gyaanstack-apply");
    expect(coffee).toHaveAttribute("href", "https://buymeacoffee.com/aigyaanstack");
    for (const link of [discord, repository, coffee]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).not.toHaveAttribute("title");
    }
  });

  it("keep their names and get a tooltip while the sidebar is collapsed", () => {
    const { discord, repository, coffee } = renderLinks(true);
    expect(discord).toHaveAttribute("title", "Learn on GyaanStack");
    expect(repository).toHaveAttribute("title", "Star on GitHub");
    expect(coffee).toHaveAttribute("title", "Buy me a coffee");
  });
});
