import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

/**
 * EmptyState — premium, breathing, warm-palette empty screen.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center text-center py-20 px-6"
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 220, damping: 22 }}
          className="w-24 h-24 mb-7 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(180,140,75,0.12), rgba(163,92,92,0.12))",
            border: "1px solid rgba(180,140,75,0.20)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.30)",
          }}
        >
          <Icon className="w-11 h-11" style={{ color: "rgba(212,165,116,0.80)" }} strokeWidth={1.4} />
        </motion.div>
      )}

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        className="text-2xl font-bold mb-3 tracking-tight"
        style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.26 }}
        className="text-base leading-relaxed mb-9 max-w-sm"
        style={{ color: "rgba(224,216,200,0.68)" }}
      >
        {description}
      </motion.p>

      {(actionLabel || secondaryActionLabel) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.34 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          {actionLabel && onAction && (
            <Button onClick={onAction} size="lg">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button onClick={onSecondaryAction} variant="outline" size="lg">
              {secondaryActionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}