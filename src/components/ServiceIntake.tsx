import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Portal } from './Portal';
import { useServiceIntake } from '../hooks/useServiceIntake';
import { AdvisorVerification } from './intake/AdvisorVerification';
import { IntakeSuccessModal } from './intake/IntakeSuccessModal';
import { IntakeStepProgress } from './intake/IntakeStepProgress';
import { Step1CustomerDiscovery } from './intake/Step1CustomerDiscovery';
import { Step2VehicleSelection } from './intake/Step2VehicleSelection';
import { Step3JobSpecification } from './intake/Step3JobSpecification';

export interface ServiceIntakeProps {
  onClose: () => void;
  onSuccess: () => void;
  isPage?: boolean;
}

export function ServiceIntake({ onClose, onSuccess, isPage }: ServiceIntakeProps) {
  const {
    step,
    setStep,
    loading,
    createdJob,
    setCreatedJob,
    authenticatedAdvisor,
    pinCode,
    pinError,
    pinInputRef,
    processPinEntry,
    handleClearPin,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedCustomer,
    selectedVehicle,
    customerForm,
    setCustomerForm,
    vehicleForm,
    setVehicleForm,
    jobForm,
    setJobForm,
    useKey,
    setUseKey,
    isMileageInvalid,
    handleBackStep,
    handleSelectResult,
    handleCreateNewCustomer,
    handleSubmitIntake,
    getLastServicedDate,
  } = useServiceIntake(onClose, onSuccess);

  const Wrapper = isPage ? React.Fragment : Portal;

  // 1. Success Modal State
  if (createdJob) {
    return (
      <IntakeSuccessModal
        createdJob={createdJob}
        isPage={isPage}
        onClose={onClose}
        onDismiss={() => {
          setCreatedJob(null);
          onClose();
        }}
      />
    );
  }

  // 2. Advisor PIN Verification
  if (!authenticatedAdvisor) {
    return (
      <AdvisorVerification
        isPage={isPage}
        pinCode={pinCode}
        pinError={pinError}
        pinInputRef={pinInputRef}
        onPinChange={processPinEntry}
        onClear={handleClearPin}
        onClose={onClose}
      />
    );
  }

  // 3. Multi-Step Intake Flow
  return (
    <Wrapper>
      <motion.div
        initial={isPage ? { opacity: 0, y: 15 } : { x: "100%", opacity: 0.95 }}
        animate={isPage ? { opacity: 1, y: 0 } : { x: 0, opacity: 1 }}
        exit={isPage ? { opacity: 0, y: -10 } : { x: "100%", opacity: 0.95 }}
        transition={
          isPage
            ? { duration: 0.25, ease: [0.2, 0, 0, 1.0] }
            : { type: "spring", stiffness: 350, damping: 30 }
        }
        className={cn(
          isPage
            ? "w-full max-w-4xl mx-auto flex flex-col text-workshop-text font-sans bg-workshop-bg h-full min-h-0"
            : "fixed inset-0 z-[100] bg-workshop-bg flex flex-col w-full h-full overflow-hidden"
        )}
      >
        <div className="w-full flex-1 flex flex-col h-full bg-workshop-bg text-workshop-text relative overflow-hidden">
          <IntakeStepProgress
            step={step}
            authenticatedAdvisor={authenticatedAdvisor}
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-workshop-bg/30">
            <AnimatePresence mode="wait">
              {Math.floor(step) === 1 && (
                <Step1CustomerDiscovery
                  key="step1"
                  step={step}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchResults={searchResults}
                  customerForm={customerForm}
                  setCustomerForm={setCustomerForm}
                  onSelectResult={handleSelectResult}
                  onCreateNewCustomer={handleCreateNewCustomer}
                  onBackToSearch={() => setStep(1)}
                  onProceedToVehicle={() => setStep(2)}
                  getLastServicedDate={getLastServicedDate}
                />
              )}

              {step === 2 && (
                <Step2VehicleSelection
                  key="step2"
                  selectedCustomer={selectedCustomer}
                  vehicleForm={vehicleForm}
                  setVehicleForm={setVehicleForm}
                  useKey={useKey}
                  setUseKey={setUseKey}
                  onBackStep={handleBackStep}
                  onProceedToJob={() => setStep(3)}
                />
              )}

              {step === 3 && (
                <Step3JobSpecification
                  key="step3"
                  selectedVehicle={selectedVehicle}
                  vehicleForm={vehicleForm}
                  useKey={useKey}
                  jobForm={jobForm}
                  setJobForm={setJobForm}
                  isMileageInvalid={isMileageInvalid}
                  loading={loading}
                  onBackStep={handleBackStep}
                  onSubmit={handleSubmitIntake}
                />
              )}
            </AnimatePresence>
            <div className="safe-bottom h-4" />
          </div>
        </div>
      </motion.div>
    </Wrapper>
  );
}

export function ServiceIntakePage() {
  const navigate = useNavigate();
  return (
    <div className="w-full max-w-4xl mx-auto py-2">
      <ServiceIntake
        onClose={() => navigate('/')}
        onSuccess={() => navigate('/services')}
        isPage={true}
      />
    </div>
  );
}
