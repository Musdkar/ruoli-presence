import { useEffect, useState } from "react";

// Tracks the resolved theme (light/dark) by observing the <html> class that the
// pre-paint script and useTheme keep in sync.
export function useResolvedTheme() {
  const read = () => (document.documentElement.classList.contains("light") ? "light" : "dark");
  const [resolved, setResolved] = useState(read);
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setResolved(read()));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    setResolved(read());
    return () => obs.disconnect();
  }, []);
  return resolved;
}
