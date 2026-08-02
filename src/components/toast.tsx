"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useStream } from "@/components/stream-provider";

export function Toast() {
  const { toastMessage } = useStream();

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          className="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full glass px-5 py-2.5 text-sm font-medium text-white shadow-xl"
        >
          {toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
