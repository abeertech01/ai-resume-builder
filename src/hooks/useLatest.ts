import { useEffect, useRef } from "react";

// Keeps a ref in sync with the latest value on every render, so a callback
// captured in an effect (e.g. inside a debounce) can read the current value
// without needing it in that effect's dependency array - useful when adding
// the value as a dependency would tear down and recreate something (like a
// subscription) more often than necessary.
export default function useLatest<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  });

  return ref;
}
