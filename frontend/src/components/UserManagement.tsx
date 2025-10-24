import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Alert,
    CircularProgress,
} from '@mui/material';
import { Add, Delete, PersonAdd } from '@mui/icons-material';
import { apiService, User } from '../services/api';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [newUser, setNewUser] = useState({ name: '', email: '' });
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    const loadUsers = async () => {
        try {
        setLoading(true);
        setError(null);
        const usersData = await apiService.getUsers();
        setUsers(usersData);
        } catch (err: any) {
        setError(err.message || 'Failed to load users');
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleAddUser = async () => {
        setOpenDialog(true);
        setNewUser({ name: '', email: '' });
        setSelectedImage(null);
        setError(null);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setNewUser({ name: '', email: '' });
        setSelectedImage(null);
        setError(null);
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type.startsWith('image/')) {
            setSelectedImage(file);
            setError(null);
            } else {
            setError('Por favor, selecione uma imagem válida.');
            event.target.value = '';
            }
        }
    };

    const handleSubmit = async () => {
        if (!newUser.name || !newUser.email || !selectedImage) {
        setError('Por favor, preencha todos os campos e selecione uma imagem.');
        return;
        }

        setSubmitting(true);
        setError(null);

        try {
        await apiService.registerUser(newUser.name, newUser.email, selectedImage);
        handleCloseDialog();
        loadUsers();
        } catch (err: any) {
          if (err.response?.data?.detail) {
            setError(err.response.data.detail);
            } else {
            setError(err.message || 'Erro ao cadastrar usuário.');
            }
        } finally {
        setSubmitting(false);
        }  
    };

    const handleDeleteUser = async (userId: number, username?: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir o usuário ${username || ''}?`)) {
            return;
        }
        try {
            await apiService.deleteUser(userId);
            loadUsers();
        } catch (err: any) {
            setError(err.message || 'Erro ao excluir usuário.');
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" component="h2">
                    Usuários autorizados
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleAddUser}>
                    Adicionar Usuário
                </Button>
            </Box>
        );
    }

    return (
        <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" component="h2">
                    Usuários autorizados
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleAddUser}>
                    Adicionar Usuário
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Data de Registro</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    <Typography variant="body2" color="textSecondary">
                                        Nenhum usuário cadastrado.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDeleteUser(user.id, user.name)}
                                            title="Excluir Usuário"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <PersonAdd />
                        Adicionar Novo Usuário
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ pt: 1 }}>
                        <TextField
                            fullWidth
                            label="Nome"
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            margin="normal"
                            required
                        />
                        <Box mt={2}>
                            <Typography variant="body2" gutterBottom>
                                Foto do Usuário
                            </Typography>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ width: '100%', padding: '8px' }}
                            />
                            {selectedImage && (
                                <Typography variant="body2" mt={1} color="primary">
                                    Selecionado: {selectedImage.name}
                                </Typography>
                            )}
                        </Box>
                        {error && (
                            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                Cadastrando...
                            </>
                        ) : (
                            'Cadastrar'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default UserManagement;