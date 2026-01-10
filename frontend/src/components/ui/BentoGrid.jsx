import React from 'react';
import { motion } from 'framer-motion';

export const BentoGrid = ({ className, children }) => {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ${className}`}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({ className, children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay, ease: "easeOut" }}
      className={`
        bg-surface/50 backdrop-blur-xl
        border border-border/50
        rounded-xl p-6
        hover:border-accent/50 hover:bg-surface-highlight/50
        transition-colors duration-300
        group relative overflow-hidden
        ${className}
      `}
    >
      {/* Subtle Grid Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative z-10 h-full">
        {children}
      </div>
    </motion.div>
  );
};
