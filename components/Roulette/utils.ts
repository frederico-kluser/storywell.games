/**
 * Converte coordenadas polares (ângulo e raio) para coordenadas cartesianas (X, Y).
 * Necessário para desenhar no SVG.
 *
 * @param {number} centerX - Ponto central X.
 * @param {number} centerY - Ponto central Y.
 * @param {number} radius - Raio do círculo.
 * @param {number} angleInDegrees - Ângulo em graus.
 * @returns {{x: number, y: number}} Objeto com coordenadas X e Y.
 */
export const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
	const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
	return {
		x: centerX + radius * Math.cos(angleInRadians),
		y: centerY + radius * Math.sin(angleInRadians),
	};
};

/**
 * Cria a string de definição de caminho (d) para um arco SVG.
 *
 * @param {number} x - Centro X do círculo.
 * @param {number} y - Centro Y do círculo.
 * @param {number} radius - Raio do arco.
 * @param {number} startAngle - Ângulo inicial em graus.
 * @param {number} endAngle - Ângulo final em graus.
 * @returns {string} String do caminho SVG (ex: "M 100 100 A ...").
 */
export const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
	const start = polarToCartesian(x, y, radius, endAngle);
	const end = polarToCartesian(x, y, radius, startAngle);

	const angleDiff = endAngle - startAngle;
	// Se o arco for maior que 180 graus, usa a flag large-arc
	const largeArcFlag = angleDiff <= 180 ? '0' : '1';

	const d = [
		'M',
		start.x,
		start.y,
		'A',
		radius,
		radius,
		0,
		largeArcFlag,
		0,
		end.x,
		end.y,
		'L',
		x,
		y,
		'L',
		start.x,
		start.y,
	].join(' ');
	return d;
};
