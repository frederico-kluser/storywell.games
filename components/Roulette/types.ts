/**
 * Tipos possíveis de resultado da roleta.
 * @typedef {'success' | 'normal' | 'failure'} RouletteResult
 */
export type RouletteResult = 'success' | 'normal' | 'failure';

/**
 * Objeto de configuração de probabilidades.
 * A soma dos valores não precisa ser 100, o cálculo fará a normalização.
 */
export interface RouletteProbabilities {
	/** Peso ou porcentagem para o resultado de Sucesso (ex: 20). */
	success: number;
	/** Peso ou porcentagem para o resultado Normal (ex: 50). */
	normal: number;
	/** Peso ou porcentagem para o resultado de Falha (ex: 30). */
	failure: number;
}

/**
 * Propriedades aceitas pelo componente Roulette.
 */
export interface RouletteProps {
	/**
	 * Função de callback chamada quando a animação da roleta termina.
	 * Pode ser usada diretamente com um `setState` do React.
	 *
	 * @example
	 * const [result, setResult] = useState(null);
	 * <Roulette onFinish={setResult} />
	 *
	 * @param {RouletteResult} result - O resultado obtido ('success', 'normal', 'failure').
	 */
	onFinish: (result: RouletteResult) => void;

	/**
	 * Configuração das probabilidades de cada resultado.
	 * Caso não informado, utiliza o padrão: { success: 20, normal: 50, failure: 30 }.
	 */
	probabilities?: RouletteProbabilities;

	/**
	 * Tempo de duração da animação de giro em segundos.
	 * @default 5
	 */
	spinDuration?: number;
}

/**
 * Interface para a configuração visual de um setor da roleta.
 * @internal Uso interno para renderização do SVG.
 */
export interface SectorConfig {
	/** Caminho SVG (d) que desenha o arco. */
	path: string;
	/** Cor de preenchimento do setor. */
	color: string;
}
