// Built once during development. Runtime is a classic local script; no file:// imports.
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";
globalThis.pdfjsWorker = { WorkerMessageHandler };
globalThis.pdfjsLib = pdfjs;
