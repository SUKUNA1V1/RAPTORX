import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
// import Divider from '@mui/material/Divider';
// import Paper from '@mui/material/Paper';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import IconifyIcon from 'components/base/IconifyIcon';
import RoleSelector from 'components/onboarding/RoleSelector';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { IdentityRolesData, AdminUser } from 'types/onboarding';
import { validateForm, VALIDATION_SCHEMAS } from 'components/onboarding/FormValidation';

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
    const loadDraft = async () => {
      try {
        const draft = await OnboardingManager.loadDraft();
        if (draft && draft.step_number >= 2) {
          setFormData((draft.draft_data as unknown as IdentityRolesData) || { initial_admins: [{ email: '', name: '', role: 'admin' }] });
        }
      } catch {
        // Silently ignore draft loading errors
      }
    };
    void loadDraft();
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

  return (
    <OnboardingLayout
      currentStep={2}
      onNext={handleNext}
      onPrevious={() => navigate(paths.onboardingStep.replace(':step', '1'))}
      loading={loading}
      nextButtonLabel="Continue to Buildings & Zones"
    >
      <Box sx={{
        bgcolor: 'background.default',
        borderRadius: 3,
        p: { xs: 2, md: 4 },
        boxShadow: '0 2px 12px rgba(59,130,246,0.04)',
        maxWidth: 600,
        mx: 'auto',
        mt: 2,
      }}>
        {apiError && <Alert severity="error" sx={{ mb: 3 }}>{apiError}</Alert>}

        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'primary.main' }}>
          Administrator Accounts
        </Typography>
        <Stack spacing={2} direction="column">
          {formData.initial_admins.map((admin, index) => (
            <Box key={index} sx={{ mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 2, bgcolor: 'background.default', boxShadow: 'none' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Administrator #{index + 1}
                </Typography>
                {formData.initial_admins.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => removeAdmin(index)}
                    disabled={loading}
                    color="error"
                    sx={{ borderRadius: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
              <Stack spacing={0} direction="column">
                <TextField
                  value={admin.name}
                  onChange={(e) => handleAdminChange(index, 'name', e.target.value)}
                  fullWidth
                  placeholder="John Doe"
                  required
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 0,
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      bgcolor: 'background.default',
                      borderBottom: 'none',
                    },
                  }}
                />
                <TextField
                  type="email"
                  value={admin.email}
                  onChange={(e) => handleAdminChange(index, 'email', e.target.value)}
                  fullWidth
                  placeholder="john@acme.com"
                  required
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 0,
                      borderBottomLeftRadius: 8,
                      borderBottomRightRadius: 8,
                      bgcolor: 'background.default',
                    },
                  }}
                />
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Role <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                  <RoleSelector
                    value={admin.role}
                    onChange={(role) => handleAdminChange(index, 'role', role)}
                    disabled={loading}
                  />
                </Box>
              </Stack>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={addAdmin}
            disabled={loading}
            variant="contained"
            size="medium"
            sx={{ borderRadius: 2, fontWeight: 700, mt: 1 }}
          >
            Add Admin
          </Button>
        </Stack>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconifyIcon icon="mingcute:info-fill" fontSize={18} sx={{ color: 'primary.main' }} />
              Advanced: Identity Integration
            </Typography>
            <Typography variant="caption" color="text.secondary">
              After onboarding, you can configure identity integrations (Okta, Azure AD, LDAP, SCIM) in Admin Settings.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </OnboardingLayout>
  );
};

export default OnboardingStep2;
