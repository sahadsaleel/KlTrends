# Prompt: Fix Attendance Timezone and Late Check-In Issues

You are working on my existing **Employee Hub / KLTrends** React Native + Expo mobile app and TypeScript/Node/Express/MySQL backend.

I need you to fix the attendance **timezone and late check-in logic** without breaking existing functionality or existing attendance data.

## Main Problems

### 1. Attendance times are showing UTC instead of IST

The production backend is deployed on Railway, whose Linux environment uses UTC.

India uses:

- IST = UTC + 05:30
- 10:00 AM IST = 04:30 AM UTC
- 05:30 PM IST = 12:00 PM UTC

Some backend code currently uses:

```ts
new Date(attendance.checkInTime).toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit'
})
```

Because no timezone is explicitly provided, the Railway server can format the time using UTC.

The mobile app also uses `toLocaleTimeString()` without explicitly forcing `Asia/Kolkata`, so the displayed time can depend on the employee's device/emulator timezone.

### 2. Check-in at exactly 10:00 AM is being treated as late

The current logic effectively treats:

```text
10:00:00 AM -> On time
10:00:01 AM -> Late
10:01:00 AM -> Late
```

This is too strict.

The required attendance rule is:

```text
Shift start: 10:00 AM IST
Grace period: 15 minutes

Up to and including 10:15 AM -> ON TIME
After 10:15 AM              -> LATE
```

A late reason should only be required after 10:15 AM IST.

---

# Required Fixes

## 1. Backend timezone

Inspect the existing backend before making changes.

In `server.ts`, configure Node to use IST:

```ts
process.env.TZ = 'Asia/Kolkata';
```

Place this early enough that date/time operations use the intended timezone.

However, do not rely only on this setting. Important attendance formatting must explicitly use:

```text
Asia/Kolkata
```

so it remains reliable.

---

## 2. MySQL timezone

Inspect `db.ts` and the existing MySQL connection pool configuration.

Configure the MySQL connection timezone appropriately for IST, using:

```ts
timezone: '+05:30'
```

Do not blindly change database column types or existing stored attendance records.

Preserve all existing attendance data.

---

## 3. Create/reuse centralized backend time utilities

Inspect the existing `timeUtils.ts`.

If it already exists, improve it instead of creating a duplicate.

Create/reuse centralized functions for:

- Getting IST date/time components
- Formatting attendance times in IST
- Determining whether a check-in is late

For example, the late-check-in rule should behave like:

```ts
export const isLateCheckInIST = (date: Date = new Date()): boolean => {
  const { hours, minutes } = getISTDateTime(date);

  return hours > 10 || (hours === 10 && minutes > 15);
};
```

Make sure the implementation handles the boundary correctly:

```text
10:14:59 -> On time
10:15:00 -> On time
10:15:59 -> Late
10:16:00 -> Late
```

Do not use seconds as a reason to mark 10:00 AM immediately late.

---

## 4. Backend attendance formatting

Search the entire backend for attendance-related date/time formatting.

Especially inspect:

- `adminController.ts`
- attendance controllers/services
- reports
- attendance API responses
- any other code displaying `checkInTime` or `checkOutTime`

Replace server-dependent code such as:

```ts
toLocaleTimeString([], ...)
```

with a centralized IST formatter.

Example:

```ts
export const formatISTTimeString = (date: Date) => {
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
```

Use the existing project structure and utilities where appropriate rather than unnecessarily duplicating functions.

---

# 5. Mobile app timezone handling

Inspect the React Native attendance implementation, especially:

```text
AttendanceScreen.tsx
```

Search the entire mobile app for attendance-related uses of:

```ts
new Date()
toLocaleTimeString()
toLocaleDateString()
setHours()
getHours()
getMinutes()
```

where timezone-dependent behavior could affect attendance.

Create/reuse a mobile `timeUtils.ts` utility.

The mobile app must explicitly use:

```text
Asia/Kolkata
```

for:

- Digital attendance clock
- Check-in time display
- Check-out time display
- Attendance history
- Any attendance date/time display
- Late-check-in validation
- Any attendance-related time comparison

The app must not depend on the employee's phone/emulator timezone.

---

# 6. Fix the mobile late-check-in modal

Find the existing logic similar to:

```ts
const now = new Date();

const shiftStart = new Date(now);
shiftStart.setHours(10, 0, 0, 0);

if (now > shiftStart) {
  setLateCheckInReason('');
  setLateCheckInModalVisible(true);
  return;
}
```

Do not keep this device-local-time comparison.

Update it so the mobile app follows the same IST rule:

