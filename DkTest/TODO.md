Bạn là một Senior Full-Stack Engineer chuyên tối ưu Firebase/Firestore cho hệ thống có lượng truy cập lớn.

Hãy làm việc TRỰC TIẾP trên source code của dự án DkTest tại:

`DkTest/`

Commit cần audit:

`df5a73eafa9b0de8cdfdaea0d67922ef4023412c`

Mục tiêu chính:

GIẢM TỐI ĐA FIRESTORE READ + WRITE nhưng KHÔNG được làm mất dữ liệu, không phá chức năng, không làm sai trạng thái bài thi, không làm sai thống kê, không làm mất autosave và không làm thay đổi UX ngoài những chỗ cần thiết.

Đây KHÔNG phải yêu cầu tối ưu hiệu năng frontend đơn thuần.

Mục tiêu là giảm số lần gọi Firebase/Firestore thực tế.

==================================================

1. NGUYÊN TẮC QUAN TRỌNG NHẤT
   ==================================================

Trước khi sửa code:

1. Đọc toàn bộ source liên quan tới data layer.
2. Vẽ lại data-flow của:

   * authentication
   * exam loading
   * exam session
   * question loading
   * answer saving
   * autosave
   * submission
   * grading
   * statistics
   * leaderboard
   * parent/student relationship
   * notification
   * proctoring
   * admin dashboard
   * review/regrade
3. Xác định chính xác chỗ nào đang tạo read/write nhiều.
4. Không được đoán.
5. Không được sửa kiểu “thêm debounce vào mọi thứ”.
6. Phải xác định nguyên nhân gốc trước rồi mới refactor.

Các service cần đặc biệt audit:

* `services/examService.ts`
* `services/examSessionService.ts`
* `services/submissionService.ts`
* `services/studentService.ts`
* `services/parentService.ts`
* `services/parentExamService.ts`
* `services/realtimeProctoringService.ts`
* `services/statsAggregatorService.ts`
* `services/notificationService.ts`
* `services/reviewExamService.ts`
* `services/regradeService.ts`
* `services/questionService.ts`
* `services/sectionService.ts`
* `services/folderService.ts`
* `services/relationshipService.ts`
* `services/gradingService.ts`
* `services/adminService.ts`
* `services/apiClient.ts`

Ngoài ra phải audit:

* `context/AuthContext.tsx`
* `features/exam-builder/hooks/useExamAutosave.ts`
* mọi hook có `useEffect`
* mọi listener Firestore
* mọi `onSnapshot`
* mọi `getDoc`
* mọi `getDocs`
* mọi `query`
* mọi `setDoc`
* mọi `updateDoc`
* mọi `addDoc`
* mọi `writeBatch`
* mọi transaction
* mọi timer/interval
* mọi retry logic
* mọi nơi gọi service trong render lifecycle.

==================================================
2. TÌM READ STORM
=================

Kiểm tra toàn bộ các trường hợp:

* component mount → query
* component re-render → query lại
* route change → query lại
* mở modal → query
* đóng modal → listener không unsubscribe
* auth state change → load lại dữ liệu
* nhiều component cùng đọc một document
* cùng một query được gọi bởi nhiều service
* dashboard tải cùng một dữ liệu nhiều lần
* parent page + child component cùng đọc dữ liệu
* admin statistics đọc toàn bộ collection
* leaderboard đọc lại liên tục
* session page đọc session nhiều lần
* question page đọc exam/question lặp lại
* profile đọc user nhiều lần.

Đặc biệt tìm pattern:

```ts
useEffect(() => {
    loadData();
}, [someObject]);
```

trong đó `someObject` thay reference thường xuyên.

Tìm:

```ts
useEffect(() => {
    ...
}, [user]);
```

nếu `user` không stable.

Tìm:

```ts
getDoc(...)
```

được gọi trong nhiều component khác nhau cho cùng document.

Tìm:

