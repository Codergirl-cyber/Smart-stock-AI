# Complete Supabase Authentication System

A production-ready authentication system for React built with Supabase. Includes email/password authentication, Google OAuth, session persistence, and automatic route protection.

## 🎯 Features

✅ **Email/Password Authentication**
- Sign up with email and password
- Email verification
- Secure password hashing (handled by Supabase)

✅ **Google OAuth Login**
- "Continue with Google" button
- Automatic account creation
- Session persistence

✅ **Session Management**
- Auto login on page refresh
- Token auto-refresh
- Secure logout

✅ **Route Protection**
- Automatic redirects based on auth state
- Protected dashboard routes
- Loading states

✅ **User-Specific Data**
- Row-Level Security (RLS) built-in
- Automatic user_id filtering
- Ownership verification on updates/deletes

✅ **Clean UI**
- Beautiful, responsive login/signup pages
- Loading spinners
- Error and success messages
- Mobile-friendly design

## 🚀 Quick Start

### 1. Copy `.env.local` file

```bash
cp .env.local.example .env.local
```

Then add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Set up Supabase

See [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) for detailed setup instructions including:
- Supabase configuration
- Database table creation
- RLS policy setup
- Google OAuth configuration

### 3. Start dev server

```bash
npm run dev
```

The app will:
- Show login/signup if not authenticated
- Show dashboard if authenticated
- Auto-redirect based on auth state
- Persist session on refresh

## 📁 File Structure

```
src/
├── context/
│   └── AuthContext.jsx              # Auth state provider
├── hooks/
│   └── useAuth.js                   # Main auth hook
├── pages/
│   ├── LoginPage.jsx                # Login page
│   └── SignupPage.jsx               # Signup page
├── components/
│   └── ProtectedRoute.jsx           # Route protection
├── utils/
│   └── db.js                        # DB utilities with RLS
├── styles/
│   └── AuthPages.css                # Auth UI styles
└── supabase.js                      # Supabase client
```

## 🔑 Core Components

### `useAuth` Hook

Main hook for accessing auth state and functions:

```jsx
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const {
    user,                  // Current user object
    loading,               // Auth loading state
    error,                 // Auth error
    isAuthenticated,       // Boolean
    signUp,                // (email, password) => Promise
    signInWithPassword,    // (email, password) => Promise
    signInWithGoogle,      // () => Promise
    signOut,               // () => Promise
  } = useAuth();

  // Your component code
}
```

### `AuthContext`

Provides authentication state to entire app. Already wrapped in `main.jsx`:

```jsx
<AuthProvider>
  <App />
</AuthProvider>
```

### Database Utilities

Automatic user_id filtering and ownership verification:

```jsx
import {
  fetchUserData,      // Get user's data
  insertUserData,     // Create new record
  updateUserData,     // Update (ownership verified)
  deleteUserData,     // Delete (ownership verified)
  getCurrentUser,     // Get current user object
} from './utils/db';

// Fetch orders (auto-filters by user_id)
const orders = await fetchUserData('orders', {
  order: { column: 'created_at', ascending: false },
  limit: 10,
});

// Create order (auto-adds user_id)
const newOrder = await insertUserData('orders', {
  product_name: 'Widget',
  quantity: 5,
});

// Update order (auto-checks ownership)
await updateUserData('orders', orderId, {
  status: 'completed',
});

// Delete order (auto-checks ownership)
await deleteUserData('orders', orderId);
```

## 🔐 Security

- ✅ RLS policies enabled on all tables
- ✅ User ID automatically included in all queries
- ✅ Ownership verified before updates/deletes
- ✅ Secure token storage
- ✅ CORS handled by Supabase
- ✅ Password hashing handled by Supabase

## 📱 Usage Examples

### Sign Up

```jsx
import { useAuth } from './hooks/useAuth';

function SignUpForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      await signUp(email, password);
      // User created, check email for verification
    } catch (err) {
      console.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSignUp}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

### Sign In

```jsx
const { signInWithPassword } = useAuth();

