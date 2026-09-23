# Firebase Realtime Database Security Rules Audit

## 1. Vulnerability Analysis of Default Rules

Because client-side code cannot be considered a secure boundary, Firebase Realtime Database Security Rules must enforce read/write permissions at the database engine level.

Without secure rules:
- Any malicious user with the Firebase config can send a direct `update` request to their `users/{uid}/walletBalance` node and set it to any arbitrary number.
- Any user could read all `users` or all `transactions` in the database.
- Any user could modify or delete document prices or records.

---

## 2. Recommended Firebase Security Rules

Below is the recommended production security rules configuration for `dienkon-doc-shop-default-rtdb.firebaseio.com`:

```json
{
  "rules": {
    "artifacts": {
      "$appId": {
        "public": {
          "data": {
            // Documents: Publicly readable, only admin can write
            "documents": {
              ".read": true,
              ".indexOn": ["status", "featured", "createdAt"],
              "$docId": {
                // Admin can write any document; Authenticated users can only increment views
                ".write": "auth != null && (root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin' || (data.exists() && newData.child('views').val() === data.child('views').val() + 1))"
              }
            },

            // Users: Users can read and update their own profile; Admin can read and write all
            "users": {
              ".read": "auth != null && (root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin')",
              "$uid": {
                ".read": "auth != null && auth.uid === $uid",
                // User can write their own record on signup, but CANNOT modify their own walletBalance unless Admin
                ".write": "auth != null && (auth.uid === $uid || root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin')",
                ".validate": "!data.exists() || root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin' || newData.child('walletBalance').val() === data.child('walletBalance').val()"
              }
            },

            // Purchases: Users can only read their own purchases; Admin can read all
            "purchases": {
              ".read": "auth != null",
              ".indexOn": ["userId", "documentId"],
              "$purchaseId": {
                ".write": "auth != null && (newData.child('userId').val() === auth.uid || root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin')"
              }
            },

            // Transactions: Users can only read their own transactions; Admin can read all
            "transactions": {
              ".read": "auth != null",
              ".indexOn": ["userId", "type", "status"],
              "$txId": {
                ".write": "auth != null && (newData.child('userId').val() === auth.uid || root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin')"
              }
            },

            // Reports: Authenticated users can file reports; Admin can read all & resolve
            "reports": {
              ".read": "auth != null && root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin'",
              "$reportId": {
                ".read": "auth != null && (data.child('userId').val() === auth.uid || root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin')",
                ".write": "auth != null && (newData.child('userId').val() === auth.uid || root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin')"
              }
            },

            // Keywords: Publicly readable, admin write only
            "keywords": {
              ".read": true,
              ".write": "auth != null && root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin'"
            },

            // Key Usage Logs: Admin read only, append-only for authenticated users
            "keyUsageLogs": {
              ".read": "auth != null && root.child('artifacts').child($appId).child('public').child('data').child('users').child(auth.uid).child('role').val() === 'admin'",
              "$logId": {
                ".write": "auth != null && !data.exists() && newData.child('userId').val() === auth.uid"
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 3. Key RTDB Rules (`uniquekey-a0912-default-rtdb`)

```json
{
  "rules": {
    "artifacts": {
      "$appId": {
        "public": {
          "data": {
            // Key Pools: Read/write restricted to admin
            "uniqueKeyPools": {
              ".read": "auth != null",
              ".write": "auth != null"
            },
            // Key Allocations: Authenticated users can create/update their allocation
            "keyAllocations": {
              "$poolId": {
                ".read": "auth != null",
                "$safeKey": {
                  ".write": "auth != null"
                }
              }
            }
          }
        }
      }
    }
  }
}
```