```text
Before/equal to 10:15 AM IST -> normal check-in
After 10:15 AM IST            -> ask for late reason
```

The user must not see:

> Late Check-In: Reason for late check-in

when checking in at:

```text
10:00 AM
10:01 AM
10:05 AM
10:10 AM
10:15 AM
```

---

# 7. Backend must be the final authority

Do not rely entirely on the mobile device to determine whether someone is late.

The backend should independently determine the current IST time and validate whether the check-in is late.

The intended flow is:

```text
Employee taps Check-In
        ↓
Mobile sends request
        ↓
Backend gets current server time
        ↓
Backend evaluates current IST time
        ↓
Is time <= 10:15 AM?
       /       \
     YES        NO
      ↓          ↓
  ON TIME     LATE
                 ↓
          Require reason
```

This prevents employees from changing their device timezone/clock to bypass attendance rules.

If the existing API already has a late-reason mechanism, preserve it and only correct its time logic.

---

# 8. Check-in and check-out display

Make sure both:

```text
Check-in time
Check-out time
```

are displayed in IST.

Examples:

```text
Actual attendance time: 10:00 AM IST
Displayed:              10:00 AM

Actual attendance time: 05:30 PM IST
Displayed:              05:30 PM
```

Never display:

```text
04:30 AM
12:00 PM
```

when those values represent 10:00 AM and 5:30 PM IST respectively.

---

# 9. Do not double-convert timestamps

This is extremely important.

Do NOT solve the problem by randomly adding 5 hours 30 minutes:

```ts
date.getTime() + 5.5 * 60 * 60 * 1000
```

throughout the application.

That can cause double conversion.

Use a consistent date strategy and explicitly format timestamps with:

```text
Asia/Kolkata
```

when displaying or validating IST-based attendance rules.

Before changing timestamp handling, inspect the existing MySQL column types and how timestamps are inserted/retrieved.

---

# 10. Preserve existing functionality

Do NOT:

- Delete attendance records
- Reset the database
- Change unrelated employee functionality
- Change authentication
- Change admin functionality unnecessarily
- Remove existing attendance features
- Change API contracts unnecessarily
- Break existing reports
- Break existing check-out logic
- Change the shift to another time

The existing shift remains:

```text
10:00 AM - 05:30 PM IST
```

Only fix timezone handling and the late-check-in grace period.

---

# 11. Search before editing

Before modifying files:

1. Inspect the existing backend time utilities.
2. Inspect `server.ts`.
3. Inspect `db.ts`.
4. Inspect attendance controllers.
5. Inspect `adminController.ts`.
6. Inspect `AttendanceScreen.tsx`.
7. Search the entire project for `toLocaleTimeString`, `toLocaleDateString`, `setHours`, `getHours`, `getMinutes`, `checkInTime`, and `checkOutTime`.
8. Identify every attendance-related place where timezone conversion can occur.

Then make the smallest safe changes necessary.

Do not create duplicate utilities if an existing utility can be extended.

---

# 12. Test these exact cases

After implementing the changes, verify the following.

## Time formatting

```text
10:00 AM IST -> 10:00 AM
05:30 PM IST -> 05:30 PM
```

## Late check-in

```text
09:30 AM -> ON TIME
09:59 AM -> ON TIME
10:00 AM -> ON TIME
10:00:01 AM -> ON TIME
10:05 AM -> ON TIME
10:14 AM -> ON TIME
10:15 AM -> ON TIME
10:15:01 AM -> LATE
10:16 AM -> LATE
10:30 AM -> LATE
11:00 AM -> LATE
```

If the application intentionally prevents check-in before 9:00 AM, preserve that existing behavior rather than changing it.

---

# 13. Build and validation

After the changes:

### Backend

Run the project's existing commands, such as:

```bash
npm run build
npm run lint
```

If appropriate, also test the health endpoint and attendance API.

### Mobile

Run the appropriate Expo/TypeScript validation and make sure the application builds successfully.

Check that:

- Employee can check in normally at 10:00 AM.
- No late modal appears before or at 10:15 AM.
- Late modal appears after 10:15 AM.
- Late reason is still required for genuinely late check-ins.
- Check-in time displays in IST.
- Check-out time displays in IST.
- Admin attendance screens display IST.
- Existing attendance data remains intact.

---

# Final Response Required

After completing the implementation, report:

1. Files changed
2. What was changed in each file
3. How the IST conversion is now handled
4. How the 15-minute grace period works
5. Whether backend and mobile use the same rule
6. Build/lint/test results
7. Any remaining concerns or edge cases

Do not make unrelated changes.
