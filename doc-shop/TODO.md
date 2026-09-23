You are a senior product engineer, full-stack architect, Firebase/backend engineer, UI/UX designer, and design-system engineer.

Upgrade the existing DkDocShop codebase into a premium, production-ready digital document shop.

IMPORTANT:
This task is NOT just cosmetic.
Implement real functionality, real persistence, proper validation, secure server-side business logic, and a coherent premium design system.

The main business model remains:

DkDocShop = DIGITAL DOCUMENT SHOP

Admin is the owner/operator.

Users browse, purchase, use vouchers, purchase combos, manage their library, wallet, transactions, and use DkAI.

Do NOT add seller marketplace functionality.

Do NOT add exam simulation.

Do NOT add mock exams.

Do NOT add practice-test platform functionality.

========================================================

1. CORE OBJECTIVES
   ========================================================

Implement these major upgrades:

A. Voucher/Coupon system managed entirely from Admin UI
B. Combo/Bundle system managed entirely from Admin UI
C. Server-side persistence and validation
D. No hardcoded voucher/combo configuration in source code
E. Secure discount calculation
F. Admin campaign management
G. Fix Admin tab horizontal overflow
H. Premium icon redesign
I. Premium visual redesign
J. Better responsive behavior
K. Better spacing, typography, interaction and micro-animations
L. Consistent design system across the entire application

The result should feel like a polished commercial SaaS/e-commerce product instead of a student prototype.

========================================================
2. VERY IMPORTANT — ADMIN-CREATED DATA
======================================

Vouchers and combos MUST NOT be hardcoded.

WRONG:

const vouchers = [
{ code: "SALE20", discount: 20 }
];

WRONG:

if (code === "SALE20") {
discount = 0.2;
}

WRONG:

const COMBO_PRICE = 29000;

Do NOT implement campaigns using hardcoded JavaScript constants.

Correct architecture:

Admin UI
↓
secure service/API
↓
Firebase/Database
↓
public/user purchase validation

The administrator creates vouchers and combos from the Admin Dashboard.

The data is stored in the backend/database.

The storefront reads active campaign data dynamically.

No redeployment should be required when the admin creates or edits:

* voucher
* discount
* combo
* promotion
* campaign
* schedule

========================================================
3. VOUCHER SYSTEM
=================

Create a complete Voucher/Coupon management system.

Admin route:

/admin/vouchers

Admin navigation label:

"Mã giảm giá"

========================================================
4. VOUCHER DATA MODEL
=====================

Create a persistent voucher model such as:

{
id,
code,
name,
description,

type,
value,

minimumOrderValue,

maximumDiscount,

usageLimit,
usedCount,

perUserLimit,

startsAt,
endsAt,

active,

applicableTo,

applicableDocumentIds,
applicableCategoryIds,
applicableBundleIds,

firstPurchaseOnly,

stackable,

priority,

createdAt,
updatedAt,
createdBy
}

Supported types:

percentage
fixed
free_shipping_not_applicable
free_document
bundle_discount

Since this is a digital-document shop, DO NOT invent shipping-related functionality.

Use only relevant digital-product discount types.

Preferred types:

percentage
fixed
free_document
bundle_discount

========================================================
5. VOUCHER CREATION UI
======================

Admin → Vouchers → "Tạo mã giảm giá"

Form:

Tên chương trình
Mã voucher
Mô tả
Loại giảm giá
Giá trị giảm
Đơn tối thiểu
Giảm tối đa
Giới hạn tổng lượt dùng
Giới hạn mỗi người
Thời gian bắt đầu
Thời gian kết thúc
Phạm vi áp dụng
Chỉ khách hàng mua lần đầu
Cho phép kết hợp
Ưu tiên
Trạng thái

Code field:

SALE20

Admin can:

* manually enter code
* generate random code
* uppercase automatically
* remove whitespace
* validate uniqueness

Example generated code:

DK20X7
SHOP30
TOAN12
WELCOME10

========================================================
6. VOUCHER TYPE BEHAVIOR
========================

PERCENTAGE:

20% off

FIXED:

10,000 VND off

FREE_DOCUMENT:

If configured, allow selected documents to become free under the campaign rules.

BUNDLE_DISCOUNT:

Apply additional discount to selected combo/bundle where allowed.

Do not allow invalid negative totals.

Final price can never become below 0.

========================================================
7. VOUCHER TARGETING
====================

Admin can select:

