import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Add, Download } from "@mui/icons-material";
import { apiService, Document, DocumentLevel } from "../services/api";

interface Props {
  userEmail: string;
}

const DocumentsManagement: React.FC<Props> = ({ userEmail }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: "",
    description: "",
    documentLevel: "LIVRE",
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Normaliza o erro sempre como string
  const extractErrorMessage = (err: any): string =>
    err?.response?.data?.detail
      ? Array.isArray(err.response.data.detail)
        ? err.response.data.detail.map((d: any) => d.msg).join(", ")
        : JSON.stringify(err.response.data.detail)
      : err.message || "Erro desconhecido";

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDocuments(userEmail);
      setDocuments(response.documents);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchDocuments();
    }
  }, [userEmail]);

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await apiService.downloadDocument(doc.id, userEmail);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", doc.filename);
      link.click();
    } catch (err: any) {
      setError(extractErrorMessage(err));
    }
  };

  const handleUpload = async () => {
    if (!file || !newDoc.title.trim()) {
      setError("Preencha o título e selecione um arquivo");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiService.uploadDocuments(
        newDoc.title,
        newDoc.description,
        newDoc.documentLevel as DocumentLevel,
        userEmail,
        file
      );

      setUploadDialogOpen(false);
      setFile(null);
      setNewDoc({ title: "", description: "", documentLevel: "LIVRE" });
      await fetchDocuments();
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getLevelChip = (level: string) => {
    const map: any = {
      LIVRE: { label: "Livre", color: "success" },
      RESTRITO: { label: "Restrito", color: "warning" },
      CONFIDENCIAL: { label: "Confidencial", color: "error" },
    };

    const cfg = map[level] || { label: level, color: "default" };
    return <Chip label={cfg.label} color={cfg.color} size="small" />;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Documentos ({documents.length})</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setUploadDialogOpen(true)}>
          Novo Documento
        </Button>
      </Box>

      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <List>
        {!loading && documents.length === 0 ? (
          <Typography>Nenhum documento disponível.</Typography>
        ) : (
          documents.map((doc) => (
            <ListItem
              key={doc.id}
              secondaryAction={
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={() => handleDownload(doc)}
                >
                  Baixar
                </Button>
              }
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    {doc.title}
                    {getLevelChip(doc.document_level)}
                  </Box>
                }
                secondary={doc.description}
              />
            </ListItem>
          ))
        )}
      </List>

      {/* Dialog upload */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo Documento</DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            value={newDoc.title}
            onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
            required
            margin="normal"
          />
          <TextField
            label="Descrição"
            fullWidth
            value={newDoc.description}
            onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Nível</InputLabel>
            <Select
              value={newDoc.documentLevel}
              onChange={(e) =>
                setNewDoc({
                  ...newDoc,
                  documentLevel: e.target.value as DocumentLevel
                })
              }
              >

              <MenuItem value="LIVRE">LIVRE</MenuItem>
              <MenuItem value="RESTRITO">RESTRITO</MenuItem>
              <MenuItem value="CONFIDENCIAL">CONFIDENCIAL</MenuItem>
            </Select>
          </FormControl>

          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ marginTop: 10 }} />
          {file && <Typography mt={1}>Selecionado: {file.name}</Typography>}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleUpload} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : "Enviar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsManagement;
