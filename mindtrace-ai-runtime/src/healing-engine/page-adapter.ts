// mindtrace-ai-runtime/src/healing-engine/page-adapter.ts

/**
 * PageAdapter - abstraction over Playwright Page for unit testing
 *
 * This interface allows healing engine to be fully unit-testable
 * without depending on real Playwright objects.
 */

export interface ElementStateAdapter {
  waitFor(options: { state: "attached" | "visible"; timeout: number }): Promise<void>;
  isVisible(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  isEditable(): Promise<boolean>;
}

export interface LocatorAdapter {
  first(): ElementStateAdapter;
  all(): Promise<ElementStateAdapter[]>;
}

export interface PageAdapter {
  locator(selector: string): LocatorAdapter;
  getByRole(role: string, options?: { name?: string }): LocatorAdapter;
  isClosed(): boolean;
}

/**
 * Create PageAdapter from real Playwright Page
 */
export function createPageAdapter(page: any): PageAdapter {
  return {
    locator: (selector: string) => {
      const loc = page.locator(selector);
      return {
        first: () => {
          const first = loc.first();
          return {
            waitFor: (opts: any) => first.waitFor(opts),
            isVisible: () => first.isVisible(),
            isEnabled: () => first.isEnabled(),
            isEditable: () => first.isEditable()
          };
        },
        all: async () => {
          const elements = await loc.all();
          return elements.map((el: any) => ({
            waitFor: (opts: any) => el.waitFor(opts),
            isVisible: () => el.isVisible(),
            isEnabled: () => el.isEnabled(),
            isEditable: () => el.isEditable()
          }));
        }
      };
    },
    getByRole: (role: string, options?: { name?: string }) => {
      const loc = page.getByRole(role, options);
      return {
        first: () => {
          const first = loc.first();
          return {
            waitFor: (opts: any) => first.waitFor(opts),
            isVisible: () => first.isVisible(),
            isEnabled: () => first.isEnabled(),
            isEditable: () => first.isEditable()
          };
        },
        all: async () => {
          const elements = await loc.all();
          return elements.map((el: any) => ({
            waitFor: (opts: any) => el.waitFor(opts),
            isVisible: () => el.isVisible(),
            isEnabled: () => el.isEnabled(),
            isEditable: () => el.isEditable()
          }));
        }
      };
    },
    isClosed: () => page.isClosed()
  };
}
