import { getCompetitorLeads, getSoftDeletedTargetLeads, getOwnerLeads } from "@/lib/db";
import { CompetitorBoard } from "@/components/competitor-board";
import { AddCompetitorButton } from "@/components/add-competitor-button";
import { PageHelpButton } from "@/components/page-help-button";
import { DeletedOwnerLeadsPanel } from "@/components/deleted-owner-leads-panel";
import type { OwnerLead } from "@/lib/types";

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

function mkCompetitor(
  id: string, owner: string, prop: string, unit: string, rent: number,
  daysToEnd: number, cStage: "reach_out" | "renewing" | "watching", photoIdx: number,
  beds = 2, baths = 1,
): OwnerLead {
  return {
    id, owner_name: owner, owner_phone: "", property_name: prop, unit,
    expected_rent: rent, bedrooms: beds, bathrooms: baths,
    stage: "imported", is_competitor_target: true,
    competitor_stage: cStage,
    competitor_contract_end: new Date(Date.now() + daysToEnd * 86400000).toISOString().slice(0, 10),
    created_at: "", photo_urls: [DEMO_PHOTOS[photoIdx % DEMO_PHOTOS.length]], cover_photo_index: 0,
  };
}

export const dynamic = "force-dynamic";

export default async function LostListingPage({ searchParams }: { searchParams: Promise<{ highlight?: string }> }) {
  const { highlight } = await searchParams;
  const [leads, deletedLeads, ownerLeads] = await Promise.all([
    getCompetitorLeads(),
    getSoftDeletedTargetLeads(),
    getOwnerLeads(),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            Lost listing
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Track units rented by competitors. Reach out 60 days before renewal and win them over.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PageHelpButton
            variant="question"
            module={0}
            pageTitle="Target units — win over competitor properties"
            bullets={[
              "Add units you know are managed by other agents",
              "Track when their contracts expire and reach out before renewal",
              "Move leads through Watch, Reach Out, In Talks, and Won",
              "Each win is a new listing for you",
            ]}
          />
          <AddCompetitorButton ownerLeads={ownerLeads} />
        </div>
      </header>

      <DeletedOwnerLeadsPanel leads={deletedLeads} />

      {leads.length === 0 ? (
        <div style={{ position: "relative" }}>
          <div style={{ filter: "blur(1px) saturate(0.55)", opacity: 0.82, pointerEvents: "none", userSelect: "none" }}>
            <CompetitorBoard leads={[
              // ── Reach out (10) ──
              mkCompetitor("__d01__","Ahmad Fauzi Hassan",  "D LATOUR",            "A-25-13",  2400,  8,"reach_out", 0, 2,2),
              mkCompetitor("__d02__","Tan Mei Lin",         "Citizen Residence",   "B-28",     1900, 15,"reach_out", 1, 1,1),
              mkCompetitor("__d03__","Rajesh Kumar",        "Waltz",               "N-35-2",   2200, 22,"reach_out", 2, 3,2),
              mkCompetitor("__d04__","Siti Fatimah",        "H2O @ Ara Damansara", "C-13A-08", 3100, 30,"reach_out", 3, 2,2),
              mkCompetitor("__d05__","Nur Aisyah Mohamed",  "Greenfield",          "B-13-10",  1750, 38,"reach_out", 4, 2,1),
              mkCompetitor("__d06__","Lee Cheng Yin",       "Laurel",              "A-10-08",  2100, 44,"reach_out", 5, 3,2),
              mkCompetitor("__d07__","Goh Wei Liang",       "Verve Suite @ OKR",   "A-5-3",    2600, 50,"reach_out", 6, 2,2),
              mkCompetitor("__d08__","Yusof Bin Kassim",    "D LATOUR",            "B-15-13",  3100, 55,"reach_out", 7, 3,2),
              mkCompetitor("__d09__","Priya Devi",          "Citizen Residence",   "C-15-1",   2000, 58,"reach_out", 8, 2,1),
              mkCompetitor("__d10__","Wong Kah Wai",        "H2O @ Ara Damansara", "D-13A-10", 2800, 60,"reach_out", 9, 3,2),
              // ── Renewing (8) ──
              mkCompetitor("__d11__","Mohd Azri Rosli",     "D LATOUR",            "A-5-10",   2800, 12,"renewing", 10, 3,2),
              mkCompetitor("__d12__","Cheong Jia Qi",       "Greenfield",          "A-02-08",  2050, 18,"renewing",  5, 2,1),
              mkCompetitor("__d13__","Nurul Ain",           "H2O @ Ara Damansara", "B-20-10",  3300, 10,"renewing",  2, 2,2),
              mkCompetitor("__d14__","Hazwan Ismail",       "Waltz",               "N-12-3",   1850, 25,"renewing",  0, 2,1),
              mkCompetitor("__d15__","Kumar Selvam",        "Laurel",              "B-05-12",  2350, 20,"renewing",  9, 3,2),
              mkCompetitor("__d16__","Jenny Ng Siew Ling",  "Citizen Residence",   "A-11-7",   2600, 8, "renewing",  6, 2,2),
              mkCompetitor("__d17__","Zulkifli Bin Omar",   "Verve Suite @ OKR",   "B-3-11",   2100, 15,"renewing",  3, 2,1),
              mkCompetitor("__d18__","Farah Nadia Aziz",    "D LATOUR",            "C-08-04",  2500, 22,"renewing",  1, 3,2),
              // ── Watching (12) ──
              mkCompetitor("__d19__","Chan Siew Ling",      "Citizen Residence",   "B-14-9",   2050, 95, "watching",  4, 3,2),
              mkCompetitor("__d20__","Mohd Hafiz Ramli",    "H2O @ Ara Damansara", "C-17-11",  3300,120, "watching",  7, 2,2),
              mkCompetitor("__d21__","Aisha Binti Zulkifli","Laurel",              "A-03-06",  1900,150, "watching",  8, 2,1),
              mkCompetitor("__d22__","David Tan Wei Jian",  "Waltz",               "N-07-5",   2700,180, "watching", 11, 3,2),
              mkCompetitor("__d23__","Lim Boon Huat",       "Greenfield",          "C-10-02",  2200,200, "watching",  0, 2,2),
              mkCompetitor("__d24__","Tan Wei Jian",        "Verve Suite @ OKR",   "A-8-6",    2450,240, "watching",  5, 2,1),
              mkCompetitor("__d25__","Shahrul Azman",       "D LATOUR",            "A-18-10",  3500,270, "watching",  2, 3,2),
              mkCompetitor("__d26__","Mariammal Raju",      "Citizen Residence",   "C-06-3",   1800,300, "watching", 10, 2,1),
              mkCompetitor("__d27__","Nurul Huda",          "H2O @ Ara Damansara", "B-09-5",   2600,330, "watching",  3, 2,2),
              mkCompetitor("__d28__","Chong Kok Weng",      "Laurel",              "B-11-8",   2100,360, "watching",  6, 2,1),
              mkCompetitor("__d29__","Loh Kim Huat",        "Waltz",               "N-22-7",   2800,390, "watching",  9, 3,2),
              mkCompetitor("__d30__","Sarah Chong",         "Greenfield",          "D-04-01",  2300,420, "watching",  4, 2,2),
            ]} highlightId={undefined} />
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", background: "linear-gradient(160deg,rgba(251,251,253,0.65) 0%,rgba(251,251,253,0.88) 50%,rgba(251,251,253,0.65) 100%)" }}>
            <div style={{ background: "var(--kk-surface)", borderRadius: 24, border: "1px solid var(--kk-line)", boxShadow: "0 20px 60px rgba(0,0,0,0.10),0 4px 16px rgba(0,0,0,0.06)", padding: "36px 44px", textAlign: "center", maxWidth: 480, width: "100%" }}>
              <div style={{ width:64, height:64, borderRadius:18, background:"#FFF0EF", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
                <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="#C62828" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <p style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.03em", color:"var(--kk-ink)", marginBottom:10, fontFamily:"'DM Serif Display',serif" }}>Track competitor units</p>
              <p style={{ fontSize:14, color:"var(--kk-ink-mute)", lineHeight:1.6, marginBottom:24 }}>Add units managed by other agents. We'll alert you 60 days before their contract ends so you can reach out and win them over first.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
                <AddCompetitorButton ownerLeads={ownerLeads} />
              </div>
              <div style={{ marginTop:18, padding:"14px 16px", background:"var(--kk-amber-soft)", borderRadius:12, textAlign:"left", display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:18, lineHeight:"1", flexShrink:0 }}>⏰</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--kk-amber-ink)", marginBottom:3 }}>Every unit tracked is a future listing</div>
                  <div style={{ fontSize:12, color:"var(--kk-amber-ink)", opacity:0.85, lineHeight:1.5 }}>Add 10 competitor units today. In 60 days you'll have 10 owners to call at exactly the right moment — before the other agent does.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CompetitorBoard leads={leads} highlightId={highlight} />
      )}
    </div>
  );
}
