import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Portal } from './Portal';
import { useServiceIntake } from '../hooks/useServiceIntake';
import { AdvisorVerification } from './intake/AdvisorVerification';
import { IntakeSuccessModal } from './intake/IntakeSuccessModal';
import { IntakeTopBar } from './intake/IntakeTopBar';
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

  const handleTopBack = useCallback(() => {
    if (step > 1) {
      handleBackStep();
    } else {
      onClose();
    }
  }, [step, handleBackStep, onClose]);

  // 1. Success Screen State
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

  // 3. Multi-Step Intake Experience (Consistent Top Navbar & Left-Aligned Content)
  return (
    <Wrapper>
      <motion.div
        initial={isPage ? { opacity: 0, y: 8 } : { opacity: 0 }}
        animate={isPage ? { opacity: 1, y: 0 } : { opacity: 1 }}
        exit={isPage ? { opacity: 0, y: -8 } : { opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        className={
          isPage
            ? 'min-h-screen w-full bg-workshop-bg flex flex-col text-workshop-text relative overflow-x-hidden'
            : 'fixed inset-0 z-[100] min-h-screen w-full bg-workshop-bg flex flex-col text-workshop-text relative overflow-x-hidden'
        }
      >
        {/* Precision Canvas Dot Grid Background */}
        <div
          className="canvas-grid pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
          style={{
            maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, #000 40%, transparent 95%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, #000 40%, transparent 95%)',
          }}
        />

        {/* Ambient Background Glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
          <div className="w-[500px] h-[500px] bg-workshop-accent/5 rounded-full blur-3xl -translate-y-12" />
        </div>

        {/* Standard App Top Navbar */}
        <IntakeTopBar onBack={handleTopBack} title="Vehicle Intake" m3Icon="assignment" />

        {/* Scrollable Main Step Content Area - Left Aligned with standard padding */}
        <main className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-6 py-6 sheet-footer-safe">
          <div className="max-w-xl w-full mx-auto flex flex-col items-start text-left">
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
          </div>
        </main>
      </motion.div>
    </Wrapper>
  );
}

export function ServiceIntakePage() {
  const navigate = useNavigate();
  return (
    <div className="w-full min-h-screen flex flex-col">
      <ServiceIntake
        onClose={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/', { replace: true });
          }
        }}
        onSuccess={() => navigate('/services', { replace: true })}
        isPage={true}
      />
    </div>
  );
}
