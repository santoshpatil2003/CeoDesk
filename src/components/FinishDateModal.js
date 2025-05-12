import React, { useState } from 'react';
import { Modal, ModalDialog, Typography, Button, Input, Box } from '@mui/joy';

const FinishDateModal = ({ open, onClose, onSubmit }) => {
  const [finishDate, setFinishDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!finishDate) return;
    onSubmit(finishDate);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ minWidth: 350 }}>
        <Typography level="h5" sx={{ mb: 2 }}>Set Finish Date</Typography>
        <form onSubmit={handleSubmit}>
          <Input
            type="datetime-local"
            value={finishDate}
            onChange={e => setFinishDate(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="plain" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" variant="solid">Set</Button>
          </Box>
        </form>
      </ModalDialog>
    </Modal>
  );
};

export default FinishDateModal;
