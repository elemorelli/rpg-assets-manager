import {
  type DependencyList,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useState,
} from "react";

import { describeError } from "#web/utils/describe-error.ts";

export interface UseFetchOnMountResult<T> {
  data: T | null;
  setData: Dispatch<SetStateAction<T | null>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
}

export const useFetchOnMount = <T>(
  fetchFn: () => Promise<T>,
  deps: DependencyList,
): UseFetchOnMountResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFn()
      .then(setData)
      .catch((caught: unknown) => setError(describeError(caught)));
  }, deps);

  return { data, setData, error, setError };
};
