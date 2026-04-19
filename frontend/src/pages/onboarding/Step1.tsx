import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import FormLabel from '@mui/material/FormLabel';
import FormGroup from '@mui/material/FormGroup';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
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
    // Clear error for this field
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
      <Stack spacing={3}>
        {/* Info Box */}
        <Card sx={{ p: 2, bgcolor: 'info.lighter', border: 'none' }}>
          <Box component="p" sx={{ m: 0 }}>
            Enter your organization's basic information. You can update these details later if needed.
          </Box>
        </Card>

        {apiError && <Alert severity="error">{apiError}</Alert>}

        {/* Company Information */}
        <Box>
          <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block' }}>Company Information</FormLabel>
          <Stack spacing={2}>
            <TextField
              label="Company Name *"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              fullWidth
              error={!!errors.company_name}
              helperText={errors.company_name}
              placeholder="Acme Corporation"
            />

            <TextField
              label="Industry"
              name="industry"
              value={formData.industry || ''}
              onChange={handleChange}
              fullWidth
              placeholder="e.g., Finance, Healthcare, Technology"
            />

            <TextField
              label="Country"
              name="country"
              value={formData.country || ''}
              onChange={handleChange}
              fullWidth
              placeholder="United States"
            />

            <TextField
              select
              label="Timezone *"
              name="timezone"
              value={formData.timezone || ''}
              onChange={handleChange}
              fullWidth
              error={!!errors.timezone}
              helperText={errors.timezone}
              SelectProps={{
                native: true,
              }}
            >
              <option value="">Select a timezone...</option>
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </TextField>
          </Stack>
        </Box>

        {/* Primary Security Contact */}
        <Box>
          <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block' }}>
            Primary Security Contact
          </FormLabel>
          <Stack spacing={2}>
            <TextField
              label="Contact Name"
              name="primary_contact_name"
              value={formData.primary_contact_name || ''}
              onChange={handleChange}
              fullWidth
              placeholder="John Doe"
            />

            <TextField
              label="Email Address"
              name="primary_contact_email"
              type="email"
              value={formData.primary_contact_email || ''}
              onChange={handleChange}
              fullWidth
              error={!!errors.primary_contact_email}
              helperText={errors.primary_contact_email}
              placeholder="john@acme.com"
            />

            <TextField
              label="Phone Number"
              name="primary_contact_phone"
              value={formData.primary_contact_phone || ''}
              onChange={handleChange}
              fullWidth
              error={!!errors.primary_contact_phone}
              helperText={errors.primary_contact_phone}
              placeholder="+1 (555) 123-4567"
            />
          </Stack>
        </Box>

        {/* Compliance Requirements */}
        <Box>
          <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block' }}>
            Compliance Requirements (Optional)
          </FormLabel>
          <FormGroup>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
              {COMPLIANCE_OPTIONS.map(option => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={formData.compliance_requirements?.includes(option.value) || false}
                      onChange={(e) => handleComplianceChange(option.value, e.target.checked)}
                    />
                  }
                  label={option.label}
                  sx={{ flex: '0 0 auto' }}
                />
              ))}
            </Stack>
          </FormGroup>
        </Box>

        {/* Help Text */}
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Stack spacing={1}>
            <Box component="p" sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              Next Step: Create Admin Users
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '0.75rem', color: 'text.secondary' }}>
              After this step, you'll create the initial administrator accounts for your organization.
            </Box>
          </Stack>
        </Box>
      </Stack>
    </OnboardingLayout>
  );
};

export default OnboardingStep1;
