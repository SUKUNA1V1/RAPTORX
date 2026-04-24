import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import IconifyIcon from 'components/base/IconifyIcon';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { CompanyProfileData } from 'types/onboarding';
import { validateForm, VALIDATION_SCHEMAS } from 'components/onboarding/FormValidation';
import { premiumInputSx, formContainerSx, sectionHeaderSx, iconWrapperSx } from 'components/onboarding/PremiumStyles';





const OnboardingStep1 = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CompanyProfileData>({
    company_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const stepData = OnboardingManager.loadStepData(1) as CompanyProfileData | null;
    if (stepData) {
      setFormData(stepData);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };



  const handleNext = async () => {
    setApiError('');
    setErrors({});

    const validationErrors = validateForm(formData as unknown as Record<string, unknown>, VALIDATION_SCHEMAS.companyProfile);
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    try {
      setLoading(true);
      await OnboardingManager.saveDraft(1, formData as unknown as Record<string, unknown>);
      navigate(paths.onboardingStep.replace(':step', '2'));
    } catch (err) {
      setApiError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={1}
      isFirstStep={true}
      onNext={handleNext}
      loading={loading}
      nextButtonLabel="Continue to Identity & Roles"
    >
      <Stack spacing={4} direction="column" sx={formContainerSx}>
        {apiError && <Alert severity="error">{apiError}</Alert>}

        {/* Company Information Section */}
        <Box>
          <Box sx={sectionHeaderSx}>
            <Box sx={iconWrapperSx('99, 102, 241')}>
              <IconifyIcon icon="mingcute:building-2-fill" fontSize={24} sx={{ color: '#6366f1' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>Company Information</Typography>
              <Typography variant="caption" color="text.secondary">Provide your organization's basic details</Typography>
            </Box>
          </Box>

          <Stack spacing={3} direction="column">
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Company Name *</Typography>
              <TextField
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                fullWidth
                error={!!errors.company_name}
                helperText={errors.company_name || 'Legal name of your organization'}
                placeholder="Acme Corporation"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                      <IconifyIcon icon="mingcute:building-2-fill" fontSize={20} />
                    </Box>
                  ),
                }}
                sx={premiumInputSx}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Industry</Typography>
              <TextField
                name="industry"
                value={formData.industry || ''}
                onChange={handleChange}
                fullWidth
                placeholder="e.g., Finance, Healthcare, Technology"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                      <IconifyIcon icon="mingcute:briefcase-fill" fontSize={20} />
                    </Box>
                  ),
                }}
                sx={premiumInputSx}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Country</Typography>
              <TextField
                name="country"
                value={formData.country || ''}
                onChange={handleChange}
                fullWidth
                placeholder="United States"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                      <IconifyIcon icon="mingcute:global-line" fontSize={20} />
                    </Box>
                  ),
                }}
                sx={premiumInputSx}
              />
            </Box>


          </Stack>
        </Box>

        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

        {/* Primary Security Contact Section */}
        <Box>
          <Box sx={sectionHeaderSx}>
            <Box sx={iconWrapperSx('34, 197, 94')}>
              <IconifyIcon icon="mingcute:user-2-fill" fontSize={24} sx={{ color: '#22c55e' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>Primary Security Contact</Typography>
              <Typography variant="caption" color="text.secondary">Point of contact for security matters</Typography>
            </Box>
          </Box>

          <Stack spacing={3} direction="column">
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Contact Name</Typography>
              <TextField
                name="primary_contact_name"
                value={formData.primary_contact_name || ''}
                onChange={handleChange}
                fullWidth
                placeholder="John Doe"
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
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Email Address</Typography>
              <TextField
                name="primary_contact_email"
                type="email"
                value={formData.primary_contact_email || ''}
                onChange={handleChange}
                fullWidth
                error={!!errors.primary_contact_email}
                helperText={errors.primary_contact_email || 'We\'ll send security notifications here'}
                placeholder="john@acme.com"
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
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Phone Number</Typography>
              <TextField
                name="primary_contact_phone"
                value={formData.primary_contact_phone || ''}
                onChange={handleChange}
                fullWidth
                error={!!errors.primary_contact_phone}
                helperText={errors.primary_contact_phone || 'For urgent security contact'}
                placeholder="+1 (555) 123-4567"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                      <IconifyIcon icon="mingcute:phone-fill" fontSize={20} />
                    </Box>
                  ),
                }}
                sx={premiumInputSx}
              />
            </Box>
          </Stack>
        </Box>


      </Stack>
    </OnboardingLayout>
  );
};

export default OnboardingStep1;
