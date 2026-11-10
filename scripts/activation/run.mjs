import "./register-loader.mjs";

// Importing the business core never runs the CLI or opens a connection.
try {
  const { main } = await import("./cli.ts");
  await main(process.argv.slice(2));
} catch {
  console.error("ACTIVATION_STOPPED: no automatic retry. Review dry-run and the local journal. Sensitive diagnostics suppressed.");
  process.exitCode = 1;
}
