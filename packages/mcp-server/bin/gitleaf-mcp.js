#!/usr/bin/env node
import { main } from '../dist/bin.js';

await main(process.argv.slice(2));
