// Shared loss-aversion hook copy — used on the landing page hero carousel and
// reused as reinforcement callouts on the sign-up page, so the same specific
// numbers/wording appear in both places instead of drifting into two copies.
export interface StoryBeat {
  quote: string;
  emphasis: string;
  accentColor: string;
  quotePost?: string;
  // Second highlighted phrase, for beats that need two colored spans
  // instead of one (e.g. "RM1/day" and "passive income" both highlighted).
  emphasis2?: string;
  quotePost2?: string;
  sub?: string;
}

export const STORY_BEATS: StoryBeat[] = [
  {
    quote: "I lost",
    emphasis: "RM150,000",
    quotePost: "last year. I didn't know.",
    accentColor: "#FF3B30",
  },
  {
    quote: "I thought I could track all 50 units.",
    emphasis: "I lost almost all of them.",
    accentColor: "#FF3B30",
  },
  {
    quote: "With",
    emphasis: "RM1/day,",
    quotePost: "I get",
    emphasis2: "passive income",
    quotePost2: "just by tracking existing listings.",
    accentColor: "#34C759",
  },
  {
    quote: "WhatsApp just added usernames.",
    emphasis: "Your existing listings are now your income.",
    accentColor: "#34C759",
    sub: "Cold outreach may never be the same. Agents who protect their renewals today are the ones who still have income tomorrow.",
  },
];
