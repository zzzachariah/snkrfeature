"use client";

import { AnimatePresence, motion } from "framer-motion";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--glass-overlay)/0.44)] p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="surface-card liquid-interactive premium-border w-full max-w-lg rounded-3xl p-6 shadow-[0_30px_72px_rgb(var(--glass-shadow)/0.38)]" initial={{ y: 16, opacity: 0, scale: 0.985 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 8, opacity: 0, scale: 0.985 }} transition={{ duration: 0.22, ease: "easeOut" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold tracking-[0.01em]">{title}</h2>
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
