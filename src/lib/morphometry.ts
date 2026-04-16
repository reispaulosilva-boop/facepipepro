export type Point = { x: number; y: number };

export interface MorphoMetrics {
  zyZy: number; // Bizygomatic width (dist 454-234)
  r2: number; // Bigonial / Bizygomatic
  r3: number; // Bitemporal / Bizygomatic
  r4_proxy: number; // (dist 454-234) / (dist 10-152) -> complementar p/ biotipo
  l: number; // Mandibular Linearity
  theta: number; // Menton Angle
  if: number; // Facial Index
  asymmetry?: AsymmetryMetrics; // Split-face metrics
}

export interface AsymmetryMetrics {
  zyRatio: number; // dist(Esq)/dist(Dir) Zigoma
  goRatio: number; // dist(Esq)/dist(Dir) Gonion
  teRatio: number; // dist(Esq)/dist(Dir) Têmporas
  isAsymmetric: boolean; // true se qualquer ratio < 0.85 or > 1.18
}

/**
 * Calcula a distância euclidiana entre dois pontos.
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calcula a distância perpendicular de um ponto (p) até a reta formada por (lineP1, lineP2)
 */
export function pointLineDistance(p: Point, lineP1: Point, lineP2: Point): number {
  const numerator = Math.abs(
    (lineP2.x - lineP1.x) * (lineP1.y - p.y) - (lineP1.x - p.x) * (lineP2.y - lineP1.y)
  );
  const denominator = distance(lineP1, lineP2);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calcula o RMSE para um subconjunto de pontos em relação à sua reta ideal (reta que vai do primeiro ao último ponto do segment).
 */
export function calculateSegmentRMSE(points: Point[]): number {
  if (points.length < 3) return 0;
  const start = points[0];
  const end = points[points.length - 1];
  
  let sumSquaredDiffs = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = pointLineDistance(points[i], start, end);
    sumSquaredDiffs += dist * dist;
  }
  
  return Math.sqrt(sumSquaredDiffs / (points.length - 2));
}

/**
 * Calcula o ângulo entre os vetores (pA -> pC) e (pB -> pC) em graus.
 * pC é o vértice do ângulo.
 */
export function calculateAngleDegrees(pA: Point, pB: Point, pC: Point): number {
  const v1 = { x: pA.x - pC.x, y: pA.y - pC.y };
  const v2 = { x: pB.x - pC.x, y: pB.y - pC.y };
  
  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  // Clamping to handle potential floating point errors outside [-1, 1]
  const val = dotProduct / (mag1 * mag2);
  const clampedVal = Math.max(-1, Math.min(1, val));
  
  return (Math.acos(clampedVal) * 180) / Math.PI;
}

/**
 * Extrai e calcula as 5 Variáveis Primárias da Morfometria
 * a partir das coordenadas absolutas dos landmarks do MediaPipe.
 */
