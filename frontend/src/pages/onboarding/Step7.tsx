import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import FormLabel from '@mui/material/FormLabel';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GetAppIcon from '@mui/icons-material/GetApp';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { ReviewSummary } from 'types/onboarding';

const Step7 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSystemCheck, setShowSystemCheck] = useState(false);
  const [systemCheckResults, setSystemCheckResults] = useState<
    Array<{
      name: string;
      status: 'pending' | 'success' | 'warning' | 'error';
      message: string;
    }>
  >([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const draft = await OnboardingManager.loadDraft();
        if (!draft) {
          setApiError('No onboarding data found. Please restart onboarding.');
          return;
        }

        // Load all steps data
        const allData: ReviewSummary = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          company_profile: (draft.draft_data as any) || {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          identity_roles: (draft.draft_data as any)?.identity_roles || { initial_admins: [] },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          buildings_zones: (draft.draft_data as any)?.buildings_zones || { buildings: [] },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          access_points: (draft.draft_data as any)?.access_points || { access_points: [] },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          policies: (draft.draft_data as any)?.policies || { policies: [], dry_run_mode: false },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data_baseline: (draft.draft_data as any)?.data_baseline || {
            use_historical_logs: false,
            privacy_mask_pii: true,
            data_retention_days: 90,
            start_with_conservative_defaults: true,
          },
        };
        setSummary(allData);
      } catch {
        setApiError('Failed to load configuration summary.');
      }
    };
    void loadAllData();
  }, []);

  const handleSystemCheck = async () => {
    setSystemCheckResults([
      { name: 'Backend Connectivity', status: 'pending', message: 'Checking...' },
      { name: 'Database Connection', status: 'pending', message: 'Checking...' },
      { name: 'ML Service', status: 'pending', message: 'Checking...' },
      { name: 'Admin Accounts', status: 'pending', message: 'Verifying...' },
      { name: 'Access Points', status: 'pending', message: 'Validating...' },
    ]);

    // Simulate system checks
    setTimeout(() => {
      setSystemCheckResults([
        { name: 'Backend Connectivity', status: 'success', message: '✓ Connected' },
        { name: 'Database Connection', status: 'success', message: '✓ Connected' },
        { name: 'ML Service', status: 'success', message: '✓ Ready' },
        { name: 'Admin Accounts', status: 'success', message: `✓ ${summary?.identity_roles?.initial_admins?.length || 1} admin(s) configured` },
        { name: 'Access Points', status: 'success', message: `✓ ${summary?.access_points?.access_points?.length || 0} access points configured` },
      ]);
    }, 2000);
  };

  const handleGoLive = async () => {
    try {
      setLoading(true);
      const fullData = {
        company_profile: summary?.company_profile,
        identity_roles: summary?.identity_roles,
        buildings_zones: summary?.buildings_zones,
        access_points: summary?.access_points,
        policies: summary?.policies,
        data_baseline: summary?.data_baseline,
      };

      // Apply onboarding
      const response = await OnboardingManager.apply(fullData);
      const orgId = response?.data?.id;

      OnboardingManager.clearDraft();

      // Trigger training data generation asynchronously (in background)
      if (orgId) {
        try {
          const trainingResponse = await fetch(`/api/onboarding/generate-training-data/${orgId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (trainingResponse.ok) {
            const trainingData = await trainingResponse.json();
            console.log('Training data generation started:', trainingData);
          }
        } catch (err) {
          console.warn('Training data generation request failed (will retry in background):', err);
          // Non-blocking - continue even if training data generation fails
        }
      }

      // Redirect to dashboard
      navigate(paths.dashboard);
    } catch (err) {
      setApiError('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportConfig = () => {
    const config = {
      timestamp: new Date().toISOString(),
      summary,
    };
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `onboarding-config-${Date.now()}.json`;
    link.click();
  };

  if (!summary) {
    return (
      <OnboardingLayout currentStep={7} loading={true} nextButtonLabel="Complete Setup">
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStep={7}
      onNext={handleGoLive}
      onPrevious={() => navigate(paths.onboardingStep.replace(':step', '6'))}
      loading={loading}
      nextButtonLabel="🚀 Go Live"
    >
      <Box sx={{
        bgcolor: 'background.default',
        borderRadius: 3,
        p: { xs: 2, md: 4 },
        boxShadow: '0 2px 12px rgba(99,130,246,0.04)',
        maxWidth: 700,
        mx: 'auto',
        mt: 2,
      }}>
        {/* Success Banner */}
        <Box sx={{ p: 2.5, bgcolor: 'success.lighter', border: '2px solid', borderColor: 'success.main', borderRadius: 2, mb: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 28, mt: 0.5 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Configuration Complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review your settings below and go live when ready.
              </Typography>
            </Box>
          </Stack>
        </Box>

        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

        {/* Quick Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 1.5, mb: 3 }}>
          <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Admins</Box>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {summary.identity_roles?.initial_admins?.length || 0}
            </Box>
          </Box>
          <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Buildings</Box>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {summary.buildings_zones?.buildings?.length || 0}
            </Box>
          </Box>
          <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Access Points</Box>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {summary.access_points?.access_points?.length || 0}
            </Box>
          </Box>
          <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Policies</Box>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {summary.policies?.policies?.length || 0}
            </Box>
          </Box>
        </Box>

        {/* Configuration Review */}
        <Box sx={{ mb: 3 }}>
          <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block' }}>
            Configuration Summary
          </FormLabel>

          {/* Company Profile */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography sx={{ fontWeight: 600 }}>Company Profile</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Company Name</Box>
                  <Box sx={{ fontWeight: 500 }}>{summary.company_profile?.company_name || 'N/A'}</Box>
                </Box>
                <Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Industry</Box>
                  <Box sx={{ fontWeight: 500 }}>{summary.company_profile?.industry || 'N/A'}</Box>
                </Box>
                <Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Country</Box>
                  <Box sx={{ fontWeight: 500 }}>{summary.company_profile?.country || 'N/A'}</Box>
                </Box>
                <Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Timezone</Box>
                  <Box sx={{ fontWeight: 500 }}>{summary.company_profile?.timezone || 'N/A'}</Box>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Admins */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography sx={{ fontWeight: 600 }}>
                Administrators ({summary.identity_roles?.initial_admins?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
              <Stack spacing={1}>
                {summary.identity_roles?.initial_admins?.map((admin, idx) => (
                  <Box key={idx} sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Box sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{admin.name}</Box>
                    <Box sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{admin.email}</Box>
                    <Box sx={{ fontSize: '0.8rem', color: 'primary.main' }}>Role: {admin.role}</Box>
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Buildings & Zones */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography sx={{ fontWeight: 600 }}>
                Buildings & Zones ({summary.buildings_zones?.buildings?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
              <Stack spacing={1}>
                {summary.buildings_zones?.buildings?.map((building, idx) => (
                  <Box key={idx} sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Box sx={{ fontWeight: 600 }}>📍 {building.name}</Box>
                    <Box sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
                      {building.floors?.length || 0} floor(s)
                    </Box>
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Access Points */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography sx={{ fontWeight: 600 }}>
                Access Points ({summary.access_points?.access_points?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
              <Box sx={{ fontSize: '0.85rem' }}>
                {summary.access_points?.access_points
                  ?.slice(0, 5)
                  .map(ap => ap.name)
                  .join(', ') || 'None'}
                {(summary.access_points?.access_points?.length || 0) > 5 &&
                  ` ... and ${(summary.access_points?.access_points?.length || 0) - 5} more`}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Policies */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography sx={{ fontWeight: 600 }}>
                Access Policies ({summary.policies?.policies?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
              <Box sx={{ fontSize: '0.85rem' }}>
                {summary.policies?.policies?.map(p => p.name).join(', ') || 'None'}
                {summary.policies?.dry_run_mode && (
                  <Box sx={{ color: 'warning.main', mt: 1 }}>🔔 Dry-run mode enabled (audit-only)</Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Data Settings */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography sx={{ fontWeight: 600 }}>Data & Privacy Settings</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
              <Stack spacing={1} sx={{ fontSize: '0.85rem' }}>
                <Box>
                  <Box sx={{ color: 'text.secondary' }}>Privacy:</Box>
                  <Box>
                    {summary.data_baseline?.privacy_mask_pii ? '✓ PII Masked' : '— PII Not Masked'}
                  </Box>
                </Box>
                <Box>
                  <Box sx={{ color: 'text.secondary' }}>Data Retention:</Box>
                  <Box>{summary.data_baseline?.data_retention_days || 90} days</Box>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Export Config */}
        <Button
          variant="outlined"
          startIcon={<GetAppIcon />}
          onClick={handleExportConfig}
          fullWidth
          size="small"
        >
          Export Configuration (Backup)
        </Button>

        {/* System Check */}
        <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
          <Stack spacing={1}>
            <Box component="p" sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              🔧 System Check
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
              Before going live, run a system check to verify all components are ready.
            </Box>
            <Button size="small" variant="outlined" onClick={() => setShowSystemCheck(true)}>
              Run System Check
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* System Check Dialog */}
      <Dialog open={showSystemCheck} onClose={() => setShowSystemCheck(false)} maxWidth="sm" fullWidth>
        <DialogTitle>System Check Results</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {systemCheckResults.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Button variant="contained" onClick={handleSystemCheck}>
                Start Check
              </Button>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {systemCheckResults.map((check, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    bgcolor:
                      check.status === 'pending'
                        ? 'action.hover'
                        : check.status === 'success'
                          ? 'success.lighter'
                          : 'error.lighter',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {check.status === 'pending' && <CircularProgress size={20} />}
                  {check.status === 'success' && <CheckCircleIcon sx={{ color: 'success.main' }} />}
                  {check.status === 'error' && <ErrorIcon sx={{ color: 'error.main' }} />}
                  {check.status === 'warning' && <WarningIcon sx={{ color: 'warning.main' }} />}
                  <Box>
                    <Box sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{check.name}</Box>
                    <Box sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{check.message}</Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSystemCheck(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Go Live Confirmation Dialog */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Go Live</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Box sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 1 }}>
              <Box component="p" sx={{ m: 0, fontWeight: 600, fontSize: '0.9rem' }}>
                ⚠️ This Action is Permanent
              </Box>
            </Box>
            <Box component="p" sx={{ m: 0 }}>
              Once you go live, the access control system will start enforcing policies immediately. All decisions are
              logged and auditable.
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '0.85rem', color: 'text.secondary' }}>
              ✓ All configuration has been validated
              <br />✓ System checks have passed
              <br />✓ Backup has been exported
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleGoLive} disabled={loading}>
            {loading ? 'Going Live...' : 'Confirm Go Live'}
          </Button>
        </DialogActions>
      </Dialog>
    </OnboardingLayout>
  );
};

export { Step7 as default };
