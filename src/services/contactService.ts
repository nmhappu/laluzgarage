import { capitalizeName } from './whatsappPresetService';

export interface AddToContactsOptions {
  name: string;
  phone: string;
  email?: string;
  vehicleInfo?: string;
  notes?: string;
}

/**
 * Builds RFC 2426 vCard 3.0 formatted text with CRLF line terminators.
 */
export function generateVCard(options: AddToContactsOptions): string {
  const { name, phone, email, vehicleInfo, notes } = options;
  const formattedName = capitalizeName(name).trim() || 'Customer';
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  const parts = formattedName.split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  const noteItems: string[] = [];
  if (vehicleInfo) noteItems.push(`Vehicle: ${vehicleInfo}`);
  if (notes) noteItems.push(notes);
  noteItems.push('Gearbox Workshop Client');
  const fullNotes = noteItems.join(' | ');

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${formattedName}`,
    'ORG:Gearbox Workshop',
    `TEL;TYPE=CELL,VOICE:${cleanPhone}`,
    email ? `EMAIL;TYPE=INTERNET:${email.trim()}` : '',
    fullNotes ? `NOTE:${fullNotes}` : '',
    'END:VCARD',
  ].filter(Boolean);

  return vcardLines.join('\r\n');
}

/**
 * Launches the device's native "Create Contact" screen with the phone number and customer name pre-populated.
 * 
 * - Android (Native / Chrome / Capacitor WebViews):
 *   Triggers Android Intent action "android.intent.action.INSERT" with MIME type "vnd.android.cursor.dir/contact".
 *   This instructs Android OS to open the Contacts app straight into the "Create Contact" screen
 *   with the number and name filled in.
 * 
 * - iOS / Mobile Web Share:
 *   Uses navigator.share with an RFC 2426 vCard file, prompting the native iOS contact card preview
 *   with direct "Create New Contact" options.
 * 
 * - Desktop / Standard Fallback:
 *   Downloads the .vcf contact card for instant one-click import into macOS / Windows Contacts.
 */
export async function openCreateContactScreen(options: AddToContactsOptions): Promise<{
  success: boolean;
  method: 'android_intent' | 'web_share' | 'download' | 'canceled';
}> {
  const { name, phone, email, vehicleInfo, notes } = options;
  const formattedName = capitalizeName(name).trim() || 'Customer';
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const noteText = [
    vehicleInfo ? `Vehicle: ${vehicleInfo}` : '',
    notes || '',
    'Gearbox Workshop Client',
  ].filter(Boolean).join(' | ');

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  // 1. Android Native Intent: Pops up the system "Create Contact" screen with phone number and name
  if (isAndroid) {
    try {
      const intentExtras = [
        'intent:#Intent',
        'action=android.intent.action.INSERT',
        'type=vnd.android.cursor.dir/contact',
        `S.name=${encodeURIComponent(formattedName)}`,
        `S.phone=${encodeURIComponent(cleanPhone)}`,
      ];

      if (email) {
        intentExtras.push(`S.email=${encodeURIComponent(email)}`);
      }
      if (noteText) {
        intentExtras.push(`S.notes=${encodeURIComponent(noteText)}`);
      }
      intentExtras.push('end');

      const intentUrl = intentExtras.join(';');

      // Trigger via anchor click with standard navigation gesture
      const link = document.createElement('a');
      link.href = intentUrl;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true, method: 'android_intent' };
    } catch (err) {
      console.warn('Android Intent trigger encountered an error, falling back:', err);
    }
  }

  // 2. iOS or Web Share API with vCard file
  const vcardContent = generateVCard(options);
  const fileName = `${formattedName.replace(/\s+/g, '_')}.vcf`;

  if (typeof navigator !== 'undefined' && navigator.canShare && typeof File !== 'undefined') {
    try {
      const vcardFile = new File([vcardContent], fileName, { type: 'text/vcard' });
      if (navigator.canShare({ files: [vcardFile] })) {
        await navigator.share({
          files: [vcardFile],
          title: formattedName,
          text: `Contact card for ${formattedName}`,
        });
        return { success: true, method: 'web_share' };
      }
    } catch (shareErr) {
      if ((shareErr as Error)?.name === 'AbortError') {
        return { success: false, method: 'canceled' };
      }
      console.warn('Web Share failed, falling back to download:', shareErr);
    }
  }

  // 3. Fallback: Download .vcf file
  try {
    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
    const vcardUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = vcardUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(vcardUrl);
    return { success: true, method: 'download' };
  } catch (downloadErr) {
    console.error('Failed to trigger contact download:', downloadErr);
    return { success: false, method: 'download' };
  }
}
