import { type DragEvent, useRef, useState } from "react";

export interface UseFileDropzoneParams {
  onFilesDropped: (files: File[]) => void;
}

export interface UseFileDropzoneResult {
  isDropzoneActive: boolean;
  handleDropzoneDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  handleDropzoneDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleDropzoneDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handleDropzoneDrop: (event: DragEvent<HTMLDivElement>) => void;
}

const carriesExternalFiles = (event: DragEvent<HTMLDivElement>): boolean =>
  Array.from(event.dataTransfer?.types ?? []).includes("Files");

export const useFileDropzone = ({
  onFilesDropped,
}: UseFileDropzoneParams): UseFileDropzoneResult => {
  const [isDropzoneActive, setIsDropzoneActive] = useState<boolean>(false);
  const externalDragCounterRef = useRef<number>(0);

  const handleDropzoneDragEnter = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesExternalFiles(event)) {
      return;
    }

    event.preventDefault();
    externalDragCounterRef.current += 1;
    setIsDropzoneActive(true);
  };

  const handleDropzoneDragOver = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesExternalFiles(event)) {
      return;
    }

    event.preventDefault();
  };

  const handleDropzoneDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesExternalFiles(event)) {
      return;
    }

    externalDragCounterRef.current -= 1;

    if (externalDragCounterRef.current <= 0) {
      externalDragCounterRef.current = 0;
      setIsDropzoneActive(false);
    }
  };

  const handleDropzoneDrop = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesExternalFiles(event)) {
      return;
    }

    event.preventDefault();
    externalDragCounterRef.current = 0;
    setIsDropzoneActive(false);

    const files = Array.from(event.dataTransfer?.files ?? []);

    if (files.length > 0) {
      onFilesDropped(files);
    }
  };

  return {
    isDropzoneActive,
    handleDropzoneDragEnter,
    handleDropzoneDragOver,
    handleDropzoneDragLeave,
    handleDropzoneDrop,
  };
};
