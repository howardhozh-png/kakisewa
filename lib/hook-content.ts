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
      { text: "RM1/day", color: "#34C759" },
      { text: " gets back the ", small: true },
      { text: "RM150,000", color: "#FF3B30" },
      { text: " I lost last year.", small: true },
    ],
  },
  {
    parts: [
      { text: "I thought I could track all 50 units. ", small: true },
      { text: "I lost almost all of them.", color: "#FF3B30" },
    ],
  },
  {
    parts: [
      { text: "WhatsApp just added usernames.", small: true },
      { text: " Your ", small: true },
      { text: "existing listings", color: "#34C759" },
      { text: " are now your ", small: true },
      { text: "income.", color: "#34C759" },
    ],
    sub: "Cold outreach may never be the same. Agents who protect their renewals today are the ones who still have income tomorrow.",
  },
];
