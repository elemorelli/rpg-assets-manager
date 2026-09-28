import { faDownload, faFileZipper } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { JSX } from "react";

import { MenuItem } from "#components/context-menu/menu-item.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { getParentPath } from "#utils/directory-path.ts";
import { joinRelativePath } from "#utils/paths.ts";
import * as api from "#web/requests/index.ts";
import { triggerDownload, triggerDownloads } from "#web/utils/trigger-download.ts";

export interface DownloadMenuItemsProps {
  relativePath: string;
  selectedEntries: DirectoryEntry[];
  onClose: () => void;
}

const describeFileCount = (fileCount: number): string =>
  fileCount === 1 ? "1 file" : `${fileCount} files`;

export const DownloadMenuItems = ({
  relativePath,
  selectedEntries,
  onClose,
}: DownloadMenuItemsProps): JSX.Element => {
  // Every selected entry lives in the same directory as the one the menu was opened on.
  const parentPath = getParentPath(relativePath);
  const toSelectedPath = (selected: DirectoryEntry): string =>
    joinRelativePath(parentPath, selected.name);

  const selectedPaths = selectedEntries.map(toSelectedPath);
  const selectedFilePaths = selectedEntries
    .filter((selected) => selected.type === "file")
    .map(toSelectedPath);

  const isMultiSelection = selectedEntries.length > 1;
  const isSingleFile = !isMultiSelection && selectedFilePaths.length === 1;
  const showEachFileOption = isMultiSelection && selectedFilePaths.length > 0;

  const handleDownloadFile = (): void => {
    triggerDownload(api.buildFileDownloadUrl(relativePath));
    onClose();
  };

  const handleDownloadEachFile = (): void => {
    triggerDownloads(selectedFilePaths.map(api.buildFileDownloadUrl));
    onClose();
  };

  const handleDownloadZip = (): void => {
    triggerDownload(api.buildZipDownloadUrl(selectedPaths));
    onClose();
  };

  if (isSingleFile) {
    return (
      <MenuItem onClick={handleDownloadFile}>
        <FontAwesomeIcon icon={faDownload} fixedWidth />
        Download
      </MenuItem>
    );
  }

  return (
    <>
      {showEachFileOption && (
        <MenuItem onClick={handleDownloadEachFile}>
          <FontAwesomeIcon icon={faDownload} fixedWidth />
          Download {describeFileCount(selectedFilePaths.length)}
        </MenuItem>
      )}
      <MenuItem onClick={handleDownloadZip}>
        <FontAwesomeIcon icon={faFileZipper} fixedWidth />
        Download as zip
      </MenuItem>
    </>
  );
};