```ts
getDocs(...)
```

được gọi mỗi lần render / tab switch / modal open.

Tìm query không có cache.

==================================================
3. XÂY DỰNG CLIENT-SIDE CACHE
=============================

Thiết kế một data cache trung tâm.

Không để mỗi service tự cache một kiểu.

Tạo hoặc refactor thành kiến trúc tương đương:

```ts
FirestoreCache
FirestoreRepository
QueryCache
DocumentCache
```

Có thể dùng:

* in-memory Map
* TTL
* stale-while-revalidate
* sessionStorage/localStorage khi phù hợp.

Cache key phải deterministic.

Ví dụ:

```ts
user:${uid}
exam:${examId}
session:${sessionId}
question:${questionId}
students:${classId}
stats:${scope}:${period}
```

Không tạo nhiều request cho cùng một key trong cùng thời gian.

Phải chống request duplication.

Ví dụ:

```ts
requestCache.set(key, existingPromise)
```

Nếu 5 component cùng yêu cầu:

```ts
getUser(uid)
```

thì chỉ được tạo:

1 Firestore read

không phải:

5 Firestore reads.

==================================================
4. STALE-WHILE-REVALIDATE
=========================

Với dữ liệu không realtime:

* đọc cache trước
* nếu cache còn fresh → không gọi Firestore
* nếu stale → trả cache trước
* background refresh
* chỉ update Firestore result khi thực sự thay đổi.

Ví dụ:

```ts
const cached = cache.get(key);

if (cached && !isExpired(cached)) {
    return cached.data;
}

return fetchAndCache(...);
```

Không được query Firestore chỉ để lấy lại dữ liệu UI đang có sẵn.

==================================================
5. REALTIME LISTENER
====================

Audit toàn bộ `onSnapshot`.

Mỗi listener phải:

* subscribe đúng lúc
* unsubscribe đúng lúc
* không subscribe trùng
* không subscribe lại vì dependency object thay đổi
* không tồn tại listener duplicate.

Không được có:

```ts
useEffect(() => {
    onSnapshot(...)
}, [objectThatChangesEveryRender])
```

Phải đảm bảo listener có lifecycle rõ ràng.

Nếu cùng một document/query được nhiều component subscribe:

hãy cân nhắc tạo shared subscription manager.

Ví dụ:

```ts
subscribe("exam:123", callback)
```

nhiều component dùng chung một listener.

Khi subscriber cuối cùng unmount mới unsubscribe Firestore.

==================================================
6. PHÂN BIỆT REALTIME VÀ NON-REALTIME
=====================================

Không được dùng `onSnapshot` cho mọi thứ.

Phân loại:

REALTIME:

* trạng thái phiên thi khi thực sự cần
* proctoring
* các dữ liệu live cần thiết
* notification khi cần
* một số trạng thái admin.

NON-REALTIME:

* danh sách tĩnh
* profile
* folder
* exam metadata
* question bank
* statistics lịch sử
* leaderboard nếu không yêu cầu realtime tuyệt đối.

Các dữ liệu NON-REALTIME phải chuyển sang:

```ts
getDoc
getDocs
```

kết hợp cache.

==================================================
7. TỐI ƯU AUTOSAVE
==================

Đây là khu vực CỰC KỲ QUAN TRỌNG.

Audit:

`features/exam-builder/hooks/useExamAutosave.ts`

và tất cả logic autosave/session saving.

Không được:

```ts
saveToFirestore()
```

mỗi lần:

* gõ một ký tự
* chọn đáp án
* thay đổi state nhỏ
* timer tick
* progress thay đổi.

Phải chuyển sang dirty-state + debounce.

Kiến trúc:

```text
User changes state
        ↓
Update local state
        ↓
Mark document dirty
        ↓
Debounce 2-5 seconds
        ↓
Compute minimal diff
        ↓
Write ONLY changed fields
```

Ví dụ:

```ts
scheduleSave(sessionId, patch)
```

Không save toàn bộ object nếu chỉ thay đổi:

```ts
answers.q12
```

thì chỉ write:

```ts
{
    [`answers.q12`]: answer
}
```

==================================================
8. GỘP CÁC WRITE
================

Tìm code kiểu:

```ts
updateDoc(...)
updateDoc(...)
updateDoc(...)
```

liên tiếp.

Gộp thành:

```ts
writeBatch(...)
```

nếu các write độc lập.

Hoặc một `updateDoc()` duy nhất nếu cùng document.

Mục tiêu:

3 writes

→

1 write.

Nhưng KHÔNG được gộp một cách làm thay đổi transaction semantics.

==================================================
9. CHỈ WRITE KHI DỮ LIỆU THAY ĐỔI
=================================

Tuyệt đối tránh:

```ts
updateDoc(ref, {
   updatedAt: serverTimestamp()
})
```

chỉ vì component rerender.

Trước khi write:

```ts
deepEqual(oldData, newData)
```

hoặc tốt hơn:

tạo patch/diff.

Nếu không có business-data thay đổi:

KHÔNG WRITE.

Đặc biệt phải audit:

* profile update
* exam session
* submission
* statistics
* settings
* notification
* parent relationship
* admin data.

==================================================
10. KHÔNG GHI STATS SAU MỌI EVENT
=================================

Audit `statsAggregatorService.ts`.

Tìm các trường hợp:

```text
answer changed
→ update stats

answer changed
→ update stats

answer changed
→ update stats
```

Phải cân nhắc chuyển sang:

```text
raw event/session data
        ↓
aggregate
        ↓
persist periodically / on completion
```

Hoặc:

* update aggregate khi submit
* background aggregation
* batch aggregation
* lazy calculation
* cached stats.

Không được viết stats cho từng thao tác nhỏ nếu không bắt buộc.

==================================================
11. SESSION DATA
================

Audit `examSessionService.ts`.

Một session không nên bị write liên tục toàn bộ object.

Tách dữ liệu thành logical groups:

```text
session metadata
answers
timing
progress
proctoring
final result
```

Ví dụ:

```text
sessions/{sessionId}
sessions/{sessionId}/answers/{questionId}
```

hoặc architecture khác phù hợp với source hiện tại.

Mục tiêu:

thay đổi một answer

KHÔNG làm toàn bộ session document bị write lại nếu không cần.

==================================================
12. ANSWER PERSISTENCE
======================

Trong khi làm bài:

UI state phải là source of truth tạm thời.

Firestore chỉ là persistence layer.

Luồng mong muốn:

```text
User answer
↓
React local state
↓
local persistence
↓
debounced cloud sync
```

Có thể sử dụng:

```text
localStorage
IndexedDB
```

tùy kích thước dữ liệu.

Nếu mất mạng:

* không mất đáp án
* giữ local state
* queue pending writes
* reconnect → flush queue.

Không được tạo hàng trăm writes sau reconnect.

Phải deduplicate queue.

Ví dụ:

```text
q1=A
q1=B
q1=C
```

trước khi sync chỉ cần:

```text
q1=C
```

==================================================
13. TỐI ƯU LOCAL MIRROR
=======================

Với các dữ liệu thường xuyên thay đổi:

tạo local mirror.

Ví dụ:

```ts
saveLocalSyncMirror(...)
```

hoặc abstraction tương tự.

Local mirror phải:

* lightweight
* versioned
* có timestamp
* có checksum/version nếu cần
* tránh stale overwrite.

Không dùng localStorage cho dữ liệu cực lớn nếu gây lag.

Có thể dùng IndexedDB nếu dữ liệu session lớn.

==================================================
14. READ-BEFORE-WRITE PHẢI ĐƯỢC XEM XÉT
=======================================

Tìm pattern:

