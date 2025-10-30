import React, { useState } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Container,
    Tabs,
    Tab,
    Box,
    ThemeProvider,
    createTheme,
    CssBaseline,
} from '@mui/material';
import { Security, Dashboard as DashboardIcon, People, Camera, Description } from '@mui/icons-material';

import Dashboard from './components/Dashboard';
import CameraAccess from './components/CameraAccess';
import UserManagement from './components/UserManagement';
import DocumentsManagements from './components/DocumentsManagement';

const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
    },
});

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const App: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [loggedUserEmail, setLoggedUserEmail] = useState<string>('');
    const [accessLevel, setAccessLevel] = useState<string>(''); // BASICO | INTERMEDIARIO | TOTAL

    // troca de aba
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    // função chamada quando o reconhecimento facial é bem-sucedido
    const handleAccessResult = async (email: string) => {
        setLoggedUserEmail(email);

        try {
            // Busca o nível de acesso do usuário reconhecido
            const response = await fetch(`http://localhost:8000/api/users/email/${email}`);
            const data = await response.json();
            setAccessLevel(data.access_level); // BASICO, INTERMEDIARIO ou TOTAL
        } catch (error) {
            console.error('Erro ao buscar nível de acesso:', error);
        }
    };

    // Define quais abas ficam visíveis de acordo com o estado
    const getTabsByAccess = () => {
        // Antes de reconhecer → apenas controle de acesso
        if (!loggedUserEmail) {
            return [
                {
                    label: 'Controle de acesso',
                    icon: <Camera />,
                    component: <CameraAccess onAccessResult={handleAccessResult} />,
                },
            ];
        }

        // Após reconhecimento → BASICO e INTERMEDIARIO
        if (accessLevel === 'BASICO' || accessLevel === 'INTERMEDIARIO') {
            return [
                {
                    label: 'Controle de acesso',
                    icon: <Camera />,
                    component: <CameraAccess onAccessResult={handleAccessResult} />,
                },
                {
                    label: 'Documentos',
                    icon: <Description />,
                    component: <DocumentsManagements userEmail={loggedUserEmail} />,
                },
            ];
        }

        // Usuário TOTAL → todas as abas
        if (accessLevel === 'TOTAL') {
            return [
                {
                    label: 'Dashboard',
                    icon: <DashboardIcon />,
                    component: <Dashboard />,
                },
                {
                    label: 'Controle de acesso',
                    icon: <Camera />,
                    component: <CameraAccess onAccessResult={handleAccessResult} />,
                },
                {
                    label: 'Gerenciamento de usuários',
                    icon: <People />,
                    component: <UserManagement />,
                },
                {
                    label: 'Documentos',
                    icon: <Description />,
                    component: <DocumentsManagements userEmail={loggedUserEmail} />,
                },
            ];
        }

        // fallback (caso backend não retorne nível)
        return [
            {
                label: 'Controle de acesso',
                icon: <Camera />,
                component: <CameraAccess onAccessResult={handleAccessResult} />,
            },
        ];
    };

    const availableTabs = getTabsByAccess();

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ flexGrow: 1 }}>
                <AppBar position="static">
                    <Toolbar>
                        <Security sx={{ mr: 2 }} />
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            Sistema de Acesso Facial
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={currentTab >= availableTabs.length ? 0 : currentTab}
                            onChange={handleTabChange}
                            centered
                        >
                            {availableTabs.map((tab, index) => (
                                <Tab
                                    key={index}
                                    icon={tab.icon}
                                    iconPosition="start"
                                    label={tab.label}
                                    id={`tab-${index}`}
                                    aria-controls={`tabpanel-${index}`}
                                />
                            ))}
                        </Tabs>
                    </Box>

                    {availableTabs.map((tab, index) => (
                        <TabPanel key={index} value={currentTab} index={index}>
                            {tab.component}
                        </TabPanel>
                    ))}
                </Container>
            </Box>
        </ThemeProvider>
    );
};

export default App;
