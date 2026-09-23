/**
 * Application Lifecycle & Connection Monitoring
 */
import { store } from "./state.js";
import { notificationService } from "../services/notification.service.js";

export const initLifecycle = () => {
  const updateOnlineStatus = () => {
    const online = navigator.onLine;
    store.setUIState({ online });

    let indicator = document.getElementById("connection-status-pill");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "connection-status-pill";
      indicator.className = "fixed bottom-5 left-5 z-40 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all duration-300 pointer-events-none hidden";
      document.body.appendChild(indicator);
    }

    if (!online) {
      indicator.className = "fixed bottom-5 left-5 z-40 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all duration-300 bg-red-600 text-white flex items-center gap-1.5";
      indicator.innerHTML = '<i class="fas fa-wifi text-[10px]"></i> Mất kết nối internet';
      indicator.classList.remove("hidden");
      notificationService.warning("Bạn đang ngoại tuyến. Một số thao tác có thể bị gián đoạn.");
    } else {
      if (!indicator.classList.contains("hidden")) {
        indicator.className = "fixed bottom-5 left-5 z-40 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all duration-300 bg-green-600 text-white flex items-center gap-1.5";
        indicator.innerHTML = '<i class="fas fa-check text-[10px]"></i> Đã có kết nối trở lại';
        setTimeout(() => {
          indicator.classList.add("hidden");
        }, 3000);
      }
    }
  };

  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
};
