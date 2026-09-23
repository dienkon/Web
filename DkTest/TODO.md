Hãy tiếp tục nâng cấp DkTEST theo repository hiện tại, nhưng lần này tập trung đặc biệt vào **AUTHENTICATION FLOW, ACCOUNT REGISTRATION, EMAIL VERIFICATION, USERNAME LOGIN và FIX TOÀN BỘ LỖI ĐĂNG NHẬP/FAILED TO FETCH**.

Không chỉ thêm UI. Phải triển khai hoàn chỉnh frontend + Firebase Authentication + Firestore + Express/backend + routing + auth state + security.

# 1. BẮT BUỘC CÓ 3 PHƯƠNG THỨC ĐĂNG NHẬP

Hệ thống phải hỗ trợ rõ ràng 3 lựa chọn:

### A. Đăng nhập bằng Username + Mật khẩu

Form:

```text
Username
Mật khẩu
```

### B. Đăng nhập bằng Email + Mật khẩu

Form:

```text
Email
Mật khẩu
```

### C. Đăng nhập bằng Google

Nút:

```text
Tiếp tục với Google
```

UI nên dùng tab/segmented control hoặc cách trình bày rõ ràng để người dùng hiểu đang đăng nhập bằng phương thức nào.

Ví dụ:

```text
[ Username ] [ Email ] [ Google ]
```

Không được để một form duy nhất gây nhầm lẫn username/email.

---

# 2. USERNAME PHẢI LÀ ĐỊNH DANH ĐĂNG NHẬP THẬT

Khi người dùng đăng ký bằng phương thức Username:

Bắt buộc nhập:

```text
Tên
Username
Email
Mật khẩu
Nhập lại mật khẩu
```

Trong đó:

### Tên

Bắt buộc.

Field:

```text
fullName
```

Không cho bỏ trống.

### Username

Bắt buộc.

Yêu cầu:

* unique
* không phân biệt hoa/thường khi kiểm tra trùng
* trim whitespace
* chỉ cho phép ký tự hợp lệ
* không có khoảng trắng giữa username
* độ dài hợp lý
* không chứa ký tự nguy hiểm
* không cho username hệ thống như:

```text
admin
administrator
root
system
support
moderator
teacher
official
```

nếu phù hợp với hệ thống.

Username phải được normalize.

Ví dụ:

```text
DienKon
dienkon
DIENKON
```

phải được xử lý nhất quán, tránh tạo duplicate do khác chữ hoa/chữ thường.

---

# 3. EMAIL VẪN BẮT BUỘC KHI TẠO USERNAME ACCOUNT

Đây là điểm rất quan trọng.

Đăng ký bằng Username **không có nghĩa là bỏ email**.

User vẫn phải cung cấp email thật để:

* xác minh tài khoản
* khôi phục mật khẩu
* nhận thông báo bảo mật
* xác minh quyền sở hữu tài khoản.

Flow:

```text
Tên
↓
Username
↓
Email
↓
Password
↓
Create Firebase Auth account
↓
Send email verification
↓
User mở hòm thư
↓
Xác nhận email
↓
Refresh auth state
↓
Kiểm tra trạng thái tài khoản
↓
Cho phép sử dụng hệ thống
```

---

# 4. EMAIL LOGIN

Khi chọn:

`Đăng nhập bằng Email`

form:

```text
Email
Mật khẩu
```

Firebase Authentication xử lý credential.

Không lưu password ở:

* Firestore
* localStorage
* sessionStorage
* Zustand/Redux persist
* cookie tự tạo
* IndexedDB
* document user
* audit log.

---

# 5. USERNAME LOGIN

Khi chọn:

`Đăng nhập bằng Username`

form:

```text
Username
Mật khẩu
```

Phải hỗ trợ đăng nhập username thật.

Không được làm kiểu:

```ts
if (input === user.username) {
   localStorage.setItem("loggedIn", "true")
}
```

Không được fake authentication.

Thiết kế authentication phù hợp với Firebase hiện tại.

Username phải được map tới Firebase Auth account bằng backend/service an toàn.

Có thể sử dụng:

```text
username -> user profile / auth identifier
```

sau đó thực hiện authentication bằng Firebase Auth.

Nếu cần custom backend để resolve username thì backend phải:

* xác thực request
* validate input
* chống username enumeration nếu phù hợp
* không expose email của user tùy tiện
* không trả password/hash/password credential
* không log password
* không đưa secret Firebase Admin vào frontend.

Password vẫn phải được Firebase Authentication quản lý.

---

# 6. PASSWORD SECURITY

Tuyệt đối không tự tạo một bảng:

```text
username
password
```

rồi lưu password vào Firestore.

Không làm:

```text
password: "123456"
```

Không làm:

```text
passwordHash
```

trong Firestore chỉ để phục vụ login nếu Firebase Authentication đã đảm nhiệm credential management.

Không log:

```text
password
```

ra console.

Không lưu password vào URL.

Không lưu password trong localStorage/sessionStorage.

Nếu hệ thống cần username login thì chỉ lưu mapping:

```text
username
uid
```

và metadata cần thiết.

---

# 7. FIELD "TÊN" BẮT BUỘC CHO MỌI ACCOUNT

Tất cả phương thức tạo account phải có:

```text
Tên
```

Nếu Google lần đầu login:

Firebase lấy:

```text
displayName
```

Nếu Google không trả về tên hợp lệ:

→ bắt người dùng hoàn tất profile:

```text
Tên *
```

Không được tạo account hoàn chỉnh nếu thiếu `fullName`.

Đối với Email/Password:

```text
Tên *
Email *
Mật khẩu *
```

Đối với Username/Password:

```text
Tên *
Username *
Email *
Mật khẩu *
```

---

# 8. EMAIL VERIFICATION PHẢI THỰC SỰ HOẠT ĐỘNG

Đây là yêu cầu bắt buộc.

Khi user đăng ký bằng Username hoặc Email:

