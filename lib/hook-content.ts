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
      { text: "You're sending WhatsApp to ", small: true },
      { text: "100 owners.", color: "#FF3B30" },
      { text: " One by one. Manually.", small: true },
    ],
  },
  {
    parts: [
      { text: "You lost track of ", small: true },
      { text: "100 listings.", color: "#FF3B30" },
      { text: " Lost the renewal income.", small: true },
    ],
    sub: "On average, agents lose 50 to 70% of their contract renewals every year.",
  },
  {
    parts: [
      { text: "Photos, contracts, expiry dates — ", small: true },
      { text: "no one place to store them.", color: "#FF3B30" },
    ],
  },
  {
    parts: [
      { text: "At ", small: true },
      { text: "RM1/day,", color: "#34C759" },
      { text: " get back ", small: true },
      { text: "RM5,000 to RM10,000", color: "#34C759" },
      { text: " a month.", small: true },
    ],
    sub: "RM3,000 average commission. Protected, automatically.",
  },
];
