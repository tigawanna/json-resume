import { sentryInitOptions } from "@/lib/sentry/sentry-options";
import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init(sentryInitOptions());