1. Firebase tạo account.
2. Firebase gửi email xác minh tới email user.
3. UI chuyển sang màn hình:

```text
Kiểm tra email của bạn
```

4. Hiển thị email đích đã che bớt.

Ví dụ:

```text
d***@gmail.com
```

5. Có:

```text
Gửi lại email xác minh
```

6. Có:

```text
Tôi đã xác minh email
```

7. Sau khi user xác nhận trong email:

* reload Firebase user
* kiểm tra `emailVerified`
* cập nhật profile
* cập nhật trạng thái UI
* tiếp tục flow login.

Firebase cung cấp `sendEmailVerification()` cho việc gửi email xác minh.

---

# 9. KHÔNG ĐƯỢC CHO ACCOUNT UNVERIFIED ĐĂNG NHẬP NHƯ USER BÌNH THƯỜNG

Nếu:

```text
emailVerified === false
```

không được coi là account hoàn tất.

Sau khi nhập đúng username/password hoặc email/password:

Nếu credential đúng nhưng email chưa verified:

→ không redirect vào dashboard bình thường.

Phải đưa về:

```text
Email Verification Required
```

Có nút:

```text
Gửi lại email xác minh
```

và:

```text
Tôi đã xác minh
```

Sau khi click:

```text
reload(currentUser)
```

rồi kiểm tra lại:

```text
emailVerified
```

Không được chỉ dựa vào state cũ.

---

# 10. NẾU MUỐN DÙNG MÃ XÁC NHẬN EMAIL

Nếu UI được yêu cầu dạng:

```text
Mã xác nhận đã được gửi tới email
[ _ _ _ _ _ _ ]
Xác nhận
```

thì **không giả lập mã ở frontend**.

Phải triển khai verification-code flow thực sự phía backend:

```text
Generate cryptographically secure OTP
↓
Store only secure representation + expiry
↓
Send code via email provider
↓
User enters code
↓
Backend verifies code
↓
Mark verification successful
↓
Invalidate code
```

Mã phải:

* random bằng cryptographically secure generator
* có thời hạn
* giới hạn số lần thử
* giới hạn số lần gửi lại
* chống brute-force
* chỉ sử dụng một lần
* không log ra console
* không gửi lại raw code trong API response.

Nếu sử dụng flow email verification chuẩn của Firebase thì ưu tiên sử dụng cơ chế verification email/action link của Firebase thay vì tự phát minh lại authentication. Firebase hỗ trợ gửi verification email và xử lý verification action.

Không tạo UI nhập OTP giả nhưng backend lại chẳng kiểm tra.

---

# 11. ĐĂNG KÝ THÀNH CÔNG KHÔNG ĐỒNG NGHĨA LOGIN HOÀN CHỈNH

Sau:

```text
createUser
```

không được lập tức coi account là:

```text
active + verified
```

Account state phải phản ánh đúng:

```text
pending_verification
```

Sau khi email được xác minh:

```text
verified
```

Sau đó nếu hệ thống yêu cầu admin approval:

```text
pending_admin_approval
```

Sau khi được duyệt:

```text
active
```

---

# 12. AUTH STATE PHẢI CÓ INITIALIZATION GATE

ĐÂY LÀ BUG QUAN TRỌNG CẦN FIX.

Hiện tượng cần xử lý:

```text
ấn Đăng nhập
→ trang nhảy về Home ngay
→ Firebase chưa xác thực xong
→ UI coi như chưa login
→ login thất bại / mất session
```

Không được để route render trước khi Firebase Auth restore session xong.

Phải có trạng thái kiểu:

```ts
authLoading
```

hoặc:

```ts
authInitialized
```

Flow:

```text
App startup
↓
wait for onAuthStateChanged
↓
authInitialized = true
↓
render application
```

Trong thời gian Firebase chưa trả kết quả:

```text
Loading authentication...
```

Không redirect.

---

# 13. FIX LOGIN REDIRECT RACE CONDITION

Đăng nhập phải chạy theo flow:

```text
User click Login
↓
setSubmitting(true)
↓
disable button
↓
Firebase authentication
↓
Firebase returns user
↓
reload user if necessary
↓
load profile
↓
validate emailVerified
↓
validate accountStatus
↓
load role
↓
set auth state
↓
navigate
↓
setSubmitting(false)
```

Tuyệt đối không:

```text
navigate("/home")
```

ngay sau khi button click.

Cũng không được:

```text
setIsLoggedIn(true)
navigate("/home")
```

trước khi Firebase thực sự xác thực.

Navigation chỉ xảy ra sau khi authentication thành công và profile đã được kiểm tra.

---

# 14. FIX `FAILED TO FETCH`

Audit toàn bộ những nơi hiện lỗi:

```text
Failed to fetch
```

Không chỉ bắt error rồi hiện Toast.

Phải tìm nguyên nhân thực tế.

Kiểm tra toàn bộ:

### Frontend API URL

Kiểm tra:

```text
VITE_API_URL
```

hoặc biến môi trường tương ứng.

Không hard-code:

```text
localhost
```

trong production.

Không để frontend production gọi:

```text
http://localhost:xxxx
```

### Express server

Kiểm tra:

* server có thực sự chạy không
* port
* deployment
* endpoint
* health endpoint
* HTTPS
* CORS
* proxy.

Tạo hoặc kiểm tra:

```text
GET /api/health
```

Response:

```json
{
  "ok": true
}
```

### CORS

Kiểm tra frontend origin thực tế.

Không dùng CORS sai kiểu khiến request bị browser chặn.

Development:

```text
localhost
```

Production:

domain DkTEST thật.

---

# 15. API CLIENT PHẢI CÓ ERROR HANDLING TỐT

Không rải:

```ts
fetch(...)
```

khắp project.

Tạo API client/service trung tâm.

Ví dụ:

```text
src/services/api.ts
```

Tự xử lý:

