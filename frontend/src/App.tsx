import React, { useState } from 'react';
import{
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
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
    },
});

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    

    return (        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}



const App: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);

    const [loggedUserEmail, setLoggedUserEmail] = useState<string>(""); // email do usuário logado

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ flexGrow: 1 }}>
                <AppBar position="static">
                    <Toolbar>
                        <Security sx={{ mr: 2 }} />
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            Sistema de Acesso facial
                        </Typography>
                    </Toolbar>
                    </AppBar>

                <Container maxWidth="lg" sx={{ mt: 4 , mb: 4 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={currentTab} onChange={handleTabChange} centered>
                            <Tab
                                icon={<DashboardIcon />}
                                iconPosition="start"
                                label="Dashboard"
                                id="tab-0"
                                aria-controls="tabpanel-0"
                            />
                            <Tab
                                icon={<Camera />}
                                label="Controle de acesso"
                                id="tab-1"
                                aria-controls="tabpanel-1"
                            />
                            <Tab
                                icon={<People />}
                                label="Gerenciamento de usuários"
                                id="tab-2"
                                aria-controls="tabpanel-2"
                            />
                            <Tab
                            icon={<Description />}
                            label="Documentos"
                            id="tab-3"
                            aria-controls="tabpanel-3"
                        />
                        </Tabs>
                        
                    </Box>

                    <TabPanel value={currentTab} index={0}>
                        <Dashboard />
                    </TabPanel>

                    <TabPanel value={currentTab} index={1}>
                        <CameraAccess onAccessResult={(email) => setLoggedUserEmail(email)}/>
                    </TabPanel>

                    <TabPanel value={currentTab} index={2}>
                        <UserManagement />
                    </TabPanel>

                    <TabPanel value={currentTab} index={3}>
                         <DocumentsManagements userEmail={loggedUserEmail} />
                    </TabPanel>
                </Container>
            </Box>
        </ThemeProvider>
    );
};

export default App;