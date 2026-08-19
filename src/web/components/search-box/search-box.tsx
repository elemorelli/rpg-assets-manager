import { type ChangeEvent, type JSX, useEffect, useState } from "react";

import styles from "./search-box.module.css";

export interface SearchBoxProps {
  onSearch: (query: string) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export const SearchBox = ({ onSearch }: SearchBoxProps): JSX.Element => {
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onSearch(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query, onSearch]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setQuery(event.target.value);
  };

  return (
    <input
      type="search"
      className={styles.searchInput}
      placeholder="Search files and directories"
      aria-label="Search"
      value={query}
      onChange={handleChange}
    />
  );
};
