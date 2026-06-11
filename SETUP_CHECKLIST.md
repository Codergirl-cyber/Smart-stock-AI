# Authentication Setup Verification Checklist

Use this checklist to verify your authentication system is properly configured.

## ✅ Installation & Configuration

- [ ] Supabase project created at https://supabase.com
- [ ] `.env.local` file created with Supabase credentials
- [ ] Verified `VITE_SUPABASE_URL` is correct format (https://xxx.supabase.co)
- [ ] Verified `VITE_SUPABASE_ANON_KEY` is not empty
- [ ] Dev server restarted after adding `.env` variables
- [ ] No "missing VITE_SUPABASE_URL" warning in console

## ✅ Supabase Configuration

- [ ] Authentication providers enabled in Supabase dashboard
- [ ] Email/password provider enabled
- [ ] Google OAuth provider enabled
- [ ] Google OAuth Client ID added
- [ ] Google OAuth Client Secret added

## ✅ Database Setup

### Tables Created
- [ ] `user_profiles` table exists
- [ ] `orders` table exists
- [ ] `products` table exists
- [ ] All tables have `user_id` column as UUID
- [ ] All tables have `created_at` and `updated_at` timestamps

### RLS Policies Enabled
- [ ] Row Level Security enabled on all tables
- [ ] RLS policies for `SELECT` operations created
- [ ] RLS policies for `INSERT` operations created
- [ ] RLS policies for `UPDATE` operations created
- [ ] RLS policies for `DELETE` operations created
- [ ] All policies reference `auth.uid()` for user filtering

### Foreign Keys
- [ ] All tables have foreign key to `auth.users(id)`
- [ ] Foreign key has `ON DELETE CASCADE` option

## ✅ Authentication Features - Email/Password

**Test Sign Up:**
- [ ] Navigate to app at `http://localhost:5173`
- [ ] Click "Sign up" link
- [ ] Enter email and password (6+ chars)
- [ ] Click "Sign Up" button
- [ ] Success message appears
- [ ] Redirected to login page after 2 seconds

**Test Email Verification:**
- [ ] Check email for verification link (check spam folder)
- [ ] Click verification link
- [ ] Verify user is marked as verified in Supabase Auth

**Test Sign In:**
- [ ] Enter verified email and password
- [ ] Click "Sign In" button
- [ ] Redirected to dashboard
- [ ] Sidebar shows user email
- [ ] Page persists after refresh

**Test Session Persistence:**
- [ ] Sign in to app
- [ ] Refresh page (F5)
- [ ] Still logged in, no redirect to login
- [ ] Close browser tab and reopen
- [ ] Auto-logged in without signing in again

## ✅ Authentication Features - Google OAuth

**Google OAuth Setup:**
- [ ] Google Cloud project created
- [ ] OAuth 2.0 credentials created
- [ ] Client ID and Secret copied
- [ ] Added to Supabase Google provider settings
- [ ] Authorized redirect URI added: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- [ ] Authorized JavaScript origin added: `http://localhost:5173` (for local dev)

**Test Google Sign Up:**
- [ ] Navigate to login page
- [ ] Click "Continue with Google" button
- [ ] Redirected to Google login
- [ ] Sign in with Google account
- [ ] Redirected back to app
- [ ] Signed in to dashboard
- [ ] User can see "Sign Out" button

**Test Google Sign In:**
- [ ] Sign out first
- [ ] Click "Continue with Google"
- [ ] Sign in with same Google account
- [ ] Redirected to dashboard
- [ ] Correct email shown in sidebar

## ✅ Route Protection

**Test Auth Redirect:**
- [ ] Not logged in, accessing `/` shows login page
- [ ] After sign in, redirected to dashboard
- [ ] After sign out, redirected to login page

**Test Protected Routes:**
- [ ] Can access dashboard when logged in
- [ ] Can access all dashboard pages (orders, products, etc.)
- [ ] Cannot access dashboard pages when logged out

**Test Loading State:**
- [ ] Page shows loading spinner on initial load
- [ ] Loading resolves after 1-2 seconds
- [ ] UI appears after loading completes

## ✅ User Data & RLS

**Test User Data Isolation:**
- [ ] Sign up with email A
- [ ] Create some data (orders, products)
- [ ] Sign out
- [ ] Sign up with email B
- [ ] Create different data
- [ ] Sign in as email A
- [ ] Can only see email A's data
- [ ] Cannot see email B's data

**Test Database Operations:**
- [ ] In browser DevTools, open Console
- [ ] Run: `const { fetchUserData } = await import('./utils/db.js')`
- [ ] Run: `await fetchUserData('orders')`
- [ ] Returns only current user's orders

## ✅ Error Handling

**Test Error Messages:**
- [ ] Try signing up with invalid email format - error shown
- [ ] Try signing up with password < 6 chars - error shown
- [ ] Try signing in with wrong password - error shown
- [ ] Try signing in with non-existent email - error shown
- [ ] All error messages are helpful and specific

**Test Network Errors:**
- [ ] Simulate offline (DevTools → Network → Offline)
- [ ] Try to sign in - appropriate error message
- [ ] Go back online
- [ ] Can sign in again

## ✅ Security Checks

- [ ] Session tokens stored securely (in memory, not localStorage)
- [ ] Passwords not visible in network requests (only when sending)
- [ ] User ID automatically included in all DB queries
- [ ] User ID in URL params? ✅ **REMOVE** this is security risk
- [ ] RLS blocks users from accessing other users' data
- [ ] No API keys visible in browser DevTools

## ✅ Code Quality

**useAuth Hook:**
- [ ] Imported correctly in components
- [ ] Provides user, loading, error, isAuthenticated
- [ ] Provides signUp, signInWithPassword, signInWithGoogle, signOut

**AuthContext:**
- [ ] Wrapped around app in main.jsx
- [ ] Manages auth state correctly
- [ ] Listens for auth state changes
- [ ] Auto-refreshes tokens

**Database Utils:**
- [ ] fetchUserData auto-filters by user_id
- [ ] insertUserData auto-adds user_id
- [ ] updateUserData verifies ownership
- [ ] deleteUserData verifies ownership

## ✅ UI/UX

- [ ] Login page displays correctly on desktop and mobile
- [ ] Signup page displays correctly on desktop and mobile
- [ ] Form inputs have proper labels
- [ ] Error messages display in red
- [ ] Success messages display in green
- [ ] Loading states show spinner
- [ ] Buttons disable while loading
- [ ] Form validation works before submitting
- [ ] Password fields show as dots, not plain text

## ✅ Performance

- [ ] Auth check on page load completes < 2 seconds
- [ ] Sign in completes < 3 seconds
- [ ] Sign up completes < 3 seconds
- [ ] Data fetch completes < 2 seconds
- [ ] No console errors or warnings
- [ ] No repeated API calls for same data

## ✅ Production Readiness

- [ ] Environment variables not hardcoded
- [ ] Error messages user-friendly (no internal errors exposed)
- [ ] Loading states shown on all async operations
- [ ] RLS policies tested in Supabase dashboard
- [ ] Database backups configured in Supabase
- [ ] HTTPS enabled (required for OAuth in production)

## 🔍 Debugging Tips

If something isn't working:

1. **Check Console Errors**
   - Open DevTools (F12)
   - Look for red errors in Console tab
   - Check Network tab for failed requests

2. **Verify Supabase Connection**
   - Console should show: "Supabase connected successfully."
   - If not, check `.env.local` variables

3. **Check Auth State**
   - Open DevTools Console
   - Run: `const { supabase } = await import('./supabase.js')`
   - Run: `const { data } = await supabase.auth.getUser()`
   - Should return current user or null

4. **Check RLS Policies**
   - Go to Supabase dashboard
   - Go to Authentication → Policies
   - Verify policies exist for your tables
   - Test policy with direct SQL query

5. **Clear Session**
   - Open DevTools → Application
   - Clear cookies for localhost
   - Close all tabs
   - Reopen app - should be logged out

## ✅ Final Steps

- [ ] All items above checked
- [ ] App works in development
- [ ] Ready for production deployment
- [ ] Production Supabase project created
- [ ] Production environment variables configured
- [ ] Google OAuth redirect URL updated for production domain
- [ ] Database backups configured
- [ ] Monitoring/logging set up (optional)

## 📞 Still Having Issues?

1. Check [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) for detailed setup
2. Check [AUTH_README.md](./AUTH_README.md) for usage examples
3. Review [EXAMPLE_USAGE.jsx](./EXAMPLE_USAGE.jsx) for code samples
4. Check Supabase logs in dashboard for server-side errors
5. Check browser console for client-side errors

## 🎉 All Set!

If you've checked all items above, your authentication system is production-ready!
