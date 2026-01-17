// src/constants/currencies.ts
/* ======================================================
   ISO 4217 Currency Constants
   Can be safely used across:
   - Order model
   - Payment model
   - Checkout
   - Admin filters
====================================================== */

export interface CurrencyConfig {
  code: string;        // ISO code (INR, USD, etc.)
  name: string;        // Currency name
  symbol: string;      // ₹, $, €
  countries: string[]; // ISO country codes
}

/* ================= ALL CURRENCIES ================= */

export const CURRENCIES: CurrencyConfig[] = [
  {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    countries: ["IN"],
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    countries: ["US"],
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    countries: [
      "FR",
      "DE",
      "IT",
      "ES",
      "NL",
      "BE",
      "AT",
      "PT",
      "FI",
      "IE",
    ],
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    countries: ["GB"],
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    countries: ["AU"],
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    countries: ["CA"],
  },
  {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    countries: ["SG"],
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    countries: ["AE"],
  },
];

/* ================= ENUM HELPERS ================= */

/** ["INR","USD","EUR"...] → for mongoose enum */
export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

/** Default currency */
export const DEFAULT_CURRENCY = "INR";

/* ================= UTIL FUNCTIONS ================= */

export const getCurrencyByCode = (code: string) =>
  CURRENCIES.find((c) => c.code === code);

export const getCurrencySymbol = (code: string) =>
  getCurrencyByCode(code)?.symbol ?? "₹";
