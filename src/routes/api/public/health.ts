import { createFileRoute } from "@tanstack/react-router";

// Public uptime check. Returns no school data — only whether the app and the
// database answer. Safe for external monitors.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        let database: "ok" | "unavailable" = "unavailable";
        try {
          const url = process.env["SUPABASE_URL"];
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
          if (url && key) {
            const res = await fetch(`${url}/auth/v1/health`, {
              headers: { apikey: key },
              signal: AbortSignal.timeout(5000),
            });
            if (res.ok) database = "ok";
          }
        } catch {
          database = "unavailable";
        }
        const ok = database === "ok";
        return Response.json(
          { status: ok ? "ok" : "degraded", database, latencyMs: Date.now() - started },
          { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
