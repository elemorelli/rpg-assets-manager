// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DiffRow } from "#web/utils/diff-rows.ts";

import { DiffTable } from "./diff-table.tsx";

describe("DiffTable", () => {
  it("renders the before and after column headers", () => {
    render(<DiffTable rows={[]} beforeLabel="Source" afterLabel="Destination" />);

    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Destination")).toBeInTheDocument();
  });

  it("defaults the column headers to Before and After", () => {
    render(<DiffTable rows={[]} />);

    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("shows an added row only in the after column", () => {
    const rows: DiffRow[] = [{ key: "added:a.png", kind: "added", after: "a.png" }];

    render(<DiffTable rows={rows} />);

    expect(screen.getByText("a.png")).toBeInTheDocument();
  });

  it("shows a removed row only in the before column", () => {
    const rows: DiffRow[] = [{ key: "removed:c.png", kind: "removed", before: "c.png" }];

    render(<DiffTable rows={rows} />);

    expect(screen.getByText("c.png")).toBeInTheDocument();
  });

  it("shows a renamed row with the old path before and the new path after", () => {
    const rows: DiffRow[] = [
      { key: "renamed:old.png", kind: "renamed", before: "old.png", after: "new.png" },
    ];

    render(<DiffTable rows={rows} />);

    expect(screen.getByText("old.png")).toBeInTheDocument();
    expect(screen.getByText("new.png")).toBeInTheDocument();
  });

  it("shows a warning badge when a row will overwrite an existing destination file", () => {
    const rows: DiffRow[] = [
      {
        key: "a.png",
        kind: "renamed",
        before: "a.png",
        after: "a.webp",
        overwrite: true,
      },
    ];

    render(<DiffTable rows={rows} />);

    expect(screen.getByText("overwrites existing")).toBeInTheDocument();
  });

  it("does not show a warning badge when a row will not overwrite anything", () => {
    const rows: DiffRow[] = [
      {
        key: "a.png",
        kind: "renamed",
        before: "a.png",
        after: "a.webp",
        overwrite: false,
      },
    ];

    render(<DiffTable rows={rows} />);

    expect(screen.queryByText("overwrites existing")).not.toBeInTheDocument();
  });
});
