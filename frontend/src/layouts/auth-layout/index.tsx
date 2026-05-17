import { PropsWithChildren } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <Stack
      component="main"
      alignItems="center"
      justifyContent="center"
      sx={{
        minHeight: '100vh',
        width: 1,
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at center, #1a1b35 0%, #0d0e21 100%)',
        px: 2,
      }}
    >
      {/* Background blobs for depth */}
      <Box
        sx={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          top: '-150px',
          right: '-150px',
          filter: 'blur(100px)',
          opacity: 0.15,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
          bottom: '-200px',
          left: '-200px',
          filter: 'blur(120px)',
          opacity: 0.1,
        }}
      />

      <Paper
        elevation={0}
        sx={{
          py: 5,
          px: 4,
          width: 1,
          maxWidth: 460,
          background: 'rgba(255, 255, 255, 0.01)',
          backdropFilter: 'blur(25px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 5,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          zIndex: 1,
        }}
      >
        {children}
      </Paper>
    </Stack>
  );
};

export default AuthLayout;
