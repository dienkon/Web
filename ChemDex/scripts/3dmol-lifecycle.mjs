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
            '        var scaleFactor = (this.CAMERA_Z - this.rotationGroup.position.z) * 0.85;',
            `        // Normalize modern wheel events: up/pinch-out zooms in.
        if (typeof ev.deltaY === 'number') {
            const pixels = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? this.HEIGHT : 1);
            this.zoom(Math.exp(-Math.max(-240, Math.min(240, pixels)) * 0.001));
            return;
        }
        var scaleFactor = (this.CAMERA_Z - this.rotationGroup.position.z) * 0.85;`,
          ],
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
            '        if (!this.control_all && !this.isInViewer(x, y)) {',
            '        if (!this.control_all && !this.isDragging && !this.isInViewer(x, y)) {',
          ],
          [
            `        this.isDragging = true;
        this.mouseButton = ev.which;
        this.mouseStartX = x;
        this.mouseStartY = y;
        this.touchHold = true;`,
            `        if (this.inertiaRaf) { cancelAnimationFrame(this.inertiaRaf); this.inertiaRaf = 0; }
        this.isDragging = true;
        this.mouseButton = ev.which;
        this.mouseStartX = x;
        this.mouseStartY = y;
        this.lastDragX = x;
        this.lastDragY = y;
        this.dragVelX = 0;
        this.dragVelY = 0;
        this.lastDragTime = performance.now();
        this.didRotateDrag = false;
        if (!this._boundWindowMove) {
            this._boundWindowMove = (e) => {
                if (!this.isDragging || e._cdMoveHandled) return;
                this._handleMouseMove(e);
            };
        }
        window.addEventListener('mousemove', this._boundWindowMove, { passive: false });
        this.touchHold = true;`,
          ],
          [
            `        this.isDragging = false;
    }`,
            `        if (this._boundWindowMove) {
            window.removeEventListener('mousemove', this._boundWindowMove);
        }
        const shouldGlide =
            this.isDragging &&
            this.scene &&
            this.didRotateDrag &&
            (!this.mouseButton || this.mouseButton == 1) &&
            (performance.now() - (this.lastDragTime || 0)) < 75 &&
            Math.hypot(this.dragVelX || 0, this.dragVelY || 0) > 0.08;
        this.isDragging = false;
        this.didRotateDrag = false;
        if (shouldGlide && !this.platformDisposed) {
            let lastT = performance.now();
            const glide = (now) => {
                if (this.platformDisposed || this.isDragging || !this.scene) {
                    this.inertiaRaf = 0;
                    return;
                }
                const dt = Math.min((now - lastT) / 1000, 0.05);
                lastT = now;
                const ux = this.dragVelX * dt;
                const uy = this.dragVelY * dt;
                const ur = Math.hypot(ux, uy);
                if (ur > 0.0002) {
                    const halfAngle = Math.min(ur * 1.45, Math.PI * 0.25);
                    const s = Math.sin(halfAngle) / ur;
                    const c = Math.cos(halfAngle);
                    this.dq.set(s * uy, s * ux, 0, c);
                    const nextQ = this.rotationGroup.quaternion.clone();
                    this.rotationGroup.quaternion.multiplyQuaternions(this.dq, nextQ).normalize();
                    this.show();
                }
                const damp = Math.exp(-8.5 * dt);
                this.dragVelX *= damp;
                this.dragVelY *= damp;
                if (Math.hypot(this.dragVelX, this.dragVelY) > 0.025) {
                    this.inertiaRaf = requestAnimationFrame(glide);
                } else {
                    this.dragVelX = 0;
                    this.dragVelY = 0;
                    this.inertiaRaf = 0;
                }
            };
            this.inertiaRaf = requestAnimationFrame(glide);
        }
    }`,
          ],
          [
            `        } else if ((mode === 0 || this.mouseButton == 1) && r !== 0) { // Rotate
            var rs = Math.sin(r * Math.PI) / r;
            this.dq.x = Math.cos(r * Math.PI);
            this.dq.y = 0;
            this.dq.z = rs * dx;
            this.dq.w = -rs * dy;
            this.rotationGroup.quaternion.set(1, 0, 0, 0);
            this.rotationGroup.quaternion.multiply(this.dq);
            this.rotationGroup.quaternion.multiply(this.cq);
        }
        this.show();`,
            `        } else if ((mode === 0 || this.mouseButton == 1) && r !== 0) { // Rotate
            this.didRotateDrag = true;
            const baseDim = Math.max(Math.min(this.WIDTH, this.HEIGHT), 220);
            const stepPxX = (x - (this.lastDragX ?? this.mouseStartX)) * ratioX;
            const stepPxY = (y - (this.lastDragY ?? this.mouseStartY)) * ratioY;
            this.lastDragX = x;
            this.lastDragY = y;
            const ux = stepPxX / baseDim;
            const uy = stepPxY / baseDim;
            const ur = Math.hypot(ux, uy);
            if (ur > 0) {
                const halfAngle = Math.min(ur * 1.45, Math.PI * 0.45);
                const s = Math.sin(halfAngle) / ur;
                const c = Math.cos(halfAngle);
                this.dq.set(s * uy, s * ux, 0, c);
                const nextQ = this.rotationGroup.quaternion.clone();
                this.rotationGroup.quaternion.multiplyQuaternions(this.dq, nextQ).normalize();
                const now = performance.now();
                const dtMs = Math.max(now - (this.lastDragTime || now - 16), 6);
                const rate = 1000 / Math.min(dtMs, 80);
                this.dragVelX = (this.dragVelX || 0) * 0.45 + (ux * rate) * 0.55;
                this.dragVelY = (this.dragVelY || 0) * 0.45 + (uy * rate) * 0.55;
                this.lastDragTime = now;
            }
        }
        ev._cdMoveHandled = true;
        if (!this._renderQueued) {
            this._renderQueued = true;
            this._renderRaf = requestAnimationFrame(() => {
                this._renderQueued = false;
                if (!this.platformDisposed && this.scene) this.show();
            });
        }`,
          ],
          [
            "    public clear() {",
            `    private platformDisposed = false;
    private releaseGlobalListeners: Array<() => void> = [];
    private lastDragX = 0;
    private lastDragY = 0;
    private dragVelX = 0;
    private dragVelY = 0;
    private lastDragTime = 0;
    private didRotateDrag = false;
    private inertiaRaf = 0;
    private _renderRaf = 0;
    private _renderQueued = false;
    private _boundWindowMove: ((e: any) => void) | null = null;
    public destroy() {
        this.platformDisposed = true;
        if (this.inertiaRaf) { cancelAnimationFrame(this.inertiaRaf); this.inertiaRaf = 0; }
        if (this._renderRaf) { cancelAnimationFrame(this._renderRaf); this._renderRaf = 0; }
        if (this._boundWindowMove) {
            window.removeEventListener('mousemove', this._boundWindowMove);
            this._boundWindowMove = null;
        }
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