* base URL
* JSON
* auth token
* timeout
* network error
* HTTP error
* retry phù hợp
* parse error.

Ví dụ logic:

```text
fetch
↓
network failed?
→ NetworkError

response.ok === false?
→ ApiError(status)

response JSON invalid?
→ ParseError
```

Không biến mọi lỗi thành:

```text
Failed to fetch
```

---

# 16. AUTH TOKEN KHI GỌI BACKEND

Khi frontend gọi backend protected:

```text
Firebase currentUser
↓
getIdToken()
↓
Authorization: Bearer <token>
↓
Express verifyIdToken()
↓
request allowed
```

Không gửi:

```text
username + password
```

tới những endpoint không cần authentication.

Không dùng localStorage flag:

```text
isLoggedIn=true
```

để xác minh user.

---

# 17. API ERROR UI

Nếu backend lỗi:

Hiển thị lỗi phù hợp:

```text
Không thể kết nối máy chủ.
Vui lòng kiểm tra kết nối và thử lại.
```

Nếu Firebase lỗi:

```text
Email hoặc mật khẩu không chính xác.
```

hoặc message cụ thể phù hợp.

Nếu server đang down:

```text
Máy chủ hiện không phản hồi.
```

Không show raw:

```text
TypeError: Failed to fetch
```

cho user bình thường.

Nhưng developer console vẫn phải có thông tin debug vừa đủ.

---

# 18. LOGIN BUTTON UX

Khi user bấm:

```text
Đăng nhập
```

button phải đổi ngay:

```text
Đang đăng nhập...
```

và disabled.

Không cho double click tạo nhiều request.

Nếu thành công:

```text
Đăng nhập thành công
```

rồi chuyển trang.

Nếu thất bại:

```text
button trở lại Đăng nhập
```

User có thể thử lại.

---

# 19. GOOGLE LOGIN CŨNG PHẢI CÓ FLOW ĐÚNG

Google login:

```text
Click Google
↓
popup/redirect
↓
Firebase authentication
↓
get user
↓
load/create profile
↓
ensure fullName
↓
check account status
↓
check required profile fields
↓
navigate
```

Không:

```text
Google popup
→ navigate home ngay
```

Nếu Google lần đầu login:

```text
new account
→ create profile
→ nếu thiếu Tên → Complete Profile
```

---

# 20. PROTECTED ROUTE

Tạo route guard đúng:

```text
AuthLoading
↓
Not authenticated
→ Login
↓
Authenticated
→ check account state
↓
Verified
→ continue
```

Nếu account chưa verified:

```text
Verification page
```

Nếu pending approval:

```text
Pending approval page
```

Nếu suspended:

```text
Account suspended page
```

Nếu active:

```text
Dashboard
```

Không được redirect tất cả về Home một cách máy móc.

---

# 21. FIX TRƯỜNG HỢP LOGIN XONG NHƯNG PROFILE CHƯA LOAD

Firebase Auth user và Firestore profile là hai lớp khác nhau.

Có thể xảy ra:

```text
Firebase Auth success
Firestore profile unavailable
```

Không được coi luôn là logout.

Hiển thị:

```text
Đang tải hồ sơ...
```

Retry phù hợp.

Nếu thật sự thiếu profile:

→ xử lý bằng onboarding/profile repair.

Nếu profile lỗi:

→ error page có:

```text
Thử lại
```

không redirect về Home.

---

# 22. USERNAME DUPLICATE

Khi đăng ký:

```text
username = DienKon
```

phải check uniqueness.

Không được:

```text
DienKon
dienkon
```

tạo được hai user.

Nên có canonical field:

```text
usernameNormalized
```

Ví dụ:

```text
dienkon
```

Tạo unique mapping.

Không dựa chỉ vào frontend validation.

Backend phải kiểm tra lại.

---

# 23. EMAIL DUPLICATE

Nếu email đã tồn tại:

Hiển thị:

```text
Email này đã được sử dụng.
Bạn có thể đăng nhập hoặc sử dụng "Quên mật khẩu".
```

Không tạo duplicate account.

Nếu cùng email từng login Google:

→ xử lý provider conflict đúng.

---

# 24. LOGIN BẰNG USERNAME KHÔNG ĐƯỢC TRẢ EMAIL USER KHÁC

API resolve username không được cho phép enumeration kiểu:

```text
username → email thật
```

trả thẳng cho client tùy tiện.

Nếu architecture cần resolve identifier:

hãy thực hiện trên backend/server flow an toàn.

Không expose danh sách:

```text
username
email
uid
```

của toàn bộ user.

---

# 25. FORGOT PASSWORD

Thêm:

```text
Quên mật khẩu?
```

Nếu user nhập email:

Firebase gửi password reset email.

Nếu user nhớ username nhưng không nhớ email:

hệ thống phải cung cấp UX phù hợp mà không leak email người khác.

Có thể yêu cầu email để reset.

Không hiển thị:

```text
username này dùng email abc@gmail.com
```

cho bất kỳ người nào.

---

# 26. EMAIL VERIFICATION PAGE

Thiết kế page đẹp:

```text
✉
Kiểm tra email của bạn

Chúng tôi đã gửi email xác minh tới

d***@gmail.com

Mở email và hoàn tất xác minh tài khoản.

[ Tôi đã xác minh ]
[ Gửi lại email ]

Không nhận được email?
Kiểm tra Spam / Quảng cáo.
```

Countdown cho resend:

```text
Gửi lại sau 45s
```

Không cho spam resend.

---

# 27. RESEND VERIFICATION

Rate-limit:

```text
Resend verification
```

Không cho bấm hàng chục lần.

Hiển thị:

```text
Đã gửi lại email xác minh.
```

Nếu Firebase trả lỗi too-many-requests:

```text
Bạn đã yêu cầu quá nhiều lần.
Vui lòng thử lại sau.
```

---

# 28. PERSISTENCE

Kiểm tra Firebase Auth persistence.

