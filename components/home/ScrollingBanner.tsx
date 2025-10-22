"use client";

const SCROLLING_TEXT = [
  "REP YOUR CITY",
  "REP YOUR TEAM",
  "GAME RECOGNIZE GAME",
  "STYLE IN MOTION",
  "BUILT DIFFERENT",
  "NVRSTL ENERGY",
  "WEAR THE WIN",
];

export function ScrollingBanner() {
  return (
    <section className="bg-gray-900 py-8">
      <div className="relative overflow-hidden">
        {/* Track holds two identical groups */}
        <div className="marquee" role="marquee" aria-label="Scrolling benefits">
          <MarqueeGroup />
          <MarqueeGroup ariaHidden />
        </div>
      </div>
    </section>
  );
}

function MarqueeGroup({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div
      className="marquee-group"
      aria-hidden={ariaHidden ? "true" : undefined}
    >
      {SCROLLING_TEXT.map((t, i) => (
        <div key={`${t}-${i}`} className="marquee-item">
          <span>{t}</span>
          <span className="mx-6 select-none" aria-hidden="true">
            ◆
          </span>
        </div>
      ))}
    </div>
  );
}
