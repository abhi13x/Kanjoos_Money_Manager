export const NoDataView: React.FC = () => {
    return (
        <Card 
          sx={{ 
            p: 8, 
            textAlign: 'center', 
            border: '1px solid', 
            borderColor: 'divider', 
            boxShadow: 'none', 
            borderRadius: '24px',
            bgcolor: 'background.paper',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          <ReceiptText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            No Transactions Found
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Try adjusting your date filters or add a new transaction entry.
          </Typography>
        </Card>
    );
}