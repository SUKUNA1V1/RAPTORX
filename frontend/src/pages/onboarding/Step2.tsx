import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import IconifyIcon from 'components/base/IconifyIcon';
import RoleSelector from 'components/onboarding/RoleSelector';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { IdentityRolesData, AdminUser } from 'types/onboarding';
import { validateForm, VALIDATION_SCHEMAS } from 'components/onboarding/FormValidation';
import { premiumInputSx, formContainerSx, sectionHeaderSx, iconWrapperSx } from 'components/onboarding/PremiumStyles';

const OnboardingStep2 = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<IdentityRolesData>({
    initial_admins: [
      {
        email: '',
        name: '',
        role: 'admin',
      },
    ],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const stepData = OnboardingManager.loadStepData(2) as IdentityRolesData | null;
    if (stepData) {
      setFormData(stepData);
    }
  }, []);

  const handleAdminChange = (index: number, field: keyof AdminUser, value: unknown) => {
    setFormData(prev => {
      const newAdmins = [...prev.initial_admins];
      newAdmins[index] = {
        ...newAdmins[index],
        [field]: value,
      };
      return { ...prev, initial_admins: newAdmins };
    });

    // Clear error for this field
    const errorKey = `admin_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const addAdmin = () => {
    setFormData(prev => ({
      ...prev,
      initial_admins: [
        ...prev.initial_admins,
        {
          email: '',
          name: '',
          role: 'admin',
        },
      ],
    }));
  };

  const removeAdmin = (index: number) => {
    if (formData.initial_admins.length === 1) {
      setApiError('At least one administrator is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      initial_admins: prev.initial_admins.filter((_, i) => i !== index),
    }));
  };

  const handleNext = async () => {
    setApiError('');
    setErrors({});

    // Validate all admins
    if (!formData.initial_admins.length) {
      setApiError('At least one administrator is required');
      return;
    }

    const newErrors: Record<string, string> = {};

    formData.initial_admins.forEach((admin, index) => {
      const adminErrors = validateForm(admin as unknown as Record<string, unknown>, VALIDATION_SCHEMAS.adminUser);
      adminErrors.forEach(err => {
        newErrors[`admin_${index}_${err.field}`] = err.message;
      });
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await OnboardingManager.saveDraft(2, formData as unknown as Record<string, unknown>);
      navigate(paths.onboardingStep.replace(':step', '3'));
    } catch (err) {
      setApiError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = async () => {
    try {
      setLoading(true);
      await OnboardingManager.saveDraft(2, formData as unknown as Record<string, unknown>);
    } finally {
      setLoading(false);
      navigate(paths.onboardingStep.replace(':step', '1'));
    }
  };

  return (
    <OnboardingLayout
      currentStep={2}
      onNext={handleNext}
      onPrevious={handlePrevious}
      loading={loading}
      nextButtonLabel="Continue to Buildings & Zones"
    >
      <Stack spacing={4} direction="column" sx={formContainerSx}>
        {apiError && <Alert severity="error">{apiError}</Alert>}

        <Box>
          <Box sx={sectionHeaderSx}>
            <Box sx={iconWrapperSx('168, 85, 247')}>
              <IconifyIcon icon="mingcute:user-security-fill" fontSize={24} sx={{ color: '#a855f7' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>Administrator Accounts</Typography>
              <Typography variant="caption" color="text.secondary">Create the first administrative users</Typography>
            </Box>
          </Box>

          <Box sx={{ p: 2.5, bgcolor: 'rgba(168, 85, 247, 0.05)', border: '1px solid', borderColor: 'rgba(168, 85, 247, 0.2)', borderRadius: 2.5, mb: 3 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(168, 85, 247, 1)' }}>
                <IconifyIcon icon="mingcute:data-analytics-fill" fontSize={18} />
                ML Feature Collection
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
                Clearance levels are used by your models to compute the <strong>role_level</strong> and <strong>is_restricted_area</strong> features, which influence access control decisions.
              </Typography>
            </Stack>
          </Box>

          <Stack spacing={3} direction="column">
            {formData.initial_admins.map((admin, index) => (
              <Box key={index} sx={{ 
                borderRadius: 2.5, 
                border: '1px solid', 
                borderColor: 'rgba(255,255,255,0.08)', 
                p: { xs: 2, md: 3 }, 
                bgcolor: 'rgba(255,255,255,0.02)', 
              }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', display: 'inline-block' }} />
                    Administrator #{index + 1}
                  </Typography>
                  {formData.initial_admins.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => removeAdmin(index)}
                      disabled={loading}
                      sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                <Stack spacing={3} direction="column">
                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Full Name *</Typography>
                    <TextField
                      value={admin.name}
                      onChange={(e) => handleAdminChange(index, 'name', e.target.value)}
                      fullWidth
                      placeholder="John Doe"
                      error={!!errors[`admin_${index}_name`]}
                      helperText={errors[`admin_${index}_name`] || 'Full name of the administrator'}
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                            <IconifyIcon icon="mingcute:user-add-fill" fontSize={20} />
                          </Box>
                        ),
                      }}
                      sx={premiumInputSx}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Email Address *</Typography>
                    <TextField
                      type="email"
                      value={admin.email}
                      onChange={(e) => handleAdminChange(index, 'email', e.target.value)}
                      fullWidth
                      placeholder="john@acme.com"
                      error={!!errors[`admin_${index}_email`]}
                      helperText={errors[`admin_${index}_email`] || 'Business email address'}
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                            <IconifyIcon icon="mingcute:mail-line" fontSize={20} />
                          </Box>
                        ),
                      }}
                      sx={premiumInputSx}
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
                      System Role <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <RoleSelector
                      value={admin.role}
                      onChange={(role) => handleAdminChange(index, 'role', role)}
                      disabled={loading}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Clearance Level</Typography>
                    <TextField
                      select
                      fullWidth
                      type="number"
                      variant="outlined"
                      value={admin.clearance_level || 3}
                      onChange={(e) => handleAdminChange(index, 'clearance_level', parseInt(e.target.value))}
                      helperText="Higher level = access to more restricted areas"
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
                      <MenuItem value={1}>Level 1 - Basic Access</MenuItem>
                      <MenuItem value={2}>Level 2 - Standard Access</MenuItem>
                      <MenuItem value={3}>Level 3 - Full Access</MenuItem>
                      <MenuItem value={5}>Level 5 - Executive Access</MenuItem>
                      <MenuItem value={10}>Level 10 - Unrestricted</MenuItem>
                    </TextField>
                  </Box>
                </Stack>
              </Box>
            ))}

            <Button
              startIcon={<AddIcon />}
              onClick={addAdmin}
              disabled={loading}
              variant="outlined"
              size="large"
              sx={{ 
                borderRadius: 2.5, 
                fontWeight: 700, 
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.15)',
                color: 'text.primary',
                opacity: 0.8,
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.3)',
                  bgcolor: 'rgba(255,255,255,0.03)',
                  opacity: 1
                }
              }}
            >
              Add Another Administrator
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

        <Box sx={{ p: 2.5, bgcolor: 'rgba(99,102,241,0.05)', border: '1px solid', borderColor: 'rgba(99,102,241,0.2)', borderRadius: 2.5 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.light' }}>
              <IconifyIcon icon="mingcute:info-fill" fontSize={18} />
              Advanced: Identity Integration
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
              After onboarding, you can configure enterprise identity integrations (e.g. Okta, Azure AD, LDAP, SCIM) in the Admin Settings menu.
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </OnboardingLayout>
  );
};

export default OnboardingStep2;
