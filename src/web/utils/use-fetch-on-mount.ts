import {
  type DependencyList,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useState,
} from "react";

import { describeErrorAsMessage, type Message } from "#web/utils/message.ts";

export interface UseFetchOnMountResult<T> {
  data: T | null;
  setData: Dispatch<SetStateAction<T | null>>;
  message: Message | null;
  setMessage: Dispatch<SetStateAction<Message | null>>;
}

export const useFetchOnMount = <T>(
  fetchFn: () => Promise<T>,
  deps: DependencyList,
): UseFetchOnMountResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    fetchFn()
      .then(setData)
      .catch((caught: unknown) => setMessage(describeErrorAsMessage(caught)));
  }, deps);

  return { data, setData, message, setMessage };
};
