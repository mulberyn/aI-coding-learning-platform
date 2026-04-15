import { metrics } from "@/lib/mock-data";

export function StatGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-2xl border border-ui bg-panel p-4"
        >
          <p className="text-sm text-muted">{metric.label}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="text-3xl font-semibold">{metric.value}</span>
            <span className="rounded-full border border-ui bg-panel-strong px-3 py-1 text-xs text-muted">
              {metric.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
