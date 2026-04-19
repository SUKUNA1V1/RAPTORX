import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import paths from 'routes/paths';
import { OnboardingManager } from 'lib/onboarding';
import { useState } from 'react';

const Step3 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    setLoading(true);
    await OnboardingManager.saveDraft(3, {});
    navigate(paths.onboardingStep.replace(':step', '4'));
    setLoading(false);
  };
  return (
    <OnboardingLayout currentStep={3} onNext={handleNext} onPrevious={() => navigate(paths.onboardingStep.replace(':step', '2'))} loading={loading}>
      <Box sx={{ p: 2 }}>Buildings & Zones configuration</Box>
    </OnboardingLayout>
  );
};

const Step4 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    setLoading(true);
    await OnboardingManager.saveDraft(4, {});
    navigate(paths.onboardingStep.replace(':step', '5'));
    setLoading(false);
  };
  return (
    <OnboardingLayout currentStep={4} onNext={handleNext} onPrevious={() => navigate(paths.onboardingStep.replace(':step', '3'))} loading={loading}>
      <Box sx={{ p: 2 }}>Access Points configuration</Box>
    </OnboardingLayout>
  );
};

const Step5 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    setLoading(true);
    await OnboardingManager.saveDraft(5, {});
    navigate(paths.onboardingStep.replace(':step', '6'));
    setLoading(false);
  };
  return (
    <OnboardingLayout currentStep={5} onNext={handleNext} onPrevious={() => navigate(paths.onboardingStep.replace(':step', '4'))} loading={loading}>
      <Box sx={{ p: 2 }}>Access Policies configuration</Box>
    </OnboardingLayout>
  );
};

const Step6 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    setLoading(true);
    await OnboardingManager.saveDraft(6, {});
    navigate(paths.onboardingStep.replace(':step', '7'));
    setLoading(false);
  };
  return (
    <OnboardingLayout currentStep={6} onNext={handleNext} onPrevious={() => navigate(paths.onboardingStep.replace(':step', '5'))} loading={loading}>
      <Box sx={{ p: 2 }}>Data & Privacy settings</Box>
    </OnboardingLayout>
  );
};

const Step7 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    setLoading(true);
    await OnboardingManager.apply({});
    navigate(paths.dashboard);
    setLoading(false);
  };
  return (
    <OnboardingLayout currentStep={7} onNext={handleNext} onPrevious={() => navigate(paths.onboardingStep.replace(':step', '6'))} loading={loading} nextButtonLabel="Complete Setup">
      <Box sx={{ p: 2 }}>Review and apply configuration</Box>
    </OnboardingLayout>
  );
};

export { Step3, Step4, Step5, Step6, Step7 };
