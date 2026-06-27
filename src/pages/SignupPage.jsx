import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import '../styles/AuthPages.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, error: authError, clearError } = useAuth();
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

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const data = await signUp(formData.email, formData.password);

      if (data.session) {
        setSuccess('Account created! Taking you to your dashboard...');
        showToast('Account created successfully!', 'success');
        localStorage.setItem('userEmail', formData.email);
        navigate('/dashboard', { replace: true });
      } else {
        setSuccess('Account created! Check your email to confirm, then login.');
        showToast('Check your email to confirm your account.', 'info');
        setFormData({ email: '', password: '', confirmPassword: '' });
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setError('Too many attempts. Please wait a few minutes or use a different email.');
      } else if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        setError('This email is already registered. Login instead.');
      } else {
        setError(msg || 'Could not create account. Please try again.');
      }
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

          <button type="submit" className="auth-button primary" disabled={isSubmitting}>
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

