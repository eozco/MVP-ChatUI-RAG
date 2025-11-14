import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "lab-chat-ui",
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
    process.env.OTEL_SERVICE_ENV ?? "local",
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
  headers: process.env.OTEL_EXPORTER_OTLP_HEADERS,
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

export async function register() {
  await sdk.start();

  process.once("SIGTERM", () => {
    sdk.shutdown().catch((error) => {
      console.error("OpenTelemetry shutdown failed", error);
    });
  });
}
