import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Loader } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import '../styles/AuthPages.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/dashboard';

  const { signInWithPassword, error: authError, clearError } = useAuth();
<<<<<<< HEAD

=======
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
  const { showToast } = useToast();
  const [email, setEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    clearError();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      localStorage.setItem('userEmail', email);
      await signInWithPassword(email, password);
      showToast('Welcome back!', 'success');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err.message || 'Login failed. Please check your email and password.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = error || authError;


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="auth-container"
    >
      <div className="auth-box">
        <div className="auth-header">
          <h1>Log in</h1>
          <p>Welcome back — sign in to your SellerSync account</p>
        </div>

        {displayError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="error-alert"
            role="alert"
          >
            <AlertCircle size={18} />
            <span>{displayError}</span>
          </motion.div>
        )}

        <form onSubmit={handleEmailLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                  clearError();
                }}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="auth-link" style={{ fontSize: '13px' }}>
                Forgot password?
              </Link>
            </div>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                  clearError();
                }}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-button primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader size={18} className="spinner" />
                Logging in...
              </>
            ) : (
              'Log in'
            )}
          </button>
        </form>

<<<<<<< HEAD


=======
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="auth-link">
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
