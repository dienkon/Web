#!/usr/bin/env node
// Compatibility entry point; data generation is shared by all ChemDex tools.
import { generateCatalogFile } from '../../scripts/generate-reaction-catalog.mjs';
generateCatalogFile(process.argv[2]);
