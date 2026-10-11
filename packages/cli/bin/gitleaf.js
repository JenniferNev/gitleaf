#!/usr/bin/env node
import { main } from '../dist/index.js';

process.exitCode = await main(process.argv.slice(2), {
  out: process.stdout,
  err: process.stderr,
  isTTY: process.stdout.isTTY === true,
});
