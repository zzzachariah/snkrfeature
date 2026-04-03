"use client";

import { AnimatePresence, motion } from "framer-motion";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="surface-card premium-border w-full max-w-lg rounded-3xl p-6 shadow-[0_26px_70px_rgb(var(--shadow)/0.35)]" initial={{ y: 16, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 8, opacity: 0, scale: 0.98 }} transition={{ duration: 0.2, ease: "easeOut" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold tracking-[0.01em]">{title}</h2>
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
