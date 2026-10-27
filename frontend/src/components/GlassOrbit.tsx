import { useEffect, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Pause, Play, Sparkles } from "lucide-react";

export function GlassOrbit({
  total = 0,
  interviews = 0,
  offers = 0,
  decorative = false,
}: {
  total?: number;
  interviews?: number;
  offers?: number;
  decorative?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => setReduced(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  return (
    <div className={`orbit-scene ${paused || reduced ? "motion-paused" : ""}`}>
      <div className="orbit-art" aria-hidden="true">
        <div className="orbit-shadow" />
        <div className="orbit-ring ring-back" />
        <div className="orbit-ring ring-front" />
        <div className="orbit-core">
          <ArrowUpRight strokeWidth={1.3} />
        </div>
        <span className="orbit-glint" />
        {decorative ? (
          <>
            <div className="glass-label glass-label-top">
              <Sparkles size={15} />
              <span>A fresh perspective</span>
            </div>
            <div className="glass-label glass-label-bottom">
              <BriefcaseBusiness size={16} />
              <span>Your next opportunity</span>
            </div>
          </>
        ) : (
          <>
            <div className="glass-label glass-label-top">
              <span className="mini-icon violet">
                <BriefcaseBusiness size={15} />
              </span>
              <div>
                <strong>{interviews} interviews</strong>
                <span>Conversations in motion</span>
              </div>
            </div>
            <div className="glass-label glass-label-bottom">
              <span className="mini-icon mint">
                <Sparkles size={15} />
              </span>
              <div>
                <strong>
                  {offers} {offers === 1 ? "offer" : "offers"}
                </strong>
                <span>{total} opportunities tracked</span>
              </div>
            </div>
          </>
        )}
      </div>
      <button
        className="motion-toggle"
        aria-label={
          reduced
            ? "Reduced motion enabled"
            : paused
              ? "Play decorative animation"
              : "Pause decorative animation"
        }
        disabled={reduced}
        onClick={() => setPaused((value) => !value)}
      >
        {paused || reduced ? <Play size={12} /> : <Pause size={12} />}
      </button>
    </div>
  );
}
