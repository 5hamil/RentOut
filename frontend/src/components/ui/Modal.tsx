'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Dialog / Bottom Sheet */}
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className={cn(
              "relative z-[101] w-full max-h-[90vh] overflow-y-auto bg-surface shadow-float",
              "rounded-t-3xl p-6 pb-10 sm:max-w-lg sm:rounded-2xl sm:p-8 sm:pb-8",
              className
            )}
          >
            {/* Mobile Drag Handle Indicator */}
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-muted/30 sm:hidden" />

            {title && (
              <div className="mb-6">
                <h2 className="text-xl font-heading font-bold tracking-tight text-foreground">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>
            )}
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-gray-100 hover:text-foreground transition-colors sm:right-4 sm:top-4"
            >
              <X className="h-4 w-4" />
            </button>

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