All documents

Specific documents

Specific categories

Specific bundles

Free-only

Paid-only

Specific combinations

Do not hardcode target IDs in source code.

Store target references in the database.

========================================================
8. VOUCHER LIMITS
=================

Support:

global usage limit

per-user usage limit

campaign date range

minimum order

maximum discount

first purchase only

active/inactive

expired

scheduled

draft

========================================================
9. VOUCHER STATUS
=================

Statuses:

draft
scheduled
active
paused
expired
depleted

Status may be computed from dates and usage.

Do not rely solely on client-calculated status.

========================================================
10. VOUCHER VALIDATION
======================

When a user enters a voucher:

Frontend:

show loading state

Backend/service:

validate:

* code exists
* active
* not expired
* started
* usage limit
* per-user limit
* minimum order
* applicable document
* applicable category
* applicable bundle
* first purchase requirement
* stackability
* ownership
* current cart/order contents

Then return a secure discount result.

Never trust the browser-calculated discount.

========================================================
11. VOUCHER RESPONSE
====================

Return something similar to:

{
valid: true,
voucherId: "...",
code: "SALE20",
discountType: "percentage",
discountValue: 20,
discountAmount: 12000,
originalTotal: 60000,
finalTotal: 48000,
message: "Áp dụng mã giảm giá thành công"
}

If invalid:

{
valid: false,
reason: "EXPIRED",
message: "Mã giảm giá đã hết hạn."
}

Frontend only renders the server result.

========================================================
12. VOUCHER UX
==============

Purchase modal must contain:

"Mã giảm giá"

input

button:

"Áp dụng"

After success:

green state

✓ SALE20
Giảm 20%
Tiết kiệm 12.000đ

After invalid:

red inline message

"Voucher không hợp lệ hoặc không áp dụng cho đơn hàng này."

Do NOT use alert().

========================================================
13. VOUCHER ADMIN TABLE
=======================

Columns:

Mã

Tên chương trình

Loại

Giá trị

Đã dùng / giới hạn

Thời gian

Phạm vi

Trạng thái

Actions

Actions:

edit

duplicate

pause

activate

view

delete

analytics

========================================================
14. VOUCHER ANALYTICS
=====================

When opening a voucher:

Show:

total usage

unique users

total discount amount

orders generated

revenue generated

conversion rate

remaining usage

top documents using voucher

daily usage chart

This data should come from persisted analytics/aggregated data.

========================================================
15. COMBO / BUNDLE SYSTEM
=========================

Create a real Combo system.

Admin route:

/admin/bundles

Navigation:

"Combo tài liệu"

A combo is a purchasable package consisting of multiple documents.

Example:

Combo Toán 12 — Hàm số

Contains:

Document A
Document B
Document C

Individual total:

45.000đ

Combo:

29.000đ

Saving:

16.000đ

========================================================
16. COMBO DATA MODEL
====================

Create:

{
id,

title,
slug,
description,

thumbnail,
bannerImage,

documentIds,

originalPrice,
comboPrice,

discountAmount,
discountPercent,

featured,

active,

startsAt,
endsAt,

tags,
categoryIds,

purchaseCount,
viewCount,

createdAt,
updatedAt,
createdBy
}

Do NOT store only a hardcoded final price.

The admin must be able to edit pricing from CMS.

========================================================
17. COMBO CREATION
==================

Admin:

Create Combo

Fields:

Tên combo

Mô tả

Ảnh

Ảnh banner

Tìm tài liệu

Select multiple documents

Sort selected documents

Giá gốc

Giá combo

Featured

Active

Start date

End date

Categories

Tags

The UI should calculate:

originalPrice

savingAmount

discountPercent

in real time.

But the backend must recalculate and validate the authoritative price before checkout.

========================================================
18. COMBO DOCUMENT SELECTOR
===========================

Create a searchable document picker.

Features:

search

subject filter

category filter

already selected indicator

multi-select

drag to reorder

remove

selected count

total individual price

Example:

3 tài liệu đã chọn

Giá lẻ: 45.000đ

Giá combo: 29.000đ

Tiết kiệm: 16.000đ

========================================================
19. COMBO STOREFRONT
====================

Homepage section:

"Combo tiết kiệm"

Card:

thumbnail

combo badge

title

contains:

3 tài liệu

original price

combo price

saving badge:

Tiết kiệm 35%

CTA:

"Xem combo"

Combo detail:

