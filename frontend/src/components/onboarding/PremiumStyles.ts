export const premiumInputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.02)',
    borderRadius: 2,
    transition: 'all 0.3s ease',
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '1px' },
    '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }
  },
  '& .MuiInputLabel-root': { color: 'text.secondary' }
};

export const formContainerSx = {
  maxWidth: 640,
  mx: 'auto',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
};

export const fieldStackSx = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  gap: 3,
};

export const sectionHeaderSx = {
  display: 'flex', 
  alignItems: 'center', 
  gap: 2, 
  mb: 3
};

export const iconWrapperSx = (color: string) => ({
  p: 1.5, 
  bgcolor: `rgba(${color}, 0.1)`, 
  borderRadius: 1.5, 
  display: 'flex'
});
