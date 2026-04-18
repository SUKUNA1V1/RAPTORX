import { useState, useEffect } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient } from 'lib/api';

interface Admin {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  last_seen_at?: string | null;
}

const AdminSettingsPage = () => {
  const [tab, setTab] = useState<'profile' | 'users' | 'create'>('profile');
  const [adminId] = useState(1); // Would come from auth context in real app

  // Profile forms state
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Admins list state
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminLastName, setNewAdminLastName] = useState('');

  // Loading and error states
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [addAdminError, setAddAdminError] = useState<string | null>(null);
  const [addAdminSuccess, setAddAdminSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Load profile and admins on mount
  useEffect(() => {
    loadProfile();
    loadAdmins();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await apiClient.getAdminProfile(adminId);
      setEmail(profile.email);
    } catch (error) {
      console.error('Failed to load admin profile:', error);
    }
  };

  const loadAdmins = async () => {
    try {
      setAdminsLoading(true);
      setAdminsError(null);
      const adminsList = await apiClient.listAdmins();
      setAdmins(adminsList);
    } catch (error) {
      console.error('Failed to load admins:', error);
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      setAdminsError(`Failed to load administrators list: ${errorMsg}`);
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!email) {
      setUsernameError('Please enter a new email');
      return;
    }

    try {
      setUsernameLoading(true);
      setUsernameError(null);
      setUsernameSuccess(null);
      await apiClient.updateAdminUsername(adminId, email);
      setUsernameSuccess('Username updated successfully');
      setTimeout(() => setUsernameSuccess(null), 3000);
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : 'Failed to update username');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      await apiClient.changeAdminPassword(adminId, currentPassword, newPassword);
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword) {
      setAddAdminError('Please fill in all required fields');
      return;
    }

    try {
      setAddAdminLoading(true);
      setAddAdminError(null);
      await apiClient.createAdmin(
        newAdminEmail,
        newAdminPassword,
        newAdminRole,
        newAdminFirstName || 'Admin',
        newAdminLastName || 'User'
      );
      
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminRole('admin');
      setNewAdminFirstName('');
      setNewAdminLastName('');
      setAddAdminSuccess(true);
      setTimeout(() => setAddAdminSuccess(false), 3000);
      
      // Reload admins list
      await loadAdmins();
    } catch (error) {
      setAddAdminError(error instanceof Error ? error.message : 'Failed to create admin');
    } finally {
      setAddAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this admin?')) {
      return;
    }

    try {
      setDeleteError(null);
      setDeleteSuccess(null);
      await apiClient.deleteAdmin(id);
      setDeleteSuccess('Admin deactivated successfully');
      setTimeout(() => setDeleteSuccess(null), 3000);
      await loadAdmins();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete admin');
    }
  };

  return (
    <Stack spacing={4} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4338ca 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
          }}
        >
          <IconifyIcon icon="mdi:cog-outline" sx={{ fontSize: '2rem' }} />
        </Box>
        <Box>
          <Typography variant="h3" fontWeight={800} sx={{ background: 'linear-gradient(to right, #fff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            Admin Settings
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Manage your credentials and administer system access.
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', px: 1, overflow: 'hidden' }}>
        <Tabs
          value={tab as string}
          onChange={(_, v) => setTab(v as 'profile' | 'users' | 'create')}
          TabIndicatorProps={{ style: { display: 'none' } }}
          sx={{ minHeight: 52 }}
        >
          <Tab
            value="profile"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconifyIcon icon="mdi:account-key-outline" />
                <span>My Profile</span>
              </Box>
            }
            sx={{
              minHeight: 52, fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', borderRadius: 2, mx: 0.5, my: 0.5,
              transition: 'all 0.2s',
              color: tab === 'profile' ? '#60a5fa' : 'text.secondary',
              bgcolor: tab === 'profile' ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(96, 165, 250, 0.05)', color: '#60a5fa' },
            }}
          />
          <Tab
            value="users"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconifyIcon icon="mdi:shield-account-outline" />
                <span>Manage Admins</span>
              </Box>
            }
            sx={{
              minHeight: 52, fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', borderRadius: 2, mx: 0.5, my: 0.5,
              transition: 'all 0.2s',
              color: tab === 'users' ? '#60a5fa' : 'text.secondary',
              bgcolor: tab === 'users' ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(96, 165, 250, 0.05)', color: '#60a5fa' },
            }}
          />
          <Tab
            value="create"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconifyIcon icon="mdi:account-plus-outline" />
                <span>Create Admin</span>
              </Box>
            }
            sx={{
              minHeight: 52, fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', borderRadius: 2, mx: 0.5, my: 0.5,
              transition: 'all 0.2s',
              color: tab === 'create' ? '#60a5fa' : 'text.secondary',
              bgcolor: tab === 'create' ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(96, 165, 250, 0.05)', color: '#60a5fa' },
            }}
          />
        </Tabs>
      </Paper>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#e2e8f0', mb: 1 }}>
                Update Email
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Change your primary login email.
              </Typography>
              
              <Box sx={{ p: 2, mb: 4, mt: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #4338ca 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                  {email.charAt(0).toUpperCase()}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                    Current Account
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>
                    {email}
                  </Typography>
                </Box>
              </Box>

              {usernameError && <Alert severity="error" sx={{ mb: 2 }}>{usernameError}</Alert>}
              {usernameSuccess && <Alert severity="success" sx={{ mb: 2 }}>{usernameSuccess}</Alert>}

              <Stack direction="column" spacing={3} sx={{ flex: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>New Email Address</Typography>
                  <TextField
                    fullWidth
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="filled"
                    helperText="Enter your new email address. You'll use this to log in."
                    inputProps={{ style: { fontSize: '1rem' } }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                        '&.Mui-focused': { bgcolor: 'rgba(59, 130, 246, 0.08)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)' }
                      },
                      '& .MuiFormHelperText-root': { mt: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }
                    }}
                  />
                </Box>
                <Box sx={{ mt: 'auto', pt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, textTransform: 'none', fontSize: '1rem' }}
                    onClick={handleUpdateUsername}
                    disabled={usernameLoading}
                  >
                    {usernameLoading ? <CircularProgress size={24} /> : 'Save Email Address'}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#e2e8f0', mb: 1 }}>
                Change Password
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Ensure your account stays secure with a strong password.
              </Typography>
              
              {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
              {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}

              <Stack direction="column" spacing={3} sx={{ flex: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Current Password</Typography>
                  <TextField
                    fullWidth
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    variant="filled"
                    helperText="Enter your current password to verify your identity."
                    inputProps={{ style: { fontSize: '1rem' } }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end" sx={{ color: 'text.secondary' }}>
                            <IconifyIcon icon={showCurrentPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                        '&.Mui-focused': { bgcolor: 'rgba(239, 68, 68, 0.08)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' }
                      },
                      '& .MuiFormHelperText-root': { mt: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>New Password</Typography>
                  <TextField
                    fullWidth
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    variant="filled"
                    helperText="Use at least 8 characters with uppercase, lowercase, and numbers."
                    inputProps={{ style: { fontSize: '1rem' } }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" sx={{ color: 'text.secondary' }}>
                            <IconifyIcon icon={showNewPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                        '&.Mui-focused': { bgcolor: 'rgba(239, 68, 68, 0.08)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' }
                      },
                      '& .MuiFormHelperText-root': { mt: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Confirm New Password</Typography>
                  <TextField
                    fullWidth
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    variant="filled"
                    helperText="Retype your new password to confirm."
                    inputProps={{ style: { fontSize: '1rem' } }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" sx={{ color: 'text.secondary' }}>
                            <IconifyIcon icon={showConfirmPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                        '&.Mui-focused': { bgcolor: 'rgba(239, 68, 68, 0.08)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' }
                      },
                      '& .MuiFormHelperText-root': { mt: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }
                    }}
                  />
                </Box>
                <Box sx={{ mt: 'auto', pt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, textTransform: 'none', fontSize: '1rem' }}
                    onClick={handleChangePassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? <CircularProgress size={24} /> : 'Update Password'}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <Stack direction="column" spacing={3}>
          {adminsError && <Alert severity="error">{adminsError}</Alert>}
          {deleteError && <Alert severity="error">{deleteError}</Alert>}
          {deleteSuccess && <Alert severity="success">{deleteSuccess}</Alert>}

          <Paper sx={{ borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
            {adminsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table size="medium">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {admins.map((admin) => {
                    return (
                      <TableRow key={admin.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                        <TableCell sx={{ fontWeight: 600, color: '#e2e8f0' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                              {admin.email.charAt(0).toUpperCase()}
                            </Box>
                            {admin.email}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{admin.role}</TableCell>
                        <TableCell>
                          <Chip
                            label={admin.is_active ? 'ACTIVE' : 'INACTIVE'}
                            size="small"
                            sx={{
                              bgcolor: admin.is_active ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)',
                              color: admin.is_active ? '#4ade80' : 'text.disabled',
                              fontWeight: 800, fontSize: '0.7rem',
                              border: `1px solid ${admin.is_active ? 'rgba(74, 222, 128, 0.3)' : 'transparent'}`,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteAdmin(admin.id)}
                            sx={{ color: 'text.secondary', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                          >
                            <IconifyIcon icon="mdi:trash-can-outline" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Stack>
      )}

      {/* Create Admin Tab */}
      {(tab as 'profile' | 'users' | 'create') === 'create' && (
        <Paper sx={{ p: 4, borderRadius: 4, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#f8fafc', mb: 1 }}>
              Create Administrator Account
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Grant system access to a new team member. They will need to change their temporary password on first login.
            </Typography>
          </Box>

          {addAdminError && <Alert severity="error" sx={{ mb: 3 }}>{addAdminError}</Alert>}
          {addAdminSuccess && <Alert severity="success" sx={{ mb: 3 }}>New admin account created successfully!</Alert>}

          <Stack direction="column" spacing={4} sx={{ maxWidth: '600px' }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, mb: 2, display: 'block' }}>Personal Information</Typography>
              <Stack direction="column" spacing={3} sx={{ mt: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Email Address</Typography>
                  <TextField
                    fullWidth
                    type="email"
                    placeholder="name@company.com"
                    variant="filled"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    helperText="The user's company email address."
                    inputProps={{ style: { fontSize: '1rem' } }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                        '&.Mui-focused': { bgcolor: 'rgba(59, 130, 246, 0.08)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)' }
                      },
                      '& .MuiFormHelperText-root': { mt: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>First Name</Typography>
                  <TextField
                    fullWidth
                    placeholder="John"
                    variant="filled"
                    value={newAdminFirstName}
                    onChange={(e) => setNewAdminFirstName(e.target.value)}
                    inputProps={{ style: { fontSize: '1rem' } }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                        '&.Mui-focused': { bgcolor: 'rgba(59, 130, 246, 0.08)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)' }
                      }
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Last Name</Typography>
                  <TextField
                    fullWidth
                    placeholder="Doe"
                    variant="filled"
                    value={newAdminLastName}
                    onChange={(e) => setNewAdminLastName(e.target.value)}
                    inputProps={{ style: { fontSize: '1rem' } }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                        '&.Mui-focused': { bgcolor: 'rgba(59, 130, 246, 0.08)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)' }
                      }
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', pt: 3 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, mb: 2, display: 'block' }}>Account Security</Typography>
              <Stack direction="column" spacing={3} sx={{ mt: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Temporary Password</Typography>
                  <TextField
                    fullWidth
                    type={showNewAdminPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    variant="filled"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    helperText="Share this temporarily. User must change it on first login."
                    inputProps={{ style: { fontSize: '1rem' } }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowNewAdminPassword(!showNewAdminPassword)} edge="end" sx={{ color: 'text.secondary' }}>
                            <IconifyIcon icon={showNewAdminPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        bgcolor: 'rgba(239, 68, 68, 0.08)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.12)' },
                        '&.Mui-focused': { bgcolor: 'rgba(239, 68, 68, 0.12)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' }
                      },
                      '& .MuiFormHelperText-root': { mt: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Role</Typography>
                  <TextField
                    fullWidth
                    select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value)}
                    variant="filled"
                    helperText="Select the user's access level and permissions."
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                        '&.Mui-focused': { bgcolor: 'rgba(59, 130, 246, 0.08)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)' }
                      },
                      '& .MuiFormHelperText-root': { mt: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }
                    }}
                  >
                    <MenuItem value="admin">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                        Admin
                      </Box>
                    </MenuItem>
                    <MenuItem value="security">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                        Security Officer
                      </Box>
                    </MenuItem>
                  </TextField>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '1rem',
                  bgcolor: '#3b82f6',
                  '&:hover': { bgcolor: '#2563eb' }
                }}
                onClick={handleCreateAdmin}
                disabled={addAdminLoading}
              >
                {addAdminLoading ? <CircularProgress size={24} /> : 'Create Administrator'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};

export default AdminSettingsPage;
