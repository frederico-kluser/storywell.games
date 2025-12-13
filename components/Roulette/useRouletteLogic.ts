import { useState, useRef, useMemo } from 'react';
import { RouletteResult, SectorConfig, RouletteProbabilities } from './types';
import { describeArc } from './utils.ts';

// Valores padrão caso não sejam passados via props
const DEFAULT_PROBS: RouletteProbabilities = {
	success: 20,
	normal: 50,
	failure: 30,
};

/**
 * Hook customizado que gerencia toda a lógica de estado, física e cálculo matemático da roleta.
 *
 * @param {function} onFinish - Callback disparado ao final da animação com o resultado.
 * @param {RouletteProbabilities} probabilities - Pesos configurados para cada tipo de resultado.
 * @param {number} spinDuration - Duração do giro em segundos (usado para o timeout).
 *
 * @returns Objeto contendo o estado da rotação, flag de animação, lista de setores visuais e função de ativação.
 */
export const useRouletteLogic = (
	onFinish: (result: RouletteResult) => void,
	probabilities: RouletteProbabilities = DEFAULT_PROBS,
	spinDuration: number = 5,
) => {
	const [rotation, setRotation] = useState<number>(0);
	const [isSpinning, setIsSpinning] = useState<boolean>(false);

	// Referência para manter o valor acumulado da rotação e evitar giros "para trás" ou resets visuais.
	const currentRotationRef = useRef<number>(0);

	// 1. Calcular a configuração normalizada dos ângulos e probabilidades
	const config = useMemo(() => {
		// Garante que usamos os valores passados ou o fallback (caso venha undefined de alguma forma, embora o default parameter cuide disso)
		const probs = probabilities || DEFAULT_PROBS;

		const s = probs.success;
		const n = probs.normal;
		const f = probs.failure;
		const total = s + n + f;

		// Calcula quantos graus cada unidade de peso representa
		const scale = total === 0 ? 0 : 360 / total;

		return {
			successDeg: s * scale,
			normalDeg: n * scale,
			failureDeg: f * scale,
			rawSuccess: s,
			rawNormal: n,
			rawFailure: f,
			totalWeight: total,
		};
	}, [probabilities]);

	// 2. Gerar os caminhos SVG (Sectores Visuais)
	// Recalcula apenas se as probabilidades mudarem
	const sectors = useMemo(() => {
		let currentAngle = 0;
		const list: SectorConfig[] = [];

		// Paleta de Cores Vintage / Tons Terrosos
		// Selecionadas para contrastar bem com o fundo Caqui (#d4c59d).

		// Ordem visual: Sucesso (Verde) -> Normal (Cinza) -> Falha (Vermelho)
		if (config.successDeg > 0) {
			list.push({
				path: describeArc(150, 150, 140, currentAngle, currentAngle + config.successDeg),
				color: '#5b8c5a', // Verde Musgo (Vintage Moss Green)
			});
			currentAngle += config.successDeg;
		}

		if (config.normalDeg > 0) {
			list.push({
				path: describeArc(150, 150, 140, currentAngle, currentAngle + config.normalDeg),
				color: '#8d8d8d', // Cinza Grafite Quente (Warm Graphite)
			});
			currentAngle += config.normalDeg;
		}

		if (config.failureDeg > 0) {
			list.push({
				path: describeArc(150, 150, 140, currentAngle, currentAngle + config.failureDeg),
				color: '#c75b5b', // Vermelho Tijolo Suave (Muted Brick Red)
			});
		}

		return list;
	}, [config]);

	// 3. Função Principal: Calcular e executar o giro
	const spin = () => {
		if (isSpinning) return;

		setIsSpinning(true);

		// A. Sorteio ponderado baseado nos pesos configurados
		const r = Math.random() * config.totalWeight;
		let targetType: RouletteResult = 'failure';
		let startAngle = 0;
		let endAngle = 0;

		// Determina qual setor foi sorteado
		if (r < config.rawSuccess) {
			targetType = 'success';
			startAngle = 0;
			endAngle = config.successDeg;
		} else if (r < config.rawSuccess + config.rawNormal) {
			targetType = 'normal';
			startAngle = config.successDeg;
			endAngle = config.successDeg + config.normalDeg;
		} else {
			targetType = 'failure';
			startAngle = config.successDeg + config.normalDeg;
			endAngle = 360;
		}

		// B. Posição aleatória dentro do setor sorteado (evitando as bordas)
		const padding = 3; // Graus de margem para a agulha não parar exatamente na linha
		const sectorWidth = endAngle - startAngle;
		// Se o setor for muito pequeno, reduzimos o padding
		const safePadding = Math.min(padding, sectorWidth / 3);
		const availableWidth = Math.max(0, sectorWidth - safePadding * 2);
		const randomOffset = Math.random() * availableWidth;

		// Ângulo alvo final (0-360)
		const targetAngle = startAngle + safePadding + randomOffset;

		// C. Calcular a rotação física necessária para o CSS
		// Queremos que a agulha pare em "targetAngle".
		// Adicionamos 5 voltas completas (5 * 360) para o efeito visual de giro rápido.
		const extraSpins = 5 * 360;
		const currentMod = currentRotationRef.current % 360;

		// Distância angular que precisamos percorrer a partir da posição atual
		let distance = targetAngle - currentMod;

		// Garantir que a distância seja positiva para girar sempre no sentido horário
		if (distance < 0) {
			distance += 360;
		}

		distance += extraSpins;
		const newTotalRotation = currentRotationRef.current + distance;

		setRotation(newTotalRotation);
		currentRotationRef.current = newTotalRotation;

		// D. Finalizar após o tempo configurado
		setTimeout(() => {
			setIsSpinning(false);
			if (onFinish) {
				onFinish(targetType);
			}
		}, spinDuration * 1000); // Converte segundos para milissegundos
	};

	return {
		rotation,
		isSpinning,
		sectors,
		spin,
	};
};