export function calculateMorphometrics(landmarks: { x: number; y: number }[]): MorphoMetrics | null {
  if (!landmarks || landmarks.length < 478) return null;

  // Extrair pontos chaves
  const p454 = landmarks[454]; // Zygion dir
  const p234 = landmarks[234]; // Zygion esq
  const p172 = landmarks[172]; // Gonion esq
  const p397 = landmarks[397]; // Gonion dir
  const p356 = landmarks[356]; // Têmpora dir
  const p127 = landmarks[127]; // Têmpora esq
  const p168 = landmarks[168]; // Nasion
  const p152 = landmarks[152]; // Menton
  const p148 = landmarks[148]; // Pré-mentoniano esq
  const p377 = landmarks[377]; // Pré-mentoniano dir
  const p10 = landmarks[10]; // Trichion proxy

  // Denominador universal
  const zyZy = distance(p454, p234);
  if (zyZy === 0) return null;

  // R2, R3 e R4 (proxy)
  const r2 = distance(p172, p397) / zyZy;
  const r3 = distance(p356, p127) / zyZy;
  const r4_proxy = zyZy / distance(p10, p152);

  // IF
  const indexFacial = (distance(p168, p152) / zyZy) * 100;

  // Theta (Ângulo do Mento)
  const theta = calculateAngleDegrees(p148, p377, p152);

  // Linearidade L
  // Sequência do contorno mandibular, dividida na esféra esquerda e direita no ponto de inflexão 152
  const leftJawSeq = [172, 136, 150, 149, 176, 148, 152];
  const rightJawSeq = [152, 377, 400, 378, 379, 365, 397];
  
  const leftPoints = leftJawSeq.map(idx => landmarks[idx]);
  const rightPoints = rightJawSeq.map(idx => landmarks[idx]);
  
  const rmseLeft = calculateSegmentRMSE(leftPoints);
  const rmseRight = calculateSegmentRMSE(rightPoints);
  
  // Combinar o RMSE de ambos os lados para compor o desvio total
  const avgRMSE = (rmseLeft + rmseRight) / 2;
  
  const l = 1 - (avgRMSE / zyZy);

  // Split-Face Mode (Assimetria)
  // Distâncias perpendiculares à linha média (Nasion - Menton)
  const zyLeftDist = pointLineDistance(p234, p168, p152);
  const zyRightDist = pointLineDistance(p454, p168, p152);
  const goLeftDist = pointLineDistance(p172, p168, p152);
  const goRightDist = pointLineDistance(p397, p168, p152);
  const teLeftDist = pointLineDistance(p127, p168, p152);
  const teRightDist = pointLineDistance(p356, p168, p152);

  const zyRatio = zyRightDist === 0 ? 1 : zyLeftDist / zyRightDist;
  const goRatio = goRightDist === 0 ? 1 : goLeftDist / goRightDist;
  const teRatio = teRightDist === 0 ? 1 : teLeftDist / teRightDist;

  const isAsymmetric = 
    zyRatio < 0.85 || zyRatio > 1.18 ||
    goRatio < 0.85 || goRatio > 1.18 ||
    teRatio < 0.85 || teRatio > 1.18;

  const asymmetry: AsymmetryMetrics = {
    zyRatio,
    goRatio,
    teRatio,
    isAsymmetric
  };

  return {
    zyZy,
    r2,
    r3,
    r4_proxy,
    l,
    theta,
    if: indexFacial,
    asymmetry
  };
}

export type FaceShape = 'Angular' | 'Coração' | 'Oval' | 'Redondo' | 'Indefinido';

export interface ClassificationReport {
  shape: FaceShape;
  metrics: MorphoMetrics;
}

/**
 * Motor de Inferência Determinístico (A Árvore de Decisão)
 * Baseada nas 5 Regras de Decisão da Morfometria Clínica.
 */
export function classifyFaceShape(metrics: MorphoMetrics): FaceShape {
  // Gate 1 - A Prova do Quadrado (Regra 3)
  if (metrics.l >= 0.985) {
    return 'Angular';
  }

  // Gate 2 - A Prova do Triângulo Invertido (Regras 2 e 4)
  if (metrics.r2 < 0.65 && metrics.r3 >= 0.90) {
    return 'Coração';
  }

  // Gate 3 - Desempate Proporcional (Regras 2 e 5 - Oval vs Redondo)
  if (metrics.r2 > 0.85 || metrics.if < 88) {
    // Rosto largo (R2 alto) ou curto (IF baixo) indica redondo
    return 'Redondo';
  }
  
  // Se não atendeu os extremos do Redondo, é a proporção média e verticalizada do Oval.
  return 'Oval';
}

export type TreatmentAreaId = 'ML' | 'MP' | 'ZM' | 'ZL' | 'MT' | 'SM' | 'PJ' | 'JL' | 'JR';

export interface TreatmentAreaNode {
  id: TreatmentAreaId;
  name: string;
  landmarks: number[]; // Main landmarks points for mapping
  priority: 'High' | 'Medium' | 'Low' | 'Hide';
  action: string; // E.g., "Projetar", "Elongar", "Retificar"
  color: string;
}

export interface ABFaceTreatmentPlan {
  shape: FaceShape;
  primaryAction: string;
  areas: TreatmentAreaNode[];
}

/**
 * Mapeamento das 9 áreas de Tratamento (AB Face)
 * Usa o Biotipo Facial para definir quais áreas acender e recomendar.
 */
