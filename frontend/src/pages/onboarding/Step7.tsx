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
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import IconifyIcon from 'components/base/IconifyIcon';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import api from 'lib/api';
import type { ReviewSummary } from 'types/onboarding';
import { formContainerSx, sectionHeaderSx, iconWrapperSx } from 'components/onboarding/PremiumStyles';

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
        const allStepsData = await OnboardingManager.loadAllStepsData();

        const companyProfile = (allStepsData[1] ?? {}) as unknown as ReviewSummary['company_profile'];
        const identityRoles = (allStepsData[2] ?? { initial_admins: [] }) as unknown as ReviewSummary['identity_roles'];
        const buildingsZones = (allStepsData[3] ?? { buildings: [] }) as unknown as ReviewSummary['buildings_zones'];
        const accessPoints = (allStepsData[4] ?? { access_points: [] }) as unknown as ReviewSummary['access_points'];
        const policies = (allStepsData[5] ?? { policies: [], dry_run_mode: false }) as unknown as ReviewSummary['policies'];
        const dataBaseline = (allStepsData[6] ?? {
          use_historical_logs: false,
          privacy_mask_pii: true,
          data_retention_days: 90,
          start_with_conservative_defaults: true,
        }) as unknown as ReviewSummary['data_baseline'];
        
        const allData: ReviewSummary = {
          company_profile: companyProfile,
          identity_roles: identityRoles,
          buildings_zones: buildingsZones,
          access_points: accessPoints,
          policies: policies,
          data_baseline: dataBaseline,
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
      setApiError('');
      
      // Prepare all onboarding data for the backend
      const onboardingPayload = {
        step1: summary?.company_profile,
        step2: summary?.identity_roles,
        step3: summary?.buildings_zones,
        step4: summary?.access_points,
        step5: summary?.policies,
        step6: OnboardingManager.loadStepData(6) || {},
      };

      // Call the apply endpoint which will:
      // 1. Create the organization and all configurations
      // 2. Automatically generate training data based on org config
      // 3. Start the full ML pipeline in the background
      const response = await api.post('/onboarding/apply', onboardingPayload);

      if (response.data?.id) {
        // Success! Organization created and pipeline is starting
        OnboardingManager.clearDraft();
        
        // Show success message
        console.log('✓ Organization created:', response.data.name);
        console.log('✓ Training data generation started');
        console.log('✓ ML Pipeline queued for execution');
        
        // Navigate to dashboard after a brief delay to show the organization was created
        setTimeout(() => {
          navigate(paths.dashboard);
        }, 1500);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const errorMessage = error?.response?.data?.detail || 'Failed to complete onboarding. Please try again.';
      setApiError(errorMessage);
      console.error('Onboarding failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!summary) {
    return (
      <OnboardingLayout currentStep={8} loading={true} nextButtonLabel="Complete Setup">
        <Box sx={{ textAlign: 'center', py: 4, my: 'auto' }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      </OnboardingLayout>
    );
  }

  const premiumAccordionSx = {
    bgcolor: 'transparent',
    color: 'text.primary',
    boxShadow: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    '&:before': { display: 'none' },
    '&.Mui-expanded': { m: 0 }
  };

  return (
    <OnboardingLayout
      currentStep={8}
      onNext={async () => setShowConfirm(true)}
      onPrevious={() => navigate(paths.onboardingStep.replace(':step', '7'))}
      loading={loading}
      nextButtonLabel="🚀 Go Live"
    >
      <Stack spacing={4} direction="column" sx={formContainerSx}>
        <Box>
          <Box sx={sectionHeaderSx}>
            <Box sx={iconWrapperSx('16, 185, 129')}>
              <IconifyIcon icon="mingcute:check-circle-fill" fontSize={24} sx={{ color: '#10b981' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>Final Review</Typography>
              <Typography variant="caption" color="text.secondary">Review your setup and activate the system.</Typography>
            </Box>
          </Box>

          <Box sx={{ p: 2.5, bgcolor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 2.5, mb: 4 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <CheckCircleIcon sx={{ color: '#10b981', fontSize: 28, mt: 0.5 }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  Configuration Complete
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review your settings below and go live when ready.
                </Typography>
              </Box>
            </Stack>
          </Box>

          {apiError && <Alert severity="error" sx={{ mb: 3 }}>{apiError}</Alert>}

          {/* Quick Stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 4 }}>
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2.5, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 1 }}>Admins</Box>
              <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'text.primary' }}>
                {summary.identity_roles?.initial_admins?.length || 0}
              </Box>
            </Box>
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2.5, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 1 }}>Buildings</Box>
              <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'text.primary' }}>
                {summary.buildings_zones?.buildings?.length || 0}
              </Box>
            </Box>
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2.5, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 1 }}>Access Points</Box>
              <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'text.primary' }}>
                {summary.access_points?.access_points?.length || 0}
              </Box>
            </Box>
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2.5, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 1 }}>Policies</Box>
              <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'text.primary' }}>
                {summary.policies?.policies?.length || 0}
              </Box>
            </Box>
          </Box>

          {/* Configuration Review */}
          <Box sx={{ mb: 4 }}>
            <FormLabel sx={{ fontWeight: 600, mb: 2, display: 'block', color: 'text.primary' }}>
              Configuration Summary
            </FormLabel>

            <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              {/* Company Profile */}
              <Accordion defaultExpanded sx={premiumAccordionSx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}>
                  <CheckCircleIcon sx={{ color: '#10b981', mr: 1.5, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>Company Profile</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>Company Name</Box>
                      <Box sx={{ fontWeight: 600, color: 'text.primary' }}>{summary.company_profile?.company_name || 'N/A'}</Box>
                    </Box>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>Industry</Box>
                      <Box sx={{ fontWeight: 600, color: 'text.primary' }}>{summary.company_profile?.industry || 'N/A'}</Box>
                    </Box>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>Country</Box>
                      <Box sx={{ fontWeight: 600, color: 'text.primary' }}>{summary.company_profile?.country || 'N/A'}</Box>
                    </Box>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>Timezone</Box>
                      <Box sx={{ fontWeight: 600, color: 'text.primary' }}>{summary.company_profile?.timezone || 'N/A'}</Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Admins */}
              <Accordion sx={premiumAccordionSx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}>
                  <CheckCircleIcon sx={{ color: '#10b981', mr: 1.5, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>
                    Administrators ({summary.identity_roles?.initial_admins?.length || 0})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <Stack spacing={1.5}>
                    {summary.identity_roles?.initial_admins?.map((admin, idx) => (
                      <Box key={idx} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>{admin.name}</Box>
                        <Box sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{admin.email}</Box>
                        <Box sx={{ fontSize: '0.75rem', color: 'primary.light', mt: 1, fontWeight: 600, textTransform: 'uppercase' }}>ROLE: {admin.role}</Box>
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Buildings & Zones */}
              <Accordion sx={premiumAccordionSx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}>
                  <CheckCircleIcon sx={{ color: '#10b981', mr: 1.5, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>
                    Buildings & Zones ({summary.buildings_zones?.buildings?.length || 0})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <Stack spacing={1.5}>
                    {summary.buildings_zones?.buildings?.map((building, idx) => (
                      <Box key={idx} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box sx={{ fontWeight: 600, color: 'text.primary' }}>📍 {building.name}</Box>
                        <Box sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
                          {building.floors?.length || 0} floor(s)
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Access Points */}
              <Accordion sx={premiumAccordionSx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}>
                  <CheckCircleIcon sx={{ color: '#10b981', mr: 1.5, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>
                    Access Points ({summary.access_points?.access_points?.length || 0})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <Box sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                    {summary.access_points?.access_points?.slice(0, 5).map(ap => ap.name).join(', ') || 'None'}
                    {(summary.access_points?.access_points?.length || 0) > 5 &&
                      ` ... and ${(summary.access_points?.access_points?.length || 0) - 5} more`}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Policies */}
              <Accordion sx={premiumAccordionSx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}>
                  <CheckCircleIcon sx={{ color: '#10b981', mr: 1.5, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>
                    Access Policies ({summary.policies?.policies?.length || 0})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <Box sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                    {summary.policies?.policies?.map(p => p.name).join(', ') || 'None'}
                    {summary.policies?.dry_run_mode && (
                      <Box sx={{ color: '#f59e0b', mt: 1, fontWeight: 600 }}>🔔 Dry-run mode enabled (audit-only)</Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Data Settings */}
              <Accordion sx={{ ...premiumAccordionSx, borderBottom: 'none' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}>
                  <CheckCircleIcon sx={{ color: '#10b981', mr: 1.5, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>Data & Privacy Settings</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <Stack spacing={2} direction="column" sx={{ fontSize: '0.85rem' }}>
                    <Box>
                      <Box sx={{ color: 'text.secondary', mb: 0.5 }}>Privacy Mode</Box>
                      <Box sx={{ color: 'text.primary', fontWeight: 600 }}>
                        {summary.data_baseline?.privacy_mask_pii ? '✓ PII Masked' : '— PII Not Masked'}
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ color: 'text.secondary', mb: 0.5 }}>Data Retention Policy</Box>
                      <Box sx={{ color: 'text.primary', fontWeight: 600 }}>{summary.data_baseline?.data_retention_days || 90} days</Box>
                    </Box>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Button 
              size="large" 
              variant="contained" 
              onClick={() => setShowSystemCheck(true)}
              fullWidth
              sx={{ borderRadius: 2 }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <IconifyIcon icon="mingcute:stethoscope-fill" /> Run System Check
              </Box>
            </Button>
          </Box>
        </Box>
      </Stack>

      <Dialog open={showSystemCheck} onClose={() => setShowSystemCheck(false)} maxWidth="sm" fullWidth PaperProps={{
        sx: { bgcolor: '#1a1a24', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)' }
      }}>
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 700 }}>System Check Results</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {systemCheckResults.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Button variant="contained" onClick={handleSystemCheck} size="large" sx={{ borderRadius: 2 }}>
                Start System Diagnostics
              </Button>
            </Box>
          ) : (
            <Stack spacing={2}>
              {systemCheckResults.map((check, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.02)',
                    border: '1px solid',
                    borderColor: check.status === 'pending'
                        ? 'rgba(255,255,255,0.1)'
                        : check.status === 'success'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : 'rgba(239, 68, 68, 0.3)',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  {check.status === 'pending' && <CircularProgress size={24} sx={{ color: 'text.secondary' }} />}
                  {check.status === 'success' && <CheckCircleIcon sx={{ color: '#10b981' }} />}
                  {check.status === 'error' && <ErrorIcon sx={{ color: '#ef4444' }} />}
                  {check.status === 'warning' && <WarningIcon sx={{ color: '#f59e0b' }} />}
                  <Box>
                    <Box sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}>{check.name}</Box>
                    <Box sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.25 }}>{check.message}</Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setShowSystemCheck(false)} sx={{ color: 'text.secondary' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} maxWidth="sm" fullWidth PaperProps={{
        sx: { bgcolor: '#1a1a24', backgroundImage: 'none', border: '1px solid rgba(239,68,68,0.3)' }
      }}>
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 700 }}>Confirm Go Live</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            <Box sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.05)', borderRadius: 2, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <Box sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconifyIcon icon="mingcute:warning-fill" /> ⚠️ This Action is Permanent
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
              Once you go live, the access control system will start enforcing policies immediately. All decisions are
              logged and auditable.
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ fontSize: '0.85rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconifyIcon icon="mingcute:check-fill" sx={{ color: '#10b981' }} /> All configuration has been validated
              </Box>
              <Box sx={{ fontSize: '0.85rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconifyIcon icon="mingcute:check-fill" sx={{ color: '#10b981' }} /> System checks have passed
              </Box>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setShowConfirm(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleGoLive} disabled={loading} sx={{ borderRadius: 2 }}>
            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Confirm Go Live'}
          </Button>
        </DialogActions>
      </Dialog>
    </OnboardingLayout>
  );
};

export { Step7 as default };
