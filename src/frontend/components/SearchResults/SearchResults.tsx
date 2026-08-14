import type { JSX } from "react";
import type { SearchResultEntry } from "../../requests/files/searchEntries/searchEntries.ts";
import styles from "./SearchResults.module.css";

export interface SearchResultsProps {
  results: SearchResultEntry[];
  onOpenResult: (entry: SearchResultEntry) => void;
}

export const SearchResults = ({ results, onOpenResult }: SearchResultsProps): JSX.Element => {
  return (
    <ul className={styles.results}>
      {results.map((entry) => (
        <li key={entry.relativePath}>
          <button type="button" className={styles.resultButton} onClick={() => onOpenResult(entry)}>
            {entry.relativePath}
          </button>
        </li>
      ))}
    </ul>
  );
};
