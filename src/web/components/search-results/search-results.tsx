import type { JSX } from "react";

import type { SearchResultEntry } from "#web/requests/files/entry/search.ts";

import styles from "./search-results.module.css";

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
