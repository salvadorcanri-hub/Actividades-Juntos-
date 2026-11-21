# Security Specification — Actividades Juntos (Multi-User Production)

## 1. Data Invariants
1. **Verified Identity Gate**: Every read/write requires `request.auth != null && request.auth.token.email_verified == true`.
2. **PII Isolation (Split Collection)**: Student email addresses live exclusively in `/users/{userId}/private/info` and are strictly readable/writable only by `request.auth.uid == userId`. Public profile metadata (`/users/{userId}`) contains zero PII and is restricted to the owner.
3. **Multi-User Group Membership (Master Gate)**:
   - Top-level `/groups/{groupId}` stores `creatorId` (immutable) and a strictly bounded `memberIds` list (`1 <= size <= 20`, always containing `creatorId`).
   - Only members in `memberIds` may read or list a group (`request.auth.uid in resource.data.memberIds`).
   - Non-members may join a group ONLY via an exact invite code lookup in `/groupInvites/{inviteCode}` (`allow list: if false` prevents scraping) and may ONLY append their own UID to `memberIds`.
4. **Creator-Exclusive Privileges (#3 & Disolver Grupo)**:
   - Only `creatorId == request.auth.uid` can delete (dissolve) a group (`/groups/{groupId}`), delete its invite code (`/groupInvites/{inviteCode}`), delete tasks, kick members, move `kanbanColumn`, set `coordinatorNote`, approve/reject evidence (`verificada`/`rechazada`), or assign `teacherRating`/`teacherComment`.
   - Regular members (`request.auth.uid in memberIds`) can create tasks, toggle subtasks, attach evidence, and edit task fields to correct mistakes (#4), while being blocked from self-approving evidence (`evidenceReviewStatus` cannot be set to `verificada`) or altering `kanbanColumn`, `coordinatorNote`, or `teacherRating`.
5. **Anti-Paseos & XSS URL Guard**:
   - No task may have `kanbanColumn == 'Terminado'` while `evidenceUrl == ''`.
   - Every non-empty `evidenceUrl` and resource `url` MUST match `^https?://[^\s]+$` (blocking `javascript:`, `data:`, `vbscript:`, `file:`).
6. **Temporal & Structural Integrity**:
   - Every string and array has explicit `.size()` bounds.
   - `createdAt == request.time` on create and is immutable on update; `updatedAt == request.time` on every write.
   - All document IDs match `^[a-zA-Z0-9_\-]+$` (1..128 chars).

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Identity Spoofing on Profile**: Attacker (`uid_attacker`) attempts to create `/users/uid_victim`.
2. **Unverified Email Token Write**: User with `email_verified: false` attempts to create `/users/uid_1`.
3. **Shadow Field / Privilege Escalation**: User injects `isAdmin: true` into `/users/uid_1`.
4. **Cross-User PII Read**: Attacker attempts `get` on `/users/uid_victim/private/info`.
5. **Non-Creator Group Dissolution**: Regular group member attempts `delete` on `/groups/grp-1` (must be strictly creator-only).
6. **Invite Code Scraping**: Authenticated user attempts `list` on `/groupInvites`.
7. **Unauthorized Group List**: Non-member (`uid_outsider`) attempts `list` on `/groups` where `uid_outsider` is not in `resource.data.memberIds`.
8. **Member Privilege Escalation (Status Move)**: Non-creator member attempts to change `kanbanColumn` from `'En Progreso'` to `'Terminado'` on `/groups/grp-1/tasks/tsk-1`.
9. **Member Self-Approval of Evidence**: Non-creator member attempts to set `evidenceReviewStatus: 'verificada'` on `/groups/grp-1/tasks/tsk-1`.
10. **Member Teacher Grade Forgery**: Non-creator member attempts to set `teacherRating: 20` on `/groups/grp-1/tasks/tsk-1`.
11. **Anti-Paseos Bypass**: Creator attempts to set `kanbanColumn: 'Terminado'` with `evidenceUrl: ''`.
12. **Creator Removal Attempt**: Attacker/creator attempts to update `/groups/grp-1` removing `creatorId` from `memberIds`.
13. **XSS Protocol Injection (`javascript:`)**: Member attempts to create a task with `evidenceUrl: 'javascript:alert(1)'`.
14. **ID Poisoning & String Overflow**: User attempts to write to `/groups/bad id!$%` or with a 5000-character task title.
15. **Forged Client Timestamp**: User attempts to create `/groups/grp-1` with `updatedAt != request.time`.
