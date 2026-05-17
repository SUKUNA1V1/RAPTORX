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
        <Typography 
          align="center" 
          variant="h3" 
          fontWeight={800}
          sx={{
            background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}
        >
          Verify Your Identity
        </Typography>
        <Typography align="center" variant="body2" color="rgba(255,255,255,0.6)" mb={4}>
          Enter your authenticator code or a backup code to complete login.
        </Typography>
        <Stack onSubmit={handleMFASubmit} component="form" direction="column" gap={2.5}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                bgcolor: 'rgba(239, 68, 68, 0.1)', 
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 2
              }}
            >
              {error}
            </Alert>
          )}
          <Typography variant="body2" color="rgba(255,255,255,0.6)">
            Enter 6-digit code from your authenticator app:
          </Typography>
          <TextField
            id="totp_code"
            name="totp_code"
            type="text"
            value={mfaData.totp_code}
            onChange={handleMFAInputChange}
            variant="outlined"
            placeholder="000000"
            label="Authenticator Code"
            fullWidth
            autoFocus
            inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 2,
                '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&.Mui-focused fieldset': { borderColor: '#6366f1' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
              '& .MuiInputBase-input': { color: 'white', letterSpacing: '0.2em', textAlign: 'center' },
            }}
          />
          <Typography variant="body2" color="rgba(255,255,255,0.4)" sx={{ textAlign: 'center', my: 0.5 }}>
            OR
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.6)">
            Enter a backup code:
          </Typography>
          <TextField
            id="backup_code"
            name="backup_code"
            type="text"
            value={mfaData.backup_code}
            onChange={handleMFAInputChange}
            variant="outlined"
            placeholder="XXXX-XXXX-XXXX"
            label="Backup Code"
            fullWidth
            disabled={!!mfaData.totp_code}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 2,
                '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&.Mui-focused fieldset': { borderColor: '#6366f1' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
              '& .MuiInputBase-input': { color: 'white', fontFamily: 'monospace' },
            }}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={mfaVerifying}
              startIcon={mfaVerifying && <CircularProgress size={20} color="inherit" />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                  boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
                }
              }}
            >
              {mfaVerifying ? 'Verifying...' : 'Verify'}
            </Button>
            <Button 
              variant="outlined" 
              size="large" 
              onClick={handleBackToLogin}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                borderColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.2)',
                  bgcolor: 'rgba(255,255,255,0.02)',
                }
              }}
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
      <Typography 
        align="center" 
        variant="h3" 
        fontWeight={800}
        sx={{
          background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 1
        }}
      >
        Admin Sign In
      </Typography>
      <Typography align="center" variant="body2" color="rgba(255,255,255,0.6)" mb={4}>
        Sign in with your email and PIN to access the admin dashboard.
      </Typography>
      <Stack onSubmit={handleLoginSubmit} component="form" direction="column" gap={2.5}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              bgcolor: 'rgba(239, 68, 68, 0.1)', 
              color: '#fca5a5',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 2
            }}
          >
            {error}
          </Alert>
        )}
        <TextField
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          variant="outlined"
          placeholder="email@system.local"
          label="Email Address"
          autoComplete="email"
          fullWidth
          autoFocus
          required
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(0,0,0,0.2)',
              borderRadius: 2,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&.Mui-focused fieldset': { borderColor: '#6366f1' },
            },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
            '& .MuiInputBase-input': { color: 'white' },
          }}
        />
        <TextField
          id="pin"
          name="pin"
          type={showPassword ? 'text' : 'password'}
          value={formData.pin}
          onChange={handleInputChange}
          variant="outlined"
          placeholder="•••••"
          label="PIN or Password"
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
                  sx={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <IconifyIcon icon={showPassword ? 'ion:eye' : 'ion:eye-off'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(0,0,0,0.2)',
              borderRadius: 2,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&.Mui-focused fieldset': { borderColor: '#6366f1' },
            },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
            '& .MuiInputBase-input': { color: 'white' },
          }}
        />
        
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.02)',
            py: 1,
            borderRadius: 1.5,
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
            Default Email: admin@system.local
          </Typography>
        </Box>

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
          sx={{
            mt: 1,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
              boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
            },
            '&.Mui-disabled': {
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.2)',
            }
          }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </Stack>
    </>
  );
};

export default Login;