Sau khi login:

* refresh browser
* mở tab mới
* đóng/mở browser

phải giữ session theo cấu hình mong muốn.

Không tự lưu:

```text
password
```

để "auto login".

Chỉ sử dụng Firebase Auth session persistence.

---

# 29. LOGOUT

Logout phải:

```text
Firebase signOut
↓
clear local auth-related transient state
↓
Auth state listener cập nhật
↓
redirect Login
```

Không dùng:

```text
localStorage.removeItem("isLoggedIn")
```

làm cơ chế chính.

---

# 30. AUTH ERROR MAPPING

Centralize mapping Firebase errors:

```text
auth/invalid-credential
auth/user-not-found
auth/wrong-password
auth/email-already-in-use
auth/weak-password
auth/too-many-requests
auth/network-request-failed
auth/popup-closed-by-user
auth/popup-blocked
auth/account-exists-with-different-credential
```

Không hiển thị lỗi kỹ thuật khó hiểu cho user.

---

# 31. FIX CÁC TÍNH NĂNG MỚI BỊ `FAILED TO FETCH`

Không chỉ sửa Login.

Quét toàn bộ features vừa thêm:

* admin users
* students
* parents
* analytics
* data health
* audit logs
* notifications
* relationship
* system health
* profile
* authentication.

Với mỗi API:

```text
frontend endpoint
↓
backend route
↓
controller/service
↓
Firebase
```

phải kiểm tra end-to-end.

Tạo test/manual checklist cho từng API.

---

# 32. API HEALTH MONITOR

Thêm:

```text
/api/health
```

Nếu phù hợp:

```text
/api/health/firebase
```

Admin System Health đọc API này.

Nếu backend không phản hồi thì UI phải nói rõ:

```text
Backend offline
```

thay vì chỉ:

```text
Failed to fetch
```

---

# 33. NO SILENT CATCH

Không được có kiểu:

```ts
catch {
  return null;
}
```

với authentication/API quan trọng.

Không được nuốt lỗi khiến app tưởng login thành công.

Không được:

```ts
catch(() => navigate("/home"))
```

Không được redirect khi request thất bại.

---

# 34. AUTH INITIALIZATION DEBUG

Trong development có thể log:

```text
[AUTH] initialization started
[AUTH] Firebase initialized
[AUTH] user changed
[AUTH] profile loaded
[AUTH] verification status checked
[AUTH] route resolved
```

Không log:

```text
password
token
refresh token
private key
```

Production không cần log nhạy cảm.

---

# 35. LOADING STATE

Phải phân biệt:

```text
authInitializing
authSubmitting
profileLoading
apiLoading
pageLoading
```

Không dùng một biến:

```text
loading=true
```

cho toàn application khiến login và page rendering xung đột.

---

# 36. ROUTER FLOW

Audit toàn bộ router.

Đặc biệt tìm các đoạn:

```text
navigate("/")
navigate("/home")
redirect
Navigate
useEffect
```

có thể chạy trước auth initialization.

Sửa race condition.

Ví dụ logic chuẩn:

```text
AuthProvider
↓
wait until initialized
↓
Router knows authenticated state
↓
ProtectedRoute decides
```

Không để nhiều component cùng tranh nhau redirect.

---

# 37. SINGLE SOURCE OF TRUTH CHO AUTH

Tạo một auth service/provider trung tâm.

Ví dụ:

```text
AuthProvider
useAuth()
authService
```

Mọi page dùng cùng auth state.

Không mỗi page tự:

```text
onAuthStateChanged(...)
```

rồi tự redirect theo cách khác nhau.

---

# 38. PROFILE CREATION

Sau registration:

```text
Firebase Auth user
+
Firestore profile
```

phải được tạo nhất quán.

Nếu Firebase Auth tạo thành công nhưng Firestore profile fail:

không được để account rơi vào trạng thái không biết xử lý.

Có cơ chế:

```text
profile repair
```

hoặc backend transaction/retry phù hợp.

---

# 39. ACCOUNT STATUS

Authentication không chỉ có:

```text
logged in / logged out
```

Có:

```text
pending_verification
pending_approval
active
suspended
disabled
```

Router phải phản ánh đúng từng state.

---

# 40. TEST CASE QUAN TRỌNG NHẤT

Bắt buộc test đúng scenario này:

### Username registration

```text
Register
→ nhập Tên
→ nhập Username
→ nhập Email
→ nhập Password
→ submit
→ Firebase tạo account
→ email verification gửi thành công
→ verification screen
→ mở email
→ xác minh
→ quay lại web
→ click Tôi đã xác minh
→ reload Firebase User
→ emailVerified = true
→ load profile
→ account active/pending approval
→ redirect đúng trang
```

### Username login

```text
Logout
→ username
→ password
→ click Login
→ button loading
→ authentication
→ profile
→ status
→ dashboard
```

### Email login

```text
Logout
→ email
→ password
→ click Login
→ authentication
→ dashboard
```

### Google

```text
Logout
→ Google
→ authentication
→ profile
→ dashboard
```

### Unverified

```text
Login đúng password
→ emailVerified false
→ KHÔNG vào dashboard
→ Verification page
```

### Failed API

```text
Backend offline
→ click feature
→ UI không crash
→ không redirect Home
→ hiển thị lỗi kết nối rõ ràng
```

---

# 41. QUAN TRỌNG: KHÔNG ĐƯỢC CHỈ SỬA UI

Sau khi triển khai phải kiểm tra:

```text
Firebase Console
Authentication Users
Firestore
Express API
Network tab
Console
Routing
Auth state
```

Nếu bấm Login mà UI chuyển trang nhưng Firebase Users/Session không có user thì coi là FAILED.

Nếu API trả 401/403 mà frontend vẫn hiện thành công thì coi là FAILED.

Nếu verification page hiển thị nhưng email không gửi thật thì coi là FAILED.

---

# 42. ACCEPTANCE CRITERIA

