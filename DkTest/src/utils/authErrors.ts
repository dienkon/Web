/**
 * Centralized Firebase Auth error mapping to Vietnamese user-friendly messages
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";

  const code = error.code || "";

  // Extract a usable string message from the error
  // ApiError has .message (string) and .data (object with .message or .error)
  let message = "";
  if (typeof error.message === "string" && error.message && !error.message.includes("[object Object]")) {
    message = error.message;
  }
  // If message is empty or '[object Object]', try extracting from .data
  if (!message && error.data) {
    if (typeof error.data === "string") {
      message = error.data;
    } else if (typeof error.data?.message === "string") {
      message = error.data.message;
    } else if (typeof error.data?.error === "string") {
      message = error.data.error;
    }
  }
  // Fallback: try to stringify if still empty
  if (!message && typeof error === "object") {
    try {
      const str = JSON.stringify(error);
      if (str && str !== "{}" && str.length < 300) {
        message = str;
      }
    } catch {}
  }

  switch (code) {
    case "auth/user-not-found":
      return "Không tìm thấy tài khoản với email này. Vui lòng kiểm tra lại hoặc đăng ký mới.";
    case "auth/wrong-password":
      return "Mật khẩu không chính xác. Vui lòng thử lại hoặc chọn 'Quên mật khẩu'.";
    case "auth/invalid-credential":
      return "Email hoặc mật khẩu không chính xác. Vui lòng thử lại.";
    case "auth/email-already-in-use":
      return "Email này đã được đăng ký trước đó. Bạn có thể chọn 'Đăng nhập' hoặc khôi phục mật khẩu.";
    case "auth/popup-closed-by-user":
      return "Cửa sổ đăng nhập Google đã được đóng lại trước khi hoàn tất.";
    case "auth/popup-blocked":
      return "Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép popup và thử lại.";
    case "auth/invalid-email":
      return "Địa chỉ email không đúng định dạng hợp lệ.";
    case "auth/weak-password":
      return "Mật khẩu quá ngắn hoặc quá yếu (cần tối thiểu 8 ký tự).";
    case "auth/too-many-requests":
      return "Bạn đã thử đăng nhập thất bại quá nhiều lần. Vui lòng chờ ít phút rồi thử lại.";
    case "auth/network-request-failed":
      return "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối Internet của bạn.";
    case "auth/user-disabled":
      return "Tài khoản của bạn đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên.";
    case "auth/account-exists-with-different-credential":
      return "Email này đã liên kết với một phương thức đăng nhập khác (ví dụ: Google).";
    case "permission-denied":
      return "Bạn không có quyền thực hiện thao tác này.";
    default:
      if (message.includes("password")) return "Mật khẩu không hợp lệ.";
      if (message.includes("email")) return "Email không hợp lệ.";
      return message || "Đã xảy ra sự cố. Vui lòng thử lại sau.";
  }
}
