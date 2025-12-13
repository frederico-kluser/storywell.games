import React from 'react';
import { SectorConfig } from './types.ts';
import { polarToCartesian } from './utils.ts';

interface RouletteViewProps {
	/** Rotação atual em graus. */
	rotation: number;
	/** Estado indicando se a animação está ativa. */
	isSpinning: boolean;
	/** Lista de setores visuais pré-calculados. */
	sectors: SectorConfig[];
	/** Função para iniciar o giro. */
	onSpin: () => void;
	/** Duração da animação em segundos para o CSS. */
	spinDuration: number;
}

/**
 * Componente puramente visual da Roleta.
 * Responsável apenas por renderizar o SVG e o Botão, sem conter lógica de estado.
 */
export const RouletteView: React.FC<RouletteViewProps> = ({ rotation, isSpinning, sectors, onSpin, spinDuration }) => {
	return (
		<div className="flex flex-col items-center justify-center">
			{/* Container do Medidor */}
			<div className="relative w-[320px] h-[320px] mb-8">
				{/* Anel Externo - Estilo Rústico */}
				<div className="absolute inset-0 rounded-full border-[2px] border-ink opacity-20"></div>

				{/* SVG dos Setores */}
				<svg
					viewBox="0 0 300 300"
					className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px]"
				>
					{/* Renderiza cada fatia da roleta baseada na configuração */}
					{sectors.map((s, i) => (
						<path key={i} d={s.path} fill={s.color} stroke="#2d2a2e" strokeWidth="0.5" />
					))}

					{/* Marcações (Ticks) ao redor para estilo técnico/instrumento de medição */}
					{Array.from({ length: 12 }).map((_, i) => {
						const angle = i * 30;
						const p1 = polarToCartesian(150, 150, 145, angle);
						const p2 = polarToCartesian(150, 150, 140, angle);
						return (
							<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#2d2a2e" strokeWidth="1" opacity="0.5" />
						);
					})}
				</svg>

				{/* Agulha (Ponteiro) */}
				<div
					className="absolute top-0 left-0 w-full h-full pointer-events-none"
					style={{
						transform: `rotate(${rotation}deg)`,
						// Curva de Bezier personalizada para iniciar rápido e desacelerar no final
						// Utiliza o spinDuration passado via prop
						transition: isSpinning ? `transform ${spinDuration}s cubic-bezier(0.2, 0.8, 0.2, 1)` : 'none',
					}}
				>
					{/* Geometria da Agulha */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0">
						{/* Corpo da agulha */}
						<div className="w-1 h-[130px] bg-ink absolute bottom-0 left-1/2 -translate-x-1/2 origin-bottom rounded-t-full"></div>
						{/* Contrapeso */}
						<div className="w-2 h-8 bg-ink absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"></div>
						{/* Eixo central */}
						<div className="w-4 h-4 bg-[#fdfbf7] border-4 border-ink rounded-full absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
					</div>
				</div>
			</div>

			{/* Botão de Ação */}
			<button
				onClick={onSpin}
				disabled={isSpinning}
				className={`
          px-10 py-3 font-mono uppercase tracking-[0.2em] text-sm border-2 border-ink rounded-sm
          transition-all duration-300
          ${
						isSpinning
							? 'opacity-50 cursor-not-allowed bg-transparent'
							: 'hover:bg-ink hover:text-[#fdfbf7] bg-transparent text-ink active:scale-95'
					}
        `}
			>
				{isSpinning ? 'Girando...' : 'GIRAR'}
			</button>
		</div>
	);
};
