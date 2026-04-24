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
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import LinearProgress from '@mui/material/LinearProgress';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import IconifyIcon from 'components/base/IconifyIcon';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { DataBaselineData } from 'types/onboarding';
import { premiumInputSx, formContainerSx, sectionHeaderSx, iconWrapperSx } from 'components/onboarding/PremiumStyles';

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
    const stepData = OnboardingManager.loadStepData(6) as DataBaselineData | null;
    if (stepData) {
      setFormData(stepData);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setApiError('Please select a CSV file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setApiError('File size must be less than 100MB');
      return;
    }

    setFileName(file.name);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 30;
      });
    }, 300);

    setTimeout(() => {
      setUploadProgress(100);
      setFormData(prev => ({ ...prev, historical_logs_csv: file, use_historical_logs: true }));
      clearInterval(interval);
    }, 2000);
  };

  const handleNext = async () => {
    try {
      setLoading(true);
      await OnboardingManager.saveDraft(7, formData as unknown as Record<string, unknown>);
      navigate(paths.onboardingStep.replace(':step', '8'));
    } catch (err) {
      setApiError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = async () => {
    try {
      setLoading(true);
      await OnboardingManager.saveDraft(7, formData as unknown as Record<string, unknown>);
    } finally {
      setLoading(false);
      navigate(paths.onboardingStep.replace(':step', '6'));
    }
  };

  return (
    <OnboardingLayout
      currentStep={7}
      onNext={handleNext}
      onPrevious={handlePrevious}
      loading={loading}
      nextButtonLabel="Continue to Review"
    >
      <Stack spacing={4} direction="column" sx={formContainerSx}>
        {apiError && <Alert severity="error">{apiError}</Alert>}

        <Box>
          <Box sx={sectionHeaderSx}>
            <Box sx={iconWrapperSx('14, 165, 233')}>
              <IconifyIcon icon="mingcute:server-fill" fontSize={24} sx={{ color: '#0ea5e9' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>Data Settings</Typography>
              <Typography variant="caption" color="text.secondary">Configure data retention, privacy, and baseline modeling.</Typography>
            </Box>
          </Box>

          <Stack spacing={3} direction="column">
            {/* Baseline Setup */}
            <Box>
              <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block', color: 'text.primary' }}>
                Baseline Configuration
              </FormLabel>
              <Stack spacing={2} direction="column">
                <Box sx={{ 
                  p: 2.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, 
                  border: '1px solid', borderColor: formData.start_with_conservative_defaults ? 'primary.main' : 'rgba(255,255,255,0.08)',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {formData.start_with_conservative_defaults && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: 'primary.main' }} />
                  )}
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
                      control={<Radio sx={{ color: 'text.secondary', '&.Mui-checked': { color: 'primary.main' } }} />}
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>Conservative Defaults (Recommended)</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Start with restrictive policies that deny by default. Manually grant access as needed.
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </Box>

                <Box sx={{ 
                  p: 2.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, 
                  border: '1px solid', borderColor: !formData.start_with_conservative_defaults ? 'primary.main' : 'rgba(255,255,255,0.08)',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {!formData.start_with_conservative_defaults && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: 'primary.main' }} />
                  )}
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
                      control={<Radio sx={{ color: 'text.secondary', '&.Mui-checked': { color: 'primary.main' } }} />}
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>Import Historical Data</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Upload previous access logs to build a baseline model. AI will learn from patterns.
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>

                  {formData.start_with_conservative_defaults === false && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                        Upload Historical Access Logs (CSV)
                      </Typography>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload">
                        <Button component="span" variant="outlined" sx={{ 
                          borderStyle: 'dashed', borderWidth: 2, 
                          borderColor: 'rgba(255,255,255,0.2)', color: 'text.primary', opacity: 0.8,
                          '&:hover': { borderColor: 'primary.light', bgcolor: 'rgba(99,102,241,0.05)' }
                        }}>
                          Choose CSV File
                        </Button>
                      </label>

                      {fileName && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                          <Box sx={{ fontSize: '0.9rem', mb: 1, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconifyIcon icon="mingcute:file-fill" sx={{ color: 'primary.light' }} /> {fileName}
                          </Box>
                          {uploadProgress < 100 && (
                            <>
                              <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
                              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1, textAlign: 'right' }}>
                                {Math.round(uploadProgress)}%
                              </Box>
                            </>
                          )}
                          {uploadProgress === 100 && (
                            <Typography variant="caption" sx={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <IconifyIcon icon="mingcute:check-circle-fill" /> File ready for processing
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Stack>
            </Box>

            {/* Privacy Settings */}
            <Box>
              <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block', color: 'text.primary' }}>
                Privacy & Retention
              </FormLabel>
              <Box sx={{ 
                p: 3, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, 
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <Stack spacing={3} direction="column">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.privacy_mask_pii}
                        onChange={(e) => setFormData(prev => ({ ...prev, privacy_mask_pii: e.target.checked }))}
                        sx={{ color: 'text.secondary', '&.Mui-checked': { color: 'primary.main' } }}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">Mask personally identifiable information (PII) in dashboards and reports</Typography>}
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
                      sx={premiumInputSx}
                    />
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Box>

        {/* Compliance Note */}
        <Box sx={{ p: 2.5, bgcolor: 'rgba(14, 165, 233, 0.05)', borderRadius: 2.5, border: '1px solid rgba(14, 165, 233, 0.2)' }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ m: 0, fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconifyIcon icon="mingcute:safe-shield-fill" sx={{ color: '#0ea5e9' }} /> Data Security & Compliance
            </Typography>
            <Typography variant="caption" sx={{ pl: 3, m: 0, color: 'text.secondary' }}>
              All data is encrypted at rest and in transit. Access logs are securely archived per your retention settings.
              Contact support for compliance certifications (SOC2, ISO27001, HIPAA, PCI-DSS).
            </Typography>
          </Stack>
        </Box>

      </Stack>
    </OnboardingLayout>
  );
};

export { Step6 as default };
