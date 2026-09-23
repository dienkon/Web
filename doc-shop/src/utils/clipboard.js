/**
 * Clipboard utility
 */
export const copyText = async (text) => {
  const content = String(text || "");
  if (!content) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
      return true;
    }
  } catch {}

  try {
    const input = document.createElement("textarea");
    input.value = content;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.focus();
    input.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(input);
    return !!ok;
  } catch {
    return false;
  }
};

export const copyToClipboard = copyText;
