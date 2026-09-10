import React from 'react';
import { Search, UserPlus, ArrowLeft, ChevronRight, Key } from 'lucide-react';
import { motion } from 'motion/react';
import type { Customer, Vehicle } from '../../types';

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
      initial={{ opacity: 0, scale: 0.98, x: 15 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.98, x: -15 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1.0] }}
      className="space-y-6"
    >
      {step === 1 ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">
              Identify Vehicle or Owner
            </h3>
            <p className="text-workshop-muted text-sm">
              Locate existing records to streamline the intake process.
            </p>
          </div>

          <div className="relative flex items-center">
            <Search className="absolute left-4 text-workshop-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search anything!"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-4 rounded-xl text-base md:text-lg font-bold outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text uppercase placeholder:normal-case shadow-sm"
            />
          </div>

          <div className="space-y-3">
            {searchQuery.length > 0 && searchResults.length === 0 && (
              <div className="p-8 text-center bg-workshop-surface/30 rounded-xl border border-workshop-border border-dashed">
                <p className="text-workshop-muted text-sm font-medium opacity-50">
                  Record does not exist
                </p>
              </div>
            )}

            {searchResults.map((res, i) => (
              <button
                key={`${res.customer.id}-${res.vehicle?.id || i}`}
                onClick={() => onSelectResult(res.customer, res.vehicle)}
                className="w-full flex items-center justify-between p-4 bg-workshop-card hover:border-workshop-accent/30 border border-workshop-border rounded-xl transition-all group text-left shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-workshop-bg rounded-xl flex items-center justify-center font-black text-workshop-text uppercase text-xs border border-workshop-border shadow-inner">
                    {res.vehicle
                      ? res.vehicle.plateNumber.slice(-4)
                      : res.customer.name[0]}
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-bold text-workshop-accent uppercase leading-tight mb-0.5">
                      {res.vehicle
                        ? `${res.vehicle.make} ${res.vehicle.model}`
                        : "New Vehicle Entry Needed"}
                    </p>
                    <p className="text-sm md:text-base font-bold text-workshop-text leading-tight uppercase">
                      {res.customer.name}
                    </p>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                      <div className="flex items-center gap-1.5 text-workshop-muted">
                        <p className="text-sm md:text-base font-bold uppercase tracking-tight">
                          {res.customer.phone}
                        </p>
                      </div>
                      {res.vehicle && (
                        <>
                          <div className="flex items-center gap-1.5 text-workshop-secondary">
                            <span className="w-1.5 h-1.5 bg-workshop-border rounded-full shrink-0" />
                            <p className="text-sm md:text-base font-bold uppercase tracking-tight">
                              {res.vehicle.plateNumber}
                            </p>
                          </div>
                          {res.vehicle.passwordOrPin && (
                            <div className="flex items-center gap-1.5 text-status-success">
                              <Key className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-sm md:text-base font-google-sans font-bold uppercase tracking-tight">
                                {res.vehicle.passwordOrPin}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  <div className="text-right">
                    <span className="text-[10px] md:text-xs font-bold text-workshop-muted block uppercase tracking-tight">
                      Last Serviced
                    </span>
                    <span className="text-xs md:text-sm font-black text-workshop-text uppercase tracking-tight">
                      {getLastServicedDate(res.customer, res.vehicle)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black text-workshop-muted uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">
                      Select
                    </span>
                    <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-accent translate-x-0 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={onCreateNewCustomer}
              className="w-full flex items-center gap-4 p-5 border-2 border-dashed border-workshop-border rounded-xl text-workshop-muted hover:border-workshop-accent/50 hover:text-workshop-accent transition-all font-black text-xs uppercase tracking-widest bg-workshop-surface/30 cursor-pointer"
            >
              <UserPlus className="w-5 h-5 opacity-50" />
              <span>REGISTER NEW CUSTOMER RECORD</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={onBackToSearch}
            className="flex items-center gap-2 text-workshop-muted hover:text-workshop-text text-[10px] font-black uppercase tracking-widest cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Search
          </button>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">
              New Client Entry
            </h3>
            <p className="text-workshop-muted text-sm">
              Register a new client into the workshop system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-google-sans font-black uppercase tracking-[0.2em] text-workshop-muted">
                Full Name
              </label>
              <input
                value={customerForm.name}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    name: e.target.value,
                  })
                }
                className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="relative pt-2.5">
              <div className="flex items-center w-full bg-workshop-surface border-2 border-secondary rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-secondary/30 transition-all">
                {/* Floating notched label */}
                <span className="absolute left-4 top-0 bg-workshop-bg px-2 text-[11px] font-google-sans font-black uppercase tracking-wider text-secondary select-none">
                  Phone number
                </span>

                {/* Prefix */}
                <span className="text-workshop-text font-numeric font-bold text-base select-none pr-3 shrink-0">
                  +91
                </span>

                {/* Separator / Divider Line */}
                <div className="h-6 w-px bg-workshop-border/40 mr-3.5 shrink-0" />

                {/* Actual Input */}
                <input
                  type="tel"
                  inputMode="tel"
                  value={customerForm.phone}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.startsWith("+91")) {
                      val = val.substring(3);
                    } else if (val.startsWith("91") && val.length > 10) {
                      val = val.substring(2);
                    }
                    setCustomerForm({
                      ...customerForm,
                      phone: val,
                    });
                  }}
                  className="w-full bg-transparent border-none p-0 outline-none focus:ring-0 text-workshop-text font-numeric font-bold text-base tracking-wide placeholder-workshop-muted/40"
                  placeholder="85471 87345"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onProceedToVehicle}
            disabled={!customerForm.name || !customerForm.phone}
            className="w-full py-4 bg-workshop-accent text-workshop-bg rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale cursor-pointer"
          >
            PROCEED TO VEHICLE DETAILS
          </button>
        </div>
      )}
    </motion.div>
  );
}