```ts
const old = await getDoc(ref);

if (...) {
    await updateDoc(ref, ...)
}
```

Trong nhiều trường hợp:

READ + WRITE

có thể trở thành:

một `updateDoc`

hoặc transaction khi thực sự cần atomicity.

Không được đọc trước chỉ để kiểm tra những thứ có thể xử lý bằng client-side state hoặc Firestore rules.

==================================================
15. TRANSACTION
===============

Audit toàn bộ:

```ts
runTransaction(...)
```

Transaction có thể retry.

Không được đặt những operation gây side effects bên trong transaction.

Kiểm tra transaction có vô tình thực hiện nhiều reads.

Chỉ dùng transaction khi cần consistency/atomicity.

Không dùng transaction như một cách mặc định để update data.

==================================================
16. QUERY OPTIMIZATION
======================

Audit toàn bộ query.

Không dùng:

```ts
getDocs(collection(...))
```

để tải cả collection nếu UI chỉ cần một phần.

Phải có:

* where
* limit
* orderBy
* pagination
* cursor pagination.

Không tải toàn bộ users/students/exams chỉ để:

```ts
array.find(...)
```

Nếu Firestore có thể query trực tiếp:

hãy query trực tiếp.

==================================================
17. PAGINATION
==============

Các màn:

* admin users
* exams
* submissions
* students
* parents
* notifications
* review
* leaderboard
* statistics

nếu đang tải hàng trăm/hàng nghìn documents:

phải chuyển sang pagination/infinite loading.

Không load toàn bộ dataset ngay khi mount.

Ưu tiên:

```ts
limit(20/50)
startAfter(lastDoc)
```

và chỉ tải thêm khi cần.

==================================================
18. SELECTIVE FIELD / DATA MODEL
================================

Audit document size.

Nếu một màn chỉ cần:

```text
id
name
avatar
status
```

thì không được kéo một document khổng lồ chứa:

* answers
* analytics
* logs
* metadata
* history.

Nếu data model hiện tại khiến document quá lớn:

đề xuất tách:

```text
summary document
detail document
analytics document
```

Không phá compatibility nếu chưa cần.

==================================================
19. ADMIN DASHBOARD
===================

Audit toàn bộ admin pages.

Đặc biệt tìm:

```text
Admin mount
→ fetch users
→ fetch parents
→ fetch exams
→ fetch stats
→ fetch submissions
→ fetch notifications
```

Nếu tất cả đều chạy ngay khi mở dashboard:

hãy lazy-load theo tab.

Ví dụ:

mở tab Users

→ chỉ load Users.

Mở tab Statistics

→ mới load Statistics.

Không tải mọi thứ ngay từ initial mount.

==================================================
20. STATISTICS
==============

Không được mỗi lần mở trang statistics đều:

```text
query toàn bộ submissions
→ query toàn bộ users
→ query toàn bộ exams
→ tính lại mọi thứ
```

Tạo strategy:

```text
raw data
+
aggregated statistics
+
cache
```

Statistics có thể có TTL.

Ví dụ:

```ts
stats:daily:2026-09-27
stats:exam:123
stats:user:456
```

Chỉ recompute khi có dữ liệu liên quan thay đổi.

==================================================
21. PROCTORING
==============

Audit:

`realtimeProctoringService.ts`

Đây có thể là một nguồn WRITE CỰC LỚN.

KHÔNG được write Firestore cho mỗi event nhỏ như:

* mouse movement
* focus change liên tục
* visibility event
* heartbeat quá dày
* camera state spam
* browser events.

Phải:

* debounce
* throttle
* batch
* aggregate
* chỉ lưu event quan trọng.

Ví dụ:

heartbeat có thể chỉ update trạng thái định kỳ thay vì mỗi vài giây.

Events có thể queue local:

```text
events[]
↓
batch every N seconds
↓
one write/batch
```

Nhưng vẫn phải đảm bảo dữ liệu cần thiết không bị mất.

