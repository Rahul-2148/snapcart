export const extractCityStateFromLabel = (label: string) => {
  const parts = label.split(",").map((p) => p.trim());
  const city = parts[0] || "";

  const isNumeric = (s: string) => /^\d+$/.test(s);

  const COUNTRY = "India";
  let state = "";

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];

    if (part === COUNTRY) continue;
    if (isNumeric(part)) continue;

    if (!state) {
      state = part;
      break;
    }
  }

  return { city, state };
};