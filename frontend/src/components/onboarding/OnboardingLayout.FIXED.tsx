/**
 * FIXES APPLIED:
 * - Fixed: handleNext() now catches errors from onNext() and displays them
 * - Fixed: Added keyboard event support (Enter to proceed, Escape to cancel)
 * - Fixed: Added proper async/await error handling for next button
 * - Fixed: Added loading state management for better UX
 * - Fixed: Added aria-labels for accessibility
 * - Fixed: Previous button properly handles errors if onPrevious throws
 */

import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import IconifyIcon from 'components/base/IconifyIcon';
import { ONBOARDING_STEPS } from 'lib/onboarding';
import paths from 'routes/paths';
import Fade from '@mui/material/Fade';

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
    illustration: '/raptorx/illustrations/company.png',
  },
  2: {
    title: 'Identity & Roles',
    description: 'Set up your first administrators and define their roles. Security starts with the right people.',
    illustration: '/raptorx/illustrations/identity.png',
  },
  3: {
    title: 'Buildings & Zones',
    description: 'Map your physical spaces for granular access control.',
    illustration: '/raptorx/illustrations/buildings.png',
  },
  4: {
    title: 'Access Points',
    description: 'Configure doors, readers, and gates. Each access point can have unique rules.',
    illustration: '/raptorx/illustrations/access.png',
  },
  5: {
    title: 'Access Policies',
    description: 'Define who can go where, and when. Policies are the heart of your access control.',
    illustration: '/raptorx/illustrations/policy.png',
  },
  6: {
    title: 'Data Settings',
    description: 'Set privacy, retention, and AI learning options for your organization.',
    illustration: '/raptorx/illustrations/data.png',
  },
  7: {
    title: 'Review & Apply',
    description: 'Review your setup and go live! You can always adjust settings later.',
    illustration: '/raptorx/illustrations/review.png',
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
  const [error, setError] = useState('');
  const [nextLoading, setNextLoading] = useState(false);

  // BUG FIX: Improved error handling for next button
  const handleNext = async () => {
    setError('');
    setNextLoading(true);
    
    try {
      if (onNext) {
        await onNext();
      } else if (currentStep < 7) {
        navigate(paths.onboardingStep.replace(':step', String(currentStep + 1)));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to proceed to next step';
      setError(errorMsg);
      console.error('Next button error:', err);
    } finally {
      setNextLoading(false);
    }
  };

  // BUG FIX: Improved error handling for previous button
  const handlePrevious = () => {
    setError('');
    
    try {
      if (onPrevious) {
        onPrevious();
      } else if (currentStep > 1) {
        navigate(paths.onboardingStep.replace(':step', String(currentStep - 1)));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to go to previous step';
      setError(errorMsg);
      console.error('Previous button error:', err);
    }
  };

  // BUG FIX: Keyboard event handling for better UX
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !nextLoading && !loading) {
      e.preventDefault();
      void handleNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      navigate(paths.dashboard);
    }
  };

  const sidebar = SIDEBAR_CONTENT[currentStep] || {};
  const isProcessing = loading || nextLoading;

  return (
    <Box 
      sx={{ 
        width: '100%', 
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #09090b 0%, #171723 100%)',
        overflow: 'hidden',
        py: { xs: 2, md: 5 }, 
        px: { xs: 0, md: 2 } 
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Background ambient glowing orbs */}
      <Box sx={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        filter: 'blur(60px)',
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: '-20%',
        right: '-10%',
        width: '60vw',
        height: '60vw',
        background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        filter: 'blur(80px)',
      }} />

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 1300,
          borderRadius: 6,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: 'rgba(20, 20, 25, 0.65)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: 700,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Sidebar */}
        <Fade in timeout={800}>
          <Box
            sx={{
              width: { xs: '100%', md: 420 },
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              borderRight: { md: '1px solid rgba(255,255,255,0.06)' },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: { xs: 4, md: 6 },
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, alignSelf: 'flex-start', mb: 6 }}>
              <IconifyIcon icon="mingcute:shield-flash-fill" fontSize={32} sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', letterSpacing: 1 }}>
                RAPTOR X
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'left', width: '100%', mb: 5 }}>
              <Typography variant="h4" fontWeight={800} sx={{ 
                mb: 2, 
                background: 'linear-gradient(90deg, #fff, #a8a8bb)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {sidebar.title || 'Onboarding'}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7, fontSize: '1.05rem' }}>
                {sidebar.description}
              </Typography>
            </Box>

            {sidebar.illustration && (
              <Box
                component="img"
                src={sidebar.illustration}
                alt={sidebar.title}
                sx={{ 
                  width: '100%', 
                  maxWidth: 320, 
                  mt: 'auto',
                  borderRadius: 4,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'transform 0.5s ease',
                  '&:hover': {
                    transform: 'scale(1.02) translateY(-5px)'
                  }
                }}
              />
            )}
          </Box>
        </Fade>

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          {/* Stepper */}
          <Box sx={{ px: { xs: 3, md: 6 }, pt: { xs: 4, md: 5 }, pb: 3, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Stepper activeStep={currentStep - 1} alternativeLabel sx={{
              '& .MuiStepLabel-label': { fontWeight: 600, fontSize: 13, mt: 1 },
              '& .MuiStepIcon-root': {
                transition: 'all 0.4s ease',
                width: 28,
                height: 28,
                color: 'rgba(255,255,255,0.1)',
                '&.Mui-active': { 
                  color: theme.palette.primary.main,
                  filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.6))'
                },
                '&.Mui-completed': { 
                  color: theme.palette.success.main 
                },
              },
              '& .MuiStepConnector-line': {
                borderColor: 'rgba(255,255,255,0.1)',
                transition: 'all 0.4s ease',
              }
            }}>
              {ONBOARDING_STEPS.map((step, index) => {
                const isActive = index === currentStep - 1;
                const isCompleted = index < currentStep - 1;
                return (
                  <Step key={step.step} completed={isCompleted}>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          ...(isActive && { transform: 'scale(1.2)' }),
                        }
                      }}
                      aria-label={`Step ${step.step}: ${step.title}`}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={isActive ? 800 : 500}
                        color={isActive ? 'text.primary' : 'text.disabled'}
                        sx={{ transition: 'color 0.3s' }}
                      >
                        {step.title}
                      </Typography>
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>
          </Box>

          {/* Error Alert */}
          {error && (
            <Box sx={{ px: { xs: 3, md: 8 }, pt: 3 }}>
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            </Box>
          )}

          {/* Content Box */}
          <Fade in timeout={600} key={currentStep}>
            <Box sx={{ px: { xs: 3, md: 8 }, py: { xs: 4, md: 6 }, flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {children}
            </Box>
          </Fade>

          {/* Footer Actions */}
          <Box sx={{ 
            px: { xs: 3, md: 8 }, 
            py: 4, 
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
              <Button
                variant="outlined"
                onClick={handlePrevious}
                disabled={isFirstStep || isProcessing}
                startIcon={<IconifyIcon icon="mingcute:arrow-left-line" />}
                sx={{ 
                  px: 4, py: 1.5, 
                  borderRadius: 3, 
                  fontWeight: 600, 
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.3)',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: 'text.primary'
                  }
                }}
                aria-label="Go to previous step"
              >
                Back
              </Button>

              <Stack direction="row" spacing={3} alignItems="center">
                <Button
                  variant="text"
                  onClick={() => navigate(paths.dashboard)}
                  disabled={isProcessing}
                  sx={{ 
                    px: 3, fontWeight: 600, color: 'text.disabled',
                    '&:hover': { color: 'error.light', bgcolor: 'transparent' }
                  }}
                  aria-label="Exit onboarding"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={() => void handleNext()}
                  disabled={isProcessing}
                  endIcon={!isProcessing ? <IconifyIcon icon="mingcute:arrow-right-line" /> : <IconifyIcon icon="mingcute:loading-fill" className="spin" />}
                  sx={{
                    px: 5, py: 1.5,
                    borderRadius: 3,
                    fontWeight: 700,
                    fontSize: '1rem',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(99, 102, 241, 0.6)',
                    },
                    '&:disabled': {
                      opacity: 0.6,
                    }
                  }}
                  aria-label={`${nextButtonLabel} (or press Enter)`}
                >
                  {isProcessing ? 'Processing...' : nextButtonLabel}
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
