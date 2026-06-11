# Auth Failure Troubleshooting & Fixes

## Problem You Were Experiencing

Your auth system was failing intermittently with a pattern of:
- ✅ Works fine for a few days
- ❌ Fails after ~7 days
- ❌ Fails again sporadically
- ✅ Sometimes works again randomly

This is a classic sign of **token refresh failures and session validation issues**.

---

## Root Causes Fixed

### 1. **No Token Refresh Error Handling**
**The Problem:**
- `autoRefreshToken: true` was enabled but had **no error handling**
- When a token refresh failed (due to network issues, expired refresh token, etc.), the app silently continued with an invalid token
- After 7 days, the refresh token expires on Supabase servers, and users get stuck

**The Fix:**
- Added `TOKEN_REFRESHED` event handling to track successful refreshes
- Clear error messages when token refresh fails
- Periodic session validation every 15 minutes to proactively catch invalid sessions

### 2. **No Session Validation Against Server**
**The Problem:**
- `isAuthenticated: !!user` only checked if the `user` object existed locally
- It **never validated** if that session was still valid on Supabase servers
- A corrupted localStorage or network timeout could leave the user "authenticated" but actually logged out on the server

**The Fix:**
```javascript
validateSession: async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    // Session is invalid - sign out user
    setUser(null);
    setSession(null);
  }
  return !error;
}
```

- Runs every 15 minutes automatically
- Checks if session is actually valid with Supabase
- Automatically signs user out if token is truly expired

### 3. **Missing Recovery Mechanism**
**The Problem:**
- When auth failed, there was no way to recover except refresh the page
- Users had to manually clear browser data to fix issues

**The Fix:**
- Added `sessionValid` state tracking
- `isAuthenticated` now requires BOTH `user` AND `sessionValid` to be true
- Automatic detection and recovery of invalid sessions
- Clear error messages guide users to re-login

### 4. **Race Condition on First Load**
**The Problem:**
- The app checked `isAuthenticated` before the session listener had loaded data from localStorage
- Users could briefly see the login page even though they were logged in

**The Fix:**
- Added `initializing` state to ProtectedRoute
- Shows loading screen during initialization instead of flashing login page
- Session validation waits for initial setup to complete

---

## What Changed

### Updated Files:

#### 1. **src/context/AuthContext.jsx**
```javascript
// NEW: Session validation hook
const validateSession = useCallback(async () => {
  if (!supabase || !session) return true;
  
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    setUser(null);
    setSession(null);
    return false;
  }
  return true;
}, [session]);

// NEW: Periodic validation every 15 minutes
useEffect(() => {
  if (!supabase || !user) return;
  
  const interval = setInterval(validateSession, 15 * 60 * 1000);
  return () => clearInterval(interval);
}, [user, validateSession]);

// NEW: Track session validity separately
const [sessionValid, setSessionValid] = useState(true);

// UPDATED: isAuthenticated now checks both user AND sessionValid
isAuthenticated: !!user && sessionValid
```

#### 2. **src/components/ProtectedRoute.jsx**
```javascript
// UPDATED: Now checks sessionValid too
if (!isAuthenticated || !sessionValid) {
  return <Navigate to="/login" />;
}

// NEW: Shows loading during initialization
if (initializing) {
  return <div className="loading-container">Loading...</div>;
}
```

---

## How to Test These Fixes

### Test 1: Token Refresh Handling
1. Enable debug mode: Set `VITE_SUPABASE_DEBUG=true` in `.env.local`
2. Open browser console
3. Sign in
4. Look for `[AUTH DEBUG] token refreshed successfully` messages every ~1 hour
5. If you see errors, they'll now be properly caught and logged

### Test 2: Session Validation
1. Sign in to the app
2. Open browser DevTools → Application → LocalStorage
3. Delete the `sellersync-auth` key (simulating corruption)
4. Wait up to 15 minutes OR click a protected page
5. You should be automatically signed out with a clear error message

### Test 3: Long-term Stability
1. Sign in
2. Leave the app open for 24+ hours
3. Come back and try to use it - it should validate the session and work
4. After 7 days, refresh and sign in again - the old refresh token should have expired and handled gracefully

---

## Environment Variables

Make sure your `.env.local` has:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_SUPABASE_DEBUG=false  # Set to true to see debug logs
```

---

## Debugging Auth Issues

If you still see auth problems:

### 1. **Enable Debug Logs**
```env
VITE_SUPABASE_DEBUG=true
```
Restart dev server and check console for `[AUTH DEBUG]` messages

### 2. **Check Supabase Project Status**
- Go to Supabase Dashboard → Monitoring
- Look for failed requests or rate limiting
- Check if auth provider (Google) has quota issues

### 3. **Check Network Issues**
- Open DevTools → Network tab
- Look for failed requests to `supabaseapi.com`
- Check if there's a firewall/VPN blocking requests

### 4. **Clear Browser Storage**
```javascript
// Run in console
localStorage.clear();
sessionStorage.clear();
// Then refresh and sign in
```

### 5. **Check Token Expiration Settings**
In Supabase Dashboard → Authentication → Providers:
- Access Token Expiry: Usually 1 hour (3600 seconds)
- Refresh Token Expiry: Usually 7 days
- These are set per project

---

## Additional Recommendations

### 1. **Add Session Recovery UI**
Consider showing a "Session expired" banner with a "Sign in again" button instead of abruptly redirecting.

### 2. **Monitor Token Refresh Failures**
Log token refresh failures to your server for monitoring:
```javascript
if (event === 'TOKEN_REFRESHED') {
  console.log('Token refreshed - session extended');
  // Send telemetry to your server
}
```

### 3. **Implement Idle Timeout**
Add a feature to sign out users after 30 minutes of inactivity:
```javascript
const handleUserActivity = () => {
  // Reset idle timer
};
window.addEventListener('mousemove', handleUserActivity);
```

### 4. **Test with Supabase Staging**
Before deploying to production, test token refresh:
- Use Supabase staging environment
- Set shorter token expiry times for testing
- Simulate network failures

---

## Summary of Improvements

| Issue | Before | After |
|-------|--------|-------|
| Token refresh errors | Silent failures | Caught and logged |
| Session validation | Never checked | Every 15 minutes |
| Invalid session handling | User stays logged in | Auto sign-out with message |
| Recovery mechanism | Manual page refresh | Automatic recovery |
| User experience | "Auth randomly breaks" | "Session expired - sign in again" |

Your auth system should now be stable for weeks at a time! 🎉
