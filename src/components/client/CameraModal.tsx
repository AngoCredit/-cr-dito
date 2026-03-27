import React, { useRef, useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCcw, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CameraModalProps {
    trigger: React.ReactNode;
    onCapture: (file: File) => void;
}

export function CameraModal({ trigger, onCapture }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const [hasError, setHasError] = useState(false);

    const startCamera = async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const constraints = {
                video: { 
                    facingMode: "user",
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 }
                },
                audio: false
            };
            
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            setStream(mediaStream);
            setHasError(false);
        } catch (err) {
            console.error("Camera error:", err);
            setHasError(true);
            toast.error("Não foi possível aceder à câmara. Verifique as permissões.");
            // Do NOT call setIsOpen(false) here, let the user retry
        } finally {
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    useEffect(() => {
        if (isOpen && !capturedImage) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, capturedImage]);

    // Separate effect to ensure srcObject is set when video element is ready
    useEffect(() => {
        if (stream && videoRef.current && !capturedImage) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => console.error("Video play error:", err));
        }
    }, [stream, capturedImage, videoRef.current]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                // Ensure canvas matches video resolution
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                
                // Flip horizontally to match the mirrored preview
                context.translate(canvasRef.current.width, 0);
                context.scale(-1, 1);
                
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
                setCapturedImage(dataUrl);
            }
        }
    };

    const handleConfirm = () => {
        if (capturedImage) {
            // Convert dataUrl to File
            fetch(capturedImage)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                    onCapture(file);
                    setIsOpen(false);
                    setCapturedImage(null);
                });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
                setCapturedImage(null);
                stopCamera();
            }
        }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] focus:outline-none">
                <DialogHeader className="p-8 pb-4">
                    <DialogTitle className="font-display text-2xl font-bold text-primary flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Camera className="w-5 h-5 text-primary" />
                        </div>
                        Verificação Facial
                    </DialogTitle>
                </DialogHeader>

                <div className="relative aspect-[3/4] bg-slate-100 flex items-center justify-center overflow-hidden mx-8 rounded-3xl border-2 border-slate-50">
                    {hasError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50 z-20">
                            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                            <h3 className="text-slate-900 font-bold mb-2">Acesso à Câmara Negado</h3>
                            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
                                Não conseguimos aceder à sua câmara. Certifique-se de que deu permissão no seu navegador ou tente novamente.
                            </p>
                            <Button onClick={startCamera} className="rounded-xl gradient-primary h-12 px-8 font-bold gap-2">
                                <RefreshCcw className="w-4 h-4" /> Tentar Novamente
                            </Button>
                        </div>
                    ) : isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-slate-50/80 backdrop-blur-sm transition-all duration-300">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Iniciando Câmara...</p>
                        </div>
                    ) : !capturedImage ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                    ) : (
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-full object-cover animate-in fade-in duration-300"
                        />
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Face Guide Overlay */}
                    {!capturedImage && !isLoading && (
                        <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none flex items-center justify-center">
                            <div className="w-[80%] h-[70%] border-2 border-white/50 border-dashed rounded-[100%] shadow-[0_0_0_100vw_rgba(0,0,0,0.2)]" />
                        </div>
                    )}
                </div>

                <div className="p-8 pt-6 flex justify-center items-center gap-4">
                    {!capturedImage ? (
                        <div className="flex flex-col items-center gap-4 w-full">
                            <p className="text-xs text-slate-400 font-medium italic">Enquadre o seu rosto no guia acima</p>
                            <Button
                                onClick={handleCapture}
                                className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 shadow-xl flex items-center justify-center p-0 group active:scale-95 transition-all"
                                disabled={isLoading}
                            >
                                <div className="w-12 h-12 rounded-full border-2 border-white/50 group-hover:border-white transition-colors" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-4 w-full">
                            <Button
                                variant="outline"
                                onClick={() => setCapturedImage(null)}
                                className="flex-1 h-14 rounded-2xl border-slate-200 font-bold gap-2 text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                <RefreshCcw className="w-4 h-4" /> Repetir
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                className="flex-1 h-14 rounded-2xl gradient-primary shadow-lg font-bold gap-2 active:scale-95 transition-all"
                            >
                                <Check className="w-4 h-4" /> Usar Esta Foto
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
