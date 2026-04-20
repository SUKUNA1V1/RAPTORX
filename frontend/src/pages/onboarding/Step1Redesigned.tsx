import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import FormGroup from '@mui/material/FormGroup';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
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

const COMPLIANCE_OPTIONS = [
  { value: 'SOC2', label: 'SOC2' },
  { value: 'ISO27001', label: 'ISO27001' },
  { value: 'HIPAA', label: 'HIPAA' },
  { value: 'PCI-DSS', label: 'PCI-DSS' },
  { value: 'GDPR', label: 'GDPR' },
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
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleComplianceChange = (value: string, checked: boolean) => {
    setFormData(prev => {
      const current = prev.compliance_requirements || [];
      if (checked) {
        return { ...prev, compliance_requirements: [...current, value] };
      }
      return { ...prev, compliance_requirements: current.filter(v => v !== value) };
    });
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
      <Stack spacing={4}>
        {apiError && <Alert severity="error">{apiError}</Alert>}

        {/* Company Information Section */}
        <Box>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', borderRadius: 1.5, display: 'flex' }}>
              <IconifyIcon icon="mingcute:building-2-fill" fontSize={24} sx={{ color: '#6366f1' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25 }}>Company Information</Typography>
              <Typography variant="caption" color="text.secondary">Provide your organization's basic details</Typography>
            </Box>
          </Stack>

          <Stack spacing={2.5}>
            <TextField
              label="Company Name"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              fullWidth
              required
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
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                },
              }}
            />

            <TextField
              label="Industry"
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
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                },
              }}
            />

            <TextField
              label="Country"
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
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                },
              }}
            />

            <TextField
              select
              label="Timezone"
              name="timezone"
              value={formData.timezone || ''}
              onChange={handleChange}
              fullWidth
              required
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
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                },
              }}
            >
              <option value="">Select a timezone...</option>
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </TextField>
          </Stack>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Primary Security Contact Section */}
        <Box>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(34, 197, 94, 0.1)', borderRadius: 1.5, display: 'flex' }}>
              <IconifyIcon icon="mingcute:user-2-fill" fontSize={24} sx={{ color: '#22c55e' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25 }}>Primary Security Contact</Typography>
              <Typography variant="caption" color="text.secondary">Point of contact for security matters</Typography>
            </Box>
          </Stack>

          <Stack spacing={2.5}>
            <TextField
              label="Contact Name"
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
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                },
              }}
            />

            <TextField
              label="Email Address"
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
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                },
              }}
            />

            <TextField
              label="Phone Number"
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
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                },
              }}
            />
          </Stack>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Compliance Section */}
        <Box>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(239, 68, 68, 0.1)', borderRadius: 1.5, display: 'flex' }}>
              <IconifyIcon icon="mingcute:shield-check-fill" fontSize={24} sx={{ color: '#ef4444' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25 }}>Compliance Requirements</Typography>
              <Typography variant="caption" color="text.secondary">Select applicable standards (optional)</Typography>
            </Box>
          </Stack>

          <FormGroup>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2.5 }}>
              {COMPLIANCE_OPTIONS.map(option => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={formData.compliance_requirements?.includes(option.value) || false}
                      onChange={(e) => handleComplianceChange(option.value, e.target.checked)}
                      sx={{ '&.Mui-checked': { color: '#ef4444' } }}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={600}>{option.label}</Typography>
                  }
                  sx={{ flex: '0 0 auto' }}
                />
              ))}
            </Stack>
          </FormGroup>
        </Box>
      </Stack>
    </OnboardingLayout>
  );
};

export default OnboardingStep1;
