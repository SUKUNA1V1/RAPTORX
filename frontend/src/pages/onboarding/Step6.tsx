import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import LinearProgress from '@mui/material/LinearProgress';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { DataBaselineData } from 'types/onboarding';

const Step6 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState<DataBaselineData>({
    use_historical_logs: false,
    privacy_mask_pii: true,
    data_retention_days: 90,
    start_with_conservative_defaults: true,
  });

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await OnboardingManager.loadDraft();
        if (draft && draft.step_number >= 6) {
          const data = draft.draft_data as unknown as DataBaselineData;
          setFormData(data);
        }
      } catch {
        // Silently ignore
      }
    };
    void loadDraft();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setApiError('Please select a CSV file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB limit
      setApiError('File size must be less than 100MB');
      return;
    }

    // Simulate upload progress
    setFileName(file.name);
    setUploadProgress(0);

    // Simulate upload
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 30;
      });
    }, 300);

    // In real implementation, upload to backend
    setTimeout(() => {
      setUploadProgress(100);
      setFormData(prev => ({ ...prev, historical_logs_csv: file, use_historical_logs: true }));
      clearInterval(interval);
    }, 2000);
  };

  const handleNext = async () => {
    try {
      setLoading(true);
      await OnboardingManager.saveDraft(6, formData as unknown as Record<string, unknown>);
      navigate(paths.onboardingStep.replace(':step', '7'));
    } catch (err) {
      setApiError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={6}
      onNext={handleNext}
      onPrevious={() => navigate(paths.onboardingStep.replace(':step', '5'))}
      loading={loading}
      nextButtonLabel="Continue to Review"
    >
      <Box sx={{
        bgcolor: 'background.default',
        borderRadius: 3,
        p: { xs: 2, md: 4 },
        boxShadow: '0 2px 12px rgba(59,130,246,0.04)',
        maxWidth: 700,
        mx: 'auto',
        mt: 2,
      }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'primary.main' }}>
          Data Settings
        </Typography>
        <Box sx={{ mb: 2, color: 'text.secondary', fontWeight: 500 }}>
          Configure data settings and privacy options for your organization.
        </Box>
        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

        {/* Baseline Setup */}
        <Box>
          <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block' }}>
            Baseline Configuration
          </FormLabel>
          <Card sx={{ p: 2.5, mb: 2 }}>
            <RadioGroup
              value={formData.start_with_conservative_defaults ? 'conservative' : 'historical'}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  start_with_conservative_defaults: e.target.value === 'conservative',
                }))
              }
            >
              <FormControlLabel
                value="conservative"
                control={<Radio />}
                label={
                  <Box>
                    <Box sx={{ fontWeight: 600 }}>Conservative Defaults (Recommended for first time)</Box>
                    <Box sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                      Start with restrictive policies that deny by default. Manually grant access as needed.
                    </Box>
                  </Box>
                }
              />
            </RadioGroup>
          </Card>

          <Card sx={{ p: 2.5 }}>
            <RadioGroup
              value={formData.start_with_conservative_defaults ? 'conservative' : 'historical'}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  start_with_conservative_defaults: e.target.value === 'conservative',
                }))
              }
            >
              <FormControlLabel
                value="historical"
                control={<Radio />}
                label={
                  <Box>
                    <Box sx={{ fontWeight: 600 }}>Import Historical Data</Box>
                    <Box sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                      Upload previous access logs to build a baseline model. AI will learn from patterns.
                    </Box>
                  </Box>
                }
              />
            </RadioGroup>

            {formData.start_with_conservative_defaults === false && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <FormLabel sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  Upload Historical Access Logs (CSV)
                </FormLabel>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button component="span" variant="outlined">
                    Choose CSV File
                  </Button>
                </label>

                {fileName && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ fontSize: '0.9rem', mb: 1 }}>
                      📁 {fileName}
                    </Box>
                    {uploadProgress < 100 && (
                      <>
                        <LinearProgress variant="determinate" value={uploadProgress} />
                        <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                          {Math.round(uploadProgress)}%
                        </Box>
                      </>
                    )}
                    {uploadProgress === 100 && (
                      <Box sx={{ color: 'success.main', fontSize: '0.9rem' }}>
                        ✓ File ready for processing
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Card>
        </Box>

        {/* Privacy Settings */}
        <Box>
          <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block' }}>
            Privacy Settings
          </FormLabel>
          <Card sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.privacy_mask_pii}
                    onChange={(e) => setFormData(prev => ({ ...prev, privacy_mask_pii: e.target.checked }))}
                  />
                }
                label="Mask personally identifiable information (PII) in dashboards and reports"
              />

              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Data Retention Period (days)</Typography>
                <TextField
                  type="number"
                  fullWidth
                  value={formData.data_retention_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_retention_days: parseInt(e.target.value, 10) }))}
                  inputProps={{ min: 7, max: 2555 }}
                  helperText="How long to keep historical access logs (7-2555 days)"
                  variant="outlined"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      transition: 'all 0.2s',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                      '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: '1px' },
                      '&.Mui-focused': { bgcolor: 'rgba(99, 102, 241, 0.03)' }
                    },
                  }}
                />
              </Box>
            </Stack>
          </Card>
        </Box>

        {/* Compliance Note */}
        <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
          <Stack spacing={1}>
            <Box component="p" sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              🔒 Data Security & Compliance
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '0.75rem', color: 'text.secondary' }}>
              All data is encrypted at rest and in transit. Access logs are securely archived per your retention settings.
              Contact support for compliance certifications (SOC2, ISO27001, HIPAA, PCI-DSS).
            </Box>
          </Stack>
        </Box>

        {/* Help Text */}
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Stack spacing={1}>
            <Box component="p" sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              Next Step: Review & Go Live
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '0.75rem', color: 'text.secondary' }}>
              Review your configuration and complete setup in the next step.
            </Box>
          </Stack>
        </Box>
      </Box>
    </OnboardingLayout>
  );
};

export { Step6 as default };
