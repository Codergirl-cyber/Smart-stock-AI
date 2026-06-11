import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import '../styles/AuthPages.css';

export default function ForgotPasswordPage() {
  const { resetPassword, error: authError, clearError } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    clearError();

    if (!email) {
      setError('Enter the email you used to sign up.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(email);
      setSuccess('Check your inbox for a password reset link.');
      showToast('Password reset email sent.', 'success');
    } catch (err) {
      const message = err.message || 'Could not send reset email. Try again.';
      setError(message);
      showToast(message, 'error');
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
          <h1>Reset password</h1>
          <p>We will email you a link to set a new password</p>
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

        <form onSubmit={handleSubmit} className="auth-form">
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

          <button type="submit" className="auth-button primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader size={18} className="spinner" />
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password?{' '}
          <Link to="/login" className="auth-link">
            Back to login
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
