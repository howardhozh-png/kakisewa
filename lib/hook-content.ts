// Shared loss-aversion hook copy — used on the landing page hero carousel and
// reused as reinforcement callouts on the sign-up page, so the same specific
// numbers/wording appear in both places instead of drifting into two copies.
export interface StoryBeat {
  quote: string;
  emphasis: string;
  accentColor: string;
  quotePost?: string;
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
    quotePost: "I get passive income just by tracking existing listings.",
    accentColor: "#0071E3",
  },
  {
    quote: "WhatsApp just added usernames.",
    emphasis: "Your existing listings are now your income.",
    accentColor: "#FF9500",
    sub: "Cold outreach may never be the same. Agents who protect their renewals today are the ones who still have income tomorrow.",
  },
];
