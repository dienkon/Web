type PopupDetail = {
  title: string;
  message: string;
};

export const showPopup = (message: string) => {
  window.dispatchEvent(
    new CustomEvent("game-popup", {
      detail: {
        message,
      },
    }),
  );
};