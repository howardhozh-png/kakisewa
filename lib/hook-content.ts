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
      { text: "You're sending messages to ", small: true },
      { text: "100 owners manually", color: "#FF3B30" },
      { text: " everyday.", small: true },
    ],
  },
  {
    parts: [
      { text: "You lost track of ", small: true },
      { text: "100 rent renewals,", color: "#FF3B30" },
      { text: " that's ", small: true },
      { text: "RM300k/year.", color: "#FF3B30" },
    ],
  },
  {
    parts: [
      { text: "Photos, contracts, expiry dates.", small: true },
      { text: "messily stored", color: "#FF3B30" },
      { text: " all over ", small: true },
      { text: "WhatsApp.", color: "#FF3B30" },
    ],
  },
  {
    parts: [
      { text: "Invest ", small: true },
      { text: "RM1/day", color: "#34C759" },
      { text: " and kakisewa ", small: true },
      { text: "solve all of them.", color: "#34C759" },
    ],
    sub: "RM3,000 average commission. Protected, automatically.",
  },
];
