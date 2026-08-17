(() => {
    const STATUS_ID = 'pnd-network-status';
    let hideTimer = null;

    function ensureStatusNode() {
        let node = document.getElementById(STATUS_ID);
        if (node) return node;
        node = document.createElement('button');
        node.id = STATUS_ID;
        node.type = 'button';
        node.setAttribute('aria-live', 'polite');
        Object.assign(node.style, {
            position: 'fixed',
            left: '50%',
            bottom: '16px',
            transform: 'translateX(-50%) translateY(16px)',
            zIndex: '9998',
            border: '1px solid rgba(255,255,255,.35)',
            borderRadius: '999px',
            padding: '10px 16px',
            color: '#fff',
            fontFamily: 'Quicksand, system-ui, sans-serif',
            fontSize: '12px',
            fontWeight: '700',
            boxShadow: '0 12px 30px rgba(15,23,42,.2)',
            opacity: '0',
            pointerEvents: 'none',
            transition: 'opacity .2s ease, transform .2s ease',
            whiteSpace: 'nowrap'
        });
        document.body.appendChild(node);
        return node;
    }

    function showStatus(message, color, { persistent = false, action = null } = {}) {
        const node = ensureStatusNode();
        clearTimeout(hideTimer);
        node.textContent = message;
        node.style.background = color;
        node.style.opacity = '1';
        node.style.transform = 'translateX(-50%) translateY(0)';
        node.style.pointerEvents = action ? 'auto' : 'none';
        node.onclick = action;
        if (!persistent) {
            hideTimer = setTimeout(() => {
                node.style.opacity = '0';
                node.style.transform = 'translateX(-50%) translateY(16px)';
                node.style.pointerEvents = 'none';
            }, 2800);
        }
    }

    function updateNetworkStatus() {
        if (navigator.onLine) {
            showStatus('✓ Đã kết nối lại Internet', '#047857');
            window.dispatchEvent(new CustomEvent('pnd:online'));
        } else {
            showStatus('● Đang ngoại tuyến · dùng dữ liệu đã lưu', '#b45309', { persistent: true });
            window.dispatchEvent(new CustomEvent('pnd:offline'));
        }
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    document.addEventListener('DOMContentLoaded', () => {
        if (!navigator.onLine) updateNetworkStatus();
    });

    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
            if (registration.waiting) {
                showStatus('Có bản PND mới · bấm để cập nhật', '#8C5F3B', {
                    persistent: true,
                    action: () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
                });
            }
            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                worker?.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        showStatus('Có bản PND mới · bấm để cập nhật', '#8C5F3B', {
                            persistent: true,
                            action: () => worker.postMessage({ type: 'SKIP_WAITING' })
                        });
                    }
                });
            });
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (window.antiCheatDangBat) {
                    showStatus('Bản mới sẽ áp dụng sau khi bạn rời phòng thi', '#8C5F3B');
                    return;
                }
                location.reload();
            });
        } catch (error) {
            console.warn('Không đăng ký được chế độ local-first:', error.message);
        }
    });
})();