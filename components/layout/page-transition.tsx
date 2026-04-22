"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { navIndex } from "@/lib/nav-order";

const EASE = [0.22, 1, 0.36, 1] as const;
const DIST = 48;

const variants = {
  initial: (dir: number) => ({
    opacity: 0,
    x: dir === 0 ? 0 : dir * DIST,
    y: dir === 0 ? 8 : 0,
    scale: dir === 0 ? 0.995 : 1
  }),
  animate: { opacity: 1, x: 0, y: 0, scale: 1 },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir === 0 ? 0 : -dir * DIST,
    y: dir === 0 ? -6 : 0,
    scale: dir === 0 ? 0.997 : 1
  })
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);
  const reduceMotion = useReducedMotion();

  const prevIdx = prev.current ? navIndex(prev.current) : -1;
  const currIdx = navIndex(pathname);
  const direction =
    reduceMotion || prev.current === null || prevIdx === -1 || currIdx === -1
      ? 0
      : Math.sign(currIdx - prevIdx);

  useEffect(() => {
    prev.current = pathname;
  }, [pathname]);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={pathname}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.28, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