hero

included documents

individual prices

combo price

savings

reviews if available

CTA:

"Mua combo"

========================================================
20. COMBO PURCHASE BEHAVIOR
===========================

When user purchases a combo:

1. validate combo on backend
2. validate active dates
3. validate combo price
4. check current ownership
5. calculate missing documents
6. calculate final amount
7. apply voucher if allowed
8. atomically process transaction
9. grant ownership for all eligible documents
10. record purchase
11. record combo purchase
12. send notification

CRITICAL:

If user already owns some documents in the combo:

DO NOT charge for documents they already own unless the campaign explicitly defines otherwise.

Preferred behavior:

Display:

Bạn đã sở hữu 1/3 tài liệu.

Giá sau khi loại tài liệu đã sở hữu:
XX.XXXđ

Then calculate secure final price.

Never silently charge duplicates.

========================================================
21. COMBO DUPLICATE PROTECTION
==============================

Protect against:

double click

repeated requests

network retry

page refresh during payment

duplicate combo purchase

Use idempotency or transaction-safe logic.

========================================================
22. VOUCHER + COMBO COMPATIBILITY
=================================

Support rules:

Voucher applies to combo

Voucher does not apply to combo

Voucher only applies to documents

Voucher applies to selected categories

Voucher applies only once

Voucher stackable = true/false

Admin defines these rules.

Purchase engine evaluates them.

Do not hardcode campaign relationships.

========================================================
23. ADMIN PROMOTION CENTER
==========================

Create:

/admin/promotions

This becomes the campaign control center.

Tabs:

Vouchers

Combos

Featured

Campaigns

Analytics

The UI should clearly communicate:

"Shop Campaign Management"

========================================================
24. PROMOTION STATES
====================

Campaign states:

Draft

Scheduled

Live

Paused

Expired

Completed

Use status badges.

Use date-aware state handling.

========================================================
25. ADMIN TAB — FIX HORIZONTAL OVERFLOW
=======================================

There are currently multiple Admin tabs such as:

Tổng quan
Tài liệu
Người dùng
Giao dịch
Báo cáo

The current implementation places these in a horizontal group and can overflow on narrow screens.

Fix this properly.

DO NOT wrap into ugly multi-line tabs.

DO NOT shrink text until unreadable.

DO NOT let the page itself overflow horizontally.

Preferred behavior:

Desktop:
normal horizontal tabs.

Tablet/mobile:
the TAB CONTAINER itself scrolls horizontally.

Example structure:

<div class="admin-tabs-scroll">
  <div class="admin-tabs">
    ...
  </div>
</div>

CSS behavior:

overflow-x: auto
overflow-y: hidden
-webkit-overflow-scrolling: touch
scrollbar-width: none

Hide visual scrollbar while preserving horizontal interaction.

Each tab:

flex: 0 0 auto
white-space: nowrap

The content page itself must NOT horizontally overflow.

========================================================
26. ADMIN TAB MOBILE UX
=======================

On mobile:

Tabs should be swipeable.

Active tab should automatically scroll into view.

When selecting a tab:

scroll active tab to center.

Use smooth scrolling.

Do not cause the whole document to scroll horizontally.

Add subtle fade indicators at left/right edges when more tabs exist.

Example:

←    Tổng quan Tài liệu Người dùng Giao dịch Báo cáo    →

The arrows should not be permanent if there is no overflow.

========================================================
27. ADMIN NAVIGATION SCALABILITY
================================

The existing few tabs will grow.

Future tabs:

Tổng quan
Tài liệu
Người dùng
Giao dịch
Nạp tiền
Báo cáo
Mã giảm giá
Combo
Banner
Thông báo
AI
Analytics
Audit

Therefore design the tab system generically.

Create reusable:

<AdminTabs />

Support:

items
activeKey
onChange
scrollIntoView
mobileOverflow
badges

Do not create one-off CSS for every tab.

========================================================
28. ICON SYSTEM — REMOVE FONT AWESOME
=====================================

Replace the current Font Awesome based icon system with a consistent React icon library.

Preferred:

lucide-react

Alternative:

react-icons

Priority:

lucide-react

Use one icon system consistently.

Do NOT mix:

Font Awesome
emoji
random SVG
different icon packs

The current page includes Font Awesome globally; remove the dependency after all required icons have been migrated.

========================================================
29. ICON DESIGN RULES
=====================

Icons must look:

minimal

clean

modern

