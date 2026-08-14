export const parseFoundryWorldNames = (rawValue: string | undefined): string[] =>
  (rawValue ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

export const foundryWorldNames: string[] = parseFoundryWorldNames(process.env.FOUNDRY_WORLD_NAMES);
