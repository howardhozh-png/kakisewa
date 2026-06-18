import { getLifecycleTenancies, getOwnerLeads, getAgentProfile, getSoftDeletedTenancies } from "@/lib/db";
import { effectivePlan } from "@/lib/plan-caps";
import { LifecycleBoard } from "@/components/lifecycle-board";
import { AddTenancyDialog } from "@/components/add-tenancy-dialog";
import { UploadTenancyCsvDialog } from "@/components/upload-tenancy-csv-dialog";
import { PageHelpButton } from "@/components/page-help-button";
import { DeletedTenanciesPanel } from "@/components/deleted-tenancies-panel";
import type { Tenancy, LifecycleStage } from "@/lib/types";

const DEMO_PHOTOS = [
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/owner-photos/olead_1781690971988_y18o/1781691010306.jpeg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/owner-photos/olead_1781690696774_hupx/1781690807827.jpg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/owner-photos/olead_1781684844264_vq7t/1781684845187.jpeg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/owner-photos/olead_1781629589725_6foe/1781629590341.jpeg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/documents/1781623709186-dffe98b8-c090-4e57-8a8e-7fe31197be1d.jpeg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/documents/1781620979376-f80e09db-002f-414e-ae50-f54f4ecade9c.jpeg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/owner-photos/olead_1781619461700_6iy2/1781619462625.jpeg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/documents/1781599619238-IMG-20240701-WA0113.jpg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/documents/1781599340991-WhatsApp_Image_2026-06-16_at_4.41.35_PM__3_.jpeg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/owner-photos/olead_1781598310474_6vi1/1781598310796.jpeg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/owner-photos/olead_1781598179798_ijfp/1781598180607.jpg",
  "https://rfbrkbvnjc0tr4qu.public.blob.vercel-storage.com/documents/1781534349434-WhatsApp_Image_2026-06-15_at_22.37.40__1_.jpeg",
];

function mkTenancy(
  id: string, tenant: string, prop: string, unit: string, amount: number,
  daysToEnd: number, stage: LifecycleStage, photoIdx: number,
  beds: number, baths: number, owner: string,
): Tenancy {
  return {
    id, tenant_name: tenant, tenant_phone: "", due_day: 1, amount,
    current_month_paid: false, lhdn_status: "none", status: "Pending",
    replied_tenant: stage === "renewing" ? "yes" : "pending",
    replied_owner: stage === "renewing" ? "yes" : "pending",
    lifecycle_stage: stage,
    contract_end: new Date(Date.now() + daysToEnd * 86400000).toISOString().slice(0, 10),
    property_name: prop, created_at: "",
    property: { unit, bedrooms: beds, bathrooms: baths, owner_name: owner, photo_urls: [DEMO_PHOTOS[photoIdx % DEMO_PHOTOS.length]], cover_photo_index: 0 },
  };
}

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ open?: string; highlight?: string }>;
}

