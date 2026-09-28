// Browsers silently drop programmatic downloads fired in the same tick, so each one waits its turn.
export const DOWNLOAD_SPACING_MS = 250;

export const triggerDownload = (url: string): void => {
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "";
  anchor.style.display = "none";

  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};

export const triggerDownloads = (urls: string[]): void => {
  urls.forEach((url, index) => {
    const delayMs = index * DOWNLOAD_SPACING_MS;

    if (delayMs === 0) {
      triggerDownload(url);

      return;
    }

    setTimeout(() => triggerDownload(url), delayMs);
  });
};