const handleLogin = async (email, password) => {
  try {
    await signInWithPassword(email, password);
    // Automatically redirected to dashboard
  } catch (err) {
    console.error(err.message);
  }
};
```

### Google Login

```jsx
const { signInWithGoogle } = useAuth();

const handleGoogleLogin = async () => {
  try {
    await signInWithGoogle();
    // Redirected to Google OAuth, then back to app
  } catch (err) {
    console.error(err.message);
  }
};
```

### Sign Out

```jsx
const { signOut } = useAuth();

const handleLogout = async () => {
  try {
    await signOut();
    // Automatically redirected to login
  } catch (err) {
    console.error(err.message);
  }
};
```

### Fetch User Data

```jsx
import { useEffect, useState } from 'react';
import { fetchUserData } from './utils/db';

function OrdersList() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const userOrders = await fetchUserData('orders', {
        order: { column: 'created_at', ascending: false },
      });
      setOrders(userOrders);
    } catch (err) {
      console.error('Error:', err.message);
    }
  };

  return (
    <div>
      {orders.map((order) => (
        <div key={order.id}>{order.product_name}</div>
      ))}
    </div>
  );
}
```

## 🎨 Styling

Authentication pages use CSS variables for theming. Customize in your `index.css`:

```css
:root {
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --card-bg: #ffffff;
  --border-color: #e5e7eb;
}
```

## 🛠️ Configuration

### Supabase Client Options (supabase.js)

```javascript
const supabase = createClient(url, key, {
  auth: {
    persistSession: true,        // Keep user logged in
    autoRefreshToken: true,      // Auto-refresh tokens
    detectSessionInUrl: true,    // Detect OAuth redirect
  },
});
```

### OAuth Redirect URL

After signing in with Google, user is redirected to:
```
${window.location.origin}
```

Update in `src/context/AuthContext.jsx` if needed:

```javascript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/dashboard`, // Custom redirect
  },
});
```

## ❌ Common Issues & Solutions

### "User not authenticated" Error
- Check `.env.local` has correct Supabase credentials
- Sign out and sign back in
- Clear browser cookies and cache

### Google OAuth Not Working
- Verify Client ID/Secret in Supabase dashboard
- Check redirect URL matches in Google Cloud Console
- Ensure `localhost:5173` is in Google allowed URIs (for dev)

### RLS Policy Errors
- Check if RLS policies are enabled in Supabase
- Verify tables have `user_id` column
- Test policy with direct SQL in Supabase editor

### Session Not Persisting
- Check browser cookies are enabled
- Verify `persistSession: true` in supabase.js
- Check for CORS errors in browser console

## 📚 Documentation Files

- **[AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md)** - Detailed setup guide, database schema, RLS policies
- **[EXAMPLE_USAGE.jsx](./EXAMPLE_USAGE.jsx)** - Code examples for common tasks

## 🚀 Deployment

### Environment Variables

Set in your hosting platform (Vercel, Netlify, etc.):

```env
VITE_SUPABASE_URL=your_production_url
VITE_SUPABASE_ANON_KEY=your_production_key
```

### Google OAuth

Update redirect URL in Google Cloud Console:
```
https://yourdomain.com
```

### HTTPS Required

OAuth requires HTTPS. Enable on your hosting platform.

## 📖 API Reference

### useAuth Hook

```jsx
const {
  user: User | null,                    // Current user
  loading: boolean,                     // Loading state
  error: string | null,                 // Error message
  isAuthenticated: boolean,             // Auth status
  signUp: (email, password) => Promise, // Sign up
  signInWithPassword: (email, password) => Promise,  // Sign in
  signInWithGoogle: () => Promise,      // Google login
  signOut: () => Promise,               // Sign out
} = useAuth();
```

### fetchUserData Options

```jsx
await fetchUserData(table, {
  select: '*',              // Columns to fetch (default: all)
  filters: { status: 'active' },  // Additional WHERE filters
  order: {                  // Sort by column
    column: 'created_at',
    ascending: false,       // Default: false
  },
  limit: 10,               // Max rows to fetch
});
```

## 📞 Support

- [Supabase Documentation](https://supabase.com/docs)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 📝 License

Built with ❤️ for production-ready React apps
