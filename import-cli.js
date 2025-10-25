#!/usr/bin/env node

import EasyPayDataImporter from './src/services/EasyPayDataImporter.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './config.env' });

async function main() {
  console.log('🚀 EasyPay Data Import Tool');
  console.log('============================');

  const args = process.argv.slice(2);
  const options = {
    batchSize: 100,
    skipDuplicates: true,
    updateExisting: false,
    dryRun: false
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 100;
        break;
      case '--update-existing':
        options.updateExisting = true;
        options.skipDuplicates = false;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  console.log('📋 Import Options:');
  console.log(`   Batch Size: ${options.batchSize}`);
  console.log(`   Skip Duplicates: ${options.skipDuplicates}`);
  console.log(`   Update Existing: ${options.updateExisting}`);
  console.log(`   Dry Run: ${options.dryRun}`);
  console.log('');

  try {
    const importer = new EasyPayDataImporter();
    const stats = await importer.importAll(options);

    console.log('');
    console.log('📊 Import Results:');
    console.log(`   Total Clients: ${stats.total.toLocaleString()}`);
    console.log(`   Imported: ${stats.imported.toLocaleString()}`);
    console.log(`   Skipped: ${stats.skipped.toLocaleString()}`);
    console.log(`   Errors: ${stats.errors.toLocaleString()}`);
    console.log(`   Duplicates: ${stats.duplicates.toLocaleString()}`);
    console.log(`   Processing Time: ${formatTime(stats.processingTime)}`);

    if (stats.errors > 0) {
      console.log('');
      console.log('⚠️  Some errors occurred during import. Check the logs for details.');
    }

    if (options.dryRun) {
      console.log('');
      console.log('🔍 This was a dry run. No data was actually imported.');
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
EasyPay Data Import Tool

Usage: node import-cli.js [options]

Options:
  --batch-size <number>    Number of clients to process in each batch (default: 100)
  --update-existing        Update existing clients instead of skipping them
  --dry-run               Analyze data without importing
  --help                  Show this help message

Examples:
  node import-cli.js                           # Basic import
  node import-cli.js --batch-size 200          # Import with larger batches
  node import-cli.js --dry-run                 # Analyze data only
  node import-cli.js --update-existing         # Update existing clients
`);
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

main().catch(console.error);
