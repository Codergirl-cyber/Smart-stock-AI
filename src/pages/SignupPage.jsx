import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import '../styles/AuthPages.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, error: authError, clearError } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
    clearError();
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await signUp(formData.email, formData.password);

      if (data.session) {
        setSuccess('Account created! Taking you to your dashboard...');
        showToast('Account created successfully!', 'success');
        localStorage.setItem('userEmail', formData.email);
        navigate('/dashboard', { replace: true });
      } else {
        setSuccess(
          'Account created! Check your email to confirm, then login.'
        );
        showToast('Check your email to confirm your account.', 'info');
        setFormData({ email: '', password: '', confirmPassword: '' });
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setError(
          'Too many attempts. Please wait a few minutes or use a different email.'
        );
      } else if (
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('registered')
      ) {
        setError('This email is already registered. Login instead.');
      } else {
        setError(msg || 'Could not create account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setSuccess('');
    clearError();
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
    } catch (err) {
      const message = err.message || 'Google sign-in failed. Please try again.';
      setError(message);
      showToast(message, 'error');
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
          <h1>Sign up</h1>
          <p>Create your SellerSync account to manage your Instagram shop</p>
        </div>

        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="success-alert"
            role="status"
          >
            <CheckCircle size={18} />
            <span>{success}</span>
          </motion.div>
        )}

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

        <form onSubmit={handleEmailSignup} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>
            <small className="form-hint">At least 6 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isSubmitting}
                autoComplete="new-password"
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
                Creating account...
              </>
            ) : (
              'Sign up'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          onClick={handleGoogleSignup}
          className="auth-button google"
          disabled={isSubmitting}
          type="button"
        >
          {isSubmitting ? (
            <>
              <Loader size={18} className="spinner" />
              Redirecting...
            </>
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Log in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