consistent

premium

Recommended stroke:

1.75–2px

Do not use gigantic icons.

Do not use random solid icons beside outline icons.

========================================================
30. ICON MAPPING
================

Replace common actions with semantic Lucide icons.

Examples:

Home:
House

Search:
Search

Documents:
FileText

Purchased:
ShoppingBag

Favorites:
Heart

Wallet:
WalletCards / Wallet

Transactions:
ReceiptText

Notifications:
Bell

Profile:
UserCircle

Settings:
Settings

Admin:
LayoutDashboard

Users:
Users

Reports:
Flag

Key:
KeyRound

Voucher:
TicketPercent

Combo:
Package

Promotion:
Megaphone

Banner:
PanelTop

Analytics:
ChartNoAxesCombined

AI:
Sparkles

Logout:
LogOut

Edit:
Pencil

Delete:
Trash2

Add:
Plus

Close:
X

Confirm:
Check

Warning:
TriangleAlert

Error:
CircleAlert

Info:
Info

Copy:
Copy

Download:
Download

Upload:
Upload

Filter:
SlidersHorizontal

Sort:
ArrowUpDown

Chevron:
ChevronLeft
ChevronRight
ChevronDown
ChevronUp

Calendar:
CalendarDays

Clock:
Clock3

Eye:
Eye

Views:
ChartNoAxesColumn

Star:
Star

========================================================
31. ICON BUTTON UX
==================

Every icon-only button must have:

aria-label

tooltip

hover state

focus state

active state when applicable

Do not leave users guessing.

Example:

icon-only Trash2 button

aria-label="Xóa voucher"

tooltip:

"Xóa voucher"

========================================================
32. PREMIUM DESIGN SYSTEM
=========================

The entire site should be redesigned into:

Premium Education Commerce UI

Visual keywords:

clean

luxury

modern

bright

soft

professional

minimal

high-end SaaS

Avoid:

cheap gradients

excessive neon

huge icons

random colors

excessive shadows

template-like cards

========================================================
33. DESIGN TOKENS
=================

Create centralized tokens:

--color-primary
--color-primary-soft
--color-success
--color-warning
--color-danger
--color-info

--bg
--surface
--surface-muted
--border

--text-primary
--text-secondary
--text-muted

--radius-sm
--radius-md
--radius-lg
--radius-xl

--shadow-sm
--shadow-md
--shadow-lg

--space-1
--space-2
...

Do not manually invent colors in every component.

========================================================
34. COLOR STYLE
===============

Primary:

fresh emerald / premium green

Secondary:

soft blue

Accent:

soft violet

Warning:

warm amber

Danger:

soft red

Keep overall background:

white / near-white.

Cards:

white

border:

very subtle

Do not make every card floating with huge shadows.

========================================================
35. TYPOGRAPHY
==============

Strong hierarchy:

Page title

Section title

Card title

Body

Metadata

Caption

Prices

Use font weights intentionally.

Do not make every heading bold 700.

========================================================
36. CARD DESIGN
===============

Cards should have:

12–20px radius

1px subtle border

subtle hover elevation

clean padding

consistent internal spacing

Avoid:

giant shadows

excessive gradients

overly rounded "bubble" UI.

========================================================
37. BUTTON DESIGN
=================

Primary:

solid

medium height

rounded-xl

Secondary:

soft surface

border

Ghost:

transparent

Danger:

soft red / clear destructive appearance

Buttons need:

hover

active

focus

disabled

loading

========================================================
38. LOADING BUTTON
==================

When async:

disable button

show spinner

change text:

"Đang xử lý..."

Do not allow duplicate click.

========================================================
39. PREMIUM ADMIN DASHBOARD
===========================

Admin should feel like a professional commerce CMS.

Top:

page title

short description

date context

primary action

Then:

KPI cards

charts

tables

activity

Do not make every screen a giant white rectangle.

Use hierarchy.

========================================================
40. ADMIN TABLE DESIGN
======================

Tables:

sticky header when useful

horizontal scrolling inside table container

compact but readable rows

hover state

status badges

row actions

pagination

search

filter

bulk selection

Mobile:

switch to card/list representation when appropriate.

========================================================
41. ADMIN ACTION MENU
=====================

For crowded tables:

Use 3-dot menu:

MoreHorizontal

Menu:

Edit

Duplicate

Preview

Pause

Delete

etc.

Do not put 8 buttons beside every row.