Chỉ coi authentication hoàn thành khi:

* [ ] Username + password login thật
* [ ] Email + password login thật
* [ ] Google login thật
* [ ] Tên bắt buộc
* [ ] Username unique
* [ ] Email unique
* [ ] Password không lưu Firestore
* [ ] Registration tạo Firebase Auth user thật
* [ ] Verification email thực sự được gửi
* [ ] Unverified user không được coi là active
* [ ] Resend verification hoạt động
* [ ] Password reset hoạt động
* [ ] Refresh trang không mất session
* [ ] Logout hoạt động
* [ ] Auth initialization không race
* [ ] Login không tự nhảy Home trước khi auth xong
* [ ] Failed authentication không redirect Home
* [ ] Failed API không redirect Home
* [ ] Failed to fetch được xử lý đúng
* [ ] Backend health endpoint hoạt động
* [ ] CORS đúng
* [ ] Production API URL đúng
* [ ] Firebase ID token được verify ở backend
* [ ] Protected route hoạt động
* [ ] Account status được kiểm tra
* [ ] Profile loading được xử lý
* [ ] Google first-login hoàn tất profile
* [ ] Không leak credential
* [ ] Không có secret trong frontend.

---

# 43. CUỐI CÙNG: PHẢI TỰ DEBUG TOÀN BỘ

Đừng kết thúc bằng câu:

```text
Authentication implemented.
```

Hãy thực sự kiểm tra và sửa.

Nếu gặp:

```text
Failed to fetch
CORS
401
403
Firebase auth state race
redirect loop
profile not found
email verification not updating
Google popup error
username conflict
```

thì tiếp tục trace source → network → backend → Firebase → database cho đến khi xác định nguyên nhân.

Không chữa bằng:

```text
setTimeout(...)
navigate("/home")
reload page
localStorage flag
fake success
```

để che lỗi.

Cuối cùng báo cáo chính xác:

```text
AUTH FIXED
USERNAME LOGIN
EMAIL LOGIN
GOOGLE LOGIN
EMAIL VERIFICATION
PROFILE CREATION
AUTH STATE
REDIRECT FLOW
FAILED TO FETCH
API/CORS
ROUTER
SECURITY
TEST RESULT
```

và liệt kê những file thực sự đã sửa.
Hãy tiếp tục sửa DkTEST hiện tại, tập trung vào **TOÀN BỘ các tính năng Admin mới đã thêm nhưng đang không load dữ liệu**, đặc biệt lỗi:

```text
[Parents] Error loading parents: TypeError: Failed to fetch
    at requests.js:1:3633
    at 200.js:1:1266
    at fetchAdminUsers (adminService.ts:60:21)
    at async loadData (Parents.tsx:33:20)
```

và:

```text
WebSocket connection to 'ws://localhost:24678/' failed
```

## 1. MỤC TIÊU

Không được chỉ sửa `Parents.tsx`.

Phải kiểm tra và sửa **nguyên nhân gốc của API connectivity** khiến hàng loạt tính năng mới như:

* Parents
* Students
* Users
* Statistics
* Analytics
* Data Health
* Audit Logs
* System Health
* Relationships
* Notifications
* Dashboard statistics
* Class statistics
* Exam analytics

có thể cùng bị:

```text
Failed to fetch
Network Error
Cannot connect to server
401
403
404
500
```

Mục tiêu là mọi feature phải lấy **dữ liệu thật từ backend/Firebase**, không dùng mock data để che lỗi.

---

# 2. ĐẦU TIÊN PHẢI TRACE NGUYÊN NHÂN `FAILED TO FETCH`

Đừng bắt đầu bằng việc sửa UI.

Hãy trace chính xác:

```text
Parents.tsx
    ↓
loadData()
    ↓
adminService.fetchAdminUsers()
    ↓
fetch(...)
    ↓
API URL thực tế
    ↓
Express/API server
    ↓
Firebase Admin SDK
    ↓
Firestore/Auth
```

Phải xác định request chết ở tầng nào.

Kiểm tra:

* URL request thực tế
* protocol
* hostname
* port
* endpoint
* method
* headers
* Authorization
* CORS
* backend có chạy không
* backend có listen đúng port không
* deployment có endpoint không
* Firebase Admin có initialize không
* Firestore có trả data không.

Không được kết luận:

```text
Failed to fetch
→ Firebase lỗi
```

chỉ dựa vào message này.

`Failed to fetch` có thể xảy ra trước cả khi backend trả HTTP response.

---

# 3. KIỂM TRA `adminService.ts`

Mở chính xác file:

```text
adminService.ts
```

và kiểm tra đoạn:

```text
fetchAdminUsers
```

đặc biệt line đang báo lỗi:

```text
adminService.ts:60
```

Phải xác định `fetch()` đang gọi URL nào.

Ví dụ nếu hiện tại có kiểu:

```ts
fetch("http://localhost:xxxx/api/admin/users")
```

thì phải kiểm tra lại toàn bộ deployment architecture.

Không được hard-code localhost vào production.

---

# 4. TẠO API CLIENT TRUNG TÂM

Nếu project đang rải `fetch()` ở nhiều file, refactor thành một API client trung tâm.

Ví dụ:

```text
src/services/apiClient.ts
```

API client phải đảm nhiệm:

```text
base URL
authorization
headers
JSON parsing
timeout
network error
HTTP error
retry phù hợp
```

Ví dụ logic:

```text
request()
   ↓
resolve API base URL
   ↓
attach Firebase ID token
   ↓
fetch
   ↓
response.ok?
   ├─ yes → parse JSON
   └─ no  → typed ApiError
```

Không để từng service tự ghép URL theo kiểu khác nhau.

---

# 5. API BASE URL

Tìm toàn bộ:

```text
API_URL
VITE_API_URL
BASE_URL
localhost
127.0.0.1
/api/
```

và chuẩn hóa.

Frontend phải biết đúng API server đang chạy.

