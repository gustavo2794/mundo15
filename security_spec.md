# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Global Deny**: All unspecified paths under `/databases/{database}/documents` default to `false`.
2. **Verified Identity**: All writes (and admin privileges) require `request.auth != null && request.auth.token.email_verified == true`.
3. **Bootstrapped & DB-Backed Admin**: Admin access is granted only to the verified bootstrapped email `gusanito2794@gmail.com` (`email_verified == true`) or verified users with a document in `/admins/{request.auth.uid}`. Users cannot self-assign admin status.
4. **PII Isolation (`/users/{userId}`)**: A user document contains PII (`email`, `phone`) and is readable only by its owner (`request.auth.uid == userId`) or a verified admin. Listing `/users` is strictly restricted to verified admins.
5. **Academy Integrity (`/academies/{academyId}`)**: Only verified admins can create, update, or delete academies. Regular signed-in users can only read/list academies where `isPublished == true`.
6. **Quote Request Integrity (`/quoteRequests/{requestId}`)**: A quote request must reference an existing academy (`exists(/databases/$(database)/documents/academies/$(incoming().academyId))`), bind `userId == request.auth.uid`, and start in `status == 'pending'`. Only admins can update status (`pending` -> `contacted` -> `archived`).
7. **Temporal & Immutability Integrity**: `createdAt` must equal `request.time` on creation and remain unchanged on updates; `updatedAt` must equal `request.time` on create and update. Document IDs must match `^[a-zA-Z0-9_-]+$` and `<= 128` chars.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Academy Write**: `POST /academies/fake-1` without `request.auth` -> `PERMISSION_DENIED`.
2. **Unverified Admin Email Spoof**: User with `email: "gusanito2794@gmail.com"`, `email_verified: false` attempts to write `/academies/a1` -> `PERMISSION_DENIED`.
3. **Self-Admin Escalation**: Regular verified user attempts `create /admins/{theirUid}` -> `PERMISSION_DENIED`.
4. **Cross-User PII Read**: Verified User A attempts `get /users/{userB_uid}` -> `PERMISSION_DENIED`.
5. **Blanket Users List Scrape**: Regular verified user attempts `list /users` -> `PERMISSION_DENIED`.
6. **Ghost/Shadow Field Injection on Profile**: Owner attempts `update /users/{uid}` adding `isAdmin: true` -> `PERMISSION_DENIED` (`hasOnly` check).
7. **Timestamp Forgery on Profile**: Owner attempts `create /users/{uid}` with backdated `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`.
8. **Immutable Field Tampering**: Owner attempts `update /users/{uid}` changing `uid` or `createdAt` -> `PERMISSION_DENIED`.
9. **Oversized String DoS / Resource Poisoning**: Owner attempts `update /users/{uid}` with `displayName` of 500 chars -> `PERMISSION_DENIED` (`size() <= 100`).
10. **Unpublished Academy Read by Non-Admin**: Non-admin attempts `get /academies/draft-1` where `isPublished == false` -> `PERMISSION_DENIED`.
11. **Orphaned Quote Request**: User creates `/quoteRequests/q1` referencing non-existent `academyId: "missing"` -> `PERMISSION_DENIED` (`exists()` check).
12. **Quote Status Shortcutting by User**: User creates `/quoteRequests/q1` with `status: "contacted"` or updates `status` directly -> `PERMISSION_DENIED`.
