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
import Switch from '@mui/material/Switch';
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

interface RetrainStatus {
  status: string;
  auto_retrain_enabled: boolean;
  last_training_date: string | null;
  next_retrain_date: string | null;
  seconds_remaining: number | null;
  days_remaining: number | null;
  hours_remaining: number | null;
  minutes_remaining: number | null;
  is_overdue: boolean;
  formatted_remaining: string;
  message?: string;
}

const AdminSettingsPage = () => {
  const [tab, setTab] = useState<'profile' | 'users' | 'create' | 'ml-models'>('profile');
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

  // ML Models state
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);
  const [mlSuccess, setMlSuccess] = useState<string | null>(null);
  const [mlMode, setMlMode] = useState<'rules' | 'models'>('rules');

  // Retrain status state
  const [retrainStatus, setRetrainStatus] = useState<RetrainStatus | null>(null);
  const [retrainLoading, setRetrainLoading] = useState(false);
  const [autoRetrainEnabled, setAutoRetrainEnabled] = useState(true);
  const [countdownTime, setCountdownTime] = useState<string>('--:--:--');

  // Load profile and admins on mount
  useEffect(() => {
    loadProfile();
    loadAdmins();
  }, []);

  // Load retrain status when tab changes to ml-models
  useEffect(() => {
    if (tab === 'ml-models') {
      loadRetrainStatus();
      const interval = setInterval(loadRetrainStatus, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [tab]);

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

  const handleUseHardRules = async () => {
    try {
      setMlLoading(true);
      setMlError(null);
      setMlSuccess(null);
      
      const data = await apiClient.mlUseHardRules();
      setMlMode('rules');
      setMlSuccess(data.message || '✅ Switched to Hard Rules mode. Access decisions now use predefined business rules.');
      setTimeout(() => setMlSuccess(null), 4000);
    } catch (error) {
      setMlError(error instanceof Error ? error.message : 'Failed to switch to hard rules');
    } finally {
      setMlLoading(false);
    }
  };

  const handleGenerateTrainingData = async () => {
    try {
      setMlLoading(true);
      setMlError(null);
      setMlSuccess(null);
      
      const data = await apiClient.mlGenerateTrainingData();
      setMlSuccess(`✅ ${data.message} Training data will be saved to: ${data.output_file}`);
      setTimeout(() => setMlSuccess(null), 5000);
    } catch (error) {
      setMlError(error instanceof Error ? error.message : 'Failed to generate training data');
    } finally {
      setMlLoading(false);
    }
  };

  const handleTrainModels = async () => {
    try {
      setMlLoading(true);
      setMlError(null);
      setMlSuccess(null);
      
      const data = await apiClient.mlTrainModels();
      setMlSuccess(`✅ ${data.message} Estimated duration: ${data.estimated_duration}`);
      setTimeout(() => setMlSuccess(null), 5000);
    } catch (error) {
      setMlError(error instanceof Error ? error.message : 'Failed to train models');
    } finally {
      setMlLoading(false);
    }
  };

  const handleUseModels = async () => {
    try {
      setMlLoading(true);
      setMlError(null);
      setMlSuccess(null);
      
      const data = await apiClient.mlUseModels();
      setMlMode('models');
      setMlSuccess(data.message || '✅ Switched to Model-Based Decisions. Access control now uses ML ensemble models.');
      setTimeout(() => setMlSuccess(null), 4000);
    } catch (error) {
      setMlError(error instanceof Error ? error.message : 'Failed to switch to models');
    } finally {
      setMlLoading(false);
    }
  };

  const loadRetrainStatus = async () => {
    try {
      const data = await apiClient.mlGetRetrainStatus();
      setRetrainStatus(data);
      setAutoRetrainEnabled(data.auto_retrain_enabled);
      
      // Update countdown time display
      if (data.seconds_remaining !== null) {
        const d = data.days_remaining || 0;
        const h = data.hours_remaining || 0;
        const m = data.minutes_remaining || 0;
        setCountdownTime(`${d}d ${h}h ${m}m`);
      }
    } catch (error) {
      console.error('Failed to load retrain status:', error);
    }
  };

  const handleToggleAutoRetrain = async (enabled: boolean) => {
    try {
      setRetrainLoading(true);
      
      const data = await apiClient.mlToggleAutoRetrain(enabled);
      setAutoRetrainEnabled(enabled);
      setMlSuccess(data.message || `Auto-retrain has been ${enabled ? 'enabled' : 'disabled'}`);
      setTimeout(() => setMlSuccess(null), 3000);
    } catch (error) {
      setMlError(error instanceof Error ? error.message : 'Failed to toggle auto-retrain');
      setTimeout(() => setMlError(null), 3000);
    } finally {
      setRetrainLoading(false);
    }
  };

  const handleManualRetrain = async () => {
    try {
      setRetrainLoading(true);
      setMlError(null);
      setMlSuccess(null);
      
      const data = await apiClient.mlTriggerRetrain();
      setMlSuccess(data.message || 'Model retrain has been triggered. Estimated duration: 5-10 minutes.');
      setTimeout(() => setMlSuccess(null), 5000);
      
      // Refresh status after a delay
      setTimeout(loadRetrainStatus, 2000);
    } catch (error) {
      setMlError(error instanceof Error ? error.message : 'Failed to trigger retrain');
      setTimeout(() => setMlError(null), 3000);
    } finally {
      setRetrainLoading(false);
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
          onChange={(_, v) => setTab(v as 'profile' | 'users' | 'create' | 'ml-models')}
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
          <Tab
            value="ml-models"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconifyIcon icon="mdi:brain" />
                <span>ML Models</span>
              </Box>
            }
            sx={{
              minHeight: 52, fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', borderRadius: 2, mx: 0.5, my: 0.5,
              transition: 'all 0.2s',
              color: tab === 'ml-models' ? '#60a5fa' : 'text.secondary',
              bgcolor: tab === 'ml-models' ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
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

      {/* ML Models Tab */}
      {tab === 'ml-models' && (
        <Stack 
          direction="column" 
          spacing={4}
          sx={{ 
            minHeight: '60vh', 
            alignItems: 'center', 
            justifyContent: 'center',
            py: 8
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: '5rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #9c27b0 0%, #7209b7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2
              }}
            >
              COMING SOON
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '1.5rem'
              }}
            >
              Advanced ML Model Configuration
            </Typography>
          </Box>
        </Stack>
      )}

      {/* OLD ML Models Tab Content - REMOVED */}
      {false && (
        <Stack direction="column" spacing={4}>
          {mlError && <Alert severity="error">{mlError}</Alert>}
          {mlSuccess && <Alert severity="success">{mlSuccess}</Alert>}

          <Paper sx={{ p: 4, borderRadius: 4, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#f8fafc', mb: 1 }}>
                ML Decision Engine
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                Switch between hard rules-based access control and machine learning-powered decisions.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                <IconifyIcon icon="mdi:information-outline" sx={{ fontSize: '1.25rem', color: '#60a5fa' }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>Current Mode</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {mlMode === 'rules' ? '🔒 Hard Rules Mode - Using predefined business rules' : '🤖 ML Models Mode - Using trained ensemble models'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Stack direction="column" spacing={3}>
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 3 }}>
                  1️⃣ Generate Training Data (Step 1):
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<IconifyIcon icon="mdi:database-plus" />}
                  fullWidth
                  sx={{
                    py: 2,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                    bgcolor: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    border: '2px solid rgba(34, 197, 94, 0.3)',
                    '&:hover': { 
                      bgcolor: 'rgba(34, 197, 94, 0.3)',
                      borderColor: 'rgba(34, 197, 94, 0.5)'
                    }
                  }}
                  onClick={handleGenerateTrainingData}
                  disabled={mlLoading}
                >
                  {mlLoading ? <CircularProgress size={24} sx={{ color: '#22c55e' }} /> : '📊 Generate Training Data'}
                </Button>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, fontSize: '0.85rem' }}>
                  Creates synthetic training data from your onboarding configuration. Required before training models.
                </Typography>
              </Box>

              <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', pt: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 3 }}>
                  2️⃣ Train ML Models (Step 2):
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<IconifyIcon icon="mdi:school" />}
                  fullWidth
                  sx={{
                    py: 2,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                    bgcolor: 'rgba(168, 85, 247, 0.2)',
                    color: '#a855f7',
                    border: '2px solid rgba(168, 85, 247, 0.3)',
                    '&:hover': { 
                      bgcolor: 'rgba(168, 85, 247, 0.3)',
                      borderColor: 'rgba(168, 85, 247, 0.5)'
                    }
                  }}
                  onClick={handleTrainModels}
                  disabled={mlLoading}
                >
                  {mlLoading ? <CircularProgress size={24} sx={{ color: '#a855f7' }} /> : '🎓 Train ML Models'}
                </Button>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, fontSize: '0.85rem' }}>
                  Trains ensemble models on the generated data. This runs in the background and typically takes 5-10 minutes.
                </Typography>
              </Box>

              <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', pt: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 3 }}>
                  3️⃣ Select Decision Mode (Step 3):
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<IconifyIcon icon="mdi:shield-check-outline" />}
                    sx={{
                      py: 2,
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '1rem',
                      bgcolor: mlMode === 'rules' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                      color: mlMode === 'rules' ? '#f8fafc' : 'text.secondary',
                      border: mlMode === 'rules' ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
                      '&:hover': { 
                        bgcolor: mlMode === 'rules' ? '#2563eb' : 'rgba(255,255,255,0.15)',
                        borderColor: mlMode === 'rules' ? '#2563eb' : 'rgba(255,255,255,0.2)'
                      }
                    }}
                    onClick={handleUseHardRules}
                    disabled={mlLoading || mlMode === 'rules'}
                  >
                    {mlLoading && mlMode === 'rules' ? <CircularProgress size={24} /> : 'Use Hard Rules'}
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<IconifyIcon icon="mdi:brain" />}
                    sx={{
                      py: 2,
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '1rem',
                      bgcolor: mlMode === 'models' ? '#10b981' : 'rgba(255,255,255,0.1)',
                      color: mlMode === 'models' ? '#f8fafc' : 'text.secondary',
                      border: mlMode === 'models' ? '2px solid #10b981' : '2px solid rgba(255,255,255,0.1)',
                      '&:hover': { 
                        bgcolor: mlMode === 'models' ? '#059669' : 'rgba(255,255,255,0.15)',
                        borderColor: mlMode === 'models' ? '#059669' : 'rgba(255,255,255,0.2)'
                      }
                    }}
                    onClick={handleUseModels}
                    disabled={mlLoading || mlMode === 'models'}
                  >
                    {mlLoading && mlMode === 'models' ? <CircularProgress size={24} /> : 'Use Models'}
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', pt: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 3 }}>
                  ⏱️ Auto-Retrain Status (Every 40 Days):
                </Typography>
                
                {retrainStatus ? (
                  <Stack spacing={3}>
                    {/* Retrain Status Card */}
                    <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                              Next Retrain Countdown
                            </Typography>
                            <Typography variant="h3" fontWeight={800} sx={{ color: retrainStatus!.is_overdue ? '#ef4444' : '#a855f7', mt: 0.5 }}>
                              {retrainStatus!.is_overdue ? '⚠️ OVERDUE' : countdownTime}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Chip
                              label={autoRetrainEnabled ? '✓ Enabled' : '✗ Disabled'}
                              color={autoRetrainEnabled ? 'success' : 'default'}
                              variant="outlined"
                              sx={{ mb: 1 }}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.8rem', mt: 1 }}>
                              {retrainStatus!.message || (retrainStatus!.last_training_date ? `Last trained: ${new Date(retrainStatus!.last_training_date!).toLocaleDateString()}` : 'Never trained')}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Time Breakdown */}
                        {retrainStatus!.seconds_remaining !== null && !retrainStatus!.message && (
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 2 }}>
                            <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ color: '#a855f7', fontWeight: 800 }}>
                                {retrainStatus!.days_remaining}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                Days
                              </Typography>
                            </Box>
                            <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ color: '#a855f7', fontWeight: 800 }}>
                                {retrainStatus!.hours_remaining}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                Hours
                              </Typography>
                            </Box>
                            <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ color: '#a855f7', fontWeight: 800 }}>
                                {retrainStatus!.minutes_remaining}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                Minutes
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Stack>
                    </Box>

                    {/* Auto-Retrain Toggle */}
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                          Automatic Model Retraining
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                          Automatically retrain models every 40 days for optimal performance
                        </Typography>
                      </Box>
                      <Switch
                        checked={autoRetrainEnabled}
                        onChange={(e) => handleToggleAutoRetrain(e.target.checked)}
                        disabled={retrainLoading}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#a855f7',
                            '&:hover': { bgcolor: 'rgba(168, 85, 247, 0.1)' }
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#a855f7',
                          }
                        }}
                      />
                    </Box>

                    {/* Manual Retrain Button */}
                    <Button
                      variant="outlined"
                      startIcon={retrainLoading ? <CircularProgress size={20} /> : <IconifyIcon icon="mdi:refresh" />}
                      fullWidth
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        color: '#f59e0b',
                        borderColor: '#f59e0b',
                        '&:hover': { 
                          bgcolor: 'rgba(245, 158, 11, 0.1)',
                          borderColor: '#fbbf24'
                        }
                      }}
                      onClick={handleManualRetrain}
                      disabled={retrainLoading || !retrainStatus!.last_training_date}
                      title={!retrainStatus!.last_training_date ? 'Train models first before manual retrain' : 'Manually trigger model retraining now'}
                    >
                      🔄 Manually Retrain Models Now
                    </Button>
                  </Stack>
                ) : null}
              </Box>
            </Stack>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
};

export default AdminSettingsPage;
