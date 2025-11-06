import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Grid,
    Alert,
    Chip,
    CircularProgress,
} from '@mui/material';
import {
    AccessTime,
    CheckCircle,
    Cancel,
    Group,
    Assessment,
} from '@mui/icons-material';
import { apiService, AccessLog, Stats } from '../services/api';

const Dashboard: React.FC = () => {
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [logsData, statsData] = await Promise.all([
                apiService.getAccessLogs(20),
                apiService.getStats(),
            ]);
            setLogs(logsData);
            setStats(statsData);
        } catch (err: any) {
            setError('Erro ao carregar dados: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // Atualizar dados a cada 30 segundos
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const getAccessChip = (granted: boolean) => {
        return granted ? (
            <Chip icon={<CheckCircle />} label="Liberado" color="success" size="small" />
        ) : (
            <Chip icon={<Cancel />} label="Negado" color="error" size="small" />
        );
    };

    if (loading && !stats) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Estatísticas */}
            {stats && (
                <Grid container spacing={3} mb={4}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Group sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                                <Typography variant="h4" component="div">
                                    {stats.total_authorized_users}
                                </Typography>
                                <Typography color="text.secondary">Usuários Autorizados</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Assessment sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                                <Typography variant="h4" component="div">
                                    {stats.total_access_attempts}
                                </Typography>
                                <Typography color="text.secondary">Total de Tentativas</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                                <Typography variant="h4" component="div">
                                    {stats.granted_attempts}
                                </Typography>
                                <Typography color="text.secondary">Acessos Liberados</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Cancel sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                                <Typography variant="h4" component="div">
                                    {stats.denied_attempts}
                                </Typography>
                                <Typography color="text.secondary">Acessos Negados</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
                
            )}
            <Grid item xs={12} sm={6} md={3}>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                    <Cancel sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" component="div">
                        {stats?.current_lockouts ?? 0}
                    </Typography>
                    <Typography color="text.secondary">Bloqueios Ativos</Typography>
                    </CardContent>
                </Card>
            </Grid>


            {/* Log de Acessos */}
            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={3}>
                        <AccessTime />
                        <Typography variant="h5" component="h2">
                            Últimas Tentativas de Acesso
                        </Typography>
                        {loading && <CircularProgress size={20} />}
                    </Box>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Data/Hora</TableCell>
                                    <TableCell>Usuário</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                    <TableCell align="center">Confiança</TableCell>
                                    <TableCell align="center">Tipo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            <Typography variant="body2" color="textSecondary">
                                                Nenhuma tentativa de acesso registrada
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                                            <TableCell>{log.user_name || 'Não identificado'}</TableCell>
                                            <TableCell align="center">{getAccessChip(log.access_granted)}</TableCell>
                                            <TableCell align="center">{log.confidence_score || '-'}</TableCell>
                                            <TableCell align="center">
                                                {log.access_type === 'lockout' ? (
                                                <Chip label="Bloqueio" color="warning" size="small" />
                                                ) : (
                                                <Chip label={log.access_type || '—'} size="small" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Dashboard;