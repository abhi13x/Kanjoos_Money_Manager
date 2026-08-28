import { Box, styled } from '@mui/material';

export const IosSafeAreaLayoutContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100vh',
  overflowX: 'hidden',
  // Integrates Apple frame borders cleanly
  paddingTop: 'env(safe-area-inset-top, 0px)',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
}));