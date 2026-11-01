import { clearMockSettings, fillMockSettings } from "@/app/(app)/mock-actions";
import { buttonSecondary, compact } from "@/components/ui";
import { mockScenario } from "@/lib/snaptrade/mock/config";

// Shown on every app page while mock data is enabled, so generated figures are
// never mistaken for SnapTrade data, including in screenshots.
export function MockDataBar() {
  const scenario = mockScenario();
  if (!scenario) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-attention/40 bg-attention-soft px-6 py-2.5 text-sm lg:px-10"
    >
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-attention">Mock data</span>
        <span className="text-muted">(development only)</span>
      </p>
      <div className="flex gap-2">
        <form action={fillMockSettings}>
          <button type="submit" className={compact(buttonSecondary)}>
            Fill settings
          </button>
        </form>
        <form action={clearMockSettings}>
          <button type="submit" className={compact(buttonSecondary)}>
            Clear settings
          </button>
        </form>
      </div>
    </div>
  );
}