========================================================
42. PREMIUM FORM UX
===================

Forms should use:

section headers

field descriptions

helper text

validation messages

input icons where appropriate

clear spacing

group related fields

Do not create a giant 2-column wall of inputs.

Use cards/sections:

Basic Information

Pricing

Availability

Targeting

Advanced Rules

========================================================
43. VOUCHER FORM PREMIUM UX
===========================

Layout:

GENERAL

Tên chiến dịch
Mô tả
Mã

DISCOUNT

Loại
Giá trị
Giảm tối đa

RULES

Đơn tối thiểu
Giới hạn
Per-user
First purchase

TARGETING

Document
Category
Combo

SCHEDULE

Start
End
Timezone

ADVANCED

Stackable
Priority
Active

Right-side or top sticky summary:

Voucher Preview

SALE20

Giảm 20%

Đơn tối thiểu 50.000đ

19/09 → 30/09

========================================================
44. COMBO FORM PREMIUM UX
=========================

Sections:

Thông tin combo

Tài liệu trong combo

Giá

Hiển thị

Thời gian

Preview

Live price calculator:

Giá lẻ:
45.000đ

Giá combo:
29.000đ

Tiết kiệm:
16.000đ

Giảm:
35.5%

========================================================
45. LIVE STOREFRONT CAMPAIGN
============================

When admin creates a voucher:

Do NOT automatically hardcode it into homepage.

The storefront should dynamically query active promotions.

Homepage can show:

Khuyến mãi đang diễn ra

with campaign cards.

When promotion expires:

automatically stop displaying it.

========================================================
46. PROMOTION CACHE
===================

Cache promotion data safely.

When admin modifies:

voucher
bundle
banner
promotion

invalidate relevant cache.

Do not wait for an app deployment.

========================================================
47. SECURITY
============

Critical discount logic MUST NOT rely on frontend.

The server/service layer must determine:

original price

eligible documents

voucher validity

discount

final price

combo price

owned documents

payment amount

The frontend only displays authoritative results.

A user must not be able to edit:

discountAmount

finalTotal

comboPrice

voucher validity

purchase approval

through browser DevTools.

========================================================
48. ADMIN AUTHORIZATION
=======================

Admin pages require:

authentication

admin authorization

Do not trust:

localStorage.role

UI visibility

client variables

The server/database security rules must enforce admin authorization.

========================================================
49. CUSTOM POPUPS
=================

Absolutely NO:

alert()

confirm()

prompt()

window.alert()

window.confirm()

window.prompt()

EVERYWHERE.

Use:

Toast

Modal

ConfirmDialog

Drawer

BottomSheet

InlineValidation

This includes:

voucher errors

combo errors

delete confirmation

logout

payment

admin actions

upload errors

AI errors

success messages

========================================================
50. MICRO-INTERACTIONS
======================

Add subtle animations:

150–250ms

Use:

opacity

transform

scale

translateY

Do not animate huge areas.

Use motion to indicate:

opening

closing

success

selection

hover

loading

========================================================
51. RESPONSIVE BREAKPOINTS
==========================

Test:

320
375
390
430
768
1024
1280
1440
1920

Special attention:

Admin tabs

Admin tables

Voucher forms

Combo forms

Header

Sidebar

Modals

Purchase modal

========================================================
52. MOBILE ADMIN
================

Admin on mobile must be usable.

Tabs:

horizontal swipe

Tables:

horizontal internal scroll

Forms:

single column

Actions:

bottom sheet / menu

KPI:

2-column grid

Charts:

horizontal scroll only where needed

========================================================
53. EMPTY STATES
================

Voucher empty:

"Chưa có mã giảm giá"

CTA:

"Tạo mã đầu tiên"

Combo empty:

"Chưa có combo"

CTA:

"Tạo combo"

No promotions:

"Hiện chưa có chương trình khuyến mãi."

All empty states should be polished.

========================================================
54. SUCCESS STATES
==================

After creating voucher:

Modal or toast:

"Đã tạo mã giảm giá"

Code preview:

SALE20

After creating combo:

"Đã tạo combo"

After update:

"Đã cập nhật thành công"

After deletion:

"Đã xóa"

Never use browser alerts.

========================================================
55. AUDIT LOGS
==============

Track admin campaign changes:

voucher_created

voucher_updated

voucher_deleted

voucher_paused

voucher_activated

bundle_created

bundle_updated

bundle_deleted

