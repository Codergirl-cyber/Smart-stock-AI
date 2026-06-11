# Supabase Authentication Setup Guide

## Overview
This is a production-ready authentication system for your React app with Supabase. It includes:
- Email/password authentication
- Google OAuth login
- Session persistence
- Protected routes
- Automatic redirects
- Reusable hooks and utilities

## 1. Environment Setup

### Create `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Get these values from:**
- Go to your Supabase dashboard
- Click on "Settings" → "API"
- Copy the "Project URL" and "anon/public" key

## 2. Database Setup (RLS Policies)

### Create Tables

Create the following table in Supabase (SQL Editor):

```sql
-- Users profile table (optional, but recommended)
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT auth.uid(),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Example: Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Example: Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

### Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for orders
CREATE POLICY "Users can read own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for products
CREATE POLICY "Users can read own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);
```

## 3. Google OAuth Setup

### In Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Find **Google** and click to enable
3. Redirect URL will be auto-filled: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`

### In Google Cloud Console:

1. Create a new project
2. Go to **APIs & Services** → **Credentials**
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URIs:
   - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - `http://localhost:5173/` (for local development)
5. Copy the Client ID and Secret
6. Paste them in Supabase → Authentication → Providers → Google

## 4. Using the Authentication System

### Basic Usage - useAuth Hook

```jsx
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, loading, error, isAuthenticated } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <div>Please login first</div>;
  }

  return (
    <div>
      <p>Welcome, {user.email}</p>
    </div>
  );
}
```

### Sign Up with Email

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
      console.log('User signed up successfully');
    } catch (err) {
      console.error('Signup failed:', err.message);
    }
  };

  return (
    <form onSubmit={handleSignUp}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

### Sign In with Email

```jsx
const { signInWithPassword } = useAuth();

const handleLogin = async (email, password) => {
  try {
    await signInWithPassword(email, password);
    // User is logged in
  } catch (err) {
    console.error('Login failed:', err.message);
  }
};
```

### Sign In with Google

```jsx
const { signInWithGoogle } = useAuth();

const handleGoogleLogin = async () => {
  try {
    await signInWithGoogle();
    // Google OAuth redirect happens
  } catch (err) {
    console.error('Google login failed:', err.message);
  }
};
```

### Sign Out

```jsx
const { signOut } = useAuth();

const handleLogout = async () => {
  try {
    await signOut();
    // User is logged out, redirect to login
  } catch (err) {
    console.error('Logout failed:', err.message);
  }
};
```

## 5. Database Operations with User Isolation

### Fetch User Data (Auto-filters by user_id)

```jsx
import { fetchUserData } from './utils/db';

// In your component
const loadOrders = async () => {
  try {
    const orders = await fetchUserData('orders', {
      order: { column: 'created_at', ascending: false },
      limit: 10,
    });
    console.log('User orders:', orders);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
  }
};
```

### Insert User Data (Auto-includes user_id)

```jsx
import { insertUserData } from './utils/db';

const createOrder = async (productName, quantity) => {
  try {
    const order = await insertUserData('orders', {
      product_name: productName,
      quantity: quantity,
      total_amount: quantity * 100,
    });
    console.log('Order created:', order);
  } catch (err) {
    console.error('Error creating order:', err.message);
  }
};
```

### Update User Data (Auto-verifies ownership)

```jsx
import { updateUserData } from './utils/db';

const updateOrder = async (orderId, newStatus) => {
  try {
    const updated = await updateUserData('orders', orderId, {
      status: newStatus,
    });
    console.log('Order updated:', updated);
  } catch (err) {
    console.error('Error updating order:', err.message);
  }
};
```

### Delete User Data (Auto-verifies ownership)

```jsx
import { deleteUserData } from './utils/db';

const deleteOrder = async (orderId) => {
  try {
    await deleteUserData('orders', orderId);
    console.log('Order deleted');
  } catch (err) {
    console.error('Error deleting order:', err.message);
  }
};
```

## 6. Protected Routes

The app automatically handles route protection:

- **Not authenticated**: Shown login/signup pages
- **Authenticated**: Shown dashboard pages
- **Auto-redirect**: Happens on login/logout

No need to add manual checks - it's handled in `App.jsx`

## 7. Security Checklist

- ✅ RLS enabled on all tables
- ✅ User ID automatically included in queries
- ✅ Ownership verified before updates/deletes
- ✅ Session persists on refresh
- ✅ OAuth tokens auto-refresh
- ✅ CORS handled by Supabase

## 8. File Structure

```
src/
├── context/
│   └── AuthContext.jsx           # Auth state & providers
├── hooks/
│   └── useAuth.js                # useAuth hook
├── pages/
│   ├── LoginPage.jsx             # Login page
│   └── SignupPage.jsx            # Signup page
├── components/
│   └── ProtectedRoute.jsx        # Route protection wrapper
├── utils/
│   └── db.js                     # Database helpers with RLS
├── styles/
│   └── AuthPages.css             # Auth UI styles
├── supabase.js                   # Supabase client setup
└── App.jsx                       # Main app with auth routing
```

## 9. Troubleshooting

### "User not authenticated" Error
- Check if token is expired in browser DevTools → Storage → Cookies
- Restart dev server: `npm run dev`
- Sign out and sign back in

### Google OAuth Not Working
- Verify redirect URL matches in Google Console and Supabase
- Check Client ID/Secret in Supabase dashboard
- Ensure cookies are not blocked

### RLS Errors
- Check if RLS policies are enabled
- Verify `user_id` column exists in tables
- Test policy with direct SQL query in Supabase editor

### Session Not Persisting
- Check `.env.local` has correct Supabase credentials
- Verify cookies are enabled in browser
- Check browser console for CORS errors

## 10. Deployment Checklist

- [ ] Add production Supabase credentials to `.env.local`
- [ ] Update Google OAuth redirect URL for production domain
- [ ] Test all auth flows in production environment
- [ ] Enable HTTPS (required for OAuth)
- [ ] Monitor Supabase logs for errors
- [ ] Set up Supabase backups
- [ ] Test RLS policies with production data

## Need Help?

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [OAuth Setup Guide](https://supabase.com/docs/guides/auth/social-login)
