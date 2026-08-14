import type { JSX } from "react";
import { FileBrowser } from "./components/file-browser/file-browser.tsx";

export const App = (): JSX.Element => (
  <main>
    <h1>rpg-assets-manager</h1>
    <FileBrowser />
  </main>
);
