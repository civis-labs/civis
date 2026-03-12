import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://fec9646bf853bd52880e3d97ec755f68@o4511034049757184.ingest.us.sentry.io/4511034056179712",
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
