export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

export function trackEvent(event: AnalyticsEvent) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", event.name, event.properties);
  }
}
