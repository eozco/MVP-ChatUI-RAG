export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { Resource } = await import("@opentelemetry/resources");
    const { SemanticResourceAttributes } = await import(
      "@opentelemetry/semantic-conventions"
    );
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME ?? "lab-chat-ui",
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        process.env.OTEL_SERVICE_ENV ?? "local",
    });

    const traceExporter = new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        "http://localhost:4318/v1/traces",
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS as any,
    });

    const sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    sdk.start();
  }
}
