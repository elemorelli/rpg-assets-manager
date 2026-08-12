import { type JSX, useEffect, useState } from "react";

export const App = (): JSX.Element => {
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    const checkHealth = async (): Promise<void> => {
      const response = await fetch("/api/health");
      const data = await response.json();

      setStatus(data.status);
    };

    checkHealth().catch(() => setStatus("unreachable"));
  }, []);

  return (
    <main>
      <h1>rpg-assets-manager</h1>
      <p>API status: {status}</p>
    </main>
  );
};
