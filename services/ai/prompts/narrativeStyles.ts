/**
 * @fileoverview Sistema de Estilos Narrativos - Técnicas Literárias para RPG
 *
 * Este módulo implementa as técnicas do documento de qualidade narrativa:
 * - Presets de gênero com convenções específicas
 * - Sistema de "mostrar, não contar"
 * - Diferenciação de voz de NPCs
 * - Controle de ritmo narrativo
 * - Templates de estilo literário
 *
 * @module prompts/narrativeStyles
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Níveis de intensidade narrativa que controlam o ritmo da história.
 * Baseado no modelo fractal de tensão-liberação em três níveis.
 */
export type PacingLevel = 'high_tension' | 'building' | 'moderate' | 'calm' | 'release';

/**
 * Gêneros narrativos suportados com convenções específicas.
 */
export type NarrativeGenre =
  | 'epic_fantasy'      // Tolkien-style: dicção arcaica, estrutura paratática
  | 'dark_fantasy'      // Grimdark: violência gráfica, moralidade cinza
  | 'sword_sorcery'     // Howard-style: prosa dinâmica, ação poética
  | 'cosmic_horror'     // Lovecraft-style: narrador não confiável, pavor crescente
  | 'noir'              // Hardboiled: cinismo, símiles inesperados
  | 'sci_fi_space'      // Space opera: terminologia técnica, escala épica
  | 'cyberpunk'         // Dystopia tecnológica: jargão de rua, alta tecnologia
  | 'steampunk'         // Era vitoriana com tecnologia: formalidade, gadgets
  | 'post_apocalyptic'  // Sobrevivência: escassez, desconfiança
  | 'mystery'           // Detetive: pistas, red herrings, revelação gradual
  | 'romance'           // Foco em relacionamentos: tensão emocional
  | 'comedy'            // Humor: timing, subversão de expectativas
  | 'historical'        // Época específica: precisão cultural
  | 'superhero'         // Ação heróica: dilemas morais, poderes
  | 'slice_of_life';    // Cotidiano: momentos pequenos, realismo

/**
 * Configuração completa de estilo narrativo.
 */
export interface NarrativeStyle {
  /** Identificador do gênero */
  genre: NarrativeGenre;
  /** Nome legível para exibição */
  displayName: string;
  /** Descrição do estilo */
  description: string;
  /** Instruções de vocabulário */
  vocabulary: VocabularyStyle;
  /** Padrões de estrutura de frase */
  sentencePatterns: SentencePatterns;
  /** Configuração de ponto de vista */
  pointOfView: PointOfViewConfig;
  /** Atmosfera e tom */
  atmosphere: AtmosphereConfig;
  /** Técnicas características */
  techniques: string[];
  /** O que evitar neste estilo */
  avoid: string[];
  /** Exemplos de prosa no estilo */
  examplePhrases: string[];
}

export interface VocabularyStyle {
  /** Nível de complexidade: simple, moderate, elaborate, archaic */
  complexity: 'simple' | 'moderate' | 'elaborate' | 'archaic';
  /** Palavras/expressões características a usar */
  useWords: string[];
  /** Palavras/expressões a evitar */
  avoidWords: string[];
  /** Nível de formalidade: casual, neutral, formal, ceremonial */
  formality: 'casual' | 'neutral' | 'formal' | 'ceremonial';
}

export interface SentencePatterns {
  /** Comprimento médio preferido: short, medium, long, varied */
  averageLength: 'short' | 'medium' | 'long' | 'varied';
  /** Ritmo: staccato (curto, rápido), flowing (longo, fluido), mixed */
  rhythm: 'staccato' | 'flowing' | 'mixed';
  /** Complexidade estrutural: simple, compound, complex */
  complexity: 'simple' | 'compound' | 'complex';
  /** Padrões específicos (e.g., paratático para fantasia épica) */
  patterns: string[];
}

export interface PointOfViewConfig {
  /** Pessoa narrativa preferida: first, second, third */
  person: 'first' | 'second' | 'third';
  /** Nível de intimidade: distant, moderate, close, intimate */
  intimacy: 'distant' | 'moderate' | 'close' | 'intimate';
  /** Confiabilidade do narrador: reliable, unreliable */
  reliability: 'reliable' | 'unreliable';
}

export interface AtmosphereConfig {
  /** Tom principal */
  primaryTone: string;
  /** Tons secundários */
  secondaryTones: string[];
  /** Prioridades sensoriais (quais sentidos enfatizar) */
  sensoryPriorities: ('visual' | 'auditory' | 'tactile' | 'olfactory' | 'gustatory')[];
  /** Nível de violência: none, implied, moderate, graphic */
  violenceLevel: 'none' | 'implied' | 'moderate' | 'graphic';
  /** Estilo de humor: none, subtle, moderate, frequent */
  humorStyle: 'none' | 'subtle' | 'moderate' | 'frequent';
}

/**
 * Perfil de voz para diferenciação de NPCs.
 */
export interface NPCVoiceProfile {
  /** Nível educacional/vocabulário */
  educationLevel: 'uneducated' | 'common' | 'educated' | 'scholarly' | 'archaic';
  /** Classe social */
  socialClass: 'outcast' | 'lower' | 'middle' | 'upper' | 'nobility' | 'royalty';
  /** Região/origem (afeta dialeto) */
  region: string;
  /** Profissão (afeta jargão) */
  profession: string;
  /** Tiques verbais únicos */
  verbalTics: string[];
  /** Frases características */
  catchphrases: string[];
  /** Padrão de ritmo de fala: slow, normal, fast, erratic */
  speechRhythm: 'slow' | 'normal' | 'fast' | 'erratic';
  /** Traço de personalidade dominante que afeta a fala */
  personalityTrait: string;
}

/**
 * Estado de pacing/ritmo da cena atual.
 */
export interface PacingState {
  /** Nível atual de tensão */
  currentLevel: PacingLevel;
  /** Número de turnos neste nível */
  turnsAtLevel: number;
  /** Tendência: rising, falling, stable */
  trend: 'rising' | 'falling' | 'stable';
  /** Último clímax (turno) */
  lastClimax?: number;
  /** Último momento de respiro (turno) */
  lastBreather?: number;
}

