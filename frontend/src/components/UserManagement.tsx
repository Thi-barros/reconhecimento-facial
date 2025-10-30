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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
} from '@mui/material';
import { Add, Delete, PersonAdd, Edit } from '@mui/icons-material';
import { apiService, User, AccessLevel, UserUpdate } from '../services/api';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    //const [newUser, setNewUser] = useState({ name: '', email: '' });
    const [editDialog, setEditDialog] =useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newUser, setNewUser]= useState({
        name: '',
        email: '',
        accessLevel: AccessLevel.BASICO
    });
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
        setNewUser({ name: '', email: '', accessLevel: AccessLevel.BASICO });
        setSelectedImage(null);
        setError(null);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setEditDialog(true);
        setError(null);
    }

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditDialog(false);
        setSelectedUser(null);
        setNewUser({ name: '', email: '', accessLevel: AccessLevel.BASICO });
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
        await apiService.registerUser(newUser.name, newUser.email, newUser.accessLevel, selectedImage);
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

    const handleUpdateUser  =async () => {
        if(!selectedUser) return;

        setSubmitting(true);
        setError(null);

        try{
            const updateData: UserUpdate = {
                name: selectedUser.name,
                access_level: selectedUser.access_level,
                is_active: selectedUser.is_active
            };

            await apiService.updateUser(selectedUser.id, updateData);
            await loadUsers();
        }catch (err: any){
            if(err.response?.data?.detail){
                setError(err.response.data.detail);
            }else {
                setError('Erro ao atualizar usuário: ' + (err.message || 'Erro desconhecido'));
            }
        }finally {
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

    const getAccessLevelChip = (level: AccessLevel) => {
        const configs = {
            [AccessLevel.BASICO]: {color: 'info' as const, label: 'Básico' },
            [AccessLevel.INTERMEDIARIO]: { color: 'warning' as const, label: 'Intermediário' },
            [AccessLevel.TOTAL]: { color: 'success' as const, label: 'Total'}
        };

        return (
            <Chip
                label={configs[level].label}
                color={configs[level].color as any} 
                size="small"
            />
        );
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
                            <TableCell align="center">Nível de acesso</TableCell>
                            <TableCell>Data de Registro</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
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
                                    <TableCell align="center">
                                        {getAccessLevelChip(user.access_level)}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            color="primary"
                                            onClick={() => handleEditUser(user)}
                                            title="Editar usuário"
                                            sx={{ mr: 1 }}
                                        >
                                            <Edit />
                                        </IconButton>
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
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Nível de acesso</InputLabel>
                            <Select
                            value={newUser.accessLevel}
                            onChange={(e) => setNewUser({ ...newUser, accessLevel: e.target.value as AccessLevel}) }
                            label="Nível de acesso"
                            >
                                <MenuItem value={AccessLevel.BASICO}>
                                    <Box>
                                        <Typography>BASICO</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Acesso apenas a documentos livres
                                        </Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value={AccessLevel.INTERMEDIARIO}>
                                    <Box>
                                        <Typography>INTERMEDIARIO</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Acesso a documentos livres e restritos
                                        </Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value={AccessLevel.TOTAL}>
                                    <Box>
                                        <Typography>TOTAL</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Acesso a todos os documentos
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>
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

            {/* Diálogo de Edição */}
            <Dialog open={editDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Edit />
                        Editar Usuário
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedUser && (
                        <Box component="form" sx={{ pt: 1 }}>
                            <TextField
                            fullWidth
                            label="Nome"
                            value={selectedUser.name}
                            onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value})}
                            margin="normal"
                            required
                            />
                            <TextField
                            fullWidth
                            label="Email"
                            value={selectedUser.email}
                            onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value})}
                            margin="normal"
                            disabled
                            helperText="Email não pode ser alterado"
                            />
                            <FormControl fullWidth margin="normal">
                                <InputLabel> Nível de Acesso</InputLabel>
                                <Select
                                value={selectedUser.access_level}
                                onChange={(e) => setSelectedUser({ ...selectedUser, access_level: e.target.value as AccessLevel})}
                                label="Nível de acesso"
                                >
                                    <MenuItem value={AccessLevel.BASICO}>
                                        <Box>
                                            <Typography> BASICO </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                Acesso apenas a documentos livres
                                            </Typography>
                                        </Box>
                                    </MenuItem>

                                    <MenuItem value={AccessLevel.INTERMEDIARIO}>
                                        <Box>
                                            <Typography> INTERMEDIARIO </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                Acesso a documentos livres e restritos
                                            </Typography>
                                        </Box>
                                    </MenuItem>

                                    <MenuItem value={AccessLevel.TOTAL}>
                                        <Box>
                                            <Typography> TOTAL </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                Acesso a todos os documentos
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                    
                                </Select>
                            </FormControl>
                            {error && (
                                <Alert severity="error" sx={{ mt: 2}}>
                                    {error}
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}> Cancelar </Button>
                    <Button
                        onClick={handleUpdateUser}
                        variant="contained"
                        disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <CircularProgress size = {20} sx={{ mr: 1 }}/>
                                    Atualizando...
                                </>
                            ) : (
                                'Atualizar'
                            )}
                        </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default UserManagement;