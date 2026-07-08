// Shared loss-aversion hook copy — used on the landing page hero carousel and
// reused as reinforcement callouts on the sign-up page, so the same specific
// numbers/wording appear in both places instead of drifting into two copies.
export interface StoryBeatPart {
  text: string;
  color?: string;
}

export interface StoryBeat {
  parts: StoryBeatPart[];
  sub?: string;
}

export const STORY_BEATS: StoryBeat[] = [
  {
    parts: [
      { text: "I lost " },
      { text: "RM150,000", color: "#FF3B30" },
      { text: " last year. I didn't know." },
    ],
  },
  {
    parts: [
      { text: "I thought I could track all 50 units. " },
      { text: "I lost almost all of them.", color: "#FF3B30" },
    ],
  },
  {
    parts: [
      { text: "With " },
      { text: "RM1/day,", color: "#34C759" },
      { text: " I get " },
      { text: "passive income", color: "#34C759" },
      { text: " just by tracking existing listings." },
    ],
  },
  {
    parts: [
      { text: "WhatsApp", color: "#FF3B30" },
      { text: " just added " },
      { text: "usernames.", color: "#FF3B30" },
      { text: " Your " },
      { text: "existing listings", color: "#34C759" },
      { text: " are now your " },
      { text: "income.", color: "#34C759" },
    ],
    sub: "Cold outreach may never be the same. Agents who protect their renewals today are the ones who still have income tomorrow.",
  },
];
