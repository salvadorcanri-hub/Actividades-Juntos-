# Security Specification — Actividades Juntos

## 1. Data Invariants
1. **Identity & Ownership (`ownerId`)**: Every document in `/users/{userId}`, `/users/{userId}/private/{docId}`, `/users/{userId}/groups/{groupId}`, `/users/{userId}/groups/{groupId}/tasks/{taskId}`, and `/users/{userId}/groups/{groupId}/resources/{resourceId}` MUST have `ownerId == request.auth.uid` and `userId == request.auth.uid`.
2. **Email Verification**: Every read and write operation requires `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation (Split Collection)**: Student email addresses are strictly isolated inside `/users/{userId}/private/{docId}` (`docId == 'info'`) and never stored on `/users/{userId}`. Access is restricted exclusively to the verified owner (`request.auth.uid == userId`).
4. **Master Gate Relational Integrity**: Subcollection documents (`tasks` and `resources`) cannot be created, read, updated, or deleted unless the parent group document `/users/$(userId)/groups/$(groupId)` exists and its `ownerId == request.auth.uid`, and `incoming().groupId == groupId`.
5. **Anti-Paseos State Invariant**: A task document in `/users/{userId}/groups/{groupId}/tasks/{taskId}` CANNOT be created or updated with `kanbanColumn == 'Terminado'` unless `evidenceUrl.size() > 0`.
6. **Terminal State Locking**: Once a task reaches `kanbanColumn == 'Terminado'`, it is locked against unauthorized state regression unless explicitly updated through the valid transition action with preserved immutable fields.
7. **Temporal & Immutable Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update (`incoming().createdAt == existing().createdAt`). `updatedAt` must equal `request.time` on every create and update. `ownerId` and `groupId` are strictly immutable on update.
8. **Strict Key Allowlisting & Volumetric Bounds**: All documents enforce `hasAll` + `hasOnly` in `isValid[Entity]`, regex ID validation (`^[a-zA-Z0-9_\-]+$`, max 128 chars), and explicit `.size()` bounds on every string field.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Identity Spoofing on User Profile)**: Authenticated user `uid_attacker` writes to `/users/uid_victim` with `ownerId: "uid_victim"`.
   ```json
   { "ownerId": "uid_victim", "displayName": "Hacker", "gradeCourse": "5to", "activeGroupId": "grp-1", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
2. **Payload 2 (Unverified Email Token Write)**: User with `email_verified: false` attempts to create `/users/uid_1`.
   ```json
   { "ownerId": "uid_1", "displayName": "Unverified", "gradeCourse": "5to", "activeGroupId": "grp-1", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
3. **Payload 3 (PII Leak in Public Profile / Shadow Field Injection)**: User injects `email` or `isAdmin: true` into `/users/uid_1`.
   ```json
   { "ownerId": "uid_1", "displayName": "Valeria", "gradeCourse": "5to", "activeGroupId": "grp-1", "isAdmin": true, "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
4. **Payload 4 (Cross-User PII Read on Split Collection)**: Authenticated user `uid_attacker` attempts `get` on `/users/uid_victim/private/info`.
   ```json
   { "operation": "get", "path": "/users/uid_victim/private/info" }
   ```
5. **Payload 5 (ID Poisoning Attack)**: User attempts to create `/users/uid_1/groups/invalid id with spaces!$%` with malicious characters.
   ```json
   { "ownerId": "uid_1", "name": "Proyecto EPT", "course": "EPT", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
6. **Payload 6 (Denial of Wallet / String Overflow)**: User attempts to create a task with a 5,000-character `title` exceeding `maxLength: 160`.
   ```json
   { "ownerId": "uid_1", "groupId": "grp-1", "title": "A... (5000 chars)", "assignee": "Valeria", "dueDate": "2026-11-20", "priority": "Alta", "kanbanColumn": "Por Hacer", "evidenceUrl": "", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
7. **Payload 7 (Anti-Paseos Bypass — State Shortcutting)**: User attempts to move or create a task in `kanbanColumn: "Terminado"` with an empty `evidenceUrl: ""`.
   ```json
   { "ownerId": "uid_1", "groupId": "grp-1", "title": "Maqueta", "assignee": "Valeria", "dueDate": "2026-11-20", "priority": "Alta", "kanbanColumn": "Terminado", "evidenceUrl": "", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
8. **Payload 8 (Orphaned Task Write Without Parent Group)**: User attempts to create `/users/uid_1/groups/non_existent_grp/tasks/tsk-1` when `/users/uid_1/groups/non_existent_grp` does not exist.
   ```json
   { "ownerId": "uid_1", "groupId": "non_existent_grp", "title": "Tarea Huérfana", "assignee": "Valeria", "dueDate": "2026-11-20", "priority": "Media", "kanbanColumn": "Por Hacer", "evidenceUrl": "", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "SERVER_TIMESTAMP" }
   ```
9. **Payload 9 (Immortal Field Mutation on Update)**: User attempts to mutate `ownerId` or `createdAt` during an `update` on `/users/uid_1/groups/grp-1`.
   ```json
   { "ownerId": "uid_other", "name": "Nuevo Nombre", "course": "EPT", "createdAt": "2020-01-01T00:00:00Z", "updatedAt": "SERVER_TIMESTAMP" }
   ```
10. **Payload 10 (Forged Client Timestamp)**: User supplies a past or future timestamp instead of `request.time` for `updatedAt`.
    ```json
    { "ownerId": "uid_1", "name": "Grupo", "course": "EPT", "createdAt": "SERVER_TIMESTAMP", "updatedAt": "2099-01-01T00:00:00Z" }
    ```
11. **Payload 11 (Value Poisoning on Update)**: User updates an allowed key (`priority`) with an invalid enum value `"Urgente"` or wrong type `123`.
    ```json
    { "priority": "Urgente", "updatedAt": "SERVER_TIMESTAMP" }
    ```
12. **Payload 12 (Unauthorized List Query Across Users)**: User `uid_attacker` executes a `list` query on `/users/uid_victim/groups` where `resource.data.ownerId != request.auth.uid`.
    ```json
    { "operation": "list", "path": "/users/uid_victim/groups" }
    ```
