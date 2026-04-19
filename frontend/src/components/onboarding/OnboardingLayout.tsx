import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { ONBOARDING_STEPS } from 'lib/onboarding';
import paths from 'routes/paths';

interface OnboardingLayoutProps {
  currentStep: number;
  children: ReactNode;
  onNext?: () => Promise<void>;
  onPrevious?: () => void;
  isFirstStep?: boolean;

  nextButtonLabel?: string;
  loading?: boolean;
}

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

  return (
    <Stack spacing={4} sx={{ width: '100%', maxWidth: 900, mx: 'auto', py: 4, px: 2 }}>
      {/* Header */}
      <Box>
        <Typography variant="h3" fontWeight={800} gutterBottom>
          Enterprise Onboarding
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Set up your organization's access control system
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Stepper activeStep={currentStep - 1} sx={{ py: 2 }}>
        {ONBOARDING_STEPS.map((step) => (
          <Step key={step.step}>
            <StepLabel>{step.title}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Content */}
      <Box sx={{ minHeight: 300 }}>
        {children}
      </Box>

      {/* Navigation Buttons */}
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={handlePrevious}
          disabled={isFirstStep || loading}
        >
          Previous
        </Button>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={() => navigate(paths.dashboard)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Saving...' : nextButtonLabel}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default OnboardingLayout;