Development có thể:

```text
http://localhost:<backend-port>
```

Production phải dùng endpoint production thực tế.

Không được:

```text
production frontend
    ↓
http://localhost:xxxx
```

vì trên browser của người dùng `localhost` là máy của chính người dùng.

---

# 6. KIỂM TRA EXPRESS SERVER

Kiểm tra server hiện tại.

Xác nhận:

* Express có start không
* port hiện tại là gì
* `process.env.PORT` có đúng không
* server bind đúng interface
* route có được mount không
* middleware có throw error không.

Ví dụ:

```text
app.use("/api/admin", adminRoutes)
```

phải khớp với frontend.

Nếu frontend gọi:

```text
/api/admin/users
```

thì backend thực sự phải có endpoint tương ứng.

Không chỉ nhìn source rồi giả định endpoint tồn tại.

---

# 7. TẠO `/api/health`

Phải có endpoint đơn giản:

```text
GET /api/health
```

trả:

```json
{
  "ok": true,
  "service": "DkTEST API"
}
```

Không cần authentication cho health cơ bản.

Tạo thêm nếu cần:

```text
GET /api/health/firebase
```

để admin/development kiểm tra Firebase connection.

Sau đó test trực tiếp endpoint.

Nếu `/api/health` không mở được thì không được tiếp tục sửa `Parents.tsx`; phải sửa backend connectivity trước.

---

# 8. KIỂM TRA CORS

Audit Express CORS.

Phải cho phép đúng frontend origin.

Development và production phải hỗ trợ origin phù hợp.

Không dùng cấu hình nguy hiểm chỉ để "cho chạy".

Không giải quyết bằng:

```ts
origin: "*"
```

nếu API chứa protected user/admin data.

Kiểm tra:

```text
Origin
Access-Control-Allow-Origin
Access-Control-Allow-Headers
Access-Control-Allow-Methods
Authorization
```

Nếu preflight `OPTIONS` fail thì sửa backend.

---

# 9. AUTHORIZATION HEADER

Các admin API protected phải gửi Firebase ID token.

Flow:

```text
Firebase currentUser
↓
await currentUser.getIdToken()
↓
Authorization: Bearer <token>
↓
Express
↓
verifyIdToken()
↓
check admin role
↓
query Firebase Admin
```

Không gửi:

```text
role=admin
```

từ frontend rồi backend tin luôn.

Không gửi:

```text
isAdmin=true
```

để bypass authorization.

---

# 10. KIỂM TRA FIREBASE AUTH STATE TRƯỚC API CALL

Rất có khả năng một số page đang gọi API quá sớm.

Ví dụ:

```text
Parents mounted
↓
loadData()
↓
fetchAdminUsers()
↓
Firebase user chưa restore
↓
không có token
↓
request fail
```

Phải đảm bảo:

```text
authInitializing
↓
wait Firebase auth initialization
↓
currentUser available
↓
getIdToken()
↓
API call
```

Không gọi protected API khi auth chưa sẵn sàng.

---

# 11. FIX `Parents.tsx`

Không chỉ catch lỗi.

Hiện tại có thể đang là:

```ts
try {
    const data = await fetchAdminUsers();
    setParents(data);
} catch (error) {
    console.error(...)
}
```

Cần sửa architecture để service trả error rõ ràng.

Ví dụ phân biệt:

```text
NetworkError
UnauthorizedError
ForbiddenError
NotFoundError
ServerError
FirebaseError
```

UI phải xử lý từng loại phù hợp.

---

# 12. KHÔNG ĐƯỢC DÙNG `setTimeout` ĐỂ "CHỜ API"

Stack hiện tại có:

```text
setTimeout
useEffect
loadData
```

Hãy kiểm tra tại sao `setTimeout` đang được dùng.

Không giải quyết race condition bằng:

```ts
setTimeout(loadData, 500)
```

hoặc:

```ts
setTimeout(loadData, 1000)
```

để mong Firebase/backend kịp load.

Đây chỉ che bug.

Phải dùng state chính xác:

```text
authInitialized
currentUser
profileLoaded
```

rồi mới gọi API.

---

# 13. FIX REACT STRICT MODE / DOUBLE EFFECT

Stack cho thấy:

```text
commitDoubleInvokeEffectsInDEV
```

Đây là React Strict Mode ở development.

Điều này có thể khiến:

```text
loadData()
```

chạy nhiều lần.

Phải kiểm tra:

* effect cleanup
* AbortController
* duplicate request
* stale response
* state update after unmount.

Không được disable Strict Mode chỉ để che lỗi.

Có thể dùng:

```text
AbortController
request cancellation
```

nếu component unmount/re-run.

---

# 14. TẠO REQUEST CANCELLATION

Các admin data query nên hỗ trợ:

```text
AbortController
```

Flow:

```text
component mount
↓
request
↓
component unmount
↓
abort
```

tránh:

* request cũ ghi đè request mới
* memory leak
* stale data
* duplicate load.

---

# 15. KIỂM TRA `Failed to fetch` BẰNG NETWORK TAB

Không chỉ nhìn console.

Trong development phải kiểm tra Network:

### Nếu không có request

Bug nằm ở frontend/service/auth flow.

### Nếu có request nhưng `(failed)`

Kiểm tra:

* DNS
* localhost
* protocol
* CORS
* backend down
* SSL
* port.

### Nếu `401`

Authentication token/role có vấn đề.

### Nếu `403`

Authorization/permission.

### Nếu `404`

Sai API path.

### Nếu `500`

Backend/service/Firebase.

### Nếu `200` nhưng frontend vẫn lỗi

Bug parser/response shape.

Phải xử lý đúng từng trường hợp.

---

# 16. CHUẨN HÓA RESPONSE

Các admin endpoint nên trả structure nhất quán.