==================================================
22. NOTIFICATION
================

Audit `notificationService.ts`.

Không được query notification list liên tục.

Nếu realtime:

chỉ một listener.

Nếu không cần realtime:

load khi mở notification panel.

Mark-as-read phải:

* chỉ write khi state thực sự thay đổi
* batch nhiều notification nếu cần.

==================================================
23. AUTH
========

Audit `AuthContext.tsx`.

Không được mỗi auth state update lại:

```text
fetch user
fetch profile
fetch relationship
fetch permissions
fetch settings
```

nhiều lần.

Phải có:

```text
Auth state
↓
user cache
↓
profile cache
↓
permission cache
```

và chống duplicate requests.

==================================================
24. SERVICE LAYER
=================

Các service hiện tại phải thống nhất một data-access strategy.

Không được có:

```text
examService cache
studentService cache
parentService cache
adminService cache
```

mỗi nơi một cơ chế.

Tạo centralized layer kiểu:

```ts
firestoreRepository.ts
firestoreCache.ts
firestoreBatch.ts
firestoreSyncQueue.ts
```

Các service business chỉ gọi repository.

Ví dụ:

```ts
examService.getExam(id)
```

bên dưới:

```ts
repository.getDocument(...)
```

và repository chịu trách nhiệm:

* cache
* request deduplication
* retry
* metrics
* invalidation.

==================================================
25. CACHE INVALIDATION
======================

Phải thiết kế invalidation rõ ràng.

Ví dụ:

```text
update exam
↓
invalidate exam:${id}
↓
invalidate exam-list cache
↓
invalidate related statistics nếu cần
```

Không được dùng TTL cực ngắn để “chữa cháy”.

Không được invalidate toàn bộ cache sau một update nhỏ.

==================================================
26. WRITE QUEUE
===============

Tạo một centralized write queue.

Ví dụ:

```ts
enqueueWrite({
    key,
    ref,
    patch
})
```

Nếu cùng một `key` được enqueue nhiều lần:

phải merge.

Ví dụ:

```text
session:123
```

updates:

```text
progress=10
answers.q1=A
progress=11
answers.q1=B
```

cuối cùng có thể merge thành:

```text
progress=11
answers.q1=B
```

rồi mới flush.

==================================================
27. BACKOFF / RETRY
===================

Retry phải có:

* exponential backoff
* jitter
* giới hạn số lần retry.

Không được:

```ts
setInterval(() => save(), 1000)
```

khi request fail.

Không được tạo retry storm.

==================================================
28. OFFLINE FIRST
=================

Đối với exam session:

ưu tiên:

```text
local state
>
memory cache
>
IndexedDB/localStorage
>
Firestore
```

Firestore không nên là storage duy nhất cho UI realtime state.

==================================================
29. FIRESTORE LISTENER MANAGER
==============================

Nếu phù hợp với kiến trúc:

tạo:

```ts
FirestoreSubscriptionManager
```

Có reference counting.

Ví dụ:

```text
Component A subscribes exam:123
Component B subscribes exam:123

Firestore:
1 onSnapshot

Subscribers:
2 callbacks
```

Khi A unmount:

listener vẫn tồn tại.

Khi B unmount:

unsubscribe Firestore.

==================================================
30. DUPLICATE REQUEST DEDUPLICATION
===================================

Phải có:

```ts
inFlightRequests: Map<string, Promise<any>>
```

Nếu request giống nhau đang chạy:

không gửi request mới.

Ví dụ:

```text
Component A -> getExam(123)
Component B -> getExam(123)
Component C -> getExam(123)
```

Firestore chỉ:

1 READ.

==================================================
31. KHÔNG CACHE SAI DỮ LIỆU
===========================

Không được áp dụng cache tùy tiện cho:

* permissions quan trọng
* security-sensitive state
* final score nếu có yêu cầu consistency
* payment/wallet nếu có
* trạng thái submit cuối.

