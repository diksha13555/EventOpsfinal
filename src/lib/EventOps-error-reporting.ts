type  EventOpsErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type EventOpsEvents = {
  track?: (event: string, properties?: Record<string, unknown>) => string | null;
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: EventOpsErrorOptions,
  ) => void;
};
declare global {
  interface Window {
    __eventOpsEvents?: EventOpsEvents;
    __eventOpsReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

export function reportEventOpsError(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  window.__eventOpsEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );

  // Prod React does not rethrow boundary-caught errors to window.onerror,
  // so Event Ops telemetry never sees them.
  // Forward to Event Ops's reporting hook, which is present only
  // inside the Event Ops preview.

  // Loaders and server functions commonly throw a raw Response;
  // String(error) is the opaque "[object Response]", so pull out
  // the status and URL instead.

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  const stack = error instanceof Error ? error.stack : undefined;

  window.__eventOpsReportRuntimeError?.({
    message,
    ...(stack !== undefined && { stack }),
    filename: window.location.pathname,
  });
}