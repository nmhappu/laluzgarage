import React from 'react';
import { UserPlus, ArrowLeft, ArrowRight, ChevronRight, Search, Key, User, Phone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Customer, Vehicle } from '../../types';

const tapSpringTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 25,
};

export interface Step1CustomerDiscoveryProps {
  key?: React.Key;
  step: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: { customer: Customer; vehicle?: Vehicle }[];
  customerForm: { name: string; phone: string };
  setCustomerForm: (form: { name: string; phone: string }) => void;
  onSelectResult: (customer: Customer, vehicle?: Vehicle) => void;
  onCreateNewCustomer: () => void;
  onBackToSearch: () => void;
  onProceedToVehicle: () => void;
  getLastServicedDate: (customer: Customer, vehicle?: Vehicle) => string;
}

export function Step1CustomerDiscovery({
  step,
  searchQuery,
  setSearchQuery,
  searchResults,
  customerForm,
  setCustomerForm,
  onSelectResult,
  onCreateNewCustomer,
  onBackToSearch,
  onProceedToVehicle,
  getLastServicedDate,
}: Step1CustomerDiscoveryProps) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col items-start text-left space-y-6 w-full"
    >
      {step === 1 ? (
        <div className="w-full space-y-6">
          {/* Header Icon & Title */}
          <div className="space-y-4 text-left">
            <div className="relative text-workshop-accent">
              <div className="absolute -inset-2 bg-workshop-accent/20 blur-2xl rounded-full pointer-events-none" />
              <Search className="relative w-10 h-10 stroke-[1.75]" />
            </div>

            <div className="space-y-1.5 text-left">
              <h1 className="text-2xl sm:text-3xl font-logo font-bold text-workshop-text tracking-tight">
                Customer Discovery
              </h1>
              <p className="text-workshop-muted text-xs sm:text-sm leading-relaxed">
                Search by phone number, vehicle plate, or customer name to locate records.
              </p>
            </div>
          </div>

          {/* Search Input Box */}
          <div className="w-full space-y-1.5 text-left">
            <label className="text-xs font-semibold text-workshop-muted pl-0.5">
              Search Database
            </label>
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
              <input
                type="text"
                placeholder="Plate number, phone, customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-10 text-workshop-text placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-workshop-muted hover:text-workshop-text transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results List */}
          <div className="w-full space-y-2">
            {searchQuery.length > 0 && searchResults.length === 0 && (
              <div className="p-4 bg-workshop-surface/40 border border-workshop-border/60 rounded-xl text-left text-xs text-workshop-muted">
                No matching customer or vehicle record found for{' '}
                <span className="text-workshop-text font-semibold">"{searchQuery}"</span>.
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="w-full divide-y divide-workshop-border/60 border-y border-workshop-border/60 text-left py-1">
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.customer.id}-${res.vehicle?.id || i}`}
                    type="button"
                    onClick={() => onSelectResult(res.customer, res.vehicle)}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-workshop-surface/60 rounded-xl transition-colors group cursor-pointer text-left"
                  >
                    <div className="flex items-start gap-3 min-w-0 pr-3">
                      <div className="w-10 h-10 rounded-xl bg-workshop-surface border border-workshop-border flex items-center justify-center font-plate font-bold text-xs text-workshop-text shrink-0">
                        {res.vehicle
                          ? res.vehicle.plateNumber.slice(-4)
                          : res.customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-workshop-text group-hover:text-workshop-accent transition-colors truncate">
                            {res.customer.name}
                          </p>
                          {res.vehicle && (
                            <span className="font-plate text-xs font-bold text-workshop-accent px-1.5 py-0.5 rounded bg-workshop-accent/10 border border-workshop-accent/20 uppercase">
                              {res.vehicle.plateNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-workshop-muted flex-wrap">
                          <span className="font-numeric">{res.customer.phone}</span>
                          {res.vehicle && (
                            <>
                              <span>•</span>
                              <span>
                                {res.vehicle.make} {res.vehicle.model}
                              </span>
                            </>
                          )}
                          {res.vehicle?.passwordOrPin && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-workshop-accent font-numeric">
                                <Key className="w-3 h-3" />
                                {res.vehicle.passwordOrPin}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] uppercase font-mono text-workshop-muted block">
                          Last Service
                        </span>
                        <span className="text-xs text-workshop-text font-medium">
                          {getLastServicedDate(res.customer, res.vehicle)}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-workshop-muted group-hover:text-workshop-accent group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* New Customer Button */}
            <div className="pt-2">
              <motion.button
                type="button"
                onClick={onCreateNewCustomer}
                whileTap={{ scale: 0.97 }}
                transition={tapSpringTransition}
                className="w-full flex items-center justify-start gap-3 bg-workshop-surface/60 hover:bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-text px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider shadow-sm cursor-pointer text-left accelerate-gpu will-change-transform"
              >
                <UserPlus className="w-4 h-4 text-workshop-accent shrink-0" />
                <span>Register New Customer Record</span>
              </motion.button>
            </div>
          </div>
        </div>
      ) : (
        /* Step 1.5: Inline New Customer Form */
        <div className="w-full space-y-6">
          <motion.button
            type="button"
            onClick={onBackToSearch}
            whileTap={{ scale: 0.97 }}
            transition={tapSpringTransition}
            className="flex items-center gap-2 text-xs font-semibold text-workshop-muted hover:text-workshop-text transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Search</span>
          </motion.button>

          <div className="space-y-4 text-left">
            <div className="relative text-workshop-accent">
              <div className="absolute -inset-2 bg-workshop-accent/20 blur-2xl rounded-full pointer-events-none" />
              <UserPlus className="relative w-10 h-10 stroke-[1.75]" />
            </div>

            <div className="space-y-1.5 text-left">
              <h1 className="text-2xl sm:text-3xl font-logo font-bold text-workshop-text tracking-tight">
                New Customer
              </h1>
              <p className="text-workshop-muted text-xs sm:text-sm leading-relaxed">
                Enter customer contact details to establish a workshop profile.
              </p>
            </div>
          </div>

          <div className="w-full space-y-4">
            {/* Customer Name */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-workshop-muted pl-0.5">
                Customer Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  required
                  value={customerForm.name}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      name: e.target.value,
                    })
                  }
                  autoFocus
                  className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-4 text-workshop-text placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-workshop-muted pl-0.5">
                Mobile Number
              </label>
              <div className="relative group flex items-center">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  <Phone className="w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                  <span className="text-xs font-numeric font-semibold text-workshop-text pl-1">
                    +91
                  </span>
                  <div className="h-4 w-px bg-workshop-border/60 mx-1" />
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="98765 43210"
                  required
                  value={customerForm.phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^\d\s]/g, '');
                    if (val.startsWith('91') && val.length > 10) {
                      val = val.substring(2);
                    }
                    setCustomerForm({
                      ...customerForm,
                      phone: val,
                    });
                  }}
                  className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-24 pr-4 text-workshop-text font-numeric placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm"
                />
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="w-full pt-2">
            <motion.button
              type="button"
              disabled={!customerForm.name.trim() || !customerForm.phone.trim()}
              onClick={onProceedToVehicle}
              whileTap={{ scale: 0.97 }}
              transition={tapSpringTransition}
              className="w-full flex items-center justify-start gap-3 bg-workshop-accent text-workshop-bg hover:bg-workshop-accent/90 px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left accelerate-gpu will-change-transform"
            >
              <ArrowRight className="w-4 h-4 shrink-0" />
              <span>Continue to Vehicle Details</span>
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
