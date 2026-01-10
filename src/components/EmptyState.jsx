import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  secondaryActionLabel,
  onSecondaryAction 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#7D90A5]/20 to-[#A35C5C]/20 flex items-center justify-center"
      >
        {Icon && <Icon className="w-12 h-12 text-[#7D90A5]" strokeWidth={1.5} />}
      </motion.div>
      
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-semibold text-[#E0D8C8] mb-3"
      >
        {title}
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[#E0D8C8]/70 mb-8 max-w-md mx-auto"
      >
        {description}
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        {actionLabel && onAction && (
          <Button 
            onClick={onAction}
            className="bg-gradient-to-r from-[#A35C5C] to-[#8B4A4A] hover:from-[#8B4A4A] hover:to-[#A35C5C] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            size="lg"
          >
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button 
            onClick={onSecondaryAction}
            variant="outline"
            className="border-[#E0D8C8]/30 text-[#E0D8C8] hover:bg-[#E0D8C8]/10"
            size="lg"
          >
            {secondaryActionLabel}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}