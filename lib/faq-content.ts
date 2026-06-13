export interface FaqQuestion {
  q: string;
  a: string;
}

export interface FaqSection {
  id: string;
  title: string;
  questions: FaqQuestion[];
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    questions: [
      {
        q: "What is KakiSewa?",
        a: "KakiSewa is a rental management app built for Malaysian property agents. It helps you track new owner leads across My pipeline, manage existing tenancies, monitor target listings, and send professional property and tenant packs — all from one dashboard.",
      },
      {
        q: "Who is KakiSewa designed for?",
        a: "KakiSewa is built for REN/REA-licensed property agents in Malaysia who manage residential rentals. It works best for agents handling multiple properties across different owners and tenants.",
      },
      {
        q: "How do I complete my agent profile?",
        a: "Go to Settings > Account. Fill in your name, phone number, and REN/REA number. A complete profile unlocks your public agent directory listing (Platinum and Elite plans) so owners and tenants can find you.",
      },
      {
        q: "What is the trial period?",
        a: "New accounts get a free trial so you can explore all features before subscribing. You will see a countdown banner at the top of the app when your trial is near expiry. Go to Subscription to choose a plan before the trial ends.",
      },
    ],
  },
  {
    id: "my-listing",
    title: "My listing",
    questions: [
      {
        q: "What is My listing?",
        a: "My listing is the Kanban board inside My pipeline for tracking potential new property listings. Each card represents one property you are pitching to an owner. Move cards through stages as you progress from first contact to signing the agency agreement.",
      },
      {
        q: "How do I add a new listing card?",
        a: "Tap the '+' or 'Add listing' button at the top of the board. Enter the property name, owner contact, and any known details. The card will appear in the first stage of your pipeline.",
      },
      {
        q: "How do I move a card to the next stage?",
        a: "Drag the card to a new column, or open the card and use the stage selector to move it. On mobile, use the move button inside the card detail view.",
      },
      {
        q: "How do I send a WhatsApp message to an owner?",
        a: "Open the card and tap the WhatsApp icon. KakiSewa opens WhatsApp Web (or your phone's WhatsApp) with a pre-filled message from your template. Tap Send inside WhatsApp to deliver it.",
      },
      {
        q: "How do I send a property pack to an owner?",
        a: "Open the listing card and tap 'Send property pack'. KakiSewa generates a professional summary of the property and your agency details, then opens WhatsApp with a message for the owner.",
      },
      {
        q: "How do I track whether an owner has replied?",
        a: "When a WhatsApp reply arrives, open the card and use the T (tenant) or O (owner) reply chips to log the response. KakiSewa can also auto-classify replies as Yes / No / Unclear using AI when WhatsApp is connected.",
      },
      {
        q: "What happens when a competitor rents a unit I was tracking?",
        a: "Open the card and tap 'Competitor rented'. Enter the rental date and duration. The card moves to Target listing and KakiSewa will remind you 60 days before that tenancy ends — so you can approach the owner again when the unit is coming vacant.",
      },
      {
        q: "How do I import multiple listings at once?",
        a: "Tap the import button (top-right of the board). Upload a CSV with columns: owner_name, owner_phone, property_name, unit, expected_rent, bedrooms, bathrooms. Download the template from the import dialog if you are unsure of the format.",
      },
    ],
  },
  {
    id: "existing-listing",
    title: "Existing listing",
    questions: [
      {
        q: "What is Existing listing?",
        a: "Existing listing tracks all the tenancies you currently manage. It shows renewal timelines, helps you send check-in messages, and moves expiring contracts into a follow-up queue automatically 60 days before they end.",
      },
      {
        q: "How do I add a tenancy?",
        a: "Tap 'Add tenancy' and fill in the property, owner, tenant, start date, and duration. KakiSewa calculates the end date and sets a 60-day reminder automatically.",
      },
      {
        q: "How does the renewal pipeline work?",
        a: "Tenancies within 60 days of their end date move to 'Follow-up' automatically. Send WhatsApp check-ins, track replies with the T/O chips, then move the card through Pinged > Renewing once both sides confirm. Confirming commission resets the card to Active with the new end date.",
      },
      {
        q: "How do I send a renewal reminder to a tenant or owner?",
        a: "Open the tenancy card and tap the WhatsApp icon. Choose whether to message the owner or the tenant. KakiSewa prefills your renewal message template and opens WhatsApp ready to send.",
      },
      {
        q: "Can I track multiple properties under the same owner?",
        a: "Yes. Each property is a separate card. You can filter by owner name to see all their units at once. When a tenant leaves (Replacing stage), a new listing is auto-created in My listing under the same owner.",
      },
      {
        q: "How is commission calculated?",
        a: "By default, 1 month's rent equals 100% commission. You can override the percentage per deal in the tenancy card's edit dialog, or change your agency default under Settings > Goals > Commission %.",
      },
    ],
  },
  {
    id: "target-listing",
    title: "Target listing",
    questions: [
      {
        q: "What is Target listing?",
        a: "Target listing tracks properties managed by a competitor where the current tenancy will end soon. When a competitor rents a unit you were tracking in My listing, the card moves here so you know when to approach the owner again.",
      },
      {
        q: "How does a card move into Target listing?",
        a: "From a My listing card, tap 'Competitor rented', enter the rental date and duration. The card moves to Target listing. KakiSewa calculates the end date and will remind you 60 days before that tenancy finishes.",
      },
      {
        q: "How do I move a target card back to My listing?",
        a: "When the time is right, open the target card and tap 'Move to pipeline'. A new card is created in My listing so you can start approaching the owner again.",
      },
      {
        q: "Will I be notified when a target tenancy is about to end?",
        a: "Yes. KakiSewa sends you a push or email notification 60 days before the competitor's tenancy ends. Make sure notifications are enabled in Settings > Notifications.",
      },
    ],
  },
  {
    id: "directory",
    title: "Directory",
    questions: [
      {
        q: "What is the Directory?",
        a: "The Directory gives you a searchable list of all your tenants, all your properties, and your saved service contacts (plumbers, electricians, etc.) in one place.",
      },
      {
        q: "How do I find a tenant's contact details?",
        a: "Go to Directory > Tenants and search by name or property. Tap a tenant card to see their phone, email, and active tenancy details.",
      },
      {
        q: "How do I search for a property?",
        a: "Go to Directory > Properties and type the property name or address in the search bar. You will see all units under that property and their current tenancy status.",
      },
      {
        q: "What are service contacts?",
        a: "Service contacts are the vendors and contractors you work with — plumbers, electricians, cleaners, etc. Save them in Directory > Contacts so they are always one tap away when an owner or tenant needs a repair.",
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    questions: [
      {
        q: "How do I turn on email notifications?",
        a: "Go to Settings > Notifications. Toggle on 'Email notifications'. KakiSewa will send renewal reminders and important alerts to your registered email address.",
      },
      {
        q: "How do I enable push notifications on iPhone?",
        a: "Install KakiSewa as a PWA first: open Safari, tap the Share button, then 'Add to Home Screen'. Open the app from your Home Screen, go to Settings > Notifications, and tap 'Enable push notifications'. iOS will ask for permission — tap Allow.",
      },
      {
        q: "How do I enable push notifications on Android?",
        a: "Open KakiSewa in Chrome, tap the three-dot menu, and select 'Add to Home Screen'. Open the installed app, go to Settings > Notifications, and tap 'Enable push notifications'. Android will ask for permission — tap Allow.",
      },
      {
        q: "How do I enable push notifications on a desktop computer?",
        a: "Open KakiSewa in Chrome or Edge. Go to Settings > Notifications and tap 'Enable push notifications'. Your browser will ask for permission in the address bar — click Allow. Notifications will appear even when the browser tab is in the background.",
      },
      {
        q: "What notifications will I receive?",
        a: "KakiSewa notifies you when an existing listing enters the 60-day renewal window, when a WhatsApp reply is received (if connected), and when a target listing is close to becoming vacant. You can choose email, push, or both in Settings > Notifications.",
      },
      {
        q: "Why am I not receiving notifications even though they are turned on?",
        a: "On iPhone, notifications only work when KakiSewa is installed as a PWA from Safari's 'Add to Home Screen'. Opening it in the browser tab does not support push. Also check that your device's system notification settings allow KakiSewa (or your browser) to send notifications.",
      },
    ],
  },
  {
    id: "message-templates",
    title: "Message templates",
    questions: [
      {
        q: "What are message templates?",
        a: "Message templates are pre-written WhatsApp messages that KakiSewa uses when you tap the WhatsApp button on a card. They are personalised automatically with the owner's or tenant's name and property details.",
      },
      {
        q: "Where do I find and edit my message templates?",
        a: "Go to Settings > Templates. You will see separate templates for owner outreach, tenant check-in, renewal reminders, and more. Edit the text and use the placeholder tags shown to insert dynamic values like {owner_name} or {property}.",
      },
      {
        q: "Can I have different templates for owners and tenants?",
        a: "Yes. KakiSewa has separate templates for owner messages and tenant messages. You can customise each one independently from Settings > Templates.",
      },
    ],
  },
  {
    id: "property-pack",
    title: "Property pack",
    questions: [
      {
        q: "What is a property pack?",
        a: "A property pack is a professional summary you send to a property owner. It includes your agency details, the property listing information, and your pitch — presented in a clean, shareable format.",
      },
      {
        q: "How do I send a property pack to an owner?",
        a: "Open the listing card in My listing and tap 'Send property pack'. KakiSewa generates the pack and opens WhatsApp with a message ready to send to the owner.",
      },
      {
        q: "What does the owner see when they open the property pack?",
        a: "The owner sees a web page with your agency branding, the property details, your contact information, and a brief summary of your services. It is designed to look professional and build trust.",
      },
    ],
  },
  {
    id: "tenant-pack",
    title: "Tenant pack",
    questions: [
      {
        q: "What is a tenant pack?",
        a: "A tenant pack is a collection of tenant profiles you send to a property owner (landlord) so they can review and choose a tenant. It includes each tenant's background, budget, and preferences in a clean format.",
      },
      {
        q: "How do I send a tenant pack to a landlord?",
        a: "Go to the relevant property listing, select the tenants you want to include, and tap 'Send tenant pack'. KakiSewa generates the pack and opens WhatsApp with a message for the landlord.",
      },
      {
        q: "How do I rank or prioritise tenants in the pack?",
        a: "In the tenant selection screen, drag and drop tenants to reorder them. The landlord will see them in the order you set, with your top pick listed first.",
      },
      {
        q: "What does the landlord see in the tenant pack?",
        a: "The landlord sees a web page with each tenant's name, occupation, income range, occupant count, pets and smoking status, preferred move-in date, and any notes you have added. They can contact you directly from the page.",
      },
    ],
  },
  {
    id: "performance",
    title: "Performance dashboard",
    questions: [
      {
        q: "What is the performance dashboard?",
        a: "The performance dashboard shows your key rental metrics: total active listings, renewals completed, pipeline conversion rate, and commission earned this month and year.",
      },
      {
        q: "Who can access the performance dashboard?",
        a: "The performance dashboard is available on the Elite plan. If you are on a lower plan, upgrade to Elite in the Subscription page to unlock it.",
      },
      {
        q: "What data does it show?",
        a: "It shows your commission forecast for the next 90 days, your renewal success rate, your average time-to-close on new listings, and your monthly trends over the past 12 months.",
      },
    ],
  },
  {
    id: "whatsapp-setup",
    title: "WhatsApp Web setup",
    questions: [
      {
        q: "How does the WhatsApp integration work?",
        a: "When you tap the WhatsApp button on a card, KakiSewa opens WhatsApp Web (or your phone's WhatsApp app) with a pre-filled message. You review it and tap Send inside WhatsApp. KakiSewa does not send messages directly on your behalf.",
      },
      {
        q: "Why does clicking Send open a new tab?",
        a: "KakiSewa uses wa.me links which open WhatsApp Web in a new tab on desktop, or the WhatsApp app on mobile. Make sure you are logged into WhatsApp Web in your browser for this to work smoothly.",
      },
      {
        q: "How do I set up WhatsApp Web?",
        a: "Open web.whatsapp.com in your browser. On your phone, open WhatsApp > Settings > Linked Devices > Link a Device. Scan the QR code shown in the browser. Once linked, KakiSewa's WhatsApp buttons will open directly in the linked session.",
      },
      {
        q: "Can KakiSewa send WhatsApp messages automatically?",
        a: "Not at this time. KakiSewa opens WhatsApp with the message pre-filled so you remain in control of what is sent. This also avoids spam policy violations with WhatsApp.",
      },
    ],
  },
  {
    id: "subscription",
    title: "Subscription and billing",
    questions: [
      {
        q: "What plans are available?",
        a: "KakiSewa offers four plans: Silver (RM30/month), Gold (RM99/month), Platinum (RM179/month), and Elite (RM299/month). All plans include email and push notifications. Annual billing saves you 2 months of fees. See the Subscription page for the full comparison.",
      },
      {
        q: "How many cards can I have on each plan?",
        a: "Silver: 70 total (40 My listing + 20 Existing listing + 10 Target listing). Gold: 200 total (100 + 60 + 40). Platinum: 600 total (300 + 200 + 100). Elite: 2,000 total (800 + 700 + 500).",
      },
      {
        q: "What happens if I reach my card limit?",
        a: "KakiSewa will show an upgrade prompt when you try to add a new card. You can archive older cards to free up space, or upgrade your plan for a higher limit.",
      },
      {
        q: "How do I upgrade my plan?",
        a: "Go to Subscription and tap 'Upgrade'. Choose your plan and billing cycle (monthly or annual). You will be taken to the Stripe payment page. Once payment is confirmed, your new limits apply immediately.",
      },
      {
        q: "How do I access my billing details or cancel?",
        a: "Go to Subscription and tap 'Manage billing'. This opens the Stripe customer portal where you can update your payment method, download invoices, or cancel your subscription.",
      },
    ],
  },
  {
    id: "account-settings",
    title: "Account and settings",
    questions: [
      {
        q: "How do I update my name or profile photo?",
        a: "Go to Settings > Account. Tap your name or photo to edit. Your profile name appears on property packs and tenant packs sent to owners.",
      },
      {
        q: "Where do I enter my REN or REA number?",
        a: "Go to Settings > Account > REN/REA number. This is required to complete your agent profile and is displayed on your public agent listing (Platinum and Elite plans).",
      },
      {
        q: "How do I manage my notification preferences?",
        a: "Go to Settings > Notifications. You can toggle email notifications and push notifications independently. Push notifications require the app to be installed as a PWA and browser/device permission to be granted.",
      },
      {
        q: "Is my data secure?",
        a: "Yes. All data is stored in Supabase, a managed cloud database with encryption at rest, daily backups, and row-level security so only you can see your own records. No one else — including the KakiSewa team — can read your client data without your permission. You can export your data to CSV at any time.",
      },
    ],
  },
];

export const FAQ_CONTEXT = FAQ_SECTIONS.map(
  (s) =>
    `## ${s.title}\n\n${s.questions
      .map((q) => `Q: ${q.q}\nA: ${q.a}`)
      .join("\n\n")}`
).join("\n\n---\n\n");
