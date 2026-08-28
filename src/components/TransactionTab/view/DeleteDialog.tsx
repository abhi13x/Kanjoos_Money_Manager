import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

export const DeleteDialog = (
  { deleteId,
    setDeleteId,
    handleDelete }: {
      deleteId: string | null; 
      setDeleteId: (id: string | null) => void; 
      handleDelete: () => void 
    }) => {
      return (<Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        slotProps={{
          paper: { 
            sx: { 
              borderRadius: '24px', 
              p: 1, 
              userSelect: 'none', 
              WebkitUserSelect: 'none' 
            }}
          }}
          >
            <DialogTitle 
            component="span" 
            sx={{ 
              fontWeight: 800, 
              pt: 2, 
              pb: 1, 
              display: 'block', 
              WebkitTapHighlightColor: 'transparent !important' 
            }}>
              Confirm Deletion
            </DialogTitle>
            <DialogContent>
              <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                WebkitTapHighlightColor: 'transparent !important' 
                }}>
                Are you sure you want to delete this transaction? This action will permanently remove it from Dexie storage.
              </Typography>
            </DialogContent>
            <DialogActions 
            sx={{ 
              p: 2, 
              gap: 1, 
              WebkitTapHighlightColor: 'transparent !important' 
              }}>
              {/* Cancel button - closes dialog without deleting */}
              <Button 
              onClick={() => setDeleteId(null)} 
              color="inherit" 
              sx={{ 
                borderRadius: '10px', 
                fontWeight: 700, 
                WebkitTapHighlightColor: 'transparent !important' 
              }}>
                Cancel
              </Button>
              {/* Delete button - confirms and processes transaction deletion */}
              <Button 
              onClick={handleDelete} 
              variant="contained" 
              color="error" 
              sx={{ 
                borderRadius: '10px', 
                fontWeight: 700, 
                WebkitTapHighlightColor: 'transparent !important' 
              }}>
                Delete Entry
              </Button>
            </DialogActions>
          </Dialog>
      );
    }