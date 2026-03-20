import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

/**
 * Post-purchase success modal
 * Shown after successful Stripe payment
 */
export default function SuccessModal({
  onContinue,
  heading = "You're all set.",
  body = "Your collection just got a lot more powerful. Start exploring!",
  ctaText = "Continue",
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-8 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 22, 0.95), rgba(28, 20, 16, 0.95))',
          border: '1px solid rgba(120, 90, 65, 0.3)',
        }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <CheckCircle2
            className="w-16 h-16"
            style={{ color: '#A0D5A0', filter: 'drop-shadow(0 0 12px rgba(160, 213, 160, 0.3))' }}
          />
        </div>

        {/* Heading */}
        <h2
          className="text-2xl font-bold mb-3"
          style={{ color: '#F5F1E7' }}
        >
          {heading}
        </h2>

        {/* Body */}
        <p
          className="text-sm mb-6"
          style={{ color: 'rgba(224, 216, 200, 0.75)' }}
        >
          {body}
        </p>

        {/* CTA */}
        <Button
          onClick={onContinue}
          className="w-full font-medium"
          style={{
            background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))',
            color: '#F5F1E7',
          }}
        >
          {ctaText}
        </Button>
      </div>
    </div>
  );
}