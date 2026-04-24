/**
 * FIXES APPLIED:
 * - Fixed: Added email format validation using regex
 * - Fixed: Added PIN length validation (minimum 4 characters)
 * - Fixed: MFA form now properly disables backup_code when totp_code is entered
 * - Fixed: Error messages now clear when switching between form states
 * - Fixed: Added proper state management for form reset on back button
 * - Fixed: Improved input field validation for MFA codes
 * - Fixed: Added autocomplete attributes for better UX
 */

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import IconifyIcon from 'components/base/IconifyIcon';
import paths from 'routes/paths';
import { isAuthenticated, loginAsAdmin, verifyMFA, logout } from 'lib/auth';

interface LoginFormData {
  email: string;
  pin: string;
}

interface MFAFormData {
  totp_code: string;
  backup_code: string;
}

// BUG FIX: Email regex validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PIN_LENGTH = 4;

const Login = () => {
  const [formData, setFormData] = useState<LoginFormData>({ email: '', pin: '' });
  const [mfaData, setMFAData] = useState<MFAFormData>({ totp_code: '', backup_code: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaVerifying, setMFAVerifying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = (location.state as { from?: string } | undefined)?.from || paths.dashboard;

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMFAInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const { name, value } = e.target;
    
    // BUG FIX: Enforce numeric input for TOTP code
    if (name === 'totp_code') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setMFAData({ ...mfaData, [name]: numericValue });
    } else {
      setMFAData({ ...mfaData, [name]: value });
    }
  };

  // BUG FIX: Email format validation
  const isValidEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email.trim());
  };

  // BUG FIX: PIN length validation
  const isValidPin = (pin: string): boolean => {
    return pin.trim().length >= MIN_PIN_LENGTH;
  };

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // BUG FIX: Validate email format
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // BUG FIX: Validate PIN length
    if (!isValidPin(formData.pin)) {
      setError(`PIN must be at least ${MIN_PIN_LENGTH} characters long.`);
      return;
    }

    setLoading(true);
    setError('');

    const result = await loginAsAdmin(formData.email, formData.pin);

    if (!result.success && result.requiresMFA) {
      setRequiresMFA(true);
      // BUG FIX: Clear MFA data when starting MFA flow
      setMFAData({ totp_code: '', backup_code: '' });
      setLoading(false);
      return;
    }

    if (!result.success) {
      setError(result.error || 'Login failed. Please check your credentials.');
      setLoading(false);
      return;
    }

    // Successfully logged in without MFA
    setLoading(false);
    navigate(redirectTo, { replace: true });
  };

  const handleMFASubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMFAVerifying(true);
    setError('');

    // BUG FIX: Validate at least one code is provided
    const totp = mfaData.totp_code.trim();
    const backup = mfaData.backup_code.trim();

    if (!totp && !backup) {
      setError('Please enter either a TOTP code or backup code.');
      setMFAVerifying(false);
      return;
    }

    // BUG FIX: Validate TOTP is 6 digits if provided
    if (totp && totp.length !== 6) {
      setError('TOTP code must be exactly 6 digits.');
      setMFAVerifying(false);
      return;
    }

    const result = await verifyMFA(totp, backup);

    if (!result.success) {
      setError(result.error || 'MFA verification failed. Please try again.');
      setMFAVerifying(false);
      return;
    }

    setMFAVerifying(false);
    navigate(redirectTo, { replace: true });
  };

  const handleBackToLogin = () => {
    // BUG FIX: Properly clear all state when going back from MFA
    setRequiresMFA(false);
    setMFAData({ totp_code: '', backup_code: '' });
    setError('');
    setFormData({ ...formData, pin: '' });
    void logout();
  };

  if (requiresMFA) {
    return (
      <>
        <Typography align="center" variant="h3" fontWeight={600}>
          Verify Your Identity
        </Typography>
        <Typography align="center" variant="body2" color="text.secondary" mt={1}>
          Enter your authenticator code or a backup code to complete login.
        </Typography>
        <Stack onSubmit={handleMFASubmit} component="form" direction="column" gap={2} mt={4}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Enter 6-digit code from your authenticator app:
          </Typography>
          <TextField
            id="totp_code"
            name="totp_code"
            type="text"
            value={mfaData.totp_code}
            onChange={handleMFAInputChange}
            variant="filled"
            placeholder="000000"
            label="Authenticator Code"
            fullWidth
            autoFocus
            disabled={mfaVerifying}
            inputProps={{ maxLength: 6, pattern: '[0-9]*', inputMode: 'numeric' }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', my: 1 }}>
            OR
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a backup code:
          </Typography>
          <TextField
            id="backup_code"
            name="backup_code"
            type="text"
            value={mfaData.backup_code}
            onChange={handleMFAInputChange}
            variant="filled"
            placeholder="XXXX-XXXX-XXXX"
            label="Backup Code"
            fullWidth
            // BUG FIX: Properly disable backup code field when TOTP is entered
            disabled={!!mfaData.totp_code || mfaVerifying}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              type="submit"
              variant="contained"
              size="medium"
              fullWidth
              disabled={mfaVerifying}
              startIcon={mfaVerifying && <CircularProgress size={20} />}
            >
              {mfaVerifying ? 'Verifying...' : 'Verify'}
            </Button>
            <Button 
              variant="outlined" 
              size="medium" 
              onClick={handleBackToLogin}
              disabled={mfaVerifying}
            >
              Back
            </Button>
          </Box>
        </Stack>
      </>
    );
  }

  return (
    <>
      <Typography align="center" variant="h3" fontWeight={600}>
        Admin Sign In
      </Typography>
      <Typography align="center" variant="body2" color="text.secondary" mt={1}>
        Sign in with your email and PIN to access the admin dashboard.
      </Typography>
      <Stack onSubmit={handleLoginSubmit} component="form" direction="column" gap={2} mt={4}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Email Address"
          label="Email"
          autoComplete="email"
          fullWidth
          autoFocus
          required
          disabled={loading}
        />
        <TextField
          id="pin"
          name="pin"
          type={showPassword ? 'text' : 'password'}
          value={formData.pin}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Enter your PIN or password"
          label="PIN/Password"
          autoComplete="current-password"
          fullWidth
          required
          disabled={loading}
          inputProps={{ maxLength: 50 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ opacity: formData.pin ? 1 : 0 }}>
                <IconButton
                  aria-label="toggle PIN visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  disabled={loading}
                >
                  <IconifyIcon icon={showPassword ? 'ion:eye' : 'ion:eye-off'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Stack mt={-1.5} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Default: admin@system.local / admin
          </Typography>
        </Stack>
        <Button
          type="submit"
          variant="contained"
          size="medium"
          fullWidth
          disabled={loading || !isValidEmail(formData.email) || !isValidPin(formData.pin)}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </Stack>
    </>
  );
};

export default Login;
