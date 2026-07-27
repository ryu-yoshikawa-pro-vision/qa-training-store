import { useCallback, useEffect, useState, type DependencyList } from "react";

export function useAsyncValue<T>(load: () => Promise<T>, dependencies: DependencyList) {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const [sequence, setSequence] = useState(0);
  const retry = useCallback(() => setSequence((current) => current + 1), []);
  useEffect(() => {
    let active = true;
    setValue(null);
    setError(null);
    setLoaded(false);
    void load()
      .then((result) => {
        if (active) {
          setValue(result);
          setLoaded(true);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
    // The caller explicitly provides the reload boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, sequence]);
  return { value, error, loaded, retry };
}