export default async function TrackRenewalPage({ searchParams }: Props) {
  const { open, highlight } = await searchParams;
  const [lifecycle, ownerLeads, agentProfile, deletedTenancies] = await Promise.all([
    getLifecycleTenancies(),
    getOwnerLeads(),
    getAgentProfile().catch(() => null),
    getSoftDeletedTenancies(),
  ]);
  const plan = effectivePlan(agentProfile);

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            Existing listing
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Track every tenancy. Get alerted 60 days before any contract expires.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PageHelpButton
            variant="question"
            module={2}
            pageTitle="Existing listing — capture your passive income"
            bullets={[
              "Add each active tenancy with its contract expiry date",
              "kakisewa alerts you 60 days before any contract expires",
              "Reach out to the owner before another agent does",
              "Renew the contract and earn half a month's rent in commission. Automatically tracked.",
            ]}
          />
          <AddTenancyDialog ownerLeads={ownerLeads} />
          <UploadTenancyCsvDialog />
        </div>
      </header>

      <DeletedTenanciesPanel tenancies={deletedTenancies} />

      {lifecycle.length === 0 ? (() => {
        const demo: Tenancy[] = [
          // ── Expiring (10) ──
          mkTenancy("__d01__","Ahmad Fauzi Hassan",  "D LATOUR",             "A-25-13", 2400,  5, "headsup",  0,  2,2,"Tan Boon Huat"),
          mkTenancy("__d02__","Tan Mei Lin",         "Citizen Residence",    "B-28",    1900, 12, "headsup",  1,  1,1,"Hazwan Ismail"),
          mkTenancy("__d03__","Rajesh Kumar",        "Waltz",                "N-35-2",  2200, 20, "headsup",  2,  3,2,"Lim Ah Kow"),
          mkTenancy("__d04__","Siti Fatimah",        "H2O @ Ara Damansara",  "C-13A-08",3100, 28, "headsup",  3,  2,2,"Wong Fai Nam"),
          mkTenancy("__d05__","Nur Aisyah",          "Greenfield",           "B-13-10", 1750, 35, "headsup",  4,  2,1,"Mohd Ridzwan"),
          mkTenancy("__d06__","Lee Cheng Yin",       "Laurel",               "A-10-08", 2100, 42, "headsup",  5,  3,2,"Chan Siew Ling"),
          mkTenancy("__d07__","Goh Wei Liang",       "Verve Suite @ OKR",    "A-5-3",   2600, 50, "headsup",  6,  2,2,"Farah Nadia"),
          mkTenancy("__d08__","Yusof Bin Kassim",    "D LATOUR",             "B-15-13", 3100, 55, "headsup",  7,  3,2,"Chong Kok Weng"),
          mkTenancy("__d09__","Priya Devi",          "Citizen Residence",    "C-15-1",  2000, 58, "headsup",  8,  2,1,"Shahrul Azman"),
          mkTenancy("__d10__","Wong Kah Wai",        "H2O @ Ara Damansara",  "D-13A-10",2800, 60, "headsup",  9,  3,2,"Loh Kim Huat"),
          // ── Renewing (7) ──
          mkTenancy("__d11__","Mohd Azri Rosli",     "D LATOUR",             "A-5-10",  2800, 15, "renewing", 10, 3,2,"Nurul Huda"),
          mkTenancy("__d12__","Cheong Jia Qi",       "Greenfield",           "A-02-08", 2050, 20, "renewing",  5, 2,1,"David Tan"),
          mkTenancy("__d13__","Nurul Ain",           "H2O @ Ara Damansara",  "B-20-10", 3300, 10, "renewing",  2, 2,2,"Kumar Selvam"),
          mkTenancy("__d14__","Hazwan Ismail",       "Waltz",                "N-12-3",  1850, 25, "renewing",  0, 2,1,"Jenny Ng"),
          mkTenancy("__d15__","Kumar Selvam",        "Laurel",               "B-05-12", 2350, 18, "renewing",  9, 3,2,"Zulkifli Omar"),
          mkTenancy("__d16__","Jenny Ng Siew Ling",  "Citizen Residence",    "A-11-7",  2600, 8,  "renewing",  6, 2,2,"Mariammal Raju"),
          mkTenancy("__d17__","Zulkifli Bin Omar",   "Verve Suite @ OKR",    "B-3-11",  2100, 22, "renewing",  3, 2,1,"Farah Nadia"),
          // ── Active (13) ──
          mkTenancy("__d18__","Farah Nadia",         "D LATOUR",             "C-08-04", 2500, 95,  "active",   1, 2,2,"Ahmad Fauzi"),
          mkTenancy("__d19__","Chan Siew Ling",      "Citizen Residence",    "B-14-9",  2050, 120, "active",   2, 3,2,"Tan Mei Lin"),
          mkTenancy("__d20__","Mohd Hafiz",          "H2O @ Ara Damansara",  "C-17-11", 3300, 150, "active",   4, 2,2,"Rajesh Kumar"),
          mkTenancy("__d21__","Aisha Binti Zulkifli","Laurel",               "A-03-06", 1900, 180, "active",   7, 2,1,"Siti Fatimah"),
          mkTenancy("__d22__","David Tan",           "Waltz",                "N-07-5",  2700, 200, "active",  11, 3,2,"Nur Aisyah"),
          mkTenancy("__d23__","Lim Boon Huat",       "Greenfield",           "C-10-02", 2200, 240, "active",   8, 2,2,"Goh Wei Liang"),
          mkTenancy("__d24__","Tan Wei Jian",        "Verve Suite @ OKR",    "A-8-6",   2450, 270, "active",   5, 2,1,"Yusof Kassim"),
          mkTenancy("__d25__","Shahrul Azman",       "D LATOUR",             "A-18-10", 3500, 300, "active",   0, 3,2,"Priya Devi"),
          mkTenancy("__d26__","Mariammal Raju",      "Citizen Residence",    "C-06-3",  1800, 330, "active",  10, 2,1,"Wong Kah Wai"),
          mkTenancy("__d27__","Nurul Huda",          "H2O @ Ara Damansara",  "B-09-5",  2600, 360, "active",   3, 2,2,"Mohd Azri"),
          mkTenancy("__d28__","Chong Kok Weng",      "Laurel",               "B-11-8",  2100, 390, "active",   6, 2,1,"Cheong Jia Qi"),
          mkTenancy("__d29__","Loh Kim Huat",        "Waltz",                "N-22-7",  2800, 420, "active",   9, 3,2,"Nurul Ain"),
          mkTenancy("__d30__","Sarah Chong",         "Greenfield",           "D-04-01", 2300, 480, "active",   4, 2,2,"Hazwan Ismail"),
        ];
        return (
          <div style={{ position: "relative" }}>
            <div style={{ filter: "blur(1px) saturate(0.55)", opacity: 0.82, pointerEvents: "none", userSelect: "none" }}>
              <LifecycleBoard tenancies={demo} openTenancyId={undefined} highlightId={undefined} plan={plan} />
            </div>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", background: "linear-gradient(160deg,rgba(251,251,253,0.65) 0%,rgba(251,251,253,0.88) 50%,rgba(251,251,253,0.65) 100%)" }}>
              <div style={{ background: "var(--kk-surface)", borderRadius: 24, border: "1px solid var(--kk-line)", boxShadow: "0 20px 60px rgba(0,0,0,0.10),0 4px 16px rgba(0,0,0,0.06)", padding: "36px 44px", textAlign: "center", maxWidth: 480, width: "100%" }}>
                <div style={{ width:64, height:64, borderRadius:18, background:"var(--kk-green-soft)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
                  <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="#1F8B4C" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
                <p style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.03em", color:"var(--kk-ink)", marginBottom:10, fontFamily:"'DM Serif Display',serif" }}>Track all your managed units</p>
                <p style={{ fontSize:14, color:"var(--kk-ink-mute)", lineHeight:1.6, marginBottom:24 }}>Add your existing tenants and kakisewa tracks rent, contract dates, and alerts you 60 days before anything expires.</p>
                <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
                  <AddTenancyDialog ownerLeads={ownerLeads} />
                  <UploadTenancyCsvDialog />
                </div>
                <div style={{ marginTop:18, padding:"14px 16px", background:"var(--kk-amber-soft)", borderRadius:12, textAlign:"left", display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ fontSize:18, lineHeight:"1", flexShrink:0 }}>⏰</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--kk-amber-ink)", marginBottom:3 }}>10 minutes now, 100 listings tracked in 10 days</div>
                    <div style={{ fontSize:12, color:"var(--kk-amber-ink)", opacity:0.85, lineHeight:1.5 }}>Invest 10 minutes to add 10 of your existing tenancies. Do it for 10 days and you'll have 100 listings tracked — and you'll never miss a renewal ever again.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })() : (
        <LifecycleBoard tenancies={lifecycle} openTenancyId={open} highlightId={highlight} plan={plan} />
      )}
    </div>
  );
}