Những dữ liệu này phải đảm bảo consistency.

==================================================
32. SERVER VS CLIENT
====================

Nếu có logic aggregation hoặc heavy read:

xem xét chuyển một phần sang server/API.

Không để browser thực hiện:

```text
fetch 1000 documents
→ calculate
→ fetch another 1000
→ calculate
```

nếu có thể tạo aggregated endpoint/document.

==================================================
33. FIRESTORE RULES
===================

Audit:

`firestore.rules`

Đảm bảo rule không yêu cầu các lookup không cần thiết.

Không được thay đổi rule để “giảm read”.

Rules phải vẫn an toàn.

Đặc biệt không được biến client thành nơi có thể:

* đọc toàn database
* sửa dữ liệu người khác
* bypass permission.

==================================================
34. FIRESTORE INDEXES
=====================

Audit:

`firestore.indexes.json`

Chỉ giữ index cần thiết.

Kiểm tra query có thể tối ưu bằng composite index.

Không tạo hàng loạt query workaround chỉ vì thiếu index.

==================================================
35. LOGGING
===========

Audit:

`utils/firestoreLogger.ts`

Logger không được tự nó tạo thêm reads/writes.

Không log Firestore events bằng một write Firestore cho mỗi thao tác.

Nếu cần telemetry:

* console trong development
* buffered telemetry
* batch upload.

==================================================
36. PERFORMANCE INSTRUMENTATION
===============================

Tạo dev-only Firestore metrics.

Ví dụ:

```ts
firestoreMetrics.reads++
firestoreMetrics.writes++
firestoreMetrics.listenerStarts++
firestoreMetrics.listenerStops++
firestoreMetrics.cacheHits++
firestoreMetrics.cacheMisses++
firestoreMetrics.dedupedRequests++
```

Có thể expose:

```text
Firestore Performance Debug Panel
```

chỉ trong development.

Hiển thị:

```text
Reads
Writes
Cache hit %
Cache miss %
Dedup %
Active listeners
Pending writes
```

Mục tiêu là nhìn được service nào gây read/write.

==================================================
37. MỤC TIÊU BENCHMARK
======================

Sau khi refactor phải benchmark:

A. Login

B. Trang chủ

C. Mở danh sách đề

D. Mở một đề

E. Bắt đầu thi

F. Làm 10 câu

G. Làm 50 câu

H. Submit

I. Xem kết quả

J. Mở statistics

K. Admin dashboard

L. Proctoring session

M. Parent dashboard.

So sánh:

BEFORE:

```text
reads:
writes:
listeners:
```

AFTER:

```text
reads:
writes:
listeners:
cache hit:
```

Không được chỉ nói “đã tối ưu”.

Phải cung cấp số liệu đo được.

==================================================
38. TIÊU CHUẨN THÀNH CÔNG
=========================

Ưu tiên giảm:

1. redundant reads
2. redundant writes
3. duplicate listeners
4. full-document writes
5. repeated collection queries
6. unnecessary stats aggregation
7. autosave writes
8. proctoring writes
9. admin dashboard reads.

Mục tiêu kiến trúc:

```text
UI
 ↓
Local State / Cache
 ↓
Repository
 ↓
Request Deduplication
 ↓
Firestore
```

không phải:

```text
UI
 ↓
Service
 ↓
Firestore
```

trực tiếp ở hàng chục nơi.

==================================================
39. KHÔNG ĐƯỢC PHÁ CHỨC NĂNG
============================

Trong quá trình refactor:

KHÔNG được làm mất:

* autosave
* offline answer
* reconnect sync
* exam timer
* submit
* grading
* score
* analytics
* leaderboard
* notifications
* parent functionality
* admin functionality
* proctoring
* permission system.

Đặc biệt:

không được giảm writes bằng cách bỏ persistence.

Phải giảm WRITE REDUNDANCY.

