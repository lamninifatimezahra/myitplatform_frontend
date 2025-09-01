"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";

/**
 * SectionRail — barre façon onglets Excel + auto-scroll/spy
 *
 * Props:
 * - sections: [{ key, label, dot?: string (tailwind bg-*), ref: React.RefObject<HTMLElement> }]
 * - scrollContainerRef: ref du conteneur scrollable (ex: <main ref={...} />)
 * - anchorSelector: string CSS pour caler la largeur/position (ex: "[data-graph-id='graph-vue-ensemble']")
 * - initialActiveKey?: string
 * - onActiveChange?: (key) => void
 */
export default function SectionRail({
  sections = [],
  scrollContainerRef,
  anchorSelector = "[data-graph-id='graph-vue-ensemble']",
  initialActiveKey,
  onActiveChange,
}) {
  // Dots par défaut si non fournis
  const tabs = useMemo(() => {
    const defaults = ["bg-indigo-600", "bg-sky-500", "bg-emerald-500"];
    return sections.map((s, i) => ({
      ...s,
      dot: s.dot || defaults[i % defaults.length],
    }));
  }, [sections]);

  const [active, setActive] = useState(
    initialActiveKey ?? (tabs[0] ? tabs[0].key : null)
  );

  // Positionnement aligné au 1er graphe (largeur + X)
  const [pos, setPos] = useState({ left: 0, width: 0 });
  const measure = () => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(anchorSelector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(anchorSelector);
    if (!el) return;

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const onResize = () => measure();
    const onLoad = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onLoad);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onLoad);
    };
  }, [anchorSelector]);

  // Hide on downward scroll
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const scroller = scrollContainerRef?.current || window;
    let last = scroller === window ? window.scrollY : scroller.scrollTop;
    const onScroll = () => {
      const cur = scroller === window ? window.scrollY : scroller.scrollTop;
      const delta = cur - last;
      if (Math.abs(delta) > 10) setHidden(delta > 0);
      last = cur;
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef]);

  // Scroll spy via IntersectionObserver (dominant)
  useEffect(() => {
    const root = scrollContainerRef?.current;
    if (!root || !tabs.length) return;

    const map = tabs
      .map((t) => ({ key: t.key, el: t.ref?.current }))
      .filter((m) => !!m.el);

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const found = map.find((m) => m.el === visible.target);
        if (found && found.key !== active) setActive(found.key);
      },
      { root, threshold: [0.35, 0.6], rootMargin: "0px 0px -30% 0px" }
    );

    map.forEach((m) => io.observe(m.el));
    return () => io.disconnect();
  }, [tabs, scrollContainerRef, active]);

  // Scroll spy complémentaire: section la plus proche du centre
  useEffect(() => {
    const root = scrollContainerRef?.current;
    if (!root || !tabs.length) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const rootRect = root.getBoundingClientRect();
        const center = rootRect.top + root.clientHeight / 2;

        let bestKey = active;
        let bestDist = Infinity;

        for (const t of tabs) {
          const el = t.ref?.current;
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const mid = r.top + r.height / 2;
          const dist = Math.abs(mid - center);
          if (dist < bestDist) {
            bestDist = dist;
            bestKey = t.key;
          }
        }

        if (bestKey && bestKey !== active) setActive(bestKey);
        ticking = false;
      });
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [tabs, scrollContainerRef, active]);

  // Notify parent
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // Navigation clavier
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      const idx = tabs.findIndex((t) => t.key === active);
      if (idx < 0) return;
      if (e.key === "ArrowRight") selectKey(tabs[(idx + 1) % tabs.length].key);
      else if (e.key === "ArrowLeft") selectKey(tabs[(idx - 1 + tabs.length) % tabs.length].key);
      else if (["1", "2", "3"].includes(e.key) && tabs[Number(e.key) - 1]) {
        selectKey(tabs[Number(e.key) - 1].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabs, active]);

  const selectKey = (key) => {
    const t = tabs.find((x) => x.key === key);
    const el = t?.ref?.current;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(key);
  };

  const idx = tabs.findIndex((t) => t.key === active);
  const goPrev = () => {
    if (!tabs.length) return;
    selectKey(tabs[(idx - 1 + tabs.length) % tabs.length].key);
  };
  const goNext = () => {
    if (!tabs.length) return;
    selectKey(tabs[(idx + 1) % tabs.length].key);
  };

  return (
    <div
      className="fixed z-40 pointer-events-none"
      style={{ left: pos.left, width: pos.width || "auto", bottom: 16 }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: hidden ? 20 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="pointer-events-auto mx-auto max-w-full"
      >
        <div className="rounded-2xl p-[2px] bg-gradient-to-r from-slate-300/70 via-slate-200/70 to-slate-300/70 shadow-2xl">
          <div className="relative rounded-2xl bg-gray-200/90 backdrop-blur-xl px-3 py-1">

            {/* ← */}
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10 rounded-xl bg-white/75 hover:bg-white shadow-sm active:scale-95 transition p-0"
              title="Précédent (←)"
              aria-label="Précédent"
            >
              <AiOutlineLeft className="h-5 w-5 block leading-none" />
            </button>

            {/* Onglets */}
            <div role="tablist" className="mx-12 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((t) => {
                const isActive = t.key === active;
                return (
                  <button
                    role="tab"
                    aria-selected={isActive}
                    key={t.key}
                    onClick={() => selectKey(t.key)}
                    className="relative h-9 px-5 rounded-xl text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="tab-active-bg"
                        className="absolute inset-0 rounded-xl bg-white shadow-[0_8px_30px_rgba(0,0,0,.12)]"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2 text-gray-800">
                      <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-white/70 ${t.dot}`} />
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* → */}
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10 rounded-xl bg-white/75 hover:bg-white shadow-sm active:scale-95 transition p-0"
              title="Suivant (→)"
              aria-label="Suivant"
            >
              <AiOutlineRight className="h-5 w-5 block leading-none" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
