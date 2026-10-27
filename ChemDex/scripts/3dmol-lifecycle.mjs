import fs from "node:fs/promises";

// 3Dmol 2.5.5 registers bound handlers on body/window without exposing their
// references. Add a deterministic destructor while bundling the pinned source;
// no global event methods are patched at runtime and node_modules is untouched.
export const viewerLifecyclePlugin = {
  name: "3dmol-managed-lifecycle",
  setup(build) {
    build.onLoad(
      { filter: /[\\/]3dmol[\\/]src[\\/]WebGL[\\/]Renderer\.ts$/ },
      async ({ path }) => {
        let source = await fs.readFile(path, "utf8");
        const before =
          "window.devicePixelRatio !== undefined ? window.devicePixelRatio : 1;";
        if (!source.includes(before))
          throw new Error(
            "Review 3Dmol resolution cap after dependency update.",
          );
        source = source.replace(
          before,
          "Math.min(window.devicePixelRatio ?? 1, this.maxPixelRatio);",
        );
        source = source.replace(
          "  devicePixelRatio = 1.0;",
          "  maxPixelRatio = 2;\n  devicePixelRatio = 1.0;",
        );
        return { contents: source, loader: "ts" };
      },
    );
    build.onLoad(
      { filter: /[\\/]3dmol[\\/]src[\\/]GLViewer\.ts$/ },
      async ({ path }) => {
        let source = await fs.readFile(path, "utf8");
        const replacements = [
          [
            "document.body.addEventListener('mouseup', this._handleMouseUp.bind(this));",
            "this.releaseGlobalListeners ??= []; const mouseUp = this._handleMouseUp.bind(this); document.body.addEventListener('mouseup', mouseUp); this.releaseGlobalListeners.push(() => document.body.removeEventListener('mouseup', mouseUp));",
          ],
          [
            "document.body.addEventListener('touchend', this._handleMouseUp.bind(this));",
            "const touchEnd = this._handleMouseUp.bind(this); document.body.addEventListener('touchend', touchEnd); this.releaseGlobalListeners.push(() => document.body.removeEventListener('touchend', touchEnd));",
          ],
          [
            'window.addEventListener("resize", this.resize.bind(this));',
            'const onResize = this.resize.bind(this); window.addEventListener("resize", onResize); this.releaseGlobalListeners.push(() => window.removeEventListener("resize", onResize));',
          ],
          [
            "    public resize() {",
            "    public resize() { if (this.platformDisposed) return this;",
          ],
          [
            "    public clear() {",
            `    private platformDisposed = false;
    private releaseGlobalListeners: Array<() => void> = [];
    public destroy() {
        this.platformDisposed = true;
        this.spin(false);
        this.stopAnimate();
        this.clear();
        this.divwatcher?.disconnect();
        this.intwatcher?.disconnect();
        for (const release of this.releaseGlobalListeners) release();
        this.releaseGlobalListeners = [];
        this.renderer.getContext()?.getExtension('WEBGL_lose_context')?.loseContext();
        this.glDOM.remove();
    }
    public clear() {`,
          ],
        ];
        for (const [before, after] of replacements) {
          if (!source.includes(before))
            throw new Error(
              "3Dmol lifecycle patch must be reviewed after a dependency update.",
            );
          source = source.replace(before, after);
        }
        return { contents: source, loader: "ts" };
      },
    );
  },
};
