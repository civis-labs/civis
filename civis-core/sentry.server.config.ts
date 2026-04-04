import * as Sentry from "@sentry/nextjs";
import { getSentryDsn } from "@/lib/env";

const dsn = getSentryDsn();

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    includeLocalVariables: false,
  });
}
