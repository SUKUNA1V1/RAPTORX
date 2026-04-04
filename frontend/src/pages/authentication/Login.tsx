import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';

import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import IconifyIcon from 'components/base/IconifyIcon';
import paths from 'routes/paths';
import { isAdmin, loginAsAdmin } from 'lib/auth';

interface User {
  [key: string]: string;
}

const Login = () => {
  const [user, setUser] = useState<User>({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = (location.state as { from?: string } | undefined)?.from || paths.dashboard;

  useEffect(() => {
    if (isAdmin()) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ok = await loginAsAdmin(user.username, user.password);
    if (!ok) {
      setError('Invalid email or password. Please try again.');
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <>
      <Typography align="center" variant="h3" fontWeight={600}>
        Admin Sign In
      </Typography>
      <Typography align="center" variant="body2" color="text.secondary" mt={1}>
        Non-admin users can browse regular pages without logging in.
      </Typography>
      <Stack onSubmit={handleSubmit} component="form" direction="column" gap={2} mt={4}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          id="username"
          name="username"
          type="text"
          value={user.username}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Username"
          autoComplete="username"
          fullWidth
          autoFocus
          required
        />
        <TextField
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={user.password}
          onChange={handleInputChange}
          variant="filled"
          placeholder="Your Password"
          autoComplete="current-password"
          fullWidth
          autoFocus
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ opacity: user.password ? 1 : 0 }}>
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  <IconifyIcon icon={showPassword ? 'ion:eye' : 'ion:eye-off'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Stack mt={-1.5} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Default admin account: admin / admin
          </Typography>
        </Stack>
        <Button type="submit" variant="contained" size="medium" fullWidth>
          Sign In
        </Button>
      </Stack>
    </>
  );
};

export default Login;
