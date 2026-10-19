import * as Sentry from "@sentry/tanstackstart-react";
import { sentryInitOptions } from "@/lib/sentry-options";

Sentry.init(sentryInitOptions());
