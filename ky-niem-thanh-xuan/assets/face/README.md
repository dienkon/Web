# Local face-search assets

face-api.js 0.22.2 and the Tiny Face Detector, 68-point tiny landmarks and 128-dimensional recognition weights are vendored from the upstream tag `0.22.2`, commit `8609b25a15f417398a4d2b95dc91985cd1e0c0c3`:
https://github.com/justadudewhohacks/face-api.js/tree/8609b25a15f417398a4d2b95dc91985cd1e0c0c3

The upstream MIT license is included as `LICENSE`. These files are loaded only when a visitor chooses a reference photo. No external AI service is used. Descriptors use Euclidean distance, not a calibrated probability of identity. Accuracy depends on lighting, face size, pose and thumbnail quality.

To update the model, update all three manifests and their referenced shards together and bump `MODEL` in `face-search.js` to invalidate old descriptors.
