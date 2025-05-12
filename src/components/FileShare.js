import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Card, Table, Modal, ModalDialog, ModalClose, Divider, Textarea, CircularProgress, IconButton } from '@mui/joy';
import { uploadFileToStorage, getFiles, deleteFileFromStorage } from '../firebase/config';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '../firebase/config';
import { doc, deleteDoc } from 'firebase/firestore';
import { storage } from '../firebase/config';

import Snackbar from '@mui/joy/Snackbar';
import Tooltip from '@mui/joy/Tooltip';

const FileShare = (props) => {
  // ...existing state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [deleteSnackbar, setDeleteSnackbar] = useState({ open: false, message: '', color: 'success' });

  // ...existing code

  // View file handler
  const handleViewFile = async (file) => {
    try {
      if (file.downloadURL) {
        window.open(file.downloadURL, '_blank');
        return;
      }
      // Fallback for legacy files
      const filePath = `Workspaces/${props.workspaceId}/department/${props.departmentId || (props.department && props.department.id)}/files/${file.documentId}/${file.file_name}`;
      const fileRef = storageRef(storage, filePath);
      const url = await getDownloadURL(fileRef);
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to open file: ' + (err && err.message ? err.message : err));
    }
  };

  // Delete file handler
  const handleDeleteFile = async (file) => {
    if (!file) return;
    setDeletingFileId(file.file_id);
    try {
      // Determine file path (use only file_name for storage, as per actual bucket)
      const filePath = `Workspaces/${props.workspaceId}/department/${props.departmentId || (props.department && props.department.id)}/files/${file.documentId}/${file.file_name}`;
      await deleteFileFromStorage(filePath);
      // Remove file metadata from files array
      const { arrayRemove, getDoc, deleteDoc, updateDoc } = await import('firebase/firestore');
      const fileDocRef = doc(db, 'Workspaces', props.workspaceId, 'department', props.departmentId || (props.department && props.department.id), 'files', file.documentId);
      await updateDoc(fileDocRef, {
        files: arrayRemove({
          file_id: file.file_id,
          file_name: file.file_name,
          file_description: file.file_description,
          uploaded_by: file.uploaded_by,
          time: file.time,
          downloadURL: file.downloadURL,
          documentId: file.documentId
        })
      });
      // If the array is now empty, delete the document
      const snap = await getDoc(fileDocRef);
      if (snap.exists() && (!snap.data().files || snap.data().files.length === 0)) {
        await deleteDoc(fileDocRef);
      }
      setDeleteSnackbar({ open: true, message: 'File deleted successfully!', color: 'success' });
      fetchFiles(); // Refresh file list
    } catch (err) {
      setDeleteSnackbar({ open: true, message: 'Failed to delete file: ' + (err && err.message ? err.message : err), color: 'danger' });
    } finally {
      setDeletingFileId(null);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  // Open delete confirmation dialog
  const confirmDeleteFile = (file) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  // Accept both legacy and new prop signatures
  const { workspaceId, departmentId: propDepartmentId, currentUser, department } = props;
  // departmentId can come from props or from department.id
  const departmentId = propDepartmentId || (department && department.id);

  // Reminder: Professional logging practices should be used in production code.
  // console.log statements should be removed or replaced with logging mechanisms.

  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  // For file upload modal
  const [selectedFile, setSelectedFile] = useState(null);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [fileDescription, setFileDescription] = useState('');
  // Snackbar for upload success
  const [showUploadSnackbar, setShowUploadSnackbar] = useState(false);

  // For editing file descriptions (existing files)
  const [editingFile, setEditingFile] = useState(null);
  const [editedDescription, setEditedDescription] = useState('');

  // Handler for saving file description (existing files)
  const handleSaveDescription = () => {
    // TODO: Implement saving logic for editing existing description
    setEditingFile(null);
    setEditedDescription('');
  };

  // Handler for confirming upload from modal
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const file = selectedFile;
      const description = fileDescription || 'No description added';
      // Use today's date as documentId in YYYY-MM-DD format
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const documentId = `${yyyy}-${mm}-${dd}`;
      // Use a unique file_id (timestamp)
      const fileId = Date.now().toString();
      // Debug logging
      console.log('Uploading file:', {
        workspaceId,
        departmentId,
        file,
        documentId,
        fileId,
        storagePath: `Workspaces/${workspaceId}/department/${departmentId}/files/${documentId}/${file.name}`
      });
      // Upload to Storage (date folder + unique filename)
      const downloadURL = await uploadFileToStorage(file, `Workspaces/${workspaceId}/department/${departmentId}/files/${documentId}/${file.name}`);
      // Save metadata to Firestore as an array entry
      const { db, timestamp } = await import('../firebase/config');
      const { doc, updateDoc, setDoc, arrayUnion, getDoc } = await import('firebase/firestore');
      const fileDocRef = doc(db, 'Workspaces', workspaceId, 'department', departmentId, 'files', documentId);
      const fileMeta = {
        file_id: fileId,
        file_name: file.name,
        file_description: description,
        uploaded_by: currentUser ? { uid: currentUser.uid, name: currentUser.name || currentUser.displayName || 'Unknown' } : {},
        time: new Date().toISOString(),
        downloadURL,
        documentId
      };
      // If doc exists, update; else, create
      const docSnap = await getDoc(fileDocRef);
      if (docSnap.exists()) {
        await updateDoc(fileDocRef, {
          files: arrayUnion(fileMeta)
        });
      } else {
        await setDoc(fileDocRef, {
          files: [fileMeta]
        });
      }
      setShowUploadSnackbar(true);
      setDescriptionModalOpen(false);
      setSelectedFile(null);
      setFileDescription('');
      // Refresh file list immediately after upload
      fetchFiles();
    } catch (err) {
      console.error('File upload error:', err);
      alert('Upload failed: ' + (err && err.message ? err.message : err));
    }
    setUploading(false);
  };



  const fetchFiles = async () => {
    try {
      const filesData = await getFiles(workspaceId, departmentId); // { documentId: { files: [...] } }
      // Flatten all files arrays from all date documents
      const filesArr = Object.entries(filesData)
        .flatMap(([docId, docData]) =>
          (docData.files || []).map(file => ({ ...file, documentId: docId }))
        );
      setFiles(filesArr);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const [filesLoading, setFilesLoading] = useState(true);

  useEffect(() => {
    setFilesLoading(true);
    if (workspaceId && departmentId) {
      fetchFiles()
        .catch(() => {})
        .finally(() => setFilesLoading(false));
    } else {
      setFilesLoading(false);
    }
  }, [workspaceId, departmentId]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0] || event.dataTransfer?.files?.[0];
    console.log('handleFileUpload triggered, file:', file);
    if (!file) {
      alert('No file selected or dropped.');
      return;
    }
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed.');
      setDragActive(false);
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('File size must be 3MB or less.');
      setDragActive(false);
      return;
    }
    if (!workspaceId || !departmentId) {
      alert('Workspace or Department not selected.');
      setDragActive(false);
      return;
    }
    if (!currentUser) {
      alert('User not authenticated. Please sign in again.');
      setDragActive(false);
      return;
    }
    setSelectedFile(file);
    setDescriptionModalOpen(true);
    setDragActive(false);
  };


  const handleDownloadFile = async (fileId, fileName, documentId) => {
    try {
      // Match the upload path logic (date folder + unique filename)
      const filePath = `Workspaces/${workspaceId}/department/${departmentId}/files/${documentId}/${fileId}_${fileName}`;
      const fileRef = storageRef(storage, filePath);
      const url = await getDownloadURL(fileRef);
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to get download URL.');
    }
  };



  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (filesLoading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.surface', overflow: 'hidden', width: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.surface', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 2 }}>
          <Card
            variant="soft"
            color="primary"
            size="sm"
            sx={{ p: 1, gap: 0.5, '--Card-padding': '4px 8px' }}
          >
            <Typography level="body2">
              {files.length} {files.length === 1 ? 'File' : 'Files'}
            </Typography>
          </Card>
        </Box>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            p: 3,
            border: '2px dashed',
            borderColor: dragActive ? 'primary.500' : 'divider',
            borderRadius: 'lg',
            bgcolor: dragActive ? 'background.level2' : 'transparent',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <input
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            id="file-upload"
            onChange={handleFileUpload}
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
            <Typography
              level="body1"
              sx={{ color: 'text.secondary', mb: 1 }}
            >
              Drag and drop your PDF files here, or
            </Typography>
            <Button
              component="span"
              startDecorator="📄"
              sx={{ bgcolor: 'primary.500', '&:hover': { bgcolor: 'primary.600' } }}
            >
              Choose File
            </Button>
          </label>
      </Box>
    </Box>
    <Box
      sx={{
        flex: 1,
        overflowY: 'auto',
        p: 2,
      }}
    >
      {files.length > 0 ? (
        <Table sx={{ width: '100%', tableLayout: 'fixed', mb: 2, '& th, & td, & span, & p, & div': { color: 'white' } }}>
          <thead>
            <tr>
              <th>File</th>
              <th>Description</th>
              <th>Uploaded By</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, idx) => (
              <tr key={file.file_id || idx} style={{ height: 64 }}>
                <td style={{ minHeight: 64 }}>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <IconButton size="sm" color="primary" onClick={() => handleViewFile(file)} title="View PDF">
      <VisibilityIcon />
    </IconButton>
    <Tooltip title={file.file_name} variant="soft" arrow placement="top">
      <span style={{
        maxWidth: 180,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'inline-block',
        verticalAlign: 'middle',
        cursor: 'pointer'
      }}>{file.file_name}</span>
    </Tooltip>
  </Box>
</td>
                <td style={{
  maxWidth: 220,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minHeight: 64
}}>
  <Tooltip title={file.file_description} variant="soft" arrow placement="top">
    <span style={{
      maxWidth: 200,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-block',
      verticalAlign: 'middle',
      cursor: 'pointer'
    }}>{file.file_description}</span>
  </Tooltip>
</td>
                <td>{file.uploaded_by?.name}</td>
                <td>{formatDate(file.time)}</td>
                <td style={{ height: '100%' }}>
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
    <IconButton size="sm" variant="outlined" onClick={() => handleDownloadFile(file.file_id, file.file_name, file.documentId)} title="Download">
      <DownloadIcon sx={{ color: 'text.primary' }} />
    </IconButton>
    <IconButton size="sm" variant="outlined" color="danger" onClick={() => confirmDeleteFile(file)} title="Delete" disabled={deletingFileId === file.file_id}>
      {deletingFileId === file.file_id ? <CircularProgress size="sm" /> : <DeleteIcon />}
    </IconButton>
  </Box>
</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Typography>No files uploaded yet.</Typography>
      )}
    </Box>
    {/* Delete Confirmation Modal */}
    <Modal open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
      <ModalDialog>
        <Typography level="h5">Delete File</Typography>
        <Typography sx={{ mt: 1, mb: 2 }}>
          Are you sure you want to delete <b>{fileToDelete && fileToDelete.file_name}</b>? This action cannot be undone.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="neutral" onClick={() => setDeleteDialogOpen(false)} disabled={deletingFileId === (fileToDelete && fileToDelete.file_id)}>
            Cancel
          </Button>
          <Button color="danger"
            onClick={() => handleDeleteFile(fileToDelete)}
            loading={deletingFileId === (fileToDelete && fileToDelete.file_id)}
            disabled={deletingFileId === (fileToDelete && fileToDelete.file_id)}
          >
            {deletingFileId === (fileToDelete && fileToDelete.file_id) ? <CircularProgress size="sm" /> : "Delete"}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
    <Modal open={descriptionModalOpen} onClose={() => {
      if (!uploading) {
        setDescriptionModalOpen(false);
        setSelectedFile(null);
        setFileDescription('');
      }
    }}>
      <ModalDialog>
        <Typography level="h5">Add a Description</Typography>
        <Textarea
          minRows={3}
          value={fileDescription}
          onChange={e => setFileDescription(e.target.value)}
          placeholder="Enter a description for the file (optional)"
          sx={{ mt: 1, mb: 2 }}
          disabled={uploading}
        />
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="neutral" onClick={() => {
            if (!uploading) {
              setDescriptionModalOpen(false);
              setSelectedFile(null);
              setFileDescription('');
            }
          }} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleConfirmUpload} loading={uploading} disabled={uploading}>
            {uploading ? <CircularProgress size="sm" /> : 'Upload'}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
    <Snackbar
      open={showUploadSnackbar}
      autoHideDuration={3000}
      onClose={() => setShowUploadSnackbar(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      color="success"
      variant="soft"
    >
      File uploaded successfully!
    </Snackbar>
    <Modal open={!!editingFile} onClose={() => setEditingFile(null)}>
      <ModalDialog
        sx={{
          maxWidth: 500,
          borderRadius: 'md',
          p: 3,
          boxShadow: 'lg',
        }}
      >
        <Typography level="h5">Add a Description</Typography>
        <Textarea
          minRows={3}
          value={fileDescription}
          onChange={e => setFileDescription(e.target.value)}
          placeholder="Enter a description for the file (optional)"
          sx={{ mt: 1, mb: 2 }}
          disabled={uploading}
        />
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="neutral" onClick={() => {
            if (!uploading) {
              setDescriptionModalOpen(false);
              setSelectedFile(null);
              setFileDescription('');
            }
          }} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleConfirmUpload} loading={uploading} disabled={uploading}>
            {uploading ? <CircularProgress size="sm" /> : 'Upload'}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
    <Snackbar
      open={showUploadSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowUploadSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        color="success"
        variant="soft"
      >
        File uploaded successfully!
      </Snackbar>
      <Modal open={!!editingFile} onClose={() => setEditingFile(null)}>
        <ModalDialog
          sx={{
            maxWidth: 500,
            borderRadius: 'md',
            p: 3,
            boxShadow: 'lg',
          }}
        >
          <ModalClose />
          <Typography level="h4" component="h2" sx={{ mb: 2 }}>
            Add File Description
          </Typography>
          <Divider sx={{ my: 2 }} />
          {editingFile && (
            <Box sx={{ mb: 2 }}>
              <Typography level="body2" fontWeight="bold" sx={{ mb: 1 }}>
                {editingFile.name}
              </Typography>
              <Typography level="body3" sx={{ color: 'text.primary', mb: 2 }}>
                Please add a description for this file:
              </Typography>
              <Textarea
                placeholder="Enter file description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                minRows={4}
                sx={{ mb: 2, width: '100%', color: 'white' }}
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button 
                  variant="plain" 
                  color="neutral" 
                  onClick={() => {
                    setEditingFile(null);
                    // If it's a new file with no description yet, use the default text
                    if (editingFile.description === 'No description added' && !editedDescription.trim()) {
                      // No need to update anything, keep the default
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveDescription}>
                  Save Description
                </Button>
              </Box>
            </Box>
          )}
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default FileShare;