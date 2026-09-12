import { motion, type Variants } from "motion/react";

export interface SystemViewProps {
  pageVariants?: Variants;
}

export function SystemView({ pageVariants }: SystemViewProps) {
  return (
    <motion.div
      key="system"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      <div className="divide-y divide-workshop-border/30 border-b border-workshop-border/20">
        <div className="py-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-workshop-text">Firestore Database</p>
            <p className="text-xs text-workshop-muted font-mono mt-0.5">ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e</p>
          </div>
          <span className="text-xs font-bold text-status-success bg-status-success/10 px-2.5 py-1 rounded">Active</span>
        </div>

        <div className="py-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-workshop-text">Authentication Provider</p>
            <p className="text-xs text-workshop-muted mt-0.5">Google OAuth SSO / Secure Local PINs</p>
          </div>
          <span className="text-xs font-bold text-status-success bg-status-success/10 px-2.5 py-1 rounded">Connected</span>
        </div>

        <div className="py-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-workshop-text">Client Environment</p>
            <p className="text-xs text-workshop-muted mt-0.5">Cloud Run Application Container Sandbox</p>
          </div>
          <span className="text-xs font-bold text-workshop-muted bg-workshop-surface px-2.5 py-1 rounded font-mono border border-workshop-border/40">Production</span>
        </div>
      </div>
    </motion.div>
  );
}
