/** Limits of a product's sizing table. Shared by the admin editor (client)
 * and the server-side schema; free of `zod` so the client bundle stays small. */
export const MAX_SIZE_CHART_COLUMNS = 8;
export const MAX_SIZE_CHART_ROWS = 24;
export const MAX_SIZE_CHART_CELL_LENGTH = 40;
export const MAX_SIZE_CHART_NOTE_LENGTH = 400;