bundle_price_changed

banner_created

banner_updated

banner_deleted

Store:

actorId

action

targetId

timestamp

metadata

========================================================
56. DATA SEED
=============

Add seed/demo data.

Minimum:

10 vouchers

8 bundles

8 banners

10 promotions

20 documents

Each voucher should represent a different realistic case:

WELCOME10
SALE20
TOAN12
FREEDOC
COMBO15
FLASH25
NEWUSER
WEEKEND
BIGSAVE
STUDENT10

But these are DEMO DATA ONLY.

They must be persisted through the seed system.

Do not turn these names into hardcoded business rules.

========================================================
57. ADMIN SEED TOOL
===================

Developer/demo environment may include:

"Seed demo data"

button.

This button must:

* require admin/developer permission
* show custom confirmation
* not overwrite production data blindly
* use demo namespace or DEMO_MODE

========================================================
58. PERFORMANCE
===============

Do NOT reload entire Admin Dashboard after changing one voucher.

Example:

Create voucher

→ update voucher state

→ invalidate voucher cache

→ refresh voucher table only

Do not:

reload page

reload all users

reload all documents

reload analytics unnecessarily.

========================================================
59. ARCHITECTURE RULE
=====================

Voucher logic belongs in:

voucher.service.js

Database operations:

voucher.repository.js

UI:

VoucherList

VoucherForm

VoucherPreview

Purchase UI:

VoucherInput

Backend validation:

validateVoucher()

Combo:

bundle.service.js

bundle.repository.js

BundleList

BundleForm

BundlePreview

Do not scatter voucher logic into document-card.js, home.js, purchase.js, admin.js, etc.

========================================================
60. TEST CASES
==============

VOUCHER:

* valid percentage
* valid fixed amount
* expired
* not started
* disabled
* usage depleted
* per-user limit
* minimum order failure
* category mismatch
* document mismatch
* bundle mismatch
* first purchase failure
* invalid code
* lowercase input
* whitespace
* duplicate usage
* concurrent purchase

COMBO:

* valid combo
* inactive combo
* expired combo
* already owned document
* partly owned combo
* duplicate purchase
* voucher applied
* voucher rejected
* deleted document inside combo
* changed document price
* combo price changed

ADMIN:

* create
* edit
* duplicate
* activate
* pause
* delete
* pagination
* search
* filter
* mobile
* desktop

========================================================
61. ICON MIGRATION CHECK
========================

Search the entire project for:

fa-
fas
far
fab
Font Awesome CDN

Replace all UI icons with the selected React icon system.

Do not leave mixed icon systems unless there is a documented reason.

========================================================
62. FINAL VISUAL POLISH
=======================

After functionality is complete, perform a second visual pass.

Check:

spacing consistency

alignment

icon size

button height

border radius

shadow strength

typography

color contrast

hover states

focus states

mobile spacing

table density

modal size

banner proportions

empty states

loading states

error states

No screen should look unfinished.

========================================================
63. FINAL ACCEPTANCE CRITERIA
=============================

The implementation is complete only when:

1. Admin can create vouchers from UI.
2. Voucher is persisted server-side.
3. Storefront automatically reads active vouchers.
4. Voucher validation is secure.
5. Admin can create combos from UI.
6. Combo is persisted server-side.
7. Combo purchase works.
8. Voucher + combo rules work.
9. No voucher/combo business rule is hardcoded.
10. Admin tabs scroll horizontally on mobile.
11. Page itself does not horizontally overflow.
12. Tabs auto-scroll active item into view.
13. Font Awesome icons are removed.
14. React icon library is used consistently.
15. Every icon-only button has accessible label.
16. UI looks premium and consistent.
17. No browser alert.
18. No browser confirm.
19. No browser prompt.
20. All success/error/confirmation states use custom UI.
21. Existing DkDocShop functionality still works.
22. Existing Firebase data remains compatible.
23. Existing document IDs remain valid.
24. Admin actions generate audit logs.
25. The implementation is genuinely production-oriented.

========================================================
64. FINAL REPORT
================

After implementation, report:

A. Voucher system
B. Combo system
C. Promotion architecture
D. Admin tab fix
E. Icon migration
F. Design system changes
G. Security changes
H. Firebase/database changes
I. Performance changes
J. Files created
K. Files modified
L. Files deprecated
M. Test results
N. Remaining limitations

Do not merely describe the design.

IMPLEMENT IT.
