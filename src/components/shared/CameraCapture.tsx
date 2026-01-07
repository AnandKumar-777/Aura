
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CameraIcon, CameraOff, Circle, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         toast({
          variant: 'destructive',
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access.',
        });
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };

    getCameraPermission();

    return () => {
      // Stop camera stream when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleUsePhoto = () => {
    if (capturedImage && canvasRef.current) {
        canvasRef.current.toBlob(blob => {
            if (blob) {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);
            }
        }, 'image/jpeg');
    }
  };


  if (hasCameraPermission === false) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <CameraOff className="h-4 w-4" />
          <AlertTitle>Camera Access Required</AlertTitle>
          <AlertDescription>
            Camera access is denied or not supported. Please check your browser settings.
          </AlertDescription>
        </Alert>
         <Button onClick={onCancel} variant="outline" className="w-full mt-4">
            Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-black flex flex-col items-center justify-center">
      <div className="relative w-full aspect-video">
        {capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        ) : (
            <video ref={videoRef} className="w-full h-full object-contain" autoPlay muted playsInline />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="w-full p-4 bg-background/80 backdrop-blur-sm">
        {capturedImage ? (
          <div className="flex justify-between items-center gap-2">
            <Button onClick={handleRetake} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retake
            </Button>
            <Button onClick={handleUsePhoto} className="w-full">
              Use Photo
            </Button>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            <Button onClick={handleCapture} size="icon" className="w-16 h-16 rounded-full" aria-label="Capture photo">
              <Circle className="w-12 h-12 text-white fill-white" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
