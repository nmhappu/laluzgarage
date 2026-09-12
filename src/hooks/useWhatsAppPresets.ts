import { useState, useEffect } from "react";
import {
  fetchWhatsAppPresets,
  saveWhatsAppPresets,
  DEFAULT_INTAKE_TEMPLATE,
  DEFAULT_DELIVERY_TEMPLATE,
} from "../services/whatsappPresetService";

export function useWhatsAppPresets(
  onError: (msg: string | null) => void,
  onSuccess: (msg: string | null) => void
) {
  const [intakeTemplate, setIntakeTemplate] = useState(DEFAULT_INTAKE_TEMPLATE);
  const [deliveryTemplate, setDeliveryTemplate] = useState(DEFAULT_DELIVERY_TEMPLATE);
  const [presetTab, setPresetTab] = useState<"intake" | "delivery">("intake");
  const [savingPresets, setSavingPresets] = useState(false);

  useEffect(() => {
    fetchWhatsAppPresets().then((presets) => {
      setIntakeTemplate(presets.intakeTemplate);
      setDeliveryTemplate(presets.deliveryTemplate);
    });
  }, []);

  const handleSavePresets = async () => {
    setSavingPresets(true);
    onError(null);
    try {
      await saveWhatsAppPresets({
        intakeTemplate,
        deliveryTemplate,
      });
      onSuccess("WhatsApp Message Presets saved successfully!");
      setTimeout(() => onSuccess(null), 3000);
    } catch (e) {
      console.error("Error saving whatsapp presets:", e);
      onError("Failed to save WhatsApp message presets.");
    } finally {
      setSavingPresets(false);
    }
  };

  const handleResetPresets = () => {
    if (presetTab === "intake") {
      setIntakeTemplate(DEFAULT_INTAKE_TEMPLATE);
    } else {
      setDeliveryTemplate(DEFAULT_DELIVERY_TEMPLATE);
    }
    onSuccess(`Reset ${presetTab} message template to default.`);
    setTimeout(() => onSuccess(null), 2500);
  };

  const handleInsertVariable = (tag: string) => {
    if (presetTab === "intake") {
      setIntakeTemplate((prev) => prev + " " + tag);
    } else {
      setDeliveryTemplate((prev) => prev + " " + tag);
    }
  };

  return {
    intakeTemplate,
    setIntakeTemplate,
    deliveryTemplate,
    setDeliveryTemplate,
    presetTab,
    setPresetTab,
    savingPresets,
    handleSavePresets,
    handleResetPresets,
    handleInsertVariable,
  };
}
