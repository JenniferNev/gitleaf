// Entry for the single-file bundle: start the stdio server for the cwd given by --cwd or GITLEAF_CWD.
import { main } from './bin.js';

await main(process.argv.slice(2));
