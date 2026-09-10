import { motion, type Variants } from "motion/react";

export interface GeneralViewProps {
  pageVariants?: Variants;
}

export function GeneralView({ pageVariants }: GeneralViewProps) {
  return (
    <motion.div
      key="general"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      <div className="divide-y divide-workshop-border/30 border-b border-workshop-border/20">
        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-workshop-text">Workshop Identifier</p>
            <p className="text-xs text-workshop-muted">The name used on customer correspondence and reports</p>
          </div>
          <input 
            type="text" 
            readOnly 
            value="Workshop Manager Pro" 
            className="bg-workshop-surface border border-workshop-border/40 px-3.5 py-2 rounded-lg text-xs font-bold text-workshop-text text-right max-w-xs focus:outline-none"
          />
        </div>

        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-workshop-text">Base Currency</p>
            <p className="text-xs text-workshop-muted">Default billing and pricing currency</p>
          </div>
          <span className="text-xs font-bold font-mono text-workshop-muted bg-workshop-surface px-3.5 py-2 rounded-lg border border-workshop-border/40">AUD ($)</span>
        </div>

        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-workshop-text">GST Billing Integration</p>
            <p className="text-xs text-workshop-muted">Standard sales tax rate for billing items and invoices</p>
          </div>
          <span className="text-xs font-bold font-mono text-workshop-muted bg-workshop-surface px-3.5 py-2 rounded-lg border border-workshop-border/40">10% (GST)</span>
        </div>
      </div>
    </motion.div>
  );
}
