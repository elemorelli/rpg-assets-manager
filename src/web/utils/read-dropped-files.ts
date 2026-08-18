export interface DroppedFile {
  relativePath: string;
  file: File;
}

const stripLeadingSlash = (fullPath: string): string => fullPath.replace(/^\/+/, "");

const resolveFile = (entry: FileSystemFileEntry): Promise<File> =>
  new Promise((resolve, reject) => entry.file(resolve, reject));

const readAllDirectoryEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => {
    const collectedEntries: FileSystemEntry[] = [];

    const readNextBatch = (): void => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(collectedEntries);

          return;
        }

        collectedEntries.push(...batch);
        readNextBatch();
      }, reject);
    };

    readNextBatch();
  });

const collectEntryFiles = async (entry: FileSystemEntry): Promise<DroppedFile[]> => {
  if (entry.isFile) {
    const file = await resolveFile(entry as FileSystemFileEntry);

    return [{ relativePath: stripLeadingSlash(entry.fullPath), file }];
  }

  if (entry.isDirectory) {
    const directoryReader = (entry as FileSystemDirectoryEntry).createReader();
    const childEntries = await readAllDirectoryEntries(directoryReader);
    const childFiles = await Promise.all(childEntries.map((child) => collectEntryFiles(child)));

    return childFiles.flat();
  }

  return [];
};

const readViaFlatFileList = (dataTransfer: DataTransfer): DroppedFile[] =>
  Array.from(dataTransfer.files ?? []).map((file) => ({ relativePath: file.name, file }));

export const readDroppedFiles = async (dataTransfer: DataTransfer): Promise<DroppedFile[]> => {
  const items = Array.from(dataTransfer.items ?? []);
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => entry !== null && entry !== undefined);

  if (entries.length === 0) {
    return readViaFlatFileList(dataTransfer);
  }

  const files = await Promise.all(entries.map((entry) => collectEntryFiles(entry)));

  return files.flat();
};
