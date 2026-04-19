import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import FormLabel from '@mui/material/FormLabel';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
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
      <Stack spacing={3}>
        {/* Info Box */}
        <Card sx={{ p: 2, bgcolor: 'info.lighter', border: 'none' }}>
          <Box component="p" sx={{ m: 0 }}>
            Create initial administrator accounts. You can add more users later in the system.
          </Box>
        </Card>

        {apiError && <Alert severity="error">{apiError}</Alert>}

        {/* Admin Accounts */}
        <Box>
          <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Administrator Accounts</span>
            <Button startIcon={<AddIcon />} onClick={addAdmin} disabled={loading} size="small">
              Add Admin
            </Button>
          </FormLabel>

          <Stack spacing={2}>
            {formData.initial_admins.map((admin, index) => (
              <Card key={index} sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <FormLabel sx={{ fontWeight: 600 }}>Admin #{index + 1}</FormLabel>
                    <IconButton
                      size="small"
                      onClick={() => removeAdmin(index)}
                      disabled={loading || formData.initial_admins.length === 1}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Name and Email */}
                  <Stack spacing={2}>
                    <TextField
                      label="Admin Name *"
                      value={admin.name}
                      onChange={(e) => handleAdminChange(index, 'name', e.target.value)}
                      fullWidth
                      placeholder="John Doe"
                      error={!!errors[`admin_${index}_name`]}
                      helperText={errors[`admin_${index}_name`]}
                    />

                    <TextField
                      label="Email Address *"
                      type="email"
                      value={admin.email}
                      onChange={(e) => handleAdminChange(index, 'email', e.target.value)}
                      fullWidth
                      placeholder="john@acme.com"
                      error={!!errors[`admin_${index}_email`]}
                      helperText={errors[`admin_${index}_email`]}
                    />
                  </Stack>

                  {/* Role Selection */}
                  <Box>
                    <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block' }}>Role *</FormLabel>
                    <RoleSelector
                      value={admin.role}
                      onChange={(role) => handleAdminChange(index, 'role', role)}
                      disabled={loading}
                    />
                  </Box>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Box>

        {/* Integration Info */}
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Stack spacing={1}>
            <Box component="p" sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              Advanced: Integration Setup
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '0.75rem', color: 'text.secondary' }}>
              After onboarding, you can configure identity integrations (Okta, Azure AD, LDAP, SCIM) in Admin Settings.
            </Box>
          </Stack>
        </Box>

        {/* Help Text */}
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Stack spacing={1}>
            <Box component="p" sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              Next Step: Define Buildings & Zones
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '0.75rem', color: 'text.secondary' }}>
              After this step, you'll configure your physical infrastructure (buildings, floors, zones, and rooms).
            </Box>
          </Stack>
        </Box>
      </Stack>
    </OnboardingLayout>
  );
};

export default OnboardingStep2;
