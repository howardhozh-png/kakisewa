export interface TourStep {
  key: string;
  targetId: string;
  title: string;
  body: string;
  nextLabel: string;
  // If true, programmatically clicks the target element when the user
  // hits Next — so the tour itself opens/activates the UI, not the user
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
        targetId: "tour-wa-blast-header",
        title: "Meet WA AutoBlast",
        body: "Automatically send WhatsApp messages to your owner leads while you focus on closing deals.",
        nextLabel: "Open it",
        clickTargetOnNext: true, // expands the panel
      },
      {
        key: "2",
        targetId: "tour-wa-blast-activate",
        title: "Activate the blast",
        body: "Once your schedule is set and WhatsApp is linked, tap this to start. Messages go out in order during your sending windows.",
        nextLabel: "See the queue",
        clickTargetOnNext: true, // switches to queue tab
      },
      {
        key: "3",
        targetId: "tour-wa-blast-queue-tab",
        title: "Your outreach queue",
        body: "Every lead here gets a WhatsApp in order. Add leads from the table or bulk-select to queue them all at once.",
        nextLabel: "Next",
      },
      {
        key: "4",
        targetId: "tour-wa-blast-queue-content",
        title: "Track who was contacted",
        body: "Leads that received a message show up here with the exact time it was sent. No more guessing who was contacted.",
        nextLabel: "Done",
      },
    ],
  },
};
