import { motion, type Variants } from "motion/react";
import { Loader2, Key, ChevronRight, Shield } from "lucide-react";
import { getUserRole, type WorkshopUser } from "../../types";
import { cn } from "../../lib/utils";

export interface AccountsViewProps {
  loading: boolean;
  users: WorkshopUser[];
  onSelectUser: (user: WorkshopUser) => void;
  pageVariants?: Variants;
}

export function AccountsView({
  loading,
  users,
  onSelectUser,
  pageVariants,
}: AccountsViewProps) {
  return (
    <motion.div
      key="accounts"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {loading && users.length === 0 ? (
        <div className="py-16 text-center text-workshop-muted text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-status-success" />
          <span>Loading team accounts...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center text-workshop-muted text-xs font-bold uppercase tracking-wider border border-dashed border-workshop-border/30 rounded-xl">
          No accounts registered yet. Click &quot;New Account&quot; at the top right to get started.
        </div>
      ) : (
        <div className="divide-y divide-workshop-border/20 border-b border-workshop-border/20">
          {users.map((u) => {
            const isAdmin = getUserRole(u) === "admin";

            return (
              <button
                key={u.id}
                type="button"
                id={`account-item-${u.id}`}
                onClick={() => onSelectUser(u)}
                className="w-full text-left py-4 flex items-center justify-between hover:bg-workshop-surface/10 transition-all rounded-none px-0 group cursor-pointer"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-workshop-text group-hover:text-status-success transition-colors">
                      {u.name || "Unnamed Team Member"}
                    </p>
                    {isAdmin && (
                      <span title="Administrator" className="inline-flex">
                        <Shield className="w-3.5 h-3.5 text-status-urgent shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-workshop-muted mt-0.5 truncate">{u.email}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 bg-workshop-surface border border-workshop-border/40 px-2.5 py-1 rounded-lg">
                    <Key className={cn("w-3.5 h-3.5", u.pin ? "text-status-success" : "text-workshop-muted/40")} />
                    <span className={cn("text-[11px] font-bold tracking-wider uppercase", u.pin ? "text-status-success" : "text-workshop-muted/60")}>
                      {u.pin ? "PIN Set" : "No PIN"}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-text transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
export default AccountsView;
