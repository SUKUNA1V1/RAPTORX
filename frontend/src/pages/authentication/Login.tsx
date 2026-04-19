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
    setMFAData({ ...mfaData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await loginAsAdmin(formData.email, formData.pin);

    if (!result.success && result.requiresMFA) {
      setRequiresMFA(true);
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

    const code = mfaData.totp_code || mfaData.backup_code;
    if (!code) {
      setError('Please enter either a TOTP code or backup code.');
      setMFAVerifying(false);
      return;
    }

    const result = await verifyMFA(mfaData.totp_code, mfaData.backup_code);

    if (!result.success) {
      setError(result.error || 'MFA verification failed. Please try again.');
      setMFAVerifying(false);
      return;
    }

    setMFAVerifying(false);
    navigate(redirectTo, { replace: true });
  };

  const handleBackToLogin = () => {
    setRequiresMFA(false);
    setMFAData({ totp_code: '', backup_code: '' });
    setError('');
    setFormData({ ...formData, pin: '' });
    logout();
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
            inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
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
            disabled={!!mfaData.totp_code}
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
            <Button variant="outlined" size="medium" onClick={handleBackToLogin}>
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
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </Stack>
    </>
  );
};

export default Login;
