import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import FormLabel from '@mui/material/FormLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import IconifyIcon from 'components/base/IconifyIcon';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { UserBasicData } from 'types/onboarding';
import { formContainerSx, sectionHeaderSx, iconWrapperSx, premiumInputSx } from 'components/onboarding/PremiumStyles';

interface UserEntry {
  id: string;
  first_name: string;
  last_name: string;
  badge_id: string;
  role: string;
  department?: string;
}

const ALLOWED_ROLES = ['Employee', 'Manager', 'Admin', 'Security'];
const BADGE_ID_REGEX = /^[A-Z0-9-]+$/i;

const Step6Users = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserEntry>({
    id: '',
    first_name: '',
    last_name: '',
    badge_id: '',
    role: 'Employee',
    department: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const stepData = OnboardingManager.loadStepData(6) as UserBasicData | null;
    if (stepData && stepData.users) {
      setUsers(stepData.users);
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.badge_id?.trim()) {
      newErrors.badge_id = 'Badge ID is required';
    } else if (!BADGE_ID_REGEX.test(formData.badge_id)) {
      newErrors.badge_id = 'Badge ID must contain only uppercase letters, numbers, and hyphens';
    } else {
      // Check for duplicates
      const isDuplicate = users.some(
        (user, idx) =>
          user.badge_id.toUpperCase() === formData.badge_id.toUpperCase() && idx !== editingIndex
      );
      if (isDuplicate) {
        newErrors.badge_id = 'This badge ID is already in use';
      }
    }

    if (!ALLOWED_ROLES.includes(formData.role)) {
      newErrors.role = 'Invalid role selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUser = () => {
    if (!validateForm()) {
      return;
    }

    if (editingIndex !== null) {
      setUsers(prev => {
        const updated = [...prev];
        updated[editingIndex] = { ...formData };
        return updated;
      });
      setEditingIndex(null);
    } else {
      setUsers(prev => [...prev, { ...formData, id: `user_${Date.now()}` }]);
    }

    setFormData({
      id: '',
      first_name: '',
      last_name: '',
      badge_id: '',
      role: 'Employee',
      department: '',
    });
    setShowDialog(false);
    setErrors({});
  };

  const handleEditUser = (index: number) => {
    setEditingIndex(index);
    setFormData({ ...users[index] });
    setShowDialog(true);
    setErrors({});
  };

  const handleDeleteUser = (index: number) => {
    setUsers(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleNext = async () => {
    try {
      setLoading(true);
      setApiError('');

      // Save this step data
      const stepData: UserBasicData = {
        users,
      };

      await OnboardingManager.saveDraft(6, stepData);
      navigate(paths.onboardingStep.replace(':step', '7'));
    } catch (error) {
      setApiError('Failed to save users. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    if (!showDialog) return;
    setShowDialog(false);
    setEditingIndex(null);
    setFormData({
      id: '',
      first_name: '',
      last_name: '',
      badge_id: '',
      role: 'Employee',
      department: '',
    });
    setErrors({});
  };

  return (
    <OnboardingLayout
      currentStep={6}
      onNext={handleNext}
      onPrevious={() => navigate(paths.onboardingStep.replace(':step', '5'))}
      loading={loading}
      nextButtonLabel="Continue"
    >
      <Stack spacing={4} direction="column" sx={formContainerSx}>
        <Box>
          <Box sx={sectionHeaderSx}>
            <Box sx={iconWrapperSx('59, 130, 246')}>
              <IconifyIcon icon="mingcute:user-add-fill" fontSize={24} sx={{ color: '#3b82f6' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>
                Add Users
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add employees and staff who will use the access control system. This data will be used to generate realistic training data.
              </Typography>
            </Box>
          </Box>

          {apiError && <Alert severity="error" sx={{ mt: 3, mb: 3 }}>{apiError}</Alert>}

          <Box sx={{ mt: 3, p: 2.5, bgcolor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <IconifyIcon icon="mingcute:info-fill" sx={{ color: '#3b82f6', fontSize: 20, mt: 0.25 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                  Why add users now?
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                  Adding users in onboarding helps the system generate realistic access patterns based on your actual employees during the training data generation phase.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <FormLabel sx={{ fontWeight: 600, color: 'text.primary' }}>
                Users ({users.length})
              </FormLabel>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setEditingIndex(null);
                  setFormData({ id: '', first_name: '', last_name: '', badge_id: '', role: 'Employee', department: '' });
                  setErrors({});
                  setShowDialog(true);
                }}
                sx={{ borderRadius: 1.5 }}
                size="small"
              >
                Add User
              </Button>
            </Box>

            {users.length === 0 ? (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 2.5,
                  color: 'text.secondary',
                }}
              >
                <IconifyIcon icon="mingcute:inbox-fill" sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography variant="body2">No users added yet. Click "Add User" to get started.</Typography>
              </Box>
            ) : (
              <TableContainer sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>First Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Last Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Badge ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'center' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user, idx) => (
                      <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                        <TableCell sx={{ color: 'text.primary' }}>{user.first_name}</TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{user.last_name}</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontFamily: 'monospace' }}>{user.badge_id}</TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 1.5,
                              py: 0.5,
                              bgcolor: 'rgba(16, 185, 129, 0.1)',
                              borderRadius: 1,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: '#10b981',
                            }}
                          >
                            {user.role}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{user.department || '—'}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(idx)}
                            sx={{ color: 'primary.main', mr: 1 }}
                          >
                            <IconifyIcon icon="mingcute:edit-fill" fontSize={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(idx)}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      </Stack>

      {/* Add/Edit User Dialog */}
      <Dialog open={showDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{
        sx: { bgcolor: '#1a1a24', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)' }
      }}>
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 700 }}>
          {editingIndex !== null ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5} direction="column" sx={{ width: '100%' }}>
            <TextField
              label="First Name"
              value={formData.first_name}
              onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              error={!!errors.first_name}
              helperText={errors.first_name}
              fullWidth
              sx={premiumInputSx}
            />
            <TextField
              label="Last Name"
              value={formData.last_name}
              onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              error={!!errors.last_name}
              helperText={errors.last_name}
              fullWidth
              sx={premiumInputSx}
            />
            <TextField
              label="Badge ID"
              value={formData.badge_id}
              onChange={e => setFormData(prev => ({ ...prev, badge_id: e.target.value.toUpperCase() }))}
              error={!!errors.badge_id}
              helperText={errors.badge_id || 'Format: ABC-123, must be unique'}
              fullWidth
              sx={premiumInputSx}
              placeholder="E.g., EMP-001"
            />
            <TextField
              label="Role"
              select
              value={formData.role}
              onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
              error={!!errors.role}
              helperText={errors.role}
              fullWidth
              sx={premiumInputSx}
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    sx: {
                      bgcolor: '#1a1a24',
                      backgroundImage: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      '& .MuiMenuItem-root': {
                        color: 'text.primary',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'rgba(59, 130, 246, 0.2)',
                          '&:hover': {
                            bgcolor: 'rgba(59, 130, 246, 0.3)',
                          },
                        },
                      },
                    },
                  },
                },
              }}
            >
              {ALLOWED_ROLES.map(role => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Department (Optional)"
              value={formData.department}
              onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
              fullWidth
              sx={premiumInputSx}
              placeholder="E.g., Engineering, Sales"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddUser} sx={{ borderRadius: 1.5 }}>
            {editingIndex !== null ? 'Update' : 'Add'} User
          </Button>
        </DialogActions>
      </Dialog>
    </OnboardingLayout>
  );
};

export { Step6Users as default };
