import { SettingsLayout } from "./settings/SettingsLayout";

export interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export { SettingsLayout, SettingsLayout as SettingsPage, SettingsLayout as SettingsModal };
export default SettingsLayout;
