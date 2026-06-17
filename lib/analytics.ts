import type { PostHog } from "posthog-js";

export function track(ph: PostHog | null | undefined, event: string, props?: Record<string, unknown>) {
  ph?.capture(event, props);
}