/**
 * Sistema de foreshadowing e callbacks.
 */
export interface NarrativeThread {
  /** ID único da thread */
  id: string;
  /** Tipo: foreshadowing (plantado), callback (referência), chekhov (objeto) */
  type: 'foreshadowing' | 'callback' | 'chekhov_gun';
  /** Descrição do elemento plantado */
  description: string;
  /** Turno em que foi plantado */
  plantedTurn: number;
  /** Status: planted, referenced, resolved */
  status: 'planted' | 'referenced' | 'resolved';
  /** Turno em que foi resolvido (se aplicável) */
  resolvedTurn?: number;
  /** Importância: minor, moderate, major */
  importance: 'minor' | 'moderate' | 'major';
}

// ============================================================================
// PRESETS DE GÊNERO
// ============================================================================

/**
 * Presets de gênero completos baseados no documento de técnicas narrativas.
 */
export const GENRE_PRESETS: Record<NarrativeGenre, NarrativeStyle> = {
  epic_fantasy: {
    genre: 'epic_fantasy',
    displayName: 'Fantasia Épica',
    description: 'Estilo Tolkien com dicção arcaica, ligação paratática e diferentes registros para diferentes povos.',
    vocabulary: {
      complexity: 'elaborate',
      useWords: ['ai de mim', 'para onde', 'todavia', 'porventura', 'eis que', 'jornada', 'destino', 'anciã', 'linhagem'],
      avoidWords: ['legal', 'ok', 'basicamente', 'tipo', 'literalmente', 'incrível'],
      formality: 'formal',
    },
    sentencePatterns: {
      averageLength: 'long',
      rhythm: 'flowing',
      complexity: 'complex',
      patterns: [
        'Estrutura paratática com "e" conectando ações',
        'Inversões poéticas ocasionais',
        'Padrões aliterativos em momentos dramáticos',
        'Frases mais simples para personagens humildes',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'moderate',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'épico',
      secondaryTones: ['majestoso', 'nostálgico', 'esperançoso'],
      sensoryPriorities: ['visual', 'auditory'],
      violenceLevel: 'moderate',
      humorStyle: 'subtle',
    },
    techniques: [
      'Diferentes registros linguísticos para diferentes raças/povos',
      'Canções e poemas intercalados na narrativa',
      'Descrições elaboradas de paisagens e arquitetura',
      'Profecias e presságios',
      'Nomes com significado etimológico',
    ],
    avoid: [
      'Gírias modernas',
      'Sarcasmo excessivo',
      'Prosa minimalista',
      'Referências anacrônicas',
      'Humor pastelão',
    ],
    examplePhrases: [
      'E assim partiu o herói, e seu coração pesava com a memória dos que ficaram.',
      'As torres erguiam-se contra o céu crepuscular como dedos acusadores apontando para as estrelas.',
      'Ai de mim! Pois mesmo a mais brilhante das lâminas não pode cortar a sombra que cresce no leste.',
    ],
  },

  dark_fantasy: {
    genre: 'dark_fantasy',
    displayName: 'Fantasia Sombria',
    description: 'Grimdark com moralidade cinza, violência consequente e um mundo implacável.',
    vocabulary: {
      complexity: 'moderate',
      useWords: ['sangue', 'cinzas', 'podridão', 'sobreviver', 'preço', 'cicatriz', 'amargo', 'frio'],
      avoidWords: ['heróico', 'glorioso', 'belo', 'perfeito', 'esperança'],
      formality: 'neutral',
    },
    sentencePatterns: {
      averageLength: 'varied',
      rhythm: 'mixed',
      complexity: 'compound',
      patterns: [
        'Frases curtas e brutais para violência',
        'Pausas abruptas para impacto',
        'Repetição para ênfase em desespero',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'close',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'sombrio',
      secondaryTones: ['opressivo', 'brutal', 'melancólico'],
      sensoryPriorities: ['tactile', 'olfactory', 'visual'],
      violenceLevel: 'graphic',
      humorStyle: 'none',
    },
    techniques: [
      'Consequências reais para ações',
      'Nenhum personagem é puramente bom ou mau',
      'Vitórias sempre têm um custo',
      'Descrições sensoriais de desconforto',
      'Ambiente reflete o estado emocional',
    ],
    avoid: [
      'Finais felizes garantidos',
      'Heróis sem falhas',
      'Violência gratuita sem peso emocional',
      'Redenção fácil',
    ],
    examplePhrases: [
      'O sangue congelou antes de tocar o chão. Nada morria rápido naquele lugar.',
      'Ela venceu. O gosto de cinzas em sua boca lembrava-a do preço.',
      'Não havia heróis naquela história. Apenas sobreviventes e cadáveres.',
    ],
  },

  sword_sorcery: {
    genre: 'sword_sorcery',
    displayName: 'Espada e Feitiçaria',
    description: 'Estilo Howard com prosa dinâmica, ação poética e atmosfera permeante.',
    vocabulary: {
      complexity: 'moderate',
      useWords: ['selvagem', 'bárbaro', 'aço', 'fúria', 'demônio', 'antigo', 'sombras', 'sangue'],
      avoidWords: ['cautelosamente', 'cuidadosamente', 'educadamente'],
      formality: 'neutral',
    },
    sentencePatterns: {
      averageLength: 'medium',
      rhythm: 'mixed',
      complexity: 'compound',
      patterns: [
        'Ritmo poético nas cenas de ação',
        'Economia de palavras aprendida da poesia',
        'Prosa que soa bem lida em voz alta',
        'Cadência de narrativa oral',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'moderate',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'aventuresco',
      secondaryTones: ['visceral', 'exótico', 'perigoso'],
      sensoryPriorities: ['visual', 'tactile', 'auditory'],
      violenceLevel: 'moderate',
      humorStyle: 'subtle',
    },
    techniques: [
      'Ação visceral e dinâmica',
      'Atmosfera exótica e decadente',
      'Heróis imperfeitos mas competentes',
      'Magia como força perigosa e misteriosa',
      'Descrições sensoriais intensas',
    ],
    avoid: [
      'Longas exposições filosóficas',
      'Planejamento meticuloso (personagens agem)',
      'Magia sistemática e previsível',
      'Protagonistas passivos',
    ],
    examplePhrases: [
      'O aço cantou. Sangue pintou a pedra antiga em padrões carmesim.',
      'Conan não hesitou. A espada desceu como um raio de aço.',
      'As tochas projetavam sombras dançantes nas paredes do templo esquecido.',
    ],
  },

  cosmic_horror: {
    genre: 'cosmic_horror',
    displayName: 'Horror Cósmico',
    description: 'Estilo Lovecraft com narradores não confiáveis, pavor crescente e o indescritível.',
    vocabulary: {
      complexity: 'elaborate',
      useWords: ['indescritível', 'inominável', 'abissal', 'geometria impossível', 'antediluviano', 'blasfemo', 'fétido'],
      avoidWords: ['bonito', 'agradável', 'confortável', 'seguro', 'normal'],
      formality: 'formal',
    },
    sentencePatterns: {
      averageLength: 'long',
      rhythm: 'flowing',
      complexity: 'complex',
      patterns: [
        'Construção lenta de pavor através de prosa orquestrada',
        'Adjetivos repetidos para ênfase',
        'Descrição do efeito, não da causa',
        'Negações e incertezas ("não posso descrever", "algo como")',
      ],
    },
    pointOfView: {
      person: 'first',
      intimacy: 'intimate',
      reliability: 'unreliable',
    },
    atmosphere: {
      primaryTone: 'perturbador',
      secondaryTones: ['opressivo', 'alienígena', 'desesperador'],
      sensoryPriorities: ['auditory', 'olfactory', 'tactile'],
      violenceLevel: 'implied',
      humorStyle: 'none',
    },
    techniques: [
      'Sugestão sobre revelação explícita',
      'Pseudobibliografia (textos fictícios)',
      'Narrador que questiona sua sanidade',
      'Escala cósmica que diminui a humanidade',
      'Descreva o afogamento, não o monstro',
    ],
    avoid: [
      'Descrições completas de horrores',
      'Explicações racionais satisfatórias',
      'Heróis que vencem o mal',
      'Tom reconfortante',
      'Diálogos longos e casuais',
    ],
    examplePhrases: [
      'O que vi naquele momento... não, não posso. As palavras foram feitas para coisas deste mundo.',
      'A geometria estava errada de formas que feriam os olhos e a mente igualmente.',
      'Havia um som—se é que posso chamá-lo assim—vindo das profundezas. Um som que senti mais do que ouvi.',
    ],
  },

  noir: {
    genre: 'noir',
    displayName: 'Noir / Hardboiled',
    description: 'Estilo Chandler com narração cínica, símiles inesperados e atmosfera urbana decadente.',
    vocabulary: {
      complexity: 'moderate',
      useWords: ['dame', 'escória', 'maldição', 'uísque', 'sombras', 'chumbo', 'traição', 'problema'],
      avoidWords: ['maravilhoso', 'esperançoso', 'inocente', 'puro'],
      formality: 'casual',
    },
    sentencePatterns: {
      averageLength: 'short',
      rhythm: 'staccato',
      complexity: 'simple',
      patterns: [
        'Frases curtas e secas',
        'Símiles inesperados e originais',
        'Narração em primeira pessoa cínica',
        'Diálogo afiado e rápido',
      ],
    },
    pointOfView: {
      person: 'first',
      intimacy: 'close',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'cínico',
      secondaryTones: ['melancólico', 'perigoso', 'sedutor'],
      sensoryPriorities: ['visual', 'olfactory', 'auditory'],
      violenceLevel: 'moderate',
      humorStyle: 'subtle',
    },
    techniques: [
      'Símiles originais e inesperados',
      'Descrição detalhada de roupas e decoração',
      'Diálogo como revelador de personagem',
      'Femmes fatales e moral ambígua',
      'Chuva, neon e fumaça de cigarro',
    ],
    avoid: [
      'Otimismo ingênuo',
      'Personagens puramente bons',
      'Descrições longas sem propósito',
      'Emoções demonstradas abertamente',
    ],
    examplePhrases: [
      'Ela entrou no escritório como um problema de matemática que eu nunca iria resolver.',
      'A chuva batia na janela como dedos impacientes de um cobrador.',
      'O cano da arma olhava para mim. Parecia o túnel para o fim da linha.',
    ],
  },

  sci_fi_space: {
    genre: 'sci_fi_space',
    displayName: 'Space Opera',
    description: 'Ficção científica épica com escala galáctica, tecnologia avançada e aventura.',
    vocabulary: {
      complexity: 'moderate',
      useWords: ['nave', 'hiperespaço', 'setor', 'colônia', 'sistema', 'capitão', 'tripulação', 'órbita'],
      avoidWords: ['magia', 'encantamento', 'feitiço'],
      formality: 'neutral',
    },
    sentencePatterns: {
      averageLength: 'medium',
      rhythm: 'mixed',
      complexity: 'compound',
      patterns: [
        'Terminologia técnica naturalizada',
        'Escala grandiosa nas descrições',
        'Diálogos de comando e protocolo',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'moderate',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'aventuresco',
      secondaryTones: ['grandioso', 'misterioso', 'esperançoso'],
      sensoryPriorities: ['visual', 'auditory'],
      violenceLevel: 'moderate',
      humorStyle: 'moderate',
    },
    techniques: [
      'Tecnologia como cenário, não exposição',
      'Culturas alienígenas distintas',
      'Conflitos em escala galáctica',
      'Senso de maravilhamento',
      'Tripulações diversas e dinâmicas',
    ],
    avoid: [
      'Explicações técnicas excessivas',
      'Alienígenas como humanos com aparência diferente',
      'Viagens instantâneas trivializadas',
    ],
    examplePhrases: [
      'A nave emergiu do hiperespaço em uma cascata de luz distorcida.',
      'Três sóis pintavam o céu de Kepler-442b em tons que a Terra nunca conheceu.',
      'O capitão olhou para as estrelas. Cada ponto de luz era um mundo. Alguns, um campo de batalha.',
    ],
  },

  cyberpunk: {
    genre: 'cyberpunk',
    displayName: 'Cyberpunk',
    description: 'Alta tecnologia, baixa vida. Megacorporações, hackers, implantes e ruas decadentes.',
    vocabulary: {
      complexity: 'moderate',
      useWords: ['jack', 'chrom', 'ice', 'wetware', 'corpo', 'street', 'cred', 'flatline', 'meat'],
      avoidWords: ['pastoral', 'natural', 'simples', 'tradicional'],
      formality: 'casual',
    },
    sentencePatterns: {
      averageLength: 'short',
      rhythm: 'staccato',
      complexity: 'simple',
      patterns: [
        'Jargão técnico misturado com gíria de rua',
        'Frases curtas e urgentes',
        'Descrições sensoriais de neon e metal',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'close',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'distópico',
      secondaryTones: ['frenético', 'sujo', 'perigoso'],
      sensoryPriorities: ['visual', 'auditory', 'tactile'],
      violenceLevel: 'graphic',
      humorStyle: 'subtle',
    },
    techniques: [
      'Contraste entre alta tecnologia e decadência',
      'Implantes cibernéticos como normalidade',
      'Megacorporações como vilãs sistêmicas',
      'Realidade virtual como escape ou armadilha',
      'Chuva ácida e neon como estética',
    ],
    avoid: [
      'Natureza intocada',
      'Governos funcionais e benevolentes',
      'Tecnologia como salvação',
      'Vilões unidimensionais',
    ],
    examplePhrases: [
      'As luzes de neon sangravam cores nas poças de chuva ácida.',
      'Ela plugou o jack. O gelo da Arasaka era brutal, mas ela era melhor.',
      'Carne era fraca. Chrom era caro. Nas ruas, você pagava com os dois.',
    ],
  },

  steampunk: {
    genre: 'steampunk',
    displayName: 'Steampunk',
    description: 'Era vitoriana alternativa com vapor, engrenagens e aventura elegante.',
    vocabulary: {
      complexity: 'elaborate',
      useWords: ['engrenagem', 'vapor', 'autômato', 'éter', 'dirigível', 'cavalheiro', 'dama', 'inventor'],
      avoidWords: ['digital', 'eletrônico', 'plástico'],
      formality: 'formal',
    },
    sentencePatterns: {
      averageLength: 'long',
      rhythm: 'flowing',
      complexity: 'complex',
      patterns: [
        'Formalidade vitoriana nos diálogos',
        'Descrições elaboradas de máquinas',
        'Etiqueta social como elemento narrativo',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'moderate',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'aventuresco',
      secondaryTones: ['elegante', 'misterioso', 'inventivo'],
      sensoryPriorities: ['visual', 'auditory', 'olfactory'],
      violenceLevel: 'moderate',
      humorStyle: 'moderate',
    },
    techniques: [
      'Estética de latão, couro e vapor',
      'Inventores excêntricos',
      'Sociedade estratificada vitoriana',
      'Aventuras em dirigíveis e trens',
      'Mistérios científicos',
    ],
    avoid: [
      'Tecnologia digital',
      'Informalidade excessiva',
      'Anacronismos óbvios',
    ],
    examplePhrases: [
      'O autômato inclinou-se com um ranger de engrenagens. "Às suas ordens, milorde."',
      'Vapor silvou das válvulas enquanto a grande máquina ganhava vida.',
      'Lady Pemberton ajustou seus óculos de proteção. A invenção funcionaria. Tinha que funcionar.',
    ],
  },

  post_apocalyptic: {
    genre: 'post_apocalyptic',
    displayName: 'Pós-Apocalíptico',
    description: 'Mundo devastado onde sobrevivência é a única lei. Escassez, desconfiança e esperança frágil.',
    vocabulary: {
      complexity: 'simple',
      useWords: ['ruínas', 'escasso', 'radioativo', 'sobrevivente', 'bunker', 'comida', 'água', 'perigo'],
      avoidWords: ['abundância', 'seguro', 'confortável', 'luxo'],
      formality: 'casual',
    },
    sentencePatterns: {
      averageLength: 'short',
      rhythm: 'staccato',
      complexity: 'simple',
      patterns: [
        'Economia de palavras refletindo escassez',
        'Diálogos pragmáticos e desconfiados',
        'Descrições de decadência e ferrugem',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'close',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'desolador',
      secondaryTones: ['tenso', 'esperançoso', 'brutal'],
      sensoryPriorities: ['visual', 'olfactory', 'tactile'],
      violenceLevel: 'moderate',
      humorStyle: 'none',
    },
    techniques: [
      'Escassez como tensão constante',
      'Ruínas do mundo antigo como cenário',
      'Comunidades frágeis e facções hostis',
      'Tecnologia antiga como tesouro',
      'Natureza retomando espaços urbanos',
    ],
    avoid: [
      'Recursos abundantes',
      'Confiança fácil entre estranhos',
      'Soluções tecnológicas simples',
    ],
    examplePhrases: [
      'A água acabou ontem. A sede era apenas mais um inimigo na lista.',
      'As ruínas da cidade erguiam-se como ossos de um gigante morto.',
      'Confiança era um luxo. Ninguém podia pagá-la.',
    ],
  },

  mystery: {
    genre: 'mystery',
    displayName: 'Mistério / Detetive',
    description: 'Investigação, pistas e revelações graduais. A verdade está nos detalhes.',
    vocabulary: {
      complexity: 'moderate',
      useWords: ['pista', 'suspeito', 'evidência', 'álibi', 'motivo', 'testemunha', 'mistério', 'verdade'],
      avoidWords: ['óbvio', 'simples', 'claramente'],
      formality: 'neutral',
    },
    sentencePatterns: {
      averageLength: 'medium',
      rhythm: 'mixed',
      complexity: 'compound',
      patterns: [
        'Descrições observacionais detalhadas',
        'Diálogos que revelam e escondem',
        'Pistas plantadas naturalmente',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'close',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'intrigante',
      secondaryTones: ['tenso', 'cerebral', 'revelador'],
      sensoryPriorities: ['visual', 'auditory'],
      violenceLevel: 'implied',
      humorStyle: 'subtle',
    },
    techniques: [
      'Plantar pistas justas (fair play)',
      'Red herrings para desviar atenção',
      'Revelações graduais e satisfatórias',
      'Cada personagem com motivo potencial',
      'Detalhes que ganham significado depois',
    ],
    avoid: [
      'Soluções deus ex machina',
      'Culpados óbvios desde o início',
      'Pistas impossíveis de deduzir',
      'Revelações sem preparação',
    ],
    examplePhrases: [
      'O detalhe era pequeno. Mas os crimes se escondem nos detalhes pequenos.',
      'Todos tinham motivo. A questão era quem tinha oportunidade.',
      '"Interessante", murmurou, notando a marca de batom na xícara. "Muito interessante."',
    ],
  },

  romance: {
    genre: 'romance',
    displayName: 'Romance',
    description: 'Foco em relacionamentos e tensão emocional. Sentimentos como motor da história.',
    vocabulary: {
      complexity: 'moderate',
      useWords: ['coração', 'olhar', 'toque', 'suspiro', 'desejo', 'saudade', 'esperança', 'medo'],
      avoidWords: ['indiferente', 'apático', 'frio'],
      formality: 'neutral',
    },
    sentencePatterns: {
      averageLength: 'varied',
      rhythm: 'flowing',
      complexity: 'compound',
      patterns: [
        'Foco em reações internas e emocionais',
        'Diálogos carregados de subtexto',
        'Descrições sensoriais de proximidade',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'intimate',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'emocional',
      secondaryTones: ['íntimo', 'esperançoso', 'tenso'],
      sensoryPriorities: ['visual', 'tactile', 'auditory'],
      violenceLevel: 'none',
      humorStyle: 'moderate',
    },
    techniques: [
      'Tensão romântica bem desenvolvida',
      'Obstáculos significativos ao relacionamento',
      'Vulnerabilidade emocional',
      'Momentos de conexão genuína',
      'Crescimento dos personagens através do amor',
    ],
    avoid: [
      'Relacionamentos instantâneos sem desenvolvimento',
      'Personagens sem profundidade fora do romance',
      'Conflitos artificiais',
    ],
    examplePhrases: [
      'Seus dedos roçaram os dela. O mundo inteiro parou naquele instante.',
      'Ela não disse nada. Não precisava. Seus olhos diziam tudo o que palavras não podiam.',
      'O coração dela sabia a verdade antes que a mente pudesse processá-la.',
    ],
  },

  comedy: {
    genre: 'comedy',
    displayName: 'Comédia',
    description: 'Humor, timing e subversão de expectativas. A vida é absurda, então ria.',
    vocabulary: {
      complexity: 'moderate',
      useWords: ['absurdo', 'ridículo', 'inacreditável', 'desastre', 'confusão'],
      avoidWords: ['trágico', 'solene', 'grave'],
      formality: 'casual',
    },
    sentencePatterns: {
      averageLength: 'varied',
      rhythm: 'mixed',
      complexity: 'simple',
      patterns: [
        'Timing cômico (setup-punchline)',
        'Subversão de expectativas',
        'Repetição cômica',
        'Exagero para efeito humorístico',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'moderate',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'humorístico',
      secondaryTones: ['absurdo', 'leve', 'satírico'],
      sensoryPriorities: ['visual', 'auditory'],
      violenceLevel: 'none',
      humorStyle: 'frequent',
    },
    techniques: [
      'Setup e punchline bem construídos',
      'Personagens com falhas cômicas',
      'Situações que escalam absurdamente',
      'Ironia dramática',
      'Quebra da quarta parede (se apropriado)',
    ],
    avoid: [
      'Humor às custas de grupos vulneráveis',
      'Piadas que precisam de explicação',
      'Tom sério prolongado',
    ],
    examplePhrases: [
      'O plano era à prova de falhas. Infelizmente, ninguém avisou os falhos.',
      '"Isso não pode ficar pior", disse ele. O universo, como sempre, aceitou o desafio.',
      'A situação era grave. Tão grave que ele decidiu fingir que não existia.',
    ],
  },

  historical: {
    genre: 'historical',
    displayName: 'Histórico',
    description: 'Época específica com precisão cultural e atmosfera autêntica.',
    vocabulary: {
      complexity: 'elaborate',
      useWords: ['época-específicas'],
      avoidWords: ['anacronismos'],
      formality: 'formal',
    },
    sentencePatterns: {
      averageLength: 'long',
      rhythm: 'flowing',
      complexity: 'complex',
      patterns: [
        'Linguagem apropriada à época',
        'Detalhes históricos naturalizados',
        'Diálogos que refletem costumes do período',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'moderate',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'autêntico',
      secondaryTones: ['imersivo', 'educativo', 'dramático'],
      sensoryPriorities: ['visual', 'olfactory', 'auditory'],
      violenceLevel: 'moderate',
      humorStyle: 'subtle',
    },
    techniques: [
      'Pesquisa histórica refletida nos detalhes',
      'Costumes e etiqueta da época',
      'Conflitos e tensões do período',
      'Personagens como produto de seu tempo',
      'Eventos históricos como pano de fundo',
    ],
    avoid: [
      'Valores modernos anacrônicos',
      'Erros históricos óbvios',
      'Idealização excessiva do passado',
    ],
    examplePhrases: [
      'As ruas de Londres fediam a carvão e esgoto. Era o cheiro do progresso.',
      'O conde inclinou-se na reverência prescrita pela etiqueta. Nem um grau a mais, nem um a menos.',
      'A guerra mudara tudo. Os velhos costumes pareciam relíquias de um mundo que já não existia.',
    ],
  },

  superhero: {
    genre: 'superhero',
    displayName: 'Super-herói',
    description: 'Poderes extraordinários e responsabilidade. Ação, dilemas morais e espetáculo.',
    vocabulary: {
      complexity: 'moderate',
      useWords: ['poder', 'herói', 'vilão', 'cidade', 'proteger', 'justiça', 'máscara', 'identidade'],
      avoidWords: ['comum', 'ordinário', 'normal'],
      formality: 'neutral',
    },
    sentencePatterns: {
      averageLength: 'medium',
      rhythm: 'mixed',
      complexity: 'compound',
      patterns: [
        'Descrições dinâmicas de ação',
        'Contraste entre vida civil e heroica',
        'Monólogos internos sobre responsabilidade',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'close',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'heroico',
      secondaryTones: ['dramático', 'espetacular', 'esperançoso'],
      sensoryPriorities: ['visual', 'auditory', 'tactile'],
      violenceLevel: 'moderate',
      humorStyle: 'moderate',
    },
    techniques: [
      'Poderes como metáfora para questões humanas',
      'Vida dupla e suas tensões',
      'Vilões como espelhos distorcidos do herói',
      'Ação cinematográfica e espetacular',
      'Dilemas morais sem respostas fáceis',
    ],
    avoid: [
      'Poderes sem limites ou custos',
      'Vilões unidimensionais',
      'Violência sem consequências',
    ],
    examplePhrases: [
      'O peso do mundo não era metáfora. Ela podia literalmente sentí-lo em seus ombros.',
      'Por baixo da máscara, ele era apenas humano. Esse era o segredo que ninguém podia saber.',
      'A cidade dormia. Alguém precisava vigiar seus sonhos.',
    ],
  },

  slice_of_life: {
    genre: 'slice_of_life',
    displayName: 'Slice of Life',
    description: 'Momentos cotidianos com profundidade. A beleza está nas pequenas coisas.',
    vocabulary: {
      complexity: 'simple',
      useWords: ['cotidiano', 'momento', 'café', 'conversa', 'silêncio', 'rotina', 'amizade'],
      avoidWords: ['épico', 'dramático', 'extraordinário'],
      formality: 'casual',
    },
    sentencePatterns: {
      averageLength: 'short',
      rhythm: 'flowing',
      complexity: 'simple',
      patterns: [
        'Observações detalhadas do ordinário',
        'Diálogos naturalistas',
        'Silêncios significativos',
      ],
    },
    pointOfView: {
      person: 'third',
      intimacy: 'intimate',
      reliability: 'reliable',
    },
    atmosphere: {
      primaryTone: 'contemplativo',
      secondaryTones: ['caloroso', 'melancólico', 'esperançoso'],
      sensoryPriorities: ['visual', 'auditory', 'olfactory'],
      violenceLevel: 'none',
      humorStyle: 'subtle',
    },
    techniques: [
      'Valorização de momentos pequenos',
      'Relacionamentos como centro',
      'Crescimento gradual e realista',
      'Detalhes sensoriais do cotidiano',
      'Emoções sutis e genuínas',
    ],
    avoid: [
      'Conflitos artificiais',
      'Drama exagerado',
      'Eventos mirabolantes',
    ],
    examplePhrases: [
      'O café estava frio. Ela bebeu mesmo assim, olhando pela janela.',
      'Não disseram nada por um longo tempo. Não precisavam.',
      'Era só mais uma terça-feira. De alguma forma, isso a fazia perfeita.',
    ],
  },
};

// ============================================================================
// SISTEMA DE MOSTRAR, NÃO CONTAR
// ============================================================================

/**
 * Regras e exemplos para técnica de "mostrar, não contar".
 */
export const SHOW_DONT_TELL_RULES = {
  emotions: {
    instruction: `
NUNCA use rótulos de estado interno (triste, com raiva, nervoso, feliz, etc.).
SEMPRE mostre emoções através de:
- Ações físicas e linguagem corporal
- Detalhes ambientais que o personagem nota
- Subtexto no diálogo
- Reações fisiológicas (respiração, batimentos, suor)
- Escolha de palavras e ritmo de fala`,
    examples: [
      { bad: 'Ela estava com raiva.', good: 'Ela bateu o punho na mesa, sua voz subindo uma oitava.' },
      { bad: 'Ele estava nervoso.', good: 'Ele ajustou a gravata pela terceira vez, os olhos saltando para a porta.' },
      { bad: 'Maria ficou triste.', good: 'Maria virou o rosto para a janela. A chuva traçava caminhos no vidro.' },
      { bad: 'O guerreiro estava com medo.', good: 'O guerreiro apertou a espada até os nós dos dedos ficarem brancos.' },
      { bad: 'A criança estava feliz.', good: 'A criança correu em círculos, rindo até perder o fôlego.' },
    ],
  },

  atmosphere: {
    instruction: `
Use detalhes sensoriais específicos para criar atmosfera.
Deixe objetos e ambiente impliquem a história de fundo.
Filtre a descrição através da percepção do personagem.`,
    examples: [
      { bad: 'O lugar era assustador.', good: 'As tábuas gemeram sob seus pés. Teias de aranha pendiam como véus de luto.' },
      { bad: 'A taverna era acolhedora.', good: 'O fogo crepitava. Cheiro de pão fresco e cerveja misturava-se ao murmúrio de vozes.' },
      { bad: 'A batalha tinha sido terrível.', good: 'Corvos circulavam. O chão estava coberto de lâminas quebradas e escudos abandonados.' },
    ],
  },

  character: {
    instruction: `
Revele personalidade através de ações e escolhas, não descrições diretas.
Mostre contradições e nuances através de comportamento.`,
    examples: [
      { bad: 'Ele era um homem generoso.', good: 'Ele dividiu seu último pão com o mendigo, ignorando seu próprio estômago roncando.' },
      { bad: 'Ela era corajosa.', good: 'Suas mãos tremiam, mas ela deu um passo à frente mesmo assim.' },
      { bad: 'O rei era cruel.', good: 'O rei sorriu enquanto assinava a ordem de execução, sem levantar os olhos da refeição.' },
    ],
  },

  selectiveUse: {
    instruction: `
Use "contar" seletivamente para:
- Transições de tempo
- Pontes de exposição
- Controle de ritmo
Alterne entre mostrar e contar para criar ritmo eficaz.`,
    examples: [
      { when: 'Passagem de tempo', example: 'Três dias depois, eles chegaram à fronteira.' },
      { when: 'Informação de fundo', example: 'O reino estava em guerra há duas décadas.' },
      { when: 'Resumo de ações rotineiras', example: 'Ela passou a manhã seguinte organizando as provisões.' },
    ],
  },
};

// ============================================================================
// SISTEMA DE DIFERENCIAÇÃO DE VOZ DE NPCS
// ============================================================================

/**
 * Templates de voz baseados em educação e classe social.
 */
export const VOICE_TEMPLATES: Record<string, Partial<NPCVoiceProfile>> = {
  peasant: {
    educationLevel: 'uneducated',
    socialClass: 'lower',
    verbalTics: ['né', 'sabe', 'tipo assim'],
    speechRhythm: 'fast',
  },
  merchant: {
    educationLevel: 'common',
    socialClass: 'middle',
    verbalTics: ['meu amigo', 'veja bem', 'entre nós'],
    speechRhythm: 'normal',
  },
  scholar: {
    educationLevel: 'scholarly',
    socialClass: 'middle',
    verbalTics: ['de fato', 'evidentemente', 'curioso'],
    speechRhythm: 'slow',
  },
  noble: {
    educationLevel: 'educated',
    socialClass: 'nobility',
    verbalTics: ['certamente', 'naturalmente', 'como é de esperar'],
    speechRhythm: 'slow',
  },
  soldier: {
    educationLevel: 'common',
    socialClass: 'lower',
    verbalTics: ['senhor', 'entendido', 'com licença'],
    speechRhythm: 'fast',
  },
  mystic: {
    educationLevel: 'scholarly',
    socialClass: 'outcast',
    verbalTics: ['as estrelas dizem', 'vejo que', 'o destino'],
    speechRhythm: 'slow',
  },
  criminal: {
    educationLevel: 'uneducated',
    socialClass: 'outcast',
    verbalTics: ['olha só', 'sacou', 'tá ligado'],
    speechRhythm: 'fast',
  },
  child: {
    educationLevel: 'uneducated',
    socialClass: 'lower',
    verbalTics: ['né', 'daí', 'aí'],
    speechRhythm: 'fast',
  },
};

/**
 * Gera instruções de diferenciação de voz para NPCs em uma cena.
 */
export function generateVoiceDifferentiationInstructions(npcs: Array<{ name: string; profile: Partial<NPCVoiceProfile> }>): string {
  if (npcs.length === 0) return '';

  const instructions = npcs.map((npc) => {
    const parts = [`${npc.name}:`];

    if (npc.profile.educationLevel) {
      const eduDescriptions: Record<string, string> = {
        uneducated: 'Vocabulário simples, gírias, erros gramaticais ocasionais',
        common: 'Vocabulário médio, expressões populares',
        educated: 'Vocabulário amplo, gramática correta',
        scholarly: 'Vocabulário técnico/acadêmico, referências eruditas',
        archaic: 'Linguagem antiga, expressões em desuso',
      };
      parts.push(eduDescriptions[npc.profile.educationLevel] || '');
    }

    if (npc.profile.socialClass) {
      const classDescriptions: Record<string, string> = {
        outcast: 'Tom defensivo ou misterioso',
        lower: 'Tom direto e prático',
        middle: 'Tom profissional e cordial',
        upper: 'Tom confiante e assertivo',
        nobility: 'Tom formal e superior',
        royalty: 'Tom majestoso e comandante',
      };
      parts.push(classDescriptions[npc.profile.socialClass] || '');
    }

    if (npc.profile.verbalTics && npc.profile.verbalTics.length > 0) {
      parts.push(`Tiques verbais: "${npc.profile.verbalTics.join('", "')}"`);
    }

    if (npc.profile.catchphrases && npc.profile.catchphrases.length > 0) {
      parts.push(`Frases características: "${npc.profile.catchphrases.join('", "')}"`);
    }

    if (npc.profile.speechRhythm) {
      const rhythmDescriptions: Record<string, string> = {
        slow: 'Fala pausada e deliberada',
        normal: 'Ritmo natural de conversa',
        fast: 'Fala rápida e energética',
        erratic: 'Ritmo irregular, hesitações',
      };
      parts.push(rhythmDescriptions[npc.profile.speechRhythm] || '');
    }

    if (npc.profile.personalityTrait) {
      parts.push(`Traço dominante: ${npc.profile.personalityTrait}`);
    }

    return parts.join(' | ');
  });

  return `
=== VOICE DIFFERENTIATION (CRITICAL) ===
Each NPC must have a DISTINCT voice. Never let all characters sound the same.

${instructions.join('\n')}

Show different worldviews through word choices.
Include action beats between dialogue lines.
Vary sentence length and complexity per character.
`;
}

// ============================================================================
// SISTEMA DE CONTROLE DE RITMO
// ============================================================================

/**
 * Instruções de pacing baseadas no estado atual.
 */
export function generatePacingInstructions(state: PacingState, targetLevel?: PacingLevel): string {
  const recommendations: Record<PacingLevel, string> = {
    high_tension: `
RITMO: ALTA TENSÃO
- Frases CURTAS e cortantes
- Ações imediatas, sem pausa para reflexão
- Diálogos breves ou interrompidos
- Escolhas com tempo limitado
- Foco em ação e reação
- Detalhes sensoriais de urgência (coração acelerado, respiração curta)`,

    building: `
RITMO: CONSTRUINDO TENSÃO
- Aumentar gradualmente a urgência
- Inserir pequenas complicações
- Diálogos que escondem ou revelam informação
- Ambiente refletindo tensão crescente
- Prenúncios sutis de perigo
- Personagem notando detalhes preocupantes`,

    moderate: `
RITMO: MODERADO
- Equilíbrio entre ação e reflexão
- Diálogos com ritmo natural
- Exploração do ambiente permitida
- Desenvolvimento de relacionamentos
- Mistura de frases curtas e longas
- Progresso constante da trama`,

    calm: `
RITMO: CALMO / RESPIRO
- Permitir reflexão do personagem
- Exploração detalhada do ambiente
- Conversas mais longas e pessoais
- Construção de relacionamentos
- Descrições sensoriais relaxantes
- Momentos de humanidade e humor`,

    release: `
RITMO: LIBERAÇÃO
- Resolução de tensão acumulada
- Consequências reveladas
- Emoções processadas
- Tempo para respirar após clímax
- Reflexão sobre o que aconteceu
- Setup para próxima sequência`,
  };

  let instruction = recommendations[state.currentLevel];

  // Adicionar avisos sobre ritmo prolongado
  if (state.turnsAtLevel > 3 && state.currentLevel === 'high_tension') {
    instruction += `
⚠️ AVISO: Alta tensão por ${state.turnsAtLevel} turnos seguidos.
Considere um momento de respiro ou resolução em breve.
Tensão constante perde impacto.`;
  }

  if (state.turnsAtLevel > 5 && state.currentLevel === 'calm') {
    instruction += `
⚠️ AVISO: Cenas calmas por ${state.turnsAtLevel} turnos seguidos.
Considere introduzir um conflito ou complicação para manter engajamento.`;
  }

  // Sugerir transição se houver target
  if (targetLevel && targetLevel !== state.currentLevel) {
    instruction += `

🎯 TRANSIÇÃO SUGERIDA: ${state.currentLevel} → ${targetLevel}
Construa essa transição naturalmente ao longo desta e das próximas respostas.`;
  }

  return instruction;
}

// ============================================================================
// GERADOR DE INSTRUÇÕES NARRATIVAS COMPLETAS
// ============================================================================

/**
 * Gera um bloco completo de instruções narrativas para o prompt do GM.
 */
export function generateNarrativeInstructions(options: {
  genre: NarrativeGenre;
  pacingState?: PacingState;
  npcsInScene?: Array<{ name: string; profile: Partial<NPCVoiceProfile> }>;
  narrativeThreads?: NarrativeThread[];
  targetPacing?: PacingLevel;
}): string {
  const { genre, pacingState, npcsInScene, narrativeThreads, targetPacing } = options;
  const style = GENRE_PRESETS[genre];

  const sections: string[] = [];

  // 1. Estilo do Gênero
  sections.push(`
=== NARRATIVE STYLE: ${style.displayName.toUpperCase()} ===
${style.description}

**VOCABULARY:**
- Complexity: ${style.vocabulary.complexity}
- Formality: ${style.vocabulary.formality}
- USE these words/expressions: ${style.vocabulary.useWords.join(', ')}
- AVOID these words/expressions: ${style.vocabulary.avoidWords.join(', ')}

**SENTENCE STRUCTURE:**
- Average length: ${style.sentencePatterns.averageLength}
- Rhythm: ${style.sentencePatterns.rhythm}
- Patterns: ${style.sentencePatterns.patterns.join('; ')}

**ATMOSPHERE:**
- Primary tone: ${style.atmosphere.primaryTone}
- Secondary tones: ${style.atmosphere.secondaryTones.join(', ')}
- Sensory priorities: ${style.atmosphere.sensoryPriorities.join(' > ')}
- Violence level: ${style.atmosphere.violenceLevel}
- Humor: ${style.atmosphere.humorStyle}

**TECHNIQUES TO USE:**
${style.techniques.map((t) => `- ${t}`).join('\n')}

**AVOID:**
${style.avoid.map((a) => `- ${a}`).join('\n')}

**EXAMPLE PHRASES (for tone reference):**
${style.examplePhrases.map((p) => `"${p}"`).join('\n')}
`);

  // 2. Mostrar, Não Contar
  sections.push(`
=== SHOW, DON'T TELL (MANDATORY) ===
${SHOW_DONT_TELL_RULES.emotions.instruction}

Examples:
${SHOW_DONT_TELL_RULES.emotions.examples.map((e) => `❌ "${e.bad}" → ✅ "${e.good}"`).join('\n')}

${SHOW_DONT_TELL_RULES.atmosphere.instruction}
${SHOW_DONT_TELL_RULES.character.instruction}
${SHOW_DONT_TELL_RULES.selectiveUse.instruction}
`);

  // 3. Diferenciação de Voz (se houver NPCs)
  if (npcsInScene && npcsInScene.length > 0) {
    sections.push(generateVoiceDifferentiationInstructions(npcsInScene));
  }

  // 4. Controle de Ritmo (se houver estado)
  if (pacingState) {
    sections.push(`
=== PACING CONTROL ===
${generatePacingInstructions(pacingState, targetPacing)}
`);
  }

  // 5. Threads Narrativas (foreshadowing e callbacks)
  if (narrativeThreads && narrativeThreads.length > 0) {
    const planted = narrativeThreads.filter((t) => t.status === 'planted');
    const toReference = planted.filter((t) => t.importance === 'major' || Math.random() < 0.3);

    if (toReference.length > 0) {
      sections.push(`
=== NARRATIVE THREADS (CALLBACKS & FORESHADOWING) ===
Consider referencing these planted elements when appropriate:
${toReference.map((t) => `- [${t.type}] ${t.description} (planted turn ${t.plantedTurn})`).join('\n')}

These create satisfying connections when paid off later.
Don't force them, but look for natural opportunities.
`);
    }
  }

  return sections.join('\n');
}

// ============================================================================
// EXPORTAÇÃO DE UTILIDADES
// ============================================================================

export const NarrativeUtils = {
  getGenrePreset: (genre: NarrativeGenre) => GENRE_PRESETS[genre],
  getAllGenres: () => Object.keys(GENRE_PRESETS) as NarrativeGenre[],
  generateVoiceInstructions: generateVoiceDifferentiationInstructions,
  generatePacingInstructions,
  generateNarrativeInstructions,
  SHOW_DONT_TELL_RULES,
  VOICE_TEMPLATES,
};
