import { switchToChefViewAction, switchToFamilyViewAction } from "@/app/actions";

type HomeView = "CHEF" | "FAMILY";

export function HomeViewSwitcher({ activeView }: { activeView: HomeView }) {
  return (
    <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 p-1">
      {activeView === "CHEF" ? (
        <span className="inline-flex min-h-10 items-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
          厨师视角
        </span>
      ) : (
        <form action={switchToChefViewAction}>
          <button className="inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-medium text-orange-900 transition hover:bg-white">
            厨师视角
          </button>
        </form>
      )}

      {activeView === "FAMILY" ? (
        <span className="inline-flex min-h-10 items-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
          干饭人视角
        </span>
      ) : (
        <form action={switchToFamilyViewAction}>
          <button className="inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-medium text-orange-900 transition hover:bg-white">
            干饭人视角
          </button>
        </form>
      )}
    </div>
  );
}
