import React from 'react';
import { RouletteProps } from './types.ts';
import { useRouletteLogic } from './useRouletteLogic.ts';
import { RouletteView } from './RouletteView.tsx';

/**
 * Componente Principal da Roleta.
 *
 * Atua como um container (Controller) conectando a lógica de negócio (useRouletteLogic)
 * com a apresentação visual (RouletteView).
 *
 * @param {RouletteProps} props - Propriedades configuráveis da roleta.
 * @param {function} props.onFinish - Callback para receber o resultado (pode ser um setState).
 * @param {object} [props.probabilities] - Pesos para sucesso, normal e falha.
 * @param {number} [props.spinDuration=5] - Tempo de giro em segundos.
 */
export const Roulette: React.FC<RouletteProps> = ({ onFinish, probabilities, spinDuration = 5 }) => {
	// Inicializa o hook de lógica passando as configurações
	const { rotation, isSpinning, sectors, spin } = useRouletteLogic(onFinish, probabilities, spinDuration);

	return (
		<RouletteView
			rotation={rotation}
			isSpinning={isSpinning}
			sectors={sectors}
			onSpin={spin}
			spinDuration={spinDuration}
		/>
	);
};
