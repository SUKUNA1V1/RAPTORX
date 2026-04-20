import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import IconifyIcon from 'components/base/IconifyIcon';
import { ONBOARDING_STEPS } from 'lib/onboarding';
import paths from 'routes/paths';
import Fade from '@mui/material/Fade';
import Divider from '@mui/material/Divider';

interface OnboardingLayoutProps {
  currentStep: number;
  children: ReactNode;
  onNext?: () => Promise<void>;
  onPrevious?: () => void;
  isFirstStep?: boolean;

  nextButtonLabel?: string;
  loading?: boolean;
}


const SIDEBAR_CONTENT: Record<number, { title: string; description: string; illustration?: string }> = {
  1: {
    title: 'Company Profile',
    description: 'Tell us about your organization. This helps personalize your experience and ensures compliance.',
    illustration: '/illustrations/company.svg',
  },
  2: {
    title: 'Identity & Roles',
    description: 'Set up your first administrators and define their roles. Security starts with the right people.',
    illustration: '/illustrations/identity.svg',
  },
  3: {
    title: 'Buildings & Zones',
    description: 'Map your physical spaces for granular access control.',
    illustration: '/illustrations/buildings.svg',
  },
  4: {
    title: 'Access Points',
    description: 'Configure doors, readers, and gates. Each access point can have unique rules.',
    illustration: '/illustrations/access.svg',
  },
  5: {
    title: 'Access Policies',
    description: 'Define who can go where, and when. Policies are the heart of your access control.',
    illustration: '/illustrations/policy.svg',
  },
  6: {
    title: 'Data Settings',
    description: 'Set privacy, retention, and AI learning options for your organization.',
    illustration: '/illustrations/data.svg',
  },
  7: {
    title: 'Review & Apply',
    description: 'Review your setup and go live! You can always adjust settings later.',
    illustration: '/illustrations/review.svg',
  },
};

const OnboardingLayout = ({
  currentStep,
  children,
  onNext,
  onPrevious,
  isFirstStep = false,
  nextButtonLabel = 'Next',
  loading = false,
}: OnboardingLayoutProps) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleNext = async () => {
    if (onNext) {
      await onNext();
    } else if (currentStep < 7) {
      navigate(paths.onboardingStep.replace(':step', String(currentStep + 1)));
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else if (currentStep > 1) {
      navigate(paths.onboardingStep.replace(':step', String(currentStep - 1)));
    }
  };

  const sidebar = SIDEBAR_CONTENT[currentStep] || {};

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', py: { xs: 2, md: 5 }, px: { xs: 0, md: 2 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 5,
          border: '1.5px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.10)',
          minHeight: 600,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* Sidebar */}
        <Fade in timeout={600}>
          <Box
            sx={{
              width: { xs: '100%', md: 340 },
              bgcolor: 'primary.lighter',
              color: 'primary.dark',
              px: { xs: 3, md: 4 },
              py: { xs: 3, md: 5 },
              borderRight: { md: '1.5px solid' },
              borderColor: { md: 'divider' },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: { md: 600 },
              gap: 3,
            }}
          >
            <Box sx={{ mb: 2 }}>
              <IconifyIcon icon="mingcute:rocket-line" fontSize={48} sx={{ color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1, color: 'primary.main', textAlign: 'center' }}>
              {sidebar.title || 'Onboarding'}
            </Typography>
            <Typography variant="body1" sx={{ color: 'primary.dark', opacity: 0.85, textAlign: 'center', mb: 2 }}>
              {sidebar.description}
            </Typography>
            {sidebar.illustration && (
              <Box
                component="img"
                src={sidebar.illustration}
                alt="Onboarding Illustration"
                sx={{ width: '100%', maxWidth: 220, mt: 2, borderRadius: 2, boxShadow: 2 }}
              />
            )}
          </Box>
        </Fade>

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Stepper */}
          <Box sx={{ px: { xs: 2, md: 5 }, pt: { xs: 2, md: 4 }, pb: 2, bgcolor: 'background.default', borderBottom: '1.5px solid', borderColor: 'divider' }}>
            <Stepper activeStep={currentStep - 1} alternativeLabel sx={{
              '& .MuiStepLabel-label': { fontWeight: 700, fontSize: 15 },
              '& .MuiStepIcon-root': {
                transition: 'all 0.3s',
                fontSize: 30,
                '&.Mui-active': { color: theme.palette.primary.main },
                '&.Mui-completed': { color: theme.palette.success.main },
              },
              mb: 1,
            }}>
              {ONBOARDING_STEPS.map((step, index) => {
                const isActive = index === currentStep - 1;
                const isCompleted = index < currentStep - 1;
                return (
                  <Step key={step.step} completed={isCompleted}>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          ...(isActive && { color: 'primary.main', transform: 'scale(1.15)' }),
                          ...(isCompleted && { color: 'success.main' }),
                          transition: 'all 0.3s',
                        }
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={isActive ? 800 : 600}
                        color={isActive ? 'primary.main' : 'text.secondary'}
                        sx={{ letterSpacing: 0.2 }}
                      >
                        {step.title}
                      </Typography>
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>
          </Box>

          {/* Content Box */}
          <Fade in timeout={400}>
            <Box sx={{ px: { xs: 2, md: 6 }, py: { xs: 3, md: 5 }, minHeight: 350, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {children}
            </Box>
          </Fade>

          {/* Footer Actions */}
          <Divider sx={{ mt: 'auto' }} />
          <Box sx={{ px: { xs: 2, md: 6 }, py: 3, bgcolor: 'background.default', borderTop: 'none' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
              <Button
                variant="outlined"
                onClick={handlePrevious}
                disabled={isFirstStep || loading}
                startIcon={<IconifyIcon icon="mingcute:left-line" />}
                sx={{ px: 3, py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: 16, minWidth: 140 }}
              >
                Previous
              </Button>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="text"
                  onClick={() => navigate(paths.dashboard)}
                  disabled={loading}
                  color="inherit"
                  sx={{ px: 3, fontWeight: 600, fontSize: 16 }}
                >
                  Cancel Setup
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={loading}
                  endIcon={!loading ? <IconifyIcon icon="mingcute:right-line" /> : null}
                  sx={{
                    px: 5,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 800,
                    fontSize: 18,
                    boxShadow: '0 6px 18px rgba(99, 102, 241, 0.13)',
                    textTransform: 'none',
                    letterSpacing: 0.5,
                  }}
                >
                  {loading ? 'Processing...' : nextButtonLabel}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default OnboardingLayout;
