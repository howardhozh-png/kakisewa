export interface TourStep {
  key: string;
  targetId: string;
  title: string;
  body: string;
  nextLabel: string;
  // Programmatically clicks the target element when the user presses Next,
  // so the tour itself performs the UI action (expand panel, switch tab, etc.)
  clickTargetOnNext?: boolean;
}

export interface TourDef {
  id: string;
  storageKey: string;
  startPath: string;
  steps: TourStep[];
}

export const TOURS: Record<string, TourDef> = {
  "wa-blast": {
    id: "wa-blast",
    storageKey: "kk-tour-wa-blast-v1",
    startPath: "/property-leads",
    steps: [
      {
        key: "1",
        targetId: "tour-wa-blast-link-wa",
        title: "Link your WhatsApp",
        body: "Tap 'Link WhatsApp' and scan the QR code with your phone. Keep the app open on your laptop while blasting.",
        nextLabel: "Next",
      },
      {
        key: "2",
        targetId: "tour-wa-blast-send-windows",
        title: "Set your sending times",
        body: "Choose the hours you want messages to go out. Stays quiet outside those windows automatically.",
        nextLabel: "Next",
      },
      {
        key: "3",
        targetId: "tour-wa-blast-queue-tab",
        title: "Add leads to the queue",
        body: "Add leads from the table below using the WA icon on each row. They line up here and go out in order.",
        nextLabel: "Next",
      },
      {
        key: "4",
        targetId: "tour-wa-blast-activate",
        title: "Activate and let it run",
        body: "Hit Activate once your schedule is set and WhatsApp is linked. Messages go out in order, one by one.",
        nextLabel: "Done",
      },
    ],
  },
};
