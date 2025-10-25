// Main Envio HyperIndex entry point
// This file initializes the indexer and sets up the processing pipeline

import { HyperIndex } from "@envio-dev/hyperindex-core";
import { config } from "../config.yaml";

// Initialize the HyperIndex instance
const indexer = new HyperIndex({
  config,
  // Add any additional configuration here
});

// Start the indexer
indexer.start().catch((error) => {
  console.error("Failed to start indexer:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down indexer...");
  indexer.stop().then(() => {
    console.log("Indexer stopped gracefully");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("Shutting down indexer...");
  indexer.stop().then(() => {
    console.log("Indexer stopped gracefully");
    process.exit(0);
  });
});