export function getABFaceTreatmentPlan(shape: FaceShape): ABFaceTreatmentPlan {
  // Cores institucionais do ABFace para cada área (baseadas na Figura 2)
  const colors = {
    ML: '#1E62C4', // Azul escuro
    MP: '#3AA780', // Verde água
    ZM: '#7CBD43', // Verde claro
    ZL: '#208544', // Verde escuro
    MT: '#D93226', // Vermelho
    SM: '#7A2234', // Vinho
    PJ: '#E8669F', // Rosa
    JL: '#E8CA31', // Amarelo
    JR: '#DE8330'  // Laranja
  };

  // Landmarks base (Landmarks centrais da área para o Fabric renderizar a região)
  const baseLandmarks: Record<TreatmentAreaId, number[]> = {
    ML: [454, 234], // Eixos direita/esquerda
    MP: [330, 101],
    ZM: [352, 123],
    ZL: [446, 226], // Proxy para Zigoma Lateral puramente (acima do Zygion)
    MT: [152],
    SM: [152], // Calculado com Y offset no front-end
    PJ: [148, 377, 176, 400],
    JL: [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397], // Linha mandibular completa
    JR: [172, 365, 361, 397] // Ramo ascendente 
  };

  const plan: ABFaceTreatmentPlan = {
    shape,
    primaryAction: 'Manutenção Padrão',
    areas: [
      { id: 'ML', name: 'Malar Lateral', landmarks: baseLandmarks.ML, priority: 'Hide', action: 'Volumizar', color: colors.ML },
      { id: 'MP', name: 'Malar Prominence', landmarks: baseLandmarks.MP, priority: 'Hide', action: 'Projetar', color: colors.MP },
      { id: 'ZM', name: 'Zigoma Medial', landmarks: baseLandmarks.ZM, priority: 'Hide', action: 'Sustentar', color: colors.ZM },
      { id: 'ZL', name: 'Zigoma Lateral', landmarks: baseLandmarks.ZL, priority: 'Hide', action: 'Expandir', color: colors.ZL },
      { id: 'MT', name: 'Mental', landmarks: baseLandmarks.MT, priority: 'Hide', action: 'Projetar', color: colors.MT },
      { id: 'SM', name: 'Submental', landmarks: baseLandmarks.SM, priority: 'Hide', action: 'Estruturar base', color: colors.SM },
      { id: 'PJ', name: 'Prejowl', landmarks: baseLandmarks.PJ, priority: 'Hide', action: 'Preencher depressão', color: colors.PJ },
      { id: 'JL', name: 'Jawline', landmarks: baseLandmarks.JL, priority: 'Hide', action: 'Retificar contorno', color: colors.JL },
      { id: 'JR', name: 'Jaw Ramus', landmarks: baseLandmarks.JR, priority: 'Hide', action: 'Alargar', color: colors.JR }
    ]
  };

  const setPriority = (id: TreatmentAreaId, p: 'High'|'Medium'|'Low') => {
    const area = plan.areas.find(a => a.id === id);
    if (area) area.priority = p;
  };

  // Motor Lógico por Biotipo
  switch (shape) {
    case 'Angular':
      plan.primaryAction = 'Restaurar Terço Médio (Projeção)';
      setPriority('ML', 'High');
      setPriority('MP', 'High');
      setPriority('ZM', 'Medium');
      setPriority('ZL', 'Medium');
      // Terço inferior é forte, logo hide JL/JR.
      break;

    case 'Coração':
      plan.primaryAction = 'Reforçar Base Mandibular e Mento';
      setPriority('JL', 'High');
      setPriority('JR', 'High');
      setPriority('MT', 'High');
      setPriority('PJ', 'High');
      setPriority('SM', 'Medium');
      break;

    case 'Oval':
      plan.primaryAction = 'Prevenir Retangularização / Efeito Lift';
      setPriority('ML', 'High');
      setPriority('MP', 'High');
      setPriority('JL', 'Medium');
      setPriority('JR', 'Medium');
      break;

    case 'Redondo':
      plan.primaryAction = 'Alongar (Menton) e Definir Mandíbula';
      setPriority('MT', 'High');
      setPriority('SM', 'High');
      setPriority('JL', 'High'); // Apenas retificar, não volumizar nos cantos
      setPriority('PJ', 'Medium');
      break;

    case 'Indefinido':
    default:
      plan.primaryAction = 'Aguardando diagnóstico morfológico claro';
      break;
  }

  return plan;
}

