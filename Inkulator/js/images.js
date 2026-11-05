(function (root) {
  "use strict";
  async function process(src, { threshold = 195, bold = 1 } = {}) {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.min(
        1,
        3000 / Math.max(img.naturalWidth, img.naturalHeight),
      ),
      c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const image = ctx.getImageData(0, 0, c.width, c.height),
      pixels = image.data,
      alpha = new Uint8Array(c.width * c.height);
    for (let i = 0; i < alpha.length; i++) {
      const j = i * 4,
        lum =
          0.2126 * pixels[j] + 0.7152 * pixels[j + 1] + 0.0722 * pixels[j + 2];
      alpha[i] =
        (Math.max(0, Math.min(255, ((threshold + 45 - lum) * 255) / 45)) *
          pixels[j + 3]) /
        255;
    }
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++) {
        let a = alpha[y * c.width + x];
        if (bold > 0)
          for (let dy = -bold; dy <= bold; dy++)
            for (let dx = -bold; dx <= bold; dx++) {
              const xx = x + dx,
                yy = y + dy;
              if (xx >= 0 && yy >= 0 && xx < c.width && yy < c.height)
                a = Math.max(a, alpha[yy * c.width + xx]);
            }
        const j = (y * c.width + x) * 4;
        pixels[j] = pixels[j + 1] = pixels[j + 2] = 17;
        pixels[j + 3] = a;
      }
    ctx.putImageData(image, 0, 0);
    const result = { src: c.toDataURL("image/png"), w: c.width, h: c.height };
    c.width = c.height = 1;
    return result;
  }
  function panel(o) {
    const el = document.getElementById("panel-content");
    el.innerHTML =
      '<p class="hint">Ảnh chèn giữ nguyên màu, nền và độ phân giải gốc. Chỉ áp dụng nét đen / nền trong suốt khi bạn muốn xử lý bản vẽ.</p><div class="image-comparison"><figure><img id="image-original" alt="Ảnh gốc"><figcaption>Ảnh gốc</figcaption></figure><figure><img id="image-processed" alt="Ảnh hiện tại"><figcaption>Trên trang</figcaption></figure></div><label class="field"><span>Ngưỡng tách nét</span><input type="range" id="image-threshold" min="100" max="230" value="' +
      (o.data.processing?.threshold || 195) +
      '"></label><label class="field"><span>Làm đậm nét</span><select id="image-bold"><option value="0">Giữ độ dày</option><option value="1" selected>Đậm vừa · 1 px</option><option value="2">Đậm rõ · 2 px</option></select></label><button class="primary full" id="image-clean">Áp dụng nét đen / nền trong suốt</button><button class="secondary full" id="image-restore">Khôi phục ảnh màu gốc</button>';
    document.getElementById("image-original").src =
      o.data.originalSrc || o.data.src;
    document.getElementById("image-processed").src = o.data.src;
    document.getElementById("image-clean").onclick = async () => {
      try {
        const options = {
            threshold: Number(document.getElementById("image-threshold").value),
            bold: Number(document.getElementById("image-bold").value),
          },
          r = await process(o.data.originalSrc || o.data.src, options);
        Store.transaction(() => {
          o.data.originalSrc = o.data.originalSrc || o.data.src;
          o.data.src = r.src;
          o.data.processing = options;
        });
        document.getElementById("image-processed").src = o.data.src;
      } catch (e) {
        App.toast(e.message);
      }
    };
    document.getElementById("image-restore").onclick = () => {
      if (o.data.originalSrc) {
        Store.transaction(() => {
          o.data.src = o.data.originalSrc;
          delete o.data.processing;
        });
        document.getElementById("image-processed").src = o.data.src;
      }
    };
  }
  root.ImageStudio = { process, panel };
})(window);