Ví dụ:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ADMIN_USERS_FETCH_FAILED",
    "message": "Unable to load users"
  }
}
```

Không để endpoint này trả array trực tiếp, endpoint khác trả `{users}`, endpoint khác trả `{data}` rồi frontend đoán.

---

# 17. KIỂM TRA RESPONSE SHAPE CỦA `fetchAdminUsers`

`Parents.tsx` đang gọi:

```text
fetchAdminUsers()
```

hãy kiểm tra nó thực sự trả:

```text
users
```

hay:

```text
data
```

hay:

```text
students
```

hay:

```text
response.data
```

Không được để:

```ts
const users = await fetchAdminUsers();
users.filter(...)
```

trong khi service thực tế trả:

```ts
{ data: users }
```

Phải đồng bộ type.

---

# 18. TẠO TYPES CHO ADMIN API

Không dùng:

```ts
any
```

cho response.

Tạo:

```ts
AdminUser
AdminUsersResponse
AdminStatsResponse
Parent
Student
AuditLog
AnalyticsData
DataHealthReport
```

Service phải return type chính xác.

---

# 19. FIX TOÀN BỘ ADMIN SERVICE

Không chỉ:

```text
fetchAdminUsers
```

Audit toàn bộ:

```text
fetchAdminUsers
fetchAdminStudents
fetchAdminParents
fetchAdminStats
fetchAnalytics
fetchAuditLogs
fetchDataHealth
fetchRelationships
fetchNotifications
fetchClasses
fetchExamAnalytics
```

Tìm các vấn đề:

```text
hard-coded localhost
wrong endpoint
missing auth token
wrong HTTP method
missing headers
wrong JSON parsing
wrong response shape
unhandled 401
unhandled 403
```

---

# 20. TẤT CẢ TRANG ADMIN PHẢI CÓ 4 STATE

Mỗi page phải có:

```text
loading
success
empty
error
```

Ví dụ Parents:

### Loading

Skeleton/table loading.

### Success

Render data.

### Empty

```text
Chưa có phụ huynh nào.
```

### Error

```text
Không thể tải dữ liệu phụ huynh.

Kiểm tra kết nối máy chủ hoặc thử lại.

[ Thử lại ]
```

Không để trang trắng.

---

# 21. NÚT RETRY

Mỗi admin data page phải có:

```text
[ Thử lại ]
```

khi request lỗi.

Retry phải gọi lại service thật.

Không reload toàn bộ page nếu không cần.

---

# 22. GLOBAL ADMIN API ERROR BOUNDARY

Nếu architecture phù hợp, thêm global handler cho:

```text
401
403
500
network failure
```

Ví dụ:

### 401

```text
Phiên đăng nhập đã hết hạn.
Vui lòng đăng nhập lại.
```

### 403

```text
Bạn không có quyền thực hiện thao tác này.
```

### 500

```text
Máy chủ gặp lỗi.
```

### Network

```text
Không thể kết nối máy chủ.
```

---

# 23. 401 → REFRESH TOKEN

Nếu Firebase ID token hết hạn:

```text
request
↓
401
↓
refresh/retrieve fresh Firebase ID token
↓
retry once
```

Chỉ retry một lần.

Không retry vô hạn.

Nếu vẫn 401:

→ logout/reauthenticate phù hợp.

Không làm:

```text
retry every 100ms
```

---

# 24. KHÔNG DÙNG MOCK FALLBACK KHI API FAIL

Không làm:

```ts
catch {
    return mockParents;
}
```

Không làm:

```ts
catch {
    setParents(fakeData);
}
```

Không hiển thị số liệu giả.

Khi API fail phải báo rõ lỗi.

---

# 25. FIX PARENTS LOGIC

Trang Parents phải lấy:

```text
role === parent
```

từ nguồn dữ liệu thật.

Không lấy tất cả users rồi filter frontend nếu dataset lớn.

Ưu tiên backend query/filter.

Ví dụ:

```text
GET /api/admin/users?role=parent
```

hoặc endpoint chuyên biệt nếu architecture hiện tại phù hợp.

---

# 26. FIX STUDENTS LOGIC

Trang Students phải:

```text
role === student
```

và xử lý:

* pagination
* search
* sorting
* filter
* createdAt
* status
* emailVerified.

Không đọc toàn bộ users về frontend.

---

# 27. FIX USER STATISTICS

Dashboard stats phải có dữ liệu thật.

Metrics có thể gồm:

```text
Total Users
Students
Parents
Teachers
Admins
Active
Pending
Suspended
Unverified
New Today
New 7 Days
New 30 Days
```

Không tính orphan Firestore profiles vào "valid user" nếu hệ thống yêu cầu user thực.

---

# 28. FIX ANALYTICS

Các chart phải:

```text
API
↓
real Firebase data
↓
aggregation
↓
chart
```

Không:

```text
Math.random()
```

Không hard-code:

```text
students: 1248
parents: 346
```

Không có dữ liệu thì:

```text
Chưa đủ dữ liệu
```

---

# 29. FIX DATA HEALTH

`Data Health` phải thực sự scan:

```text
Firebase Auth users
Firestore users
```

và detect:

```text
valid
auth_without_profile
orphan_profile
missing_role
invalid_metadata
broken_relationship
```

Nếu endpoint này lỗi thì phải hiện nguyên nhân cụ thể.

---

# 30. FIX AUDIT LOGS

Audit Logs không được load bằng một request khổng lồ.

Có:

```text
pagination
limit
cursor
filter
```

API error phải được xử lý như các page khác.

---

# 31. FIX PARENT ↔ STUDENT RELATIONSHIPS

Kiểm tra:

* parentId tồn tại
* studentId tồn tại
* relationship status
* pagination
* auth permission.

Không để relationship page phụ thuộc vào một API khác mà không handle lỗi.

---

# 32. FIX SYSTEM HEALTH

System Health phải phân biệt:

```text
Frontend
Backend
Firebase Auth
Firestore
```

Ví dụ:

```text
Frontend       OK
API Server     OK
Firebase Auth  OK
Firestore      OK
```

Nếu API server down:

```text
API Server     ERROR
```

chứ không khiến toàn page crash.

---

# 33. `ws://localhost:24678/` ERROR

