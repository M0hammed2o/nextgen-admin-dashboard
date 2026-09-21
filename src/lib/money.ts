// Money helpers for the commercial (sales/invoicing) UI.
//
// Every commercial amount on the wire is an integer number of cents (see
// admin_api/app/api/v1/routes_commercial.py's InvoiceLineIn.unit_amount_cents
// etc.) -- these two functions are the ONLY place rand<->cents conversion
// happens, specifically to avoid float drift (0.1 + 0.2 !== 0.3 in IEEE754).
// Both work on strings/integers only, never floating-point arithmetic.

/**
 * Parse a rand amount typed by a human (e.g. "1234.50", "99", "0.1") into an
 * exact integer number of cents. String-parsed digit-by-digit -- never goes
 * through floating point -- so summing e.g. randsToCents("0.1") +
 * randsToCents("0.2") is exactly 30, not 30.000000000000004.
 *
 * Rejects: negative amounts, more than 2 decimal places, and anything that
 * isn't a plain unsigned decimal number (no currency symbols, thousands
 * separators, scientific notation, etc.).
 */
export function randsToCents(input: string): number {
  const trimmed = input.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!match) {
    throw new Error(
      `"${input}" isn't a valid amount -- enter a positive number with at most 2 decimal places, e.g. 1234.50`
    );
  }
  const [, wholeRands, fractionRaw] = match;
  const fractionCents = (fractionRaw ?? "").padEnd(2, "0");
  return Number(wholeRands) * 100 + Number(fractionCents);
}

/**
 * The inverse of randsToCents, for pre-filling an editable amount field
 * (e.g. from the price catalogue) as a plain "1234.50" string -- never
 * pre-formatted with a currency symbol or thousands separator, since this
 * value is meant to be typed into the same input randsToCents will parse.
 */
export function centsToRandsInput(cents: number): string {
  const wholeCents = Math.round(cents);
  const sign = wholeCents < 0 ? "-" : "";
  const abs = Math.abs(wholeCents);
  const rands = Math.floor(abs / 100);
  const remainderCents = String(abs % 100).padStart(2, "0");
  return `${sign}${rands}.${remainderCents}`;
}

/**
 * Format an integer number of cents as "R 1 234.50" for display -- a fixed,
 * deterministic format (space thousands separator, dot decimal) rather than
 * relying on Intl's locale currency formatting, whose exact separators are
 * ICU-data-dependent and can differ between the browser and the Node/Vitest
 * environment (en-ZA renders "R 1 234,50" with a comma decimal in this
 * repo's Node ICU build -- verified while building this helper). ONE
 * function for every rand amount shown anywhere in this app.
 */
export function formatCentsAsRands(cents: number): string {
  const wholeCents = Math.round(cents);
  const sign = wholeCents < 0 ? "-" : "";
  const abs = Math.abs(wholeCents);
  const rands = Math.floor(abs / 100);
  const remainderCents = String(abs % 100).padStart(2, "0");
  const randsWithSeparators = String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}R ${randsWithSeparators}.${remainderCents}`;
}
