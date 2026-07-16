// Shared loss-aversion hook copy — used on the landing page hero carousel and
// reused as reinforcement callouts on the sign-up page, so the same specific
// numbers/wording appear in both places instead of drifting into two copies.
export interface StoryBeatPart {
  text: string;
  color?: string;
  // Renders at a reduced size — for connective black text on beats that
  // otherwise wrap too many lines on mobile, while colored keywords stay
  // at full size.
  small?: boolean;
}

export interface StoryBeat {
  parts: StoryBeatPart[];
  sub?: string;
}

export const STORY_BEATS: StoryBeat[] = [
  {
    parts: [
      { text: "You forgot to message the owner. ", small: true },
      { text: "Again.", color: "#FF3B30" },
    ],
    sub: "kakisewa reminds you 60 and 30 days before every tenancy expires, so you reach out first, every time.",
  },
  {
    parts: [
      { text: "That's how the average agent loses ", small: true },
      { text: "70%", color: "#FF3B30" },
      { text: " of their existing listings.", small: true },
    ],
  },
  {
    parts: [
      { text: "RM1/day", color: "#34C759" },
      { text: " gets back the ", small: true },
      { text: "RM150,000" },
      { text: " a year at stake.", small: true },
    ],
    sub: "RM3,000 average commission x 50 listings a year.",
  },
];
