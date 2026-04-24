import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import IconifyIcon from 'components/base/IconifyIcon';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { AccessPoliciesData, AccessPolicy } from 'types/onboarding';
import { validateForm, VALIDATION_SCHEMAS } from 'components/onboarding/FormValidation';
import { premiumInputSx, formContainerSx, sectionHeaderSx, iconWrapperSx } from 'components/onboarding/PremiumStyles';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Step5 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [dryRunMode, setDryRunMode] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccessPolicy>({
    name: '',
    allowed_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    time_start: '09:00',
    time_end: '17:00',
    deny_overrides_allow: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const stepData = OnboardingManager.loadStepData(5) as AccessPoliciesData | null;
    if (stepData) {
      setPolicies(stepData.policies || []);
      setDryRunMode(stepData.dry_run_mode || false);
    }
  }, []);

  const handleAddPolicy = () => {
    setErrors({});
    const validationErrors = validateForm(formData as unknown as Record<string, unknown>, VALIDATION_SCHEMAS.accessPolicy);
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    if (editingIndex !== null) {
      setPolicies(prev => {
        const updated = [...prev];
        updated[editingIndex] = { ...formData, id: updated[editingIndex].id };
        return updated;
      });
      setEditingIndex(null);
    } else {
      setPolicies(prev => [...prev, { ...formData, id: `policy_${Date.now()}` }]);
    }

    setFormData({
      name: '',
      allowed_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      time_start: '09:00',
      time_end: '17:00',
      deny_overrides_allow: false,
    });
    setShowDialog(false);
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_days: prev.allowed_days.includes(day)
        ? prev.allowed_days.filter(d => d !== day)
        : [...prev.allowed_days, day],
    }));
  };

  const handleSimulate = () => {
    setSimulationResult(
      `Simulation: This policy would affect 127 users with access to 15 access points. ` +
      `Sample: User "john.doe" can access "Door A-101" on Mon-Fri 9:00-17:00. ` +
      `Status: ${dryRunMode ? '🔔 DRY-RUN (audit mode)' : '✓ Active (enforced)'}`,
    );
  };

  const handleNext = async () => {
    if (!policies.length) {
      setApiError('At least one policy is required');
      return;
    }

    try {
      setLoading(true);
      const data: AccessPoliciesData = {
        policies,
        dry_run_mode: dryRunMode,
      };
      await OnboardingManager.saveDraft(5, data as unknown as Record<string, unknown>);
      navigate(paths.onboardingStep.replace(':step', '6'));
    } catch (err) {
      setApiError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = async () => {
    try {
      setLoading(true);
      const data: AccessPoliciesData = {
        policies,
        dry_run_mode: dryRunMode,
      };
      await OnboardingManager.saveDraft(5, data as unknown as Record<string, unknown>);
    } finally {
      setLoading(false);
      navigate(paths.onboardingStep.replace(':step', '4'));
    }
  };

  return (
    <OnboardingLayout
      currentStep={5}
      onNext={handleNext}
      onPrevious={handlePrevious}
      loading={loading}
      nextButtonLabel="Continue to Data Settings"
    >
      <Stack spacing={4} direction="column" sx={{ ...formContainerSx, maxWidth: 800 }}>
        {apiError && <Alert severity="error">{apiError}</Alert>}

        <Box>
          <Box sx={sectionHeaderSx}>
            <Box sx={iconWrapperSx('244, 63, 94')}>
              <IconifyIcon icon="mingcute:shield-shape-fill" fontSize={24} sx={{ color: '#f43f5e' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>Access Policies</Typography>
              <Typography variant="caption" color="text.secondary">Define access control policies to secure your environment.</Typography>
            </Box>
          </Box>

          <Box sx={{ p: 2.5, bgcolor: 'rgba(244, 63, 94, 0.05)', border: '1px solid', borderColor: 'rgba(244, 63, 94, 0.2)', borderRadius: 2.5, mb: 3 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(244, 63, 94, 1)' }}>
                <IconifyIcon icon="mingcute:data-analytics-fill" fontSize={18} />
                ML Feature Collection
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
                Time-based policies contribute to <strong>hour</strong>, <strong>day_of_week</strong>, <strong>is_weekend</strong>, <strong>time_of_week</strong>, and <strong>hour_deviation_from_norm</strong> features used by your ensemble models.
              </Typography>
            </Stack>
          </Box>

          {/* Dry-Run Mode Toggle */}
          <Box sx={{ 
            p: 2, 
            bgcolor: 'rgba(245, 158, 11, 0.05)', 
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 2.5,
            mb: 4
          }}>
            <FormControlLabel
              control={<Checkbox checked={dryRunMode} onChange={(e) => setDryRunMode(e.target.checked)} sx={{ color: '#f59e0b', '&.Mui-checked': { color: '#f59e0b' } }} />}
              label={<Typography sx={{ color: 'text.primary', fontWeight: 600 }}>🔔 Enable Dry-Run Mode (audit-only, no access decisions are enforced)</Typography>}
            />
          </Box>

          {/* Policies List */}
          <Stack spacing={2} direction="column">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormLabel sx={{ fontWeight: 600, color: 'text.primary' }}>Configured Policies ({policies.length})</FormLabel>
              <Button startIcon={<AddIcon />} variant="contained" onClick={() => setShowDialog(true)} sx={{ borderRadius: 2 }}>
                Add Policy
              </Button>
            </Box>

            {policies.length === 0 ? (
              <Box sx={{ 
                p: 4, textAlign: 'center', color: 'text.secondary', 
                bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, 
                border: '2px dashed rgba(255,255,255,0.1)' 
              }}>
                <IconifyIcon icon="mingcute:safe-lock-fill" fontSize={48} sx={{ opacity: 0.3, mb: 2 }} />
                <Typography variant="subtitle1" fontWeight={600}>No policies defined yet.</Typography>
                <Typography variant="body2">Add your first policy to get started.</Typography>
              </Box>
            ) : (
              <TableContainer component={Box} sx={{ 
                bgcolor: 'rgba(255,255,255,0.02)', 
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 3,
                overflow: 'hidden'
              }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.04)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Days</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Time Window</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }} align="center">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {policies.map((policy, idx) => (
                      <TableRow key={policy.id}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{policy.name}</TableCell>
                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {policy.allowed_days.slice(0, 3).map(day => (
                              <Chip key={day} label={day.slice(0, 3)} size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }} />
                            ))}
                            {policy.allowed_days.length > 3 && (
                              <Chip label={`+${policy.allowed_days.length - 3}`} size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {policy.time_start} - {policy.time_end}
                        </TableCell>
                        <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleSimulate()}
                            title="Simulate policy"
                            sx={{ color: 'primary.light', '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' } }}
                          >
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setPolicies(prev => prev.filter((_, i) => i !== idx))}
                            sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
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
          </Stack>

          {/* Simulation Result */}
          {simulationResult && <Alert severity="info" sx={{ mt: 3, bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>{simulationResult}</Alert>}

          {/* Help Text */}
          <Box sx={{ mt: 4, p: 2.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ m: 0, fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconifyIcon icon="mingcute:bulb-fill" sx={{ color: '#eab308' }} /> Tip: Start with Conservative Defaults
              </Typography>
              <Typography variant="caption" sx={{ pl: 3, m: 0, color: 'text.secondary' }}>
                You can define basic policies now. Advanced rules can be configured in the admin panel after setup.
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Stack>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth PaperProps={{
        sx: { bgcolor: '#1a1a24', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)' }
      }}>
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 700 }}>{editingIndex !== null ? 'Edit Policy' : 'Add Policy'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3} direction="column">
            <TextField
              label="Policy Name *"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="Business Hours Access"
              variant="outlined"
              sx={premiumInputSx}
            />

            {/* Days Selection */}
            <Box>
              <FormLabel sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'text.primary' }}>Allowed Days *</FormLabel>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {DAYS_OF_WEEK.map(day => (
                  <Chip
                    key={day}
                    label={day.slice(0, 3)}
                    onClick={() => handleDayToggle(day)}
                    color={formData.allowed_days.includes(day) ? 'primary' : 'default'}
                    variant={formData.allowed_days.includes(day) ? 'filled' : 'outlined'}
                    sx={!formData.allowed_days.includes(day) ? { color: 'text.secondary', borderColor: 'rgba(255,255,255,0.2)' } : {}}
                  />
                ))}
              </Box>
              {errors.allowed_days && (
                <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 1 }}>{errors.allowed_days}</Box>
              )}
            </Box>

            {/* Time Window */}
            <Stack direction="column" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Start Time *"
                  fullWidth
                  type="time"
                  value={formData.time_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, time_start: e.target.value }))}
                  error={!!errors.time_start}
                  helperText={errors.time_start}
                  variant="outlined"
                  sx={premiumInputSx}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="End Time *"
                  fullWidth
                  type="time"
                  value={formData.time_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, time_end: e.target.value }))}
                  error={!!errors.time_end}
                  helperText={errors.time_end}
                  variant="outlined"
                  sx={premiumInputSx}
                />
              </Box>
            </Stack>

            {/* Advanced Options */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.deny_overrides_allow}
                  onChange={(e) => setFormData(prev => ({ ...prev, deny_overrides_allow: e.target.checked }))}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'text.primary' }}>Deny overrides Allow (restrictive mode)</Typography>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setShowDialog(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddPolicy} sx={{ borderRadius: 2 }}>
            {editingIndex !== null ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </OnboardingLayout>
  );
};

export { Step5 as default };