Hãy kiểm tra lỗi:

```text
WebSocket connection to 'ws://localhost:24678/' failed.
```

Xác định nó thuộc:

* Vite HMR
* plugin dev server
* React dev tooling
* một library khác.

Nếu đây chỉ là development HMR connection:

* không coi nó là nguyên nhân của admin API failure
* không làm thay đổi API auth chỉ vì lỗi này.

Nhưng vẫn kiểm tra xem dev server có đang khởi động đúng hay không.

Nếu WebSocket error được tạo bởi một package/reverse proxy bị cấu hình sai thì sửa cấu hình đó.

Không disable HMR bừa bãi.

---

# 34. DEVELOPMENT VÀ PRODUCTION PHẢI CHẠY ĐƯỢC

Phải kiểm tra cả:

### Development

```text
Frontend localhost
+
Backend localhost
+
Firebase
```

### Production

```text
Frontend production domain
+
Backend production endpoint
+
Firebase
```

Không để chỉ dev chạy được.

---

# 35. ENVIRONMENT CONFIG

Audit `.env`, `.env.local`, `.env.production`.

Không commit secret.

Tạo `.env.example`.

Phân biệt:

```text
VITE_API_URL
```

với backend secret.

Không expose Firebase Admin credentials qua `VITE_*`.

---

# 36. DEBUG END-TO-END

Tạo checklist thực tế và chạy:

```text
1. Login admin
2. Open Admin Dashboard
3. Open Students
4. Open Parents
5. Open Users
6. Open Analytics
7. Open Data Health
8. Open Audit Logs
9. Open Relationships
10. Open System Health
```

Mỗi trang phải:

```text
request sent
↓
HTTP status
↓
data received
↓
UI rendered
```

Không trang nào được âm thầm fail.

---

# 37. PERFORMANCE

Không biến fix này thành việc đọc toàn bộ Firestore.

Ưu tiên:

```text
server-side pagination
query filters
aggregations
count()
caching hợp lý
lazy loading
```

Không:

```text
getDocs(users)
```

rồi tính toàn bộ frontend nếu dữ liệu lớn.

---

# 38. FIRESTORE INDEXES

Nếu query mới cần composite index:

hãy phát hiện và tạo/cập nhật index phù hợp.

Không workaround bằng cách:

```text
query everything
```

rồi filter client.

---

# 39. ERROR LOGGING

Ở backend phải log:

```text
route
status
error code
request correlation ID
```

Nhưng tuyệt đối không log:

```text
password
Firebase ID token
refresh token
private key
sensitive personal information
```

Ở frontend log đủ để debug endpoint nào fail.

---

# 40. REQUEST CORRELATION ID

Nếu phù hợp, thêm:

```text
X-Request-ID
```

hoặc correlation ID.

Khi frontend báo:

```text
Failed to load Parents
```

console/backend có thể truy ngược request tương ứng.

---

# 41. ACCEPTANCE CRITERIA

Chỉ coi task hoàn thành khi:

* [ ] `Parents` load được data thật
* [ ] `Students` load được data thật
* [ ] `Users` load được data thật
* [ ] Dashboard statistics load được
* [ ] Analytics load được
* [ ] Data Health load được
* [ ] Audit Logs load được
* [ ] Relationships load được
* [ ] Notifications load được
* [ ] System Health hoạt động
* [ ] Không còn `Failed to fetch` do API configuration
* [ ] Không hard-code localhost trong production
* [ ] Backend `/api/health` hoạt động
* [ ] CORS đúng
* [ ] Firebase ID token được gửi đúng
* [ ] Backend verify token đúng
* [ ] 401 được xử lý
* [ ] 403 được xử lý
* [ ] 404 được xử lý
* [ ] 500 được xử lý
* [ ] Network error có Retry
* [ ] Auth initialization không gây request quá sớm
* [ ] React Strict Mode không gây duplicate side effect nguy hiểm
* [ ] Không dùng mock data để che API failure
* [ ] Không đọc toàn bộ Firestore chỉ để render một table
* [ ] Pagination hoạt động
* [ ] Search/filter hoạt động
* [ ] Production build hoạt động
* [ ] Development build hoạt động

---

# 42. QUY TẮC DEBUG BẮT BUỘC

Đừng sửa theo kiểu:

```text
catch error
→ set []
→ hiện "không có dữ liệu"
```

vì như vậy sẽ biến:

```text
API DOWN
```

thành:

```text
No parents
```

Điều đó là SAI.

Phải phân biệt:

```text
API ERROR
```

với:

```text
SUCCESS + EMPTY DATA
```

---

# 43. QUY TẮC CUỐI

Không được kết thúc chỉ vì console không còn đỏ.

Phải chứng minh bằng flow thực:

```text
Login Admin
→ Admin Dashboard
→ Students
→ Parents
→ Statistics
→ Analytics
→ Data Health
→ Audit Logs
```

Mỗi trang phải lấy được dữ liệu thật.

Nếu một API vẫn lỗi:

1. xác định URL thật
2. xác định request thật
3. xác định HTTP status nếu có
4. xác định backend route
5. xác định Firebase query
6. sửa root cause
7. test lại frontend.

Không che lỗi bằng timeout, mock data, redirect, reload page hoặc localStorage.

Cuối cùng báo cáo:

```text
ROOT CAUSE
FIXED FILES
API ENDPOINTS FIXED
AUTH FIX
CORS FIX
ENV FIX
FIREBASE FIX
PAGES VERIFIED
REMAINING ISSUES
```

Nếu `Failed to fetch` còn xuất hiện ở bất kỳ admin feature nào sau khi hoàn thành, tiếp tục trace và sửa cho tới khi xác định được nguyên nhân thực tế.
