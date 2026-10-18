import { toBlob } from 'html-to-image';

/**
 * Captures [node] (plate down to the customer card, as on the job card) as a PNG and shares it
 * through the system share sheet where the browser supports sharing files; otherwise it downloads.
 * Returns false when the capture failed.
 */
export async function shareCapture(node: HTMLElement, fileName: string, title: string): Promise<boolean> {
  const background = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || undefined;
  let blob: Blob | null = null;
  try {
    blob = await toBlob(node, { pixelRatio: 2, backgroundColor: background, cacheBust: true });
  } catch (e) {
    console.warn('Share capture failed', e);
  }
  if (!blob) return false;
  const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return true;
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return true;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
