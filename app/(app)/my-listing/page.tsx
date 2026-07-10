import { getOwnerLeads, getTenantsForOwnerLeads, getRankedLeadIds, getSoftDeletedMyListingLeads, getAgentProfile } from "@/lib/db";
import { checkCardCap } from "@/lib/plan-caps";
import { OwnerPipelineBoard } from "@/components/owner-pipeline-board";
import { AddListingButton } from "@/components/add-listing-button";
import { PageHelpButton } from "@/components/page-help-button";
import { DeletedOwnerLeadsPanel } from "@/components/deleted-owner-leads-panel";
import { ShareBoardButton } from "@/components/share-board-button";
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

function mkLead(
  id: string, owner: string, prop: string, unit: string, rent: number,
  beds: number, baths: number, stage: "listed" | "matched", photoIdx: number,
): OwnerLead {
  return {
    id, owner_name: owner, owner_phone: "", property_name: prop, unit,
    expected_rent: rent, bedrooms: beds, bathrooms: baths,
    stage, source: "manual", outreach_count: 1,
    created_at: "", photo_urls: [DEMO_PHOTOS[photoIdx % DEMO_PHOTOS.length]], cover_photo_index: 0,
  };
}

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ open?: string; highlight?: string }>;
}

export default async function TrackListingPage({ searchParams }: Props) {
  const { open, highlight } = await searchParams;
  const [ownerLeads, rankedLeadIds, deletedLeads, capStatus, agentProfile] = await Promise.all([
    getOwnerLeads(),
    getRankedLeadIds(),
    getSoftDeletedMyListingLeads(),
    checkCardCap(),
    getAgentProfile(),
  ]);
  const matchedLeadIds = ownerLeads.filter((l) => l.stage === "matched").map((l) => l.id);
  const tenantsByLeadId = await getTenantsForOwnerLeads(matchedLeadIds);
  const boardCardLeads = ownerLeads.filter((l) =>
    !l.is_competitor_target &&
    (l.stage === "listed" || (l.stage === "matched" && !l.has_active_tenancy))
  );

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div id="tour-my-listing-header">
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            My listing
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Send your tenant pack and track every active listing.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PageHelpButton
            variant="question"
            module={1}
            pageTitle="My listing — send your tenant pack"
            bullets={[
              "Move owners here once they respond and want to proceed",
              "Send your branded tenant pack link to build trust and credibility",
              "kakisewa auto-tracks when owners open your pack and their interest level",
              "Once matched with a tenant, the deal moves to Existing listing",
            ]}
          />
          <ShareBoardButton
            initialSlug={agentProfile.board_slug ?? null}
            initialPasscode={agentProfile.board_passcode ?? null}
          />
          <AddListingButton ownerLeads={ownerLeads} />
        </div>
      </header>

      <DeletedOwnerLeadsPanel leads={deletedLeads} />

      {boardCardLeads.length === 0 ? (
        <div style={{ position: "relative" }}>
          <div style={{ filter: "blur(1px) saturate(0.55)", opacity: 0.82, pointerEvents: "none", userSelect: "none" }}>
            <OwnerPipelineBoard
              leads={[
                // ── Listed (20) ──
                mkLead("__d01__","Ahmad Fauzi Hassan",  "D LATOUR",            "A-25-13",  3200, 3,2,"listed",   0),
                mkLead("__d02__","Tan Mei Lin",         "Citizen Residence",   "B-28",     2400, 1,1,"listed",   1),
                mkLead("__d03__","Rajesh Kumar",        "Waltz",               "N-35-2",   2800, 3,2,"listed",   2),
                mkLead("__d04__","Siti Fatimah",        "H2O @ Ara Damansara", "C-13A-08", 3500, 2,2,"listed",   3),
                mkLead("__d05__","Nur Aisyah Mohamed",  "Greenfield",          "B-13-10",  2100, 2,1,"listed",   4),
                mkLead("__d06__","Lee Cheng Yin",       "Laurel",              "A-10-08",  2600, 3,2,"listed",   5),
                mkLead("__d07__","Goh Wei Liang",       "Verve Suite @ OKR",   "A-5-3",    3100, 2,2,"listed",   6),
                mkLead("__d08__","Yusof Bin Kassim",    "D LATOUR",            "B-15-13",  3800, 3,2,"listed",   7),
                mkLead("__d09__","Priya Devi",          "Citizen Residence",   "C-15-1",   2300, 2,1,"listed",   8),
                mkLead("__d10__","Wong Kah Wai",        "H2O @ Ara Damansara", "D-13A-10", 3200, 3,2,"listed",   9),
                mkLead("__d11__","Mohd Azri Rosli",     "D LATOUR",            "A-5-10",   3500, 3,2,"listed",  10),
                mkLead("__d12__","Cheong Jia Qi",       "Greenfield",          "A-02-08",  2400, 2,1,"listed",  11),
                mkLead("__d13__","Nurul Ain",           "H2O @ Ara Damansara", "B-20-10",  3900, 2,2,"listed",   0),
                mkLead("__d14__","Hazwan Ismail",       "Waltz",               "N-12-3",   2200, 2,1,"listed",   1),
                mkLead("__d15__","Kumar Selvam",        "Laurel",              "B-05-12",  2700, 3,2,"listed",   2),
                mkLead("__d16__","Jenny Ng Siew Ling",  "Citizen Residence",   "A-11-7",   3100, 2,2,"listed",   3),
                mkLead("__d17__","Zulkifli Bin Omar",   "Verve Suite @ OKR",   "B-3-11",   2500, 2,1,"listed",   4),
                mkLead("__d18__","Farah Nadia Aziz",    "D LATOUR",            "C-08-04",  3200, 3,2,"listed",   5),
                mkLead("__d19__","Chan Siew Ling",      "Citizen Residence",   "B-14-9",   2400, 2,2,"listed",   6),
                mkLead("__d20__","Mohd Hafiz Ramli",    "H2O @ Ara Damansara", "C-17-11",  3700, 2,2,"listed",   7),
                // ── Rented (10) ──
                mkLead("__d21__","Aisha Binti Zulkifli","Laurel",              "A-03-06",  2200, 2,1,"matched",  8),
                mkLead("__d22__","David Tan Wei Jian",  "Waltz",               "N-07-5",   3000, 3,2,"matched",  9),
                mkLead("__d23__","Lim Boon Huat",       "Greenfield",          "C-10-02",  2600, 2,2,"matched", 10),
                mkLead("__d24__","Tan Wei Jian",        "Verve Suite @ OKR",   "A-8-6",    2900, 2,1,"matched", 11),
                mkLead("__d25__","Shahrul Azman",       "D LATOUR",            "A-18-10",  4200, 3,2,"matched",  0),
                mkLead("__d26__","Mariammal Raju",      "Citizen Residence",   "C-06-3",   2100, 2,1,"matched",  1),
                mkLead("__d27__","Nurul Huda",          "H2O @ Ara Damansara", "B-09-5",   3100, 2,2,"matched",  2),
                mkLead("__d28__","Chong Kok Weng",      "Laurel",              "B-11-8",   2500, 2,1,"matched",  3),
                mkLead("__d29__","Loh Kim Huat",        "Waltz",               "N-22-7",   3300, 3,2,"matched",  4),
                mkLead("__d30__","Sarah Chong",         "Greenfield",          "D-04-01",  2700, 2,2,"matched",  5),
              ]}
              openLeadId={undefined}
              highlightId={undefined}
              tenantsByLeadId={{}}
              rankedLeadIds={new Set<string>()}
            />
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", background: "linear-gradient(160deg,rgba(251,251,253,0.65) 0%,rgba(251,251,253,0.88) 50%,rgba(251,251,253,0.65) 100%)" }}>
            <div style={{ background: "var(--kk-surface)", borderRadius: 24, border: "1px solid var(--kk-line)", boxShadow: "0 20px 60px rgba(0,0,0,0.10),0 4px 16px rgba(0,0,0,0.06)", padding: "36px 44px", textAlign: "center", maxWidth: 480, width: "100%" }}>
              <div style={{ width:64, height:64, borderRadius:18, background:"var(--kk-theme-light)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
                <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="var(--kk-theme-dark)" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <p style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.03em", color:"var(--kk-ink)", marginBottom:10, fontFamily:"'DM Serif Display',serif" }}>Add all your active deals</p>
              <p style={{ fontSize:14, color:"var(--kk-ink-mute)", lineHeight:1.6, marginBottom:24 }}>Owner confirmed? Add your listing here and match it with tenants. Every deal you track here is a commission in the making.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
                <AddListingButton ownerLeads={ownerLeads} />
              </div>
              <div style={{ marginTop:18, padding:"14px 16px", background:"var(--kk-amber-soft)", borderRadius:12, textAlign:"left", display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:18, lineHeight:"1", flexShrink:0 }}>⏰</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--kk-amber-ink)", marginBottom:3 }}>10 listings here means 10 active commissions</div>
                  <div style={{ fontSize:12, color:"var(--kk-amber-ink)", opacity:0.85, lineHeight:1.5 }}>Add one every time an owner says yes. Ten confirmed listings tracked here is ten commissions in the pipeline — and none of them will fall through the cracks.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <OwnerPipelineBoard
          leads={ownerLeads}
          openLeadId={open}
          highlightId={highlight}
          tenantsByLeadId={tenantsByLeadId}
          rankedLeadIds={rankedLeadIds}
          capStatus={capStatus}
        />
      )}
    </div>
  );
}