==================================================
40. CODE QUALITY
================

Sau khi refactor:

* TypeScript strict-safe
* không any vô lý
* không memory leak
* cleanup listener
* không race condition
* không stale closure
* không infinite loop
* không duplicate effect
* không duplicate subscriptions.

Không viết một giant service.

Tách theo trách nhiệm.

==================================================
41. MIGRATION
=============

Nếu thay đổi data model:

phải đảm bảo backward compatibility.

Không tự ý xóa field production.

Không tự ý rename collection.

Nếu cần migration:

tạo migration strategy rõ ràng.

==================================================
42. THỨ TỰ THỰC HIỆN
====================

Thực hiện theo thứ tự:

PHASE 1
Audit toàn bộ Firestore usage.

PHASE 2
Liệt kê top read/write hotspot.

PHASE 3
Thiết kế cache + request deduplication.

PHASE 4
Fix duplicate listeners.

PHASE 5
Fix autosave.

PHASE 6
Fix session/answer persistence.

PHASE 7
Fix proctoring.

PHASE 8
Fix statistics/admin dashboard.

PHASE 9
Fix pagination/query.

PHASE 10
Add metrics.

PHASE 11
Benchmark.

==================================================
43. KẾT QUẢ BẮT BUỘC
====================

Sau khi hoàn thành, phải trả về:

### 1. Root causes

Liệt kê chính xác các nguyên nhân làm Firestore read/write cao.

Format:

```text
File
Function
Current behavior
Why expensive
Fix
Estimated impact
```

### 2. Files changed

Liệt kê toàn bộ file đã sửa.

### 3. Architecture changes

Giải thích cache, queue, dedup, autosave, listeners.

### 4. Before / After

Ví dụ:

```text
Exam open
Before: 14 reads
After: 3 reads

Answering 20 questions
Before: 40 writes
After: 4 writes

Admin dashboard
Before: 320 reads
After: 65 reads
```

Các số phải là số ĐO ĐƯỢC, không được bịa.

### 5. Regression check

Kiểm tra:

* login
* exam
* session
* answer
* submit
* result
* admin
* parent
* proctoring.

### 6. Firestore cost impact

Ước lượng dựa trên measured request counts, không được chỉ đoán.

==================================================
44. QUY TẮC QUAN TRỌNG NHẤT
===========================

KHÔNG được làm kiểu:

```text
“Thấy nhiều read → thêm cache”
```

Phải làm:

```text
AUDIT
→ IDENTIFY ROOT CAUSE
→ MEASURE
→ DESIGN
→ REFACTOR
→ MEASURE AGAIN
```

Mọi optimization phải có lý do.

Không tối ưu mù.

Không hy sinh data consistency chỉ để giảm Firebase cost.

Không hy sinh UX.

Không hy sinh security.

Không bỏ realtime ở nơi thật sự cần realtime.

Không ghi Firestore nếu state chưa thực sự thay đổi.

Không đọc Firestore nếu dữ liệu đã có trong cache và còn hợp lệ.

Không query cùng một dữ liệu nhiều lần trong cùng lifecycle.

Không để một event của người dùng sinh ra hàng loạt reads/writes không cần thiết.

Hãy ưu tiên một kiến trúc:

```text
LOCAL-FIRST
+
CACHE
+
REQUEST DEDUP
+
DEBOUNCED WRITE
+
BATCH WRITE
+
SHARED LISTENERS
+
PAGINATION
+
AGGREGATED STATS
+
OFFLINE QUEUE
```

nhưng chỉ áp dụng từng kỹ thuật ở nơi phù hợp với semantics của dữ liệu.

Cuối cùng:

ĐỪNG chỉ đưa ra đề xuất.

Hãy trực tiếp sửa source code để triển khai toàn bộ tối ưu cần thiết, sau đó kiểm tra TypeScript/build/lint và báo cáo chính xác những gì đã thay đổi.
