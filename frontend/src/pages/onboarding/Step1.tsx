import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import IconifyIcon from 'components/base/IconifyIcon';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { CompanyProfileData } from 'types/onboarding';
import { validateForm, VALIDATION_SCHEMAS } from 'components/onboarding/FormValidation';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];



const OnboardingStep1 = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CompanyProfileData>({
    company_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await OnboardingManager.loadDraft();
        if (draft && draft.step_number >= 1) {
          setFormData((draft.draft_data as unknown as CompanyProfileData) || { company_name: '' });
        }
      } catch {
        // Silently ignore draft loading errors
      }
    };
    void loadDraft();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field
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

    // Validate required fields
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
      <Box sx={{
        bgcolor: 'background.default',
        borderRadius: 3,
        p: { xs: 2, md: 4 },
        boxShadow: '0 2px 12px rgba(99,102,241,0.04)',
        maxWidth: 600,
        mx: 'auto',
        mt: 2,
      }}>
        {apiError && <Alert severity="error" sx={{ mb: 3 }}>{apiError}</Alert>}

        {/* Company Information Section */}
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'primary.main' }}>
          Company Information
        </Typography>
        <Stack spacing={0} direction="column">
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
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: 'background.default',
                borderBottom: 'none',
              },
            }}
          />
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
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: 'background.default',
                borderBottom: 'none',
              },
            }}
          />
          <TextField
            select
            name="timezone"
            value={formData.timezone || ''}
            onChange={handleChange}
            fullWidth
            error={!!errors.timezone}
            helperText={errors.timezone || 'Your organization timezone'}
            SelectProps={{ native: true }}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                  <IconifyIcon icon="mingcute:time-line" fontSize={20} />
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
          >
            <option value="" disabled>Select a timezone...</option>
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </TextField>
        </Stack>

        {/* Primary Security Contact Section */}
        <Typography variant="h6" fontWeight={700} sx={{ mt: 4, mb: 2, color: 'success.main' }}>
          Primary Security Contact
        </Typography>
        <Stack spacing={0} direction="column">
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
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: 'background.default',
                borderBottom: 'none',
              },
            }}
          />
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
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                bgcolor: 'background.default',
              },
            }}
          />
        </Stack>


      </Box>
    </OnboardingLayout>
  );
};

export default OnboardingStep1;
