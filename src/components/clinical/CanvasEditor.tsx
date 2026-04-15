'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { DrawingUtils, FaceLandmarker, type NormalizedLandmark, type ImageSource } from '@mediapipe/tasks-vision';
import { mediaPipeService } from '@/services/mediapipe';
import styles from './CanvasEditor.module.css';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/useMediaQuery';

const MAX_W = 1920;
const MAX_H = 1440;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

interface CanvasEditorProps {
  onImageChange?: (hasImage: boolean) => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ onImageChange }) => {
  const fabricCanvasElRef = useRef<HTMLCanvasElement>(null);
  const mediapipeCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [canvasSize, setCanvasSize] = useState({ width: MAX_W, height: MAX_H });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [landmarksVisible, setLandmarksVisible] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [anatomiaOpen, setAnatomiaOpen] = useState(false);
  const [ossosVisible, setOssosVisible] = useState(false);
  const [ossosOpacity, setOssosOpacity] = useState(0.2);
  const [ossosRotation, setOssosRotation] = useState(0);
  const [musculosVisible, setMusculosVisible] = useState(false);
  const [musculosOpacity, setMusculosOpacity] = useState(0.6);
  const [musculosRotation, setMusculosRotation] = useState(0);
  const [gorduraVisible, setGorduraVisible] = useState(false);
  const [gorduraOpacity, setGorduraOpacity] = useState(0.6);
  const [gorduraRotation, setGorduraRotation] = useState(0);
  const [gorduraView, setGorduraView] = useState<'frontal' | 'obliqua'>('frontal');
  const [vasosVisible, setVasosVisible] = useState(false);
  const [vasosOpacity, setVasosOpacity] = useState(0.8);
  const [vasosRotation, setVasosRotation] = useState(0);
  const [vasosView, setVasosView] = useState<'frontal' | 'obliqua'>('frontal');
  const [nervosVisible, setNervosVisible] = useState(false);
  const [nervosOpacity, setNervosOpacity] = useState(0.8);
  const [nervosRotation, setNervosRotation] = useState(0);
  const [nervosView, setNervosView] = useState<'frontal' | 'obliqua'>('frontal');
  const [anatomiaView, setAnatomiaView] = useState<'frontal' | 'obliqua'>('frontal');

  const imageRef = useRef<ImageSource | null>(null);
  const cachedLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const ossosVisibleRef = useRef(false);
  const ossosImgRef = useRef<HTMLImageElement | null>(null);
  const ossosProcessedRef = useRef<HTMLCanvasElement | null>(null);

  // Pan drag state — refs to avoid stale closures in event handlers
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const bonesFabricRef = useRef<fabric.Image | null>(null);
  const musclesFabricRef = useRef<fabric.Image | null>(null);
  const fatFabricRef = useRef<fabric.Image | null>(null);
  const vasosFabricRef = useRef<fabric.Image | null>(null);
  const nervosFabricRef = useRef<fabric.Image | null>(null);

  const musculosImgRef = useRef<HTMLImageElement | null>(null);
  const musculosProcessedRef = useRef<HTMLCanvasElement | null>(null);
  const gorduraImgFrontalRef = useRef<HTMLImageElement | null>(null);
  const gorduraImgObliquaRef = useRef<HTMLImageElement | null>(null);
  const gorduraProcessedFrontalRef = useRef<HTMLCanvasElement | null>(null);
  const gorduraProcessedObliquaRef = useRef<HTMLCanvasElement | null>(null);
  const vasosImgFrontalRef = useRef<HTMLImageElement | null>(null);
  const vasosImgObliquaRef = useRef<HTMLImageElement | null>(null);
  const vasosProcessedFrontalRef = useRef<HTMLCanvasElement | null>(null);
  const vasosProcessedObliquaRef = useRef<HTMLCanvasElement | null>(null);
  const nervosImgFrontalRef = useRef<HTMLImageElement | null>(null);
  const nervosImgObliquaRef = useRef<HTMLImageElement | null>(null);
  const nervosProcessedFrontalRef = useRef<HTMLCanvasElement | null>(null);
  const nervosProcessedObliquaRef = useRef<HTMLCanvasElement | null>(null);

  // Tracks whether mouse is over a Fabric annotation — if yes, skip pan
  const isOverFabricObject = useRef(false);

  const { user } = useAuth();

  // Preload bones overlay — remove white background via pixel processing
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ossosImgRef.current = img; // fallback bruto sempre disponível
      try {
        const tmp = document.createElement('canvas');
        tmp.width = img.naturalWidth;
        tmp.height = img.naturalHeight;
        const ctx = tmp.getContext('2d', { willReadFrequently: true });
        if (!ctx) { console.warn('[Ossos] getContext falhou'); return; }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, tmp.width, tmp.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (r > 220 && g > 220 && b > 220) d[i + 3] = 0;
        }
        ctx.putImageData(imageData, 0, 0);
        ossosProcessedRef.current = tmp;
        console.log('[Ossos] imagem processada OK:', tmp.width, 'x', tmp.height);
      } catch (err) {
        console.warn('[Ossos] falha no processamento de pixels, usando imagem bruta:', err);
      }
    };
    img.onerror = () => console.error('[Ossos] falha ao carregar /ossos_final.png');
    img.src = '/ossos_final.png';

    // Carrega a imagem de músculos
    const mImg = new Image();
    mImg.crossOrigin = 'anonymous';
    mImg.onload = () => {
      musculosImgRef.current = mImg;
      try {
        const tmp = document.createElement('canvas');
        tmp.width = mImg.naturalWidth;
        tmp.height = mImg.naturalHeight;
        const ctx = tmp.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(mImg, 0, 0);
        const imageData = ctx.getImageData(0, 0, tmp.width, tmp.height);
        const d = imageData.data;
        const centerX = tmp.width / 2;
        const centerY = tmp.height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY) * 0.9;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (r > 245 && g > 245 && b > 245) {
            d[i + 3] = 0;
          } else {
            const x = (i / 4) % tmp.width;
            const y = Math.floor((i / 4) / tmp.width);
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            const opacityFactor = Math.pow(1 - Math.min(dist / maxDist, 1), 1.5);
            d[i + 3] = Math.min(d[i + 3], d[i + 3] * opacityFactor);
          }
        }
        ctx.putImageData(imageData, 0, 0);
        musculosProcessedRef.current = tmp;
      } catch (e) {}
    };
    mImg.src = '/musculos_v2.png';

    // Carrega imagens de gordura (Frente e Oblíqua)
    const loadGordura = (url: string, imgRef: React.MutableRefObject<HTMLImageElement | null>, procRef: React.MutableRefObject<HTMLCanvasElement | null>) => {
      const gImg = new Image();
      gImg.crossOrigin = 'anonymous';
      gImg.onload = () => {
        imgRef.current = gImg;
        try {
          const tmp = document.createElement('canvas');
          tmp.width = gImg.naturalWidth;
          tmp.height = gImg.naturalHeight;
          const ctx = tmp.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(gImg, 0, 0);
          const imageData = ctx.getImageData(0, 0, tmp.width, tmp.height);
          const d = imageData.data;
          const centerX = tmp.width / 2;
          const centerY = tmp.height / 2;
          const maxDist = Math.sqrt(centerX * centerX + centerY * centerY) * 0.9;

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            if (r > 240 && g > 240 && b > 240) {
              d[i + 3] = 0;
            } else {
              const x = (i / 4) % tmp.width;
              const y = Math.floor((i / 4) / tmp.width);
              const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
              const opacityFactor = Math.pow(1 - Math.min(dist / maxDist, 1), 1.5);
              d[i + 3] = Math.min(d[i + 3], d[i + 3] * opacityFactor);
            }
          }
          ctx.putImageData(imageData, 0, 0);
          procRef.current = tmp;
        } catch (e) {}
      };
      gImg.src = url;
    };

    loadGordura('/gordura_frontal.png', gorduraImgFrontalRef, gorduraProcessedFrontalRef);
    loadGordura('/gordura_obliqua_v3.png', gorduraImgObliquaRef, gorduraProcessedObliquaRef);

    // Carrega imagens de vasos (Arteriais)
    const loadVasos = (url: string, imgRef: React.MutableRefObject<HTMLImageElement | null>, procRef: React.MutableRefObject<HTMLCanvasElement | null>) => {
      const vImg = new Image();
      vImg.crossOrigin = 'anonymous';
      vImg.onload = () => {
        imgRef.current = vImg;
        try {
          const tmp = document.createElement('canvas');
          tmp.width = vImg.naturalWidth;
          tmp.height = vImg.naturalHeight;
          const ctx = tmp.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(vImg, 0, 0);
          const imageData = ctx.getImageData(0, 0, tmp.width, tmp.height);
          const d = imageData.data;
          const centerX = tmp.width / 2;
          const centerY = tmp.height / 2;
          const maxDist = Math.sqrt(centerX * centerX + centerY * centerY) * 0.9;

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            if (r > 240 && g > 240 && b > 240) {
              d[i + 3] = 0;
            } else {
              const x = (i / 4) % tmp.width;
              const y = Math.floor((i / 4) / tmp.width);
              const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
              const opacityFactor = Math.pow(1 - Math.min(dist / maxDist, 1), 1.5);
              d[i + 3] = Math.min(d[i + 3], d[i + 3] * opacityFactor);
            }
          }
          ctx.putImageData(imageData, 0, 0);
          procRef.current = tmp;
        } catch (e) {}
      };
      vImg.src = url;
    };

    loadVasos('/vasos_frontal.png', vasosImgFrontalRef, vasosProcessedFrontalRef);
    loadVasos('/vasos_obliqua.png', vasosImgObliquaRef, vasosProcessedObliquaRef);

    // Carrega imagens de nervos (Trigêmeo e Facial)
    const loadNervos = (url: string, imgRef: React.MutableRefObject<HTMLImageElement | null>, procRef: React.MutableRefObject<HTMLCanvasElement | null>) => {
      const nImg = new Image();
      nImg.crossOrigin = 'anonymous';
      nImg.onload = () => {
        imgRef.current = nImg;
        try {
          const tmp = document.createElement('canvas');
          tmp.width = nImg.naturalWidth;
          tmp.height = nImg.naturalHeight;
          const ctx = tmp.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(nImg, 0, 0);
          const imageData = ctx.getImageData(0, 0, tmp.width, tmp.height);
          const d = imageData.data;
          const centerX = tmp.width / 2;
          const centerY = tmp.height / 2;
          const maxDist = Math.sqrt(centerX * centerX + centerY * centerY) * 0.9;

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            if (r > 240 && g > 240 && b > 240) {
              d[i + 3] = 0;
            } else {
              const x = (i / 4) % tmp.width;
              const y = Math.floor((i / 4) / tmp.width);
              const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
              const opacityFactor = Math.pow(1 - Math.min(dist / maxDist, 1), 1.5);
              d[i + 3] = Math.min(d[i + 3], d[i + 3] * opacityFactor);
            }
          }
          ctx.putImageData(imageData, 0, 0);
          procRef.current = tmp;
        } catch (e) {}
      };
      nImg.src = url;
    };

    loadNervos('/nervos_frontal.png', nervosImgFrontalRef, nervosProcessedFrontalRef);
    loadNervos('/nervos_obliqua.png', nervosImgObliquaRef, nervosProcessedObliquaRef);
  }, []);

  // Initialize Fabric.js once and wire hover tracking
  useEffect(() => {
    if (!fabricCanvasElRef.current || fabricRef.current) return;

    const fc = new fabric.Canvas(fabricCanvasElRef.current, {
      backgroundColor: 'transparent',
      width: MAX_W,
      height: MAX_H,
    });
    fabricRef.current = fc;

    const setOver = () => { isOverFabricObject.current = true; };
    const clearOver = () => { isOverFabricObject.current = false; };
    fc.on('mouse:over', setOver);
    fc.on('mouse:out', clearOver);

    return () => {
      fc.off('mouse:over', setOver);
      fc.off('mouse:out', clearOver);
      fc.dispose();
      fabricRef.current = null;
    };
  }, []);

  const applyCanvasSize = useCallback((w: number, h: number) => {
    const mpCanvas = mediapipeCanvasRef.current;
    if (mpCanvas) {
      mpCanvas.width = w;
      mpCanvas.height = h;
    }
    fabricRef.current?.setDimensions({ width: w, height: h });
    setCanvasSize({ width: w, height: h });
  }, []);

  const calculateBonesTransform = useCallback((landmarks: NormalizedLandmark[]) => {
    const W = canvasSize.width;
    const H = canvasSize.height;

    // rotation angle — line between eyes centers
    const lEx = ((landmarks[33].x + landmarks[133].x) / 2) * W;
    const lEy = ((landmarks[33].y + landmarks[133].y) / 2) * H;
    const rEx = ((landmarks[263].x + landmarks[362].x) / 2) * W;
    const rEy = ((landmarks[263].y + landmarks[362].y) / 2) * H;
    const angle = (Math.atan2(rEy - lEy, rEx - lEx) * 180) / Math.PI;

    // facial oval bounding box
    const OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,
                  397,365,379,378,400,377,152,148,176,149,150,136,
                  172,58,132,93,234,127,162,21,54,103,67,109];

    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const i of OVAL) {
      const lm = landmarks[i];
      if (lm.x < minX) minX = lm.x;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.y > maxY) maxY = lm.y;
    }

    const faceCx = ((minX + maxX) / 2) * W;
    const faceCy = ((minY + maxY) / 2) * H;
    const faceW  = (maxX - minX) * W  * 1.08;
    const faceH  = (maxY - minY) * H  * 1.08;

    return { faceCx, faceCy, faceW, faceH, angle };
  }, [canvasSize]);

  const drawPhoto = useCallback(() => {
    const img = imageRef.current;
    const mpCanvas = mediapipeCanvasRef.current;
    if (!img || !mpCanvas) return;
    const ctx = mpCanvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, mpCanvas.width, mpCanvas.height);
    ctx.drawImage(img as CanvasImageSource, 0, 0);
  }, []);

  const drawLandmarks = useCallback((landmarks: NormalizedLandmark[]) => {
    const mpCanvas = mediapipeCanvasRef.current;
    if (!mpCanvas) return;
    const ctx = mpCanvas.getContext('2d');
    if (!ctx) return;

    drawPhoto();

    const du = new DrawingUtils(ctx);
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: 'rgba(192,192,192,0.3)', lineWidth: 1 });
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,   { color: '#e0e0e0', lineWidth: 2 });
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,    { color: '#30ff30', lineWidth: 2 });
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,   { color: '#30ff30', lineWidth: 2 });
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,  { color: '#e0e0e0', lineWidth: 2 });
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: '#e0e0e0', lineWidth: 2 });
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,   { color: '#30cfcf', lineWidth: 2 });
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,  { color: '#30cfcf', lineWidth: 2 });
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS,        { color: '#ff6b6b', lineWidth: 2 });
    du.drawLandmarks(landmarks, { color: '#58a6ff', fillColor: '#58a6ff', lineWidth: 1, radius: 1.5 });
  }, [drawPhoto]);

  const resetView = useCallback(() => {
    panRef.current = { x: 0, y: 0 };
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const raw = await createImageBitmap(file);
      const scale = Math.min(MAX_W / raw.width, MAX_H / raw.height, 1);
      const w = Math.round(raw.width * scale);
      const h = Math.round(raw.height * scale);

      const scaled = await createImageBitmap(raw, 0, 0, raw.width, raw.height, {
        resizeWidth: w,
        resizeHeight: h,
        resizeQuality: 'high',
      });
      raw.close();

      imageRef.current = scaled;
      cachedLandmarksRef.current = null;

      applyCanvasSize(w, h);

      const mpCanvas = mediapipeCanvasRef.current;
      if (!mpCanvas) return;
      const ctx = mpCanvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(scaled, 0, 0);

      fabricRef.current?.clear();
      bonesFabricRef.current = null;
      musclesFabricRef.current = null;
      fatFabricRef.current = null;
      vasosFabricRef.current = null;
      nervosFabricRef.current = null;
      ossosVisibleRef.current = false;
      setOssosVisible(false);
      setMusculosVisible(false);
      setGorduraVisible(false);
      setVasosVisible(false);
      setNervosVisible(false);
      setLandmarksVisible(false);
      resetView();
      setHasImage(true);
      onImageChange?.(true);
    },
    [applyCanvasSize, resetView, onImageChange]
  );

  const handleToggleLandmarks = useCallback(async () => {
    if (landmarksVisible) {
      drawPhoto();
      setLandmarksVisible(false);
      return;
    }
    if (cachedLandmarksRef.current) {
      drawLandmarks(cachedLandmarksRef.current);
      setLandmarksVisible(true);
      return;
    }
    const img = imageRef.current;
    if (!img) return;
    setLoading(true);
    try {
      const result = await mediaPipeService.detect(img);
      if (!result || result.faceLandmarks.length === 0) {
        alert('Nenhuma face detectada na imagem.');
        return;
      }
      const landmarks = result.faceLandmarks[0];
      cachedLandmarksRef.current = landmarks;
      drawLandmarks(landmarks);
      setLandmarksVisible(true);
    } catch (err) {
      console.error('Detection error:', err);
      alert('Erro ao analisar a imagem.');
    } finally {
      setLoading(false);
    }
  }, [landmarksVisible, drawPhoto, drawLandmarks]);

  const handleToggleOssos = useCallback(async () => {
    if (ossosVisible) {
      ossosVisibleRef.current = false;
      setOssosVisible(false);
      if (bonesFabricRef.current) {
        fabricRef.current?.remove(bonesFabricRef.current);
        bonesFabricRef.current = null;
      }
      return;
    }

    if (!cachedLandmarksRef.current) {
      const img = imageRef.current;
      if (!img) return;
      setLoading(true);
      try {
        const result = await mediaPipeService.detect(img);
        if (!result || result.faceLandmarks.length === 0) {
          alert('Nenhuma face detectada na imagem.');
          return;
        }
        cachedLandmarksRef.current = result.faceLandmarks[0];
      } catch (err) {
        console.error('Detection error:', err);
        alert('Erro ao analisar a imagem.');
        return;
      } finally {
        setLoading(false);
      }
    }

    const ossosImg: CanvasImageSource | null =
      ossosProcessedRef.current ?? ossosImgRef.current;
    
    if (!ossosImg || !fabricRef.current) return;

    const { faceCx, faceCy, faceW } = calculateBonesTransform(cachedLandmarksRef.current!);

    setOssosRotation(0);

    const fImg = new fabric.Image(ossosImg as HTMLImageElement, {
      left: faceCx,
      top: faceCy,
      originX: 'center',
      originY: 'center',
      angle: 0,
      opacity: ossosOpacity,
      shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.5)',
        blur: 25,
        offsetX: 0,
        offsetY: 10
      }),
      cornerColor: '#58a6ff',
      cornerStrokeColor: '#ffffff',
      transparentCorners: false,
      cornerStyle: 'circle',
      cornerSize: 10,
    });

    // Scale to fit faceW/faceH
    fImg.scaleToWidth(faceW);
    // scaleToWidth will maintain aspect ratio; if image is very different, you might need manual scale
    
    fabricRef.current.add(fImg);
    fabricRef.current.setActiveObject(fImg);
    bonesFabricRef.current = fImg;

    ossosVisibleRef.current = true;
    setOssosVisible(true);
  }, [ossosVisible, ossosOpacity, calculateBonesTransform]);

  const handleOssosOpacity = useCallback((val: number) => {
    setOssosOpacity(val);
    if (bonesFabricRef.current) {
      bonesFabricRef.current.set('opacity', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const handleOssosRotation = useCallback((val: number) => {
    setOssosRotation(val);
    if (bonesFabricRef.current) {
      bonesFabricRef.current.set('angle', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const handleResetBones = useCallback(() => {
    if (!bonesFabricRef.current || !cachedLandmarksRef.current) return;
    const { faceCx, faceCy, faceW, angle } = calculateBonesTransform(cachedLandmarksRef.current);
    
    bonesFabricRef.current.set({
      left: faceCx,
      top: faceCy,
      angle: angle,
    });
    bonesFabricRef.current.scaleToWidth(faceW);
    fabricRef.current?.renderAll();
  }, [calculateBonesTransform]);

  const handleToggleMusculos = useCallback(async () => {
    if (musculosVisible) {
      setMusculosVisible(false);
      if (musclesFabricRef.current) {
        fabricRef.current?.remove(musclesFabricRef.current);
        musclesFabricRef.current = null;
      }
      return;
    }

    if (!cachedLandmarksRef.current) {
      // Re-use detection logic
      const img = imageRef.current;
      if (!img) return;
      setLoading(true);
      try {
        const result = await mediaPipeService.detect(img);
        if (result?.faceLandmarks?.length) {
          cachedLandmarksRef.current = result.faceLandmarks[0];
        }
      } finally {
        setLoading(false);
      }
    }

    const mImg: CanvasImageSource | null = musculosProcessedRef.current ?? musculosImgRef.current;
    if (!mImg || !fabricRef.current || !cachedLandmarksRef.current) return;

    const { faceCx, faceCy, faceW } = calculateBonesTransform(cachedLandmarksRef.current);
    
    setMusculosRotation(0);

    const fImg = new fabric.Image(mImg as HTMLImageElement, {
      left: faceCx,
      top: faceCy,
      originX: 'center',
      originY: 'center',
      angle: 0,
      opacity: musculosOpacity,
      shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.6)',
        blur: 15,
        offsetX: 0,
        offsetY: 5
      }),
      cornerColor: '#58a6ff',
      cornerStrokeColor: '#ffffff',
      transparentCorners: false,
      cornerStyle: 'circle',
      cornerSize: 10,
    });

    fImg.scaleToWidth(faceW);
    fabricRef.current.add(fImg);
    fabricRef.current.setActiveObject(fImg);
    musclesFabricRef.current = fImg;
    setMusculosVisible(true);
  }, [musculosVisible, musculosOpacity, calculateBonesTransform]);

  const handleMusculosOpacity = useCallback((val: number) => {
    setMusculosOpacity(val);
    if (musclesFabricRef.current) {
      musclesFabricRef.current.set('opacity', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const handleMusculosRotation = useCallback((val: number) => {
    setMusculosRotation(val);
    if (musclesFabricRef.current) {
      musclesFabricRef.current.set('angle', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const handleToggleGordura = useCallback(async () => {
    if (gorduraVisible) {
      setGorduraVisible(false);
      if (fatFabricRef.current) {
        fabricRef.current?.remove(fatFabricRef.current);
        fatFabricRef.current = null;
      }
      return;
    }

    if (!cachedLandmarksRef.current) {
      const img = imageRef.current;
      if (!img) return;
      setLoading(true);
      try {
        const result = await mediaPipeService.detect(img);
        if (result?.faceLandmarks?.length) {
          cachedLandmarksRef.current = result.faceLandmarks[0];
        }
      } finally {
        setLoading(false);
      }
    }

    const isFrontal = gorduraView === 'frontal';
    const proc = isFrontal ? gorduraProcessedFrontalRef.current : gorduraProcessedObliquaRef.current;
    const raw = isFrontal ? gorduraImgFrontalRef.current : gorduraImgObliquaRef.current;
    const gImg: CanvasImageSource | null = proc ?? raw;
    
    if (!gImg || !fabricRef.current || !cachedLandmarksRef.current) return;

    const { faceCx, faceCy, faceW } = calculateBonesTransform(cachedLandmarksRef.current);
    
    // Sincroniza o estado de rotação inicial com 0 graus
    setGorduraRotation(0);

    const fImg = new fabric.Image(gImg as HTMLImageElement, {
      left: faceCx,
      top: faceCy,
      originX: 'center',
      originY: 'center',
      angle: 0,
      opacity: gorduraOpacity,
      shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.3)',
        blur: 35,
        offsetX: 0,
        offsetY: 15
      }),
      cornerColor: '#58a6ff',
      cornerStrokeColor: '#ffffff',
      transparentCorners: false,
      cornerStyle: 'circle',
      cornerSize: 10,
    });

    // Frontal view uses standard scale, Oblique uses slightly larger
    fImg.scaleToWidth(isFrontal ? faceW : faceW * 1.2);
    fabricRef.current.add(fImg);
    fabricRef.current.setActiveObject(fImg);
    fatFabricRef.current = fImg;
    setGorduraVisible(true);
  }, [gorduraVisible, gorduraOpacity, gorduraView, calculateBonesTransform]);

  const handleSetGorduraView = useCallback((view: 'frontal' | 'obliqua') => {
    setGorduraView(view);
    // Se já estiver visível, recria o objeto com a nova visão
    if (gorduraVisible) {
      if (fatFabricRef.current) {
        fabricRef.current?.remove(fatFabricRef.current);
        fatFabricRef.current = null;
      }
      setGorduraVisible(false);
      // Agenda a recriação para o próximo tick para o estado atualizar
      setTimeout(() => {
        handleToggleGordura();
      }, 0);
    }
  }, [gorduraVisible, handleToggleGordura]);

  const handleGorduraOpacity = useCallback((val: number) => {
    setGorduraOpacity(val);
    if (fatFabricRef.current) {
      fatFabricRef.current.set('opacity', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const handleGorduraRotation = useCallback((val: number) => {
    setGorduraRotation(val);
    if (fatFabricRef.current) {
      fatFabricRef.current.set('angle', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const handleToggleVasos = useCallback(async () => {
    if (vasosVisible) {
      setVasosVisible(false);
      if (vasosFabricRef.current) {
        fabricRef.current?.remove(vasosFabricRef.current);
        vasosFabricRef.current = null;
      }
      return;
    }

    if (!cachedLandmarksRef.current) {
      const img = imageRef.current;
      if (!img) return;
      setLoading(true);
      try {
        const result = await mediaPipeService.detect(img);
        if (result?.faceLandmarks?.length) {
          cachedLandmarksRef.current = result.faceLandmarks[0];
        }
      } finally {
        setLoading(false);
      }
    }

    const isFrontal = vasosView === 'frontal';
    const proc = isFrontal ? vasosProcessedFrontalRef.current : vasosProcessedObliquaRef.current;
    const raw = isFrontal ? vasosImgFrontalRef.current : vasosImgObliquaRef.current;
    const vImg: CanvasImageSource | null = proc ?? raw;
    
    if (!vImg || !fabricRef.current || !cachedLandmarksRef.current) return;

    const { faceCx, faceCy, faceW } = calculateBonesTransform(cachedLandmarksRef.current);
    
    setVasosRotation(0);

    const fImg = new fabric.Image(vImg as HTMLImageElement, {
      left: faceCx,
      top: faceCy,
      originX: 'center',
      originY: 'center',
      angle: 0,
      opacity: vasosOpacity,
      shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.5)',
        blur: 8,
        offsetX: 0,
        offsetY: 3
      }),
      globalCompositeOperation: 'multiply', // Embutimento orgânico na pele
      cornerColor: '#ff4d4f', // Red for arteries
      cornerStrokeColor: '#ffffff',
      transparentCorners: false,
      cornerStyle: 'circle',
      cornerSize: 10,
    });

    fImg.scaleToWidth(isFrontal ? faceW : faceW * 1.2);
    fabricRef.current.add(fImg);
    fabricRef.current.setActiveObject(fImg);
    vasosFabricRef.current = fImg;
    setVasosVisible(true);
  }, [vasosVisible, vasosOpacity, vasosView, calculateBonesTransform]);

  const handleSetVasosView = useCallback((view: 'frontal' | 'obliqua') => {
    setVasosView(view);
    if (vasosVisible) {
      if (vasosFabricRef.current) {
        fabricRef.current?.remove(vasosFabricRef.current);
        vasosFabricRef.current = null;
      }
      setVasosVisible(false);
      setTimeout(() => {
        handleToggleVasos();
      }, 0);
    }
  }, [vasosVisible, handleToggleVasos]);

  const handleVasosOpacity = useCallback((val: number) => {
    setVasosOpacity(val);
    if (vasosFabricRef.current) {
      vasosFabricRef.current.set('opacity', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const handleVasosRotation = useCallback((val: number) => {
    setVasosRotation(val);
    if (vasosFabricRef.current) {
      vasosFabricRef.current.set('angle', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const handleToggleNervos = useCallback(async () => {
    if (nervosVisible) {
      setNervosVisible(false);
      if (nervosFabricRef.current) {
        fabricRef.current?.remove(nervosFabricRef.current);
        nervosFabricRef.current = null;
      }
      return;
    }

    if (!cachedLandmarksRef.current) {
      const img = imageRef.current;
      if (!img) return;
      setLoading(true);
      try {
        const result = await mediaPipeService.detect(img);
        if (result?.faceLandmarks?.length) {
          cachedLandmarksRef.current = result.faceLandmarks[0];
        }
      } finally {
        setLoading(false);
      }
    }

    const isFrontal = nervosView === 'frontal';
    const proc = isFrontal ? nervosProcessedFrontalRef.current : nervosProcessedObliquaRef.current;
    const raw = isFrontal ? nervosImgFrontalRef.current : nervosImgObliquaRef.current;
    const nImg: CanvasImageSource | null = proc ?? raw;
    
    if (!nImg || !fabricRef.current || !cachedLandmarksRef.current) return;

    const { faceCx, faceCy, faceW } = calculateBonesTransform(cachedLandmarksRef.current);
    
    setNervosRotation(0);

    const fImg = new fabric.Image(nImg as HTMLImageElement, {
      left: faceCx,
      top: faceCy,
      originX: 'center',
      originY: 'center',
      angle: 0,
      opacity: nervosOpacity,
      shadow: new fabric.Shadow({
        color: 'rgba(250, 219, 20, 0.4)', // Glow amarelo para simular a cor do nervo
        blur: 15,
        offsetX: 0,
        offsetY: 2
      }),
      cornerColor: '#fadb14', // Yellow for nerves
      cornerStrokeColor: '#ffffff',
      transparentCorners: false,
      cornerStyle: 'circle',
      cornerSize: 10,
    });

    fImg.scaleToWidth(isFrontal ? faceW : faceW * 1.2);
    fabricRef.current.add(fImg);
    fabricRef.current.setActiveObject(fImg);
    nervosFabricRef.current = fImg;
    setNervosVisible(true);
  }, [nervosVisible, nervosOpacity, nervosView, calculateBonesTransform]);

  const handleSetNervosView = useCallback((view: 'frontal' | 'obliqua') => {
    setNervosView(view);
    if (nervosVisible) {
      if (nervosFabricRef.current) {
        fabricRef.current?.remove(nervosFabricRef.current);
        nervosFabricRef.current = null;
      }
      setNervosVisible(false);
      setTimeout(() => {
        handleToggleNervos();
      }, 0);
    }
  }, [nervosVisible, handleToggleNervos]);

  const handleNervosOpacity = useCallback((val: number) => {
    setNervosOpacity(val);
    if (nervosFabricRef.current) {
      nervosFabricRef.current.set('opacity', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const handleNervosRotation = useCallback((val: number) => {
    setNervosRotation(val);
    if (nervosFabricRef.current) {
      nervosFabricRef.current.set('angle', val);
      fabricRef.current?.renderAll();
    }
  }, []);

  const getCombinedCanvas = useCallback(() => {
    const mpCanvas = mediapipeCanvasRef.current;
    if (!mpCanvas || !fabricRef.current) return null;

    // Create a temporary canvas for flattening
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mpCanvas.width;
    tempCanvas.height = mpCanvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;

    // 1. Draw the background (Photo)
    ctx.drawImage(mpCanvas, 0, 0);

    // 2. Draw the Fabric layer (Bones, Annotations)
    // We create a temporary data URL from fabric and draw it over
    // Alternatively, we use fabric's internal method to render onto our ctx
    const fabricDataURL = fabricRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1 // Keep relative size
    });

    return new Promise<string | null>((resolve) => {
      const fImg = new Image();
      fImg.onload = () => {
        ctx.drawImage(fImg, 0, 0);
        resolve(tempCanvas.toDataURL('image/png'));
      };
      fImg.onerror = () => resolve(null);
      fImg.src = fabricDataURL;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!fabricRef.current || !user) return;
    setSaving(true);
    try {
      const combinedImage = await getCombinedCanvas();
      const fabricState = fabricRef.current.toJSON();
      
      const { error } = await supabase.from('evaluations').insert({
        user_id: user.id,
        type: 'facial-structure',
        canvas_state: fabricState,
        landmark_image: combinedImage,
        status: 'completed',
      });
      if (error) throw error;
      alert('Avaliação salva com sucesso!');
    } catch (err) {
      console.error('Save error:', err);
      alert('Erro ao salvar avaliação.');
    } finally {
      setSaving(false);
    }
  }, [user, getCombinedCanvas]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => {
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(prev + delta).toFixed(2)));
    });
  }, []);

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left button; skip if mouse is over a Fabric annotation
    if (e.button !== 0 || !hasImage || isOverFabricObject.current) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - panRef.current.x,
      y: e.clientY - panRef.current.y,
    };
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  }, [hasImage]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const newPan = {
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    };
    panRef.current = newPan;
    setPan({ ...newPan });
  }, []);

  const stopDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = hasImage ? 'grab' : 'default';
    }
  }, [hasImage]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    const combinedImage = await getCombinedCanvas();
    if (!combinedImage) return;
    
    const link = document.createElement('a');
    link.download = `facepipe-analise-${Date.now()}.png`;
    link.href = combinedImage;
    link.click();
  }, [getCombinedCanvas]);

  const hasCachedLandmarks = cachedLandmarksRef.current !== null;

  return (
    <div className={`${styles.workspace} ${isMobile ? styles.workspaceMobile : ''}`}>
      <aside className={isMobile ? styles.toolbarMobile : styles.sidebar}>
        <div className={styles.toolsGroup}>
          <label className={styles.uploadLabel}>
            Upload Foto
            <input type="file" onChange={handleFileUpload} accept="image/*" hidden />
          </label>
          <Button
            variant="primary"
            onClick={handleToggleLandmarks}
            disabled={!hasImage || loading}
            isLoading={loading}
            className={landmarksVisible ? styles.btnActive : undefined}
          >
            {landmarksVisible ? 'Ocultar Landmarks' : 'Mapear Landmarks'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={!hasCachedLandmarks || saving}
            isLoading={saving}
          >
            Salvar Avaliação
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownload}
            disabled={!hasCachedLandmarks}
          >
            Download PNG
          </Button>

          <div className={styles.anatomiaWrapper}>
            <button
              className={`${styles.anatomiaBtn} ${anatomiaOpen ? styles.anatomiaBtnOpen : ''}`}
              onClick={() => setAnatomiaOpen(o => !o)}
              disabled={!hasImage}
            >
              <span>Anatomia</span>
              <span className={styles.anatomiaChevron}>{anatomiaOpen ? '▲' : '▼'}</span>
            </button>

            {anatomiaOpen && (
              <div className={styles.anatomiaMenu}>
                <button
                  className={`${styles.anatomiaItem} ${ossosVisible ? styles.anatomiaItemActive : ''}`}
                  onClick={handleToggleOssos}
                  disabled={!hasImage || loading}
                >
                  {ossosVisible ? 'Ocultar Ossos' : 'Ossos'}
                </button>
                
                {ossosVisible && (
                  <>
                    <div className={styles.sliderGroup}>
                      <div className={styles.sliderLabel}>
                        <span>Opacidade</span>
                        <span>{Math.round(ossosOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={ossosOpacity}
                        onChange={(e) => handleOssosOpacity(parseFloat(e.target.value))}
                        className={styles.sliderInput}
                      />
                      <div className={styles.sliderLabel} style={{ marginTop: '8px' }}>
                        <span>Rotação</span>
                        <span>{Math.round(ossosRotation)}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={ossosRotation}
                        onChange={(e) => handleOssosRotation(parseFloat(e.target.value))}
                        className={styles.sliderInput}
                      />
                    </div>
                    <button 
                      className={styles.anatomiaActionBtn}
                      onClick={handleResetBones}
                    >
                      Resetar Alinhamento
                    </button>
                  </>
                )}

                <button 
                  className={`${styles.anatomiaItem} ${musculosVisible ? styles.anatomiaItemActive : ''}`}
                  onClick={handleToggleMusculos}
                  disabled={!hasImage}
                >
                  {musculosVisible ? 'Ocultar Músculos' : 'Músculos'}
                </button>

                {musculosVisible && (
                  <div className={styles.sliderGroup}>
                    <div className={styles.sliderLabel}>
                      <span>Opacidade</span>
                      <span>{Math.round(musculosOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={musculosOpacity}
                      onChange={(e) => handleMusculosOpacity(parseFloat(e.target.value))}
                      className={styles.sliderInput}
                    />

                    <div className={styles.sliderLabel} style={{ marginTop: '8px' }}>
                      <span>Rotação</span>
                      <span>{Math.round(musculosRotation)}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={musculosRotation}
                      onChange={(e) => handleMusculosRotation(parseFloat(e.target.value))}
                      className={styles.sliderInput}
                    />
                  </div>
                )}

                <button 
                  className={`${styles.anatomiaItem} ${gorduraVisible ? styles.anatomiaItemActive : ''}`}
                  onClick={handleToggleGordura}
                  disabled={!hasImage}
                >
                  {gorduraVisible ? 'Ocultar Compartimentos' : 'Compartimentos'}
                </button>

                {gorduraVisible && (
                  <div className={styles.sliderGroup}>
                    <div className={styles.viewSelector} style={{ marginBottom: '12px', display: 'flex', gap: '4px' }}>
                      <button 
                        className={`${styles.viewBtn} ${gorduraView === 'frontal' ? styles.viewBtnActive : ''}`}
                        onClick={() => handleSetGorduraView('frontal')}
                        style={{ flex: 1, padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #333', cursor: 'pointer', background: gorduraView === 'frontal' ? '#333' : 'transparent', color: '#fff' }}
                      >
                        Frente
                      </button>
                      <button 
                        className={`${styles.viewBtn} ${gorduraView === 'obliqua' ? styles.viewBtnActive : ''}`}
                        onClick={() => handleSetGorduraView('obliqua')}
                        style={{ flex: 1, padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #333', cursor: 'pointer', background: gorduraView === 'obliqua' ? '#333' : 'transparent', color: '#fff' }}
                      >
                        Perfil
                      </button>
                    </div>

                    <div className={styles.sliderLabel}>
                      <span>Opacidade</span>
                      <span>{Math.round(gorduraOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={gorduraOpacity}
                      onChange={(e) => handleGorduraOpacity(parseFloat(e.target.value))}
                      className={styles.sliderInput}
                    />

                    <div className={styles.sliderLabel} style={{ marginTop: '8px' }}>
                      <span>Rotação</span>
                      <span>{Math.round(gorduraRotation)}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={gorduraRotation}
                      onChange={(e) => handleGorduraRotation(parseFloat(e.target.value))}
                      className={styles.sliderInput}
                    />
                  </div>
                )}

                <button 
                  className={`${styles.anatomiaItem} ${vasosVisible ? styles.anatomiaItemActive : ''}`}
                  onClick={handleToggleVasos}
                  disabled={!hasImage}
                >
                  {vasosVisible ? 'Ocultar Vasos' : 'Vasos (Arteriais)'}
                </button>

                {vasosVisible && (
                  <div className={styles.sliderGroup}>
                    <div className={styles.viewSelector} style={{ marginBottom: '12px', display: 'flex', gap: '4px' }}>
                      <button 
                        className={`${styles.viewBtn} ${vasosView === 'frontal' ? styles.viewBtnActive : ''}`}
                        onClick={() => handleSetVasosView('frontal')}
                        style={{ flex: 1, padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #333', cursor: 'pointer', background: vasosView === 'frontal' ? '#333' : 'transparent', color: '#fff' }}
                      >
                        Frente
                      </button>
                      <button 
                        className={`${styles.viewBtn} ${vasosView === 'obliqua' ? styles.viewBtnActive : ''}`}
                        onClick={() => handleSetVasosView('obliqua')}
                        style={{ flex: 1, padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #333', cursor: 'pointer', background: vasosView === 'obliqua' ? '#333' : 'transparent', color: '#fff' }}
                      >
                        Perfil
                      </button>
                    </div>

                    <div className={styles.sliderLabel}>
                      <span>Opacidade</span>
                      <span>{Math.round(vasosOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={vasosOpacity}
                      onChange={(e) => handleVasosOpacity(parseFloat(e.target.value))}
                      className={styles.sliderInput}
                    />

                    <div className={styles.sliderLabel} style={{ marginTop: '8px' }}>
                      <span>Rotação</span>
                      <span>{Math.round(vasosRotation)}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={vasosRotation}
                      onChange={(e) => handleVasosRotation(parseFloat(e.target.value))}
                      className={styles.sliderInput}
                    />
                  </div>
                )}

                <button 
                  className={`${styles.anatomiaItem} ${nervosVisible ? styles.anatomiaItemActive : ''}`}
                  onClick={handleToggleNervos}
                  disabled={!hasImage}
                >
                  {nervosVisible ? 'Ocultar Nervos' : 'Nervos (Forames/Ramos)'}
                </button>

                {nervosVisible && (
                  <div className={styles.sliderGroup}>
                    <div className={styles.viewSelector} style={{ marginBottom: '12px', display: 'flex', gap: '4px' }}>
                      <button 
                        className={`${styles.viewBtn} ${nervosView === 'frontal' ? styles.viewBtnActive : ''}`}
                        onClick={() => handleSetNervosView('frontal')}
                        style={{ flex: 1, padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #333', cursor: 'pointer', background: nervosView === 'frontal' ? '#333' : 'transparent', color: '#fff' }}
                      >
                        Frente
                      </button>
                      <button 
                        className={`${styles.viewBtn} ${nervosView === 'obliqua' ? styles.viewBtnActive : ''}`}
                        onClick={() => handleSetNervosView('obliqua')}
                        style={{ flex: 1, padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #333', cursor: 'pointer', background: nervosView === 'obliqua' ? '#333' : 'transparent', color: '#fff' }}
                      >
                        Perfil
                      </button>
                    </div>

                    <div className={styles.sliderLabel}>
                      <span>Opacidade</span>
                      <span>{Math.round(nervosOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={nervosOpacity}
                      onChange={(e) => handleNervosOpacity(parseFloat(e.target.value))}
                      className={styles.sliderInput}
                    />

                    <div className={styles.sliderLabel} style={{ marginTop: '8px' }}>
                      <span>Rotação</span>
                      <span>{Math.round(nervosRotation)}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={nervosRotation}
                      onChange={(e) => handleNervosRotation(parseFloat(e.target.value))}
                      className={styles.sliderInput}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.sidebarDivider} />

        <div className={styles.zoomControls}>
          <button
            className={styles.zoomBtn}
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={!hasImage || zoom <= MIN_ZOOM}
            title="Diminuir zoom"
          >−</button>
          <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button
            className={styles.zoomBtn}
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={!hasImage || zoom >= MAX_ZOOM}
            title="Aumentar zoom"
          >+</button>
          <button
            className={styles.zoomReset}
            onClick={resetView}
            disabled={!hasImage || (zoom === 1 && pan.x === 0 && pan.y === 0)}
            title="Resetar zoom e posição"
          >1:1</button>
        </div>

        {hasCachedLandmarks && (
          <span className={`${styles.statusBadge} ${!landmarksVisible ? styles.statusBadgeOff : ''}`}>
            {landmarksVisible ? '478 ativos' : '478 ocultos'}
          </span>
        )}
      </aside>

      <div
        ref={containerRef}
        className={styles.canvasContainer}
        style={{ cursor: hasImage ? 'grab' : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        <div
          className={styles.canvasWrapper}
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* width/height gerenciados APENAS via ref — atributos JSX apagariam o canvas no re-render */}
          <canvas ref={mediapipeCanvasRef} className={styles.mediapipeCanvas} />
          <canvas ref={fabricCanvasElRef} className={styles.fabricCanvas} />
        </div>
      </div>
    </div>
  );
};
