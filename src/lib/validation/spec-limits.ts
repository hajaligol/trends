/** Max custom rows in a product's specifications table. Shared by the
 * admin editor (client) and the server-side schema; kept free of `zod`
 * so importing it doesn't pull validation code into the client bundle. */
export const MAX_SPEC_ROWS = 30;
