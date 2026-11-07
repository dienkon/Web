# Offline formula recognition

Source and quantized CoMER models: [kimseungdae/ink-on](https://github.com/kimseungdae/ink-on), pinned commit in UPSTREAM.json, Apache-2.0. Original LICENSE and source are in upstream/. CoMER research: [Green-Wood/CoMER](https://github.com/Green-Wood/CoMER).

Inkulator changes: classic self-contained worker, embedded local model/WASM bytes, no CDN or API, fixed single CPU thread, an ONNX Runtime 1.24.2 adapter that forces the embedded WASM-JS runtime for file/blob workers, local fflate decompression, pen-stroke and region adapters, review before replacement. The original upstream source is retained; scripts/build-runtime.cjs applies the worker adapter at build time.

ONNX Runtime Web: Microsoft, MIT; license in runtime/ONNX-RUNTIME-LICENSE. Model assets are lazy-loaded from local files. Recognition is statistical and can be wrong, particularly on long/multi-line expressions or writing unlike the model's training set.
