import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
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
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { AccessPoliciesData, AccessPolicy } from 'types/onboarding';
import { validateForm, VALIDATION_SCHEMAS } from 'components/onboarding/FormValidation';

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
    const loadDraft = async () => {
      try {
        const draft = await OnboardingManager.loadDraft();
        if (draft && draft.step_number >= 5) {
          const data = draft.draft_data as unknown as AccessPoliciesData;
          setPolicies(data.policies || []);
          setDryRunMode(data.dry_run_mode || false);
        }
      } catch {
        // Silently ignore
      }
    };
    void loadDraft();
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

  return (
    <OnboardingLayout
      currentStep={5}
      onNext={handleNext}
      onPrevious={() => navigate(paths.onboardingStep.replace(':step', '4'))}
      loading={loading}
      nextButtonLabel="Continue to Data Settings"
    >
      <Stack spacing={3}>
        {/* Info Box */}
        <Card sx={{ p: 2, bgcolor: 'info.lighter', border: 'none' }}>
          <Box component="p" sx={{ m: 0 }}>
            Define access control policies. Set who can access what, when, and under what conditions.
          </Box>
        </Card>

        {apiError && <Alert severity="error">{apiError}</Alert>}

        {/* Dry-Run Mode Toggle */}
        <Card sx={{ p: 2, bgcolor: 'warning.lighter' }}>
          <FormControlLabel
            control={<Checkbox checked={dryRunMode} onChange={(e) => setDryRunMode(e.target.checked)} />}
            label="🔔 Enable Dry-Run Mode (audit-only, no access decisions are enforced)"
          />
        </Card>

        {/* Policies List */}
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FormLabel sx={{ fontWeight: 600 }}>Access Policies ({policies.length})</FormLabel>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setShowDialog(true)}>
              Add Policy
            </Button>
          </Box>

          {policies.length === 0 ? (
            <Card sx={{ p: 3, textAlign: 'center' }}>
              <Box component="p" sx={{ m: 0, color: 'text.secondary' }}>
                No policies defined yet. Add one to get started.
              </Box>
            </Card>
          ) : (
            <TableContainer component={Card}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Days</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Time Window</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {policies.map((policy, idx) => (
                    <TableRow key={policy.id}>
                      <TableCell sx={{ fontWeight: 500 }}>{policy.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {policy.allowed_days.slice(0, 3).map(day => (
                            <Chip key={day} label={day.slice(0, 3)} size="small" variant="outlined" />
                          ))}
                          {policy.allowed_days.length > 3 && (
                            <Chip label={`+${policy.allowed_days.length - 3}`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {policy.time_start} - {policy.time_end}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleSimulate()}
                          title="Simulate policy"
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setPolicies(prev => prev.filter((_, i) => i !== idx))}
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
        {simulationResult && <Alert severity="info">{simulationResult}</Alert>}

        {/* Help Text */}
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Stack spacing={1}>
            <Box component="p" sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              💡 Tip: Start with Conservative Defaults
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '0.75rem', color: 'text.secondary' }}>
              You can define basic policies now. Advanced rules can be configured in the admin panel after setup.
            </Box>
          </Stack>
        </Box>
      </Stack>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIndex !== null ? 'Edit Policy' : 'Add Policy'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Policy Name *"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="Business Hours Access"
            />

            {/* Days Selection */}
            <Box>
              <FormLabel sx={{ fontWeight: 600, mb: 1, display: 'block' }}>Allowed Days *</FormLabel>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {DAYS_OF_WEEK.map(day => (
                  <Chip
                    key={day}
                    label={day.slice(0, 3)}
                    onClick={() => handleDayToggle(day)}
                    color={formData.allowed_days.includes(day) ? 'primary' : 'default'}
                    variant={formData.allowed_days.includes(day) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              {errors.allowed_days && (
                <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 1 }}>{errors.allowed_days}</Box>
              )}
            </Box>

            {/* Time Window */}
            <Stack direction="row" spacing={1}>
              <TextField
                label="Start Time *"
                type="time"
                value={formData.time_start}
                onChange={(e) => setFormData(prev => ({ ...prev, time_start: e.target.value }))}
                error={!!errors.time_start}
                helperText={errors.time_start}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Time *"
                type="time"
                value={formData.time_end}
                onChange={(e) => setFormData(prev => ({ ...prev, time_end: e.target.value }))}
                error={!!errors.time_end}
                helperText={errors.time_end}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {/* Advanced Options */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.deny_overrides_allow}
                  onChange={(e) => setFormData(prev => ({ ...prev, deny_overrides_allow: e.target.checked }))}
                />
              }
              label="Deny overrides Allow (restrictive mode)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddPolicy}>
            {editingIndex !== null ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </OnboardingLayout>
  );
};

export { Step5 as default };
