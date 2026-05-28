export function AuroraBg() {
  return (
    <>
      <style>{`
        @keyframes aurora-1 {
          0%,100% { transform: translate(-10%,-10%) scale(1.2) rotate(0deg); opacity:0.55; }
          50%      { transform: translate(8%,12%) scale(1.5) rotate(180deg); opacity:0.35; }
        }
        @keyframes aurora-2 {
          0%,100% { transform: translate(20%,5%) scale(1.3) rotate(0deg); opacity:0.4; }
          50%      { transform: translate(-15%,-8%) scale(1) rotate(-120deg); opacity:0.6; }
        }
        @keyframes aurora-3 {
          0%,100% { transform: translate(-5%,20%) scale(1) rotate(0deg); opacity:0.3; }
          50%      { transform: translate(15%,-15%) scale(1.4) rotate(90deg); opacity:0.5; }
        }
        .aurora-blob { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }
        .aurora-1 { width:60vw; height:60vw; background:radial-gradient(circle,rgba(34,197,94,0.35),transparent 70%); top:-10%; left:-10%; animation:aurora-1 18s ease-in-out infinite; }
        .aurora-2 { width:50vw; height:50vw; background:radial-gradient(circle,rgba(99,102,241,0.25),transparent 70%); top:20%; right:-5%; animation:aurora-2 22s ease-in-out infinite; }
        .aurora-3 { width:40vw; height:40vw; background:radial-gradient(circle,rgba(16,185,129,0.2),transparent 70%); bottom:0; left:20%; animation:aurora-3 16s ease-in-out infinite; }
      `}</style>
      <div aria-hidden className="fixed inset-0 overflow-hidden -z-10">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
      </div>
    </>
  );
}
