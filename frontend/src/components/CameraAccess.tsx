import React, { useState, useRef, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Chip,
} from '@mui/material';
import { CameraAlt, CheckCircle, Cancel } from '@mui/icons-material';
import { apiService, AccessResponse } from '../services/api';

interface CameraAccessProps {
    onAccessResult?: (email: string) => void;
}

const CameraAccess: React.FC<CameraAccessProps> = ({ onAccessResult }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<AccessResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const startCamera = useCallback(async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setIsCameraActive(true);
            }
        } catch (err) {
            setError('Erro ao acessar a câmera. Verifique as permissões.');
            console.error('Erro ao acessar câmera:', err);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
            setIsCameraActive(false);
        }
    }, [stream]);

    const captureImage = useCallback((): Promise<File | null> => {
        return new Promise((resolve) => {
            if (!videoRef.current || !canvasRef.current) {
                resolve(null);
                return;
            }
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const context = canvas.getContext('2d');
            if (!context) {
                resolve(null);
                return;
            }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
                    resolve(file);
                } else {
                    resolve(null);
                }
            }, 'image/jpeg', 0.8);
        });
    }, []);

    const checkAccess = useCallback(async () => {
        if (!isCameraActive) {
            setError('Ative a câmera primeiro');
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const imageFile = await captureImage();
            if (!imageFile) {
                throw new Error('Não foi possível capturar a imagem');
            }
            const result = await apiService.checkAccess(imageFile);
            setLastResult(result);
            if (result.access_granted && result.user_email){
                 onAccessResult?.(result.user_email);
            }
            //onAccessResult?.(result);
        } catch (err: any) {
            setError(err.message || 'Erro ao verificar acesso');
            console.error('Erro na verificação:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [isCameraActive, captureImage, onAccessResult]);

    const getResultIcon = () => {
        if (!lastResult) return null;
        return lastResult.access_granted ? (
            <CheckCircle sx={{ color: 'success.main', fontSize: 40 }} />
        ) : (
            <Cancel sx={{ color: 'error.main', fontSize: 40 }} />
        );
    };

    const getResultColor = () => {
        if (!lastResult) return 'default';
        return lastResult.access_granted ? 'success' : 'error';
    };

    return (
        <Card sx={{ maxWidth: 500, margin: 'auto', mt: 4 }}>
            <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                    Controle de Acesso
                </Typography>
                <Box sx={{ position: 'relative', mb: 2 }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        width={480}
                        height={360}
                        style={{ borderRadius: 8, backgroundColor: '#f0f0f0', display: isCameraActive ? 'block' : 'none' }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {!isCameraActive && (
                        <Box
                            sx={{
                                width: 480,
                                height: 360,
                                backgroundColor: '#fefefe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 2,
                                border: '2px dashed #ccc',
                            }}
                        >
                            <Typography variant="body1" color="textSecondary">
                                Câmera inativa
                            </Typography>
                        </Box>
                    )}
                </Box>
                {/* Controles */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
                    {!isCameraActive ? (
                        <Button
                            variant="contained"
                            startIcon={<CameraAlt />}
                            onClick={startCamera}
                            size="large"
                        >
                            Ativar Câmera
                        </Button>
                    ) : (
                        <Button
                            variant="outlined"
                            onClick={stopCamera}
                            size="large"
                        >
                            Parar Câmera
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={checkAccess}
                        disabled={isProcessing || !isCameraActive}
                        size="large"
                    >
                        {isProcessing ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                Verificando...
                            </>
                        ) : (
                            'Verificar Acesso'
                        )}
                    </Button>
                </Box>
                {/* Resultado */}
                {lastResult && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                        {getResultIcon()}
                        <Chip
                            label={lastResult.access_granted ? 'ACESSO LIBERADO' : 'ACESSO NEGADO'}
                            color={getResultColor() as any}
                            sx={{ fontSize: 18, mb: 1, mt: 1, px: 2 }}
                        />
                        <Typography variant="body2" color="textSecondary">
                            Confiança: {' '}
                            {lastResult?.confidence_score 
                            ? parseFloat(String(lastResult.confidence_score).replace('%', '')).toFixed(1)
                            : 'N/A%'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {lastResult.message}
                        </Typography>
                    </Box>
                )}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default CameraAccess;
