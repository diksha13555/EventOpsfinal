// Lets the server code import the .sql files as plain text.
declare module "*.sql?raw" {
  const sql: string;
  export default sql;
}
