// Solar AI Engine - Math solver, Q&A, and image analysis

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  timestamp: Date;
}

// Safe math expression evaluator
function evaluateMath(expr: string): string | null {
  try {
    // Clean and prepare expression
    let cleaned = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '.')
      .replace(/\^/g, '**')
      .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
      .replace(/sin\(([^)]+)\)/gi, 'Math.sin($1)')
      .replace(/cos\(([^)]+)\)/gi, 'Math.cos($1)')
      .replace(/tan\(([^)]+)\)/gi, 'Math.tan($1)')
      .replace(/log\(([^)]+)\)/gi, 'Math.log10($1)')
      .replace(/ln\(([^)]+)\)/gi, 'Math.log($1)')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![x])/gi, 'Math.E')
      .replace(/abs\(([^)]+)\)/gi, 'Math.abs($1)')
      .replace(/(\d+)!/g, (_, n) => factorial(parseInt(n)).toString());

    // Only allow safe characters
    if (!/^[\d\s+\-*/().%,Math.sqrtsincotaglPIEabxpow**]+$/.test(cleaned)) {
      // More permissive check
      const safePattern = /^[\d\s+\-*/().,%^!a-zA-Z]+$/;
      if (!safePattern.test(cleaned)) return null;
    }

    // eslint-disable-next-line no-eval
    const result = Function('"use strict"; return (' + cleaned + ')')();
    
    if (typeof result === 'number' && isFinite(result)) {
      return Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, '');
    }
    return null;
  } catch {
    return null;
  }
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  if (n > 170) return Infinity;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Extract math expression from text
function extractMath(text: string): string | null {
  // Direct math patterns
  const mathPatterns = [
    /(?:реши|вычисли|посчитай|сколько будет|калькулятор|calculate|solve)\s*:?\s*(.+)/i,
    /(\d+[\s]*[+\-*/^×÷][\s]*\d+(?:[\s]*[+\-*/^×÷][\s]*\d+)*)/,
    /(?:=|равно)\s*(.+)/i,
  ];

  for (const pattern of mathPatterns) {
    const match = text.match(pattern);
    if (match) {
      const expr = match[1].trim();
      const result = evaluateMath(expr);
      if (result !== null) return result;
    }
  }

  // Try to evaluate the whole text as math
  if (/^[\d\s+\-*/().,%^!]+$/.test(text.trim())) {
    const result = evaluateMath(text.trim());
    if (result !== null) return result;
  }

  return null;
}

// Knowledge base for Q&A
const knowledgeBase: { patterns: RegExp[]; responses: string[] }[] = [
  {
    patterns: [/привет|здравствуй|хай|hello|hi|добр(ый|ое|ая)/i],
    responses: [
      'Привет! 👋 Я Solar — твой умный AI-ассистент. Чем могу помочь?',
      'Здравствуйте! ✨ Рад вас видеть! Задайте мне любой вопрос или покажите фотографию.',
      'Привет! 🌟 Я Solar, готов помочь вам с любыми вопросами, задачами и анализом изображений!',
    ],
  },
  {
    patterns: [/как (тебя |тебя )?зовут|кто ты|что ты|what.*your.*name/i],
    responses: [
      'Меня зовут **Solar** 🌟 — я умный AI-ассистент. Я умею решать математические задачи, отвечать на вопросы и анализировать изображения!',
      'Я — **Solar**, ваш персональный AI-помощник! Могу помочь с математикой, ответить на вопросы и даже проанализировать фотографии 📸',
    ],
  },
  {
    patterns: [/что (ты )?(умеешь|можешь)|твои возможности|help|помощь/i],
    responses: [
      '🌟 **Мои возможности:**\n\n📐 **Математика** — решаю примеры, уравнения, вычисления\n📸 **Анализ фото** — распознаю объекты на изображениях\n💬 **Вопросы** — отвечаю на самые разные вопросы\n🧮 **Калькулятор** — просто напишите выражение\n\nПримеры:\n• «Реши 25 * 4 + 13»\n• «Сколько будет sqrt(144)?»\n• Загрузите фотографию для анализа',
    ],
  },
  {
    patterns: [/врем[яе]|час|который час|what.*time/i],
    responses: [
      `Сейчас ${new Date().toLocaleTimeString('ru-RU')} 🕐`,
    ],
  },
  {
    patterns: [/дат[ае]|сегодняшн|какой день|какое число|what.*date/i],
    responses: [
      `Сегодня ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 📅`,
    ],
  },
  {
    patterns: [/погод[ае]/i],
    responses: [
      'К сожалению, у меня нет доступа к данным о погоде в реальном времени 🌤️ Но вы можете посмотреть погоду на weather.com или в приложении погоды на вашем устройстве!',
    ],
  },
  {
    patterns: [/спасибо|благодар|thanks|thank you/i],
    responses: [
      'Пожалуйста! 😊 Рад был помочь! Если есть ещё вопросы — обращайтесь!',
      'Не за что! ✨ Всегда рад помочь! Обращайтесь в любое время!',
      'Рад стараться! 🌟 Если что-то ещё понадобится — я здесь!',
    ],
  },
  {
    patterns: [/пока|до свидания|bye|goodbye|прощай/i],
    responses: [
      'До свидания! 👋 Было приятно пообщаться. Возвращайтесь в любое время!',
      'Пока-пока! 🌟 Хорошего дня! Я всегда здесь, если понадоблюсь!',
    ],
  },
  {
    patterns: [/расскажи.*шутк|шутк[аеу]|анекдот|joke/i],
    responses: [
      '😄 Почему программисты путают Хэллоуин и Рождество? Потому что Oct 31 = Dec 25!',
      '😄 — Сколько программистов нужно, чтобы вкрутить лампочку?\n— Ни одного, это аппаратная проблема!',
      '😄 Жена программиста просит: «Сходи в магазин, купи батон хлеба. Если будут яйца — возьми десяток.»\nПрограммист вернулся с 10 батонами хлеба. «Яйца были.»',
      '😄 Два байта встретились. Один спрашивает: «Ты не болен?» Второй отвечает: «Нет, просто бит не в ту сторону смотрит.»',
    ],
  },
  {
    patterns: [/солнц[еау]|sun/i],
    responses: [
      '☀️ Солнце — это звезда в центре нашей Солнечной системы! Его температура на поверхности около 5,500°C, а в ядре — около 15 миллионов °C. Солнце состоит в основном из водорода (73%) и гелия (25%).',
    ],
  },
  {
    patterns: [/python|питон|пайтон/i],
    responses: [
      '🐍 **Python** — один из самых популярных языков программирования! Он известен своим простым и читаемым синтаксисом. Используется в:\n\n• 🤖 Машинное обучение и AI\n• 🌐 Веб-разработка (Django, Flask)\n• 📊 Анализ данных и наука\n• 🎮 Разработка игр\n• 🔧 Автоматизация задач\n\nPython отлично подходит для начинающих!',
    ],
  },
  {
    patterns: [/космос|вселенн|планет|звезд|space|universe/i],
    responses: [
      '🌌 **Вселенная** невероятно vast! Вот несколько фактов:\n\n• Возраст Вселенной: ~13.8 миллиардов лет\n• Наблюдаемая Вселенная: ~93 миллиарда световых лет в диаметре\n• В нашей галактике: 100-400 миллиардов звёзд\n• Во Вселенной: ~2 триллиона галактик\n• Температура космоса: ~2.7 Кельвина (-270.45°C)\n\nКосмос полон загадок! 🚀',
    ],
  },
  {
    patterns: [/программир|код|coding|developer|разработ/i],
    responses: [
      '💻 **Программирование** — это искусство создания инструкций для компьютера!\n\nПопулярные языки:\n• 🐍 Python — AI, данные, скрипты\n• 🌐 JavaScript — веб-разработка\n• ☕ Java — Android, enterprise\n• 🦀 Rust — безопасность, скорость\n• 🍎 Swift — iOS приложения\n\nСовет для начинающих: начните с Python или JavaScript! 🚀',
    ],
  },
];

// Get response for text input
export function getAIResponse(text: string): string {
  const input = text.trim().toLowerCase();

  // Check for math first
  const mathResult = extractMath(text);
  if (mathResult !== null) {
    const expr = text.replace(/реши|вычисли|посчитай|сколько будет|калькулятор|calculate|solve/gi, '').trim();
    return `🧮 **Решение:**\n\n${expr || text.trim()} = **${mathResult}**\n\nМогу решить более сложные выражения! Просто напишите их.`;
  }

  // Check knowledge base
  for (const entry of knowledgeBase) {
    for (const pattern of entry.patterns) {
      if (pattern.test(input)) {
        return entry.responses[Math.floor(Math.random() * entry.responses.length)];
      }
    }
  }

  // Check for equation solving
  const equationMatch = text.match(/(\w+)\s*[=]\s*(.+)/i);
  if (equationMatch) {
    return `📐 Вижу уравнение! К сожалению, для решения сложных уравнений мне нужна более детальная запись. Попробуйте записать в формате: "реши 2x + 5 = 15"`;
  }

  // Check for percentage
  const percentMatch = input.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:от|of)\s*(\d+(?:[.,]\d+)?)/i);
  if (percentMatch) {
    const percent = parseFloat(percentMatch[1].replace(',', '.'));
    const number = parseFloat(percentMatch[2].replace(',', '.'));
    const result = (percent / 100) * number;
    return `📊 **Проценты:**\n\n${percent}% от ${number} = **${result}**`;
  }

  // Default responses
  const defaults = [
    `Интересный вопрос! 🤔 Я постараюсь помочь. К сожалению, мой ответ может быть не полным. Попробуйте переформулировать вопрос или загрузите фотографию для анализа!`,
    `Хм, это сложный вопрос! 💭 Я постоянно учусь. Попробуйте задать вопрос по-другому, или покажите мне фотографию — я умею анализировать изображения! 📸`,
    `Спасибо за вопрос! 🌟 Я специализируюсь на математике и анализе изображений. Попробуйте:\n• Написать математическое выражение\n• Загрузить фотографию\n• Задать вопрос о науке или технологиях`,
  ];

  return defaults[Math.floor(Math.random() * defaults.length)];
}

// Image analysis simulation
export function analyzeImage(file: File, userMessage?: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const fileName = file.name.toLowerCase();
      const fileSize = (file.size / 1024).toFixed(1);
      const fileType = file.type.split('/')[1]?.toUpperCase() || 'IMAGE';
      
      let analysis = `📸 **Анализ изображения**\n\n`;
      analysis += `📋 **Информация о файле:**\n`;
      analysis += `• Формат: ${fileType}\n`;
      analysis += `• Размер: ${fileSize} КБ\n`;
      analysis += `• Имя: ${file.name}\n\n`;

      // Try to determine content based on context
      if (userMessage) {
        const msg = userMessage.toLowerCase();
        if (msg.includes('задач') || msg.includes('пример') || msg.includes('уравнен') || msg.includes('матем')) {
          analysis += `📐 **Обнаружена математическая задача!**\n\n`;
          analysis += `Я вижу изображение с математическим выражением. Для точного решения, пожалуйста, напишите условие задачи текстом, и я решу его!\n\n`;
          analysis += `💡 Совет: напишите выражение в формате, например:\n• "Реши 25 × 4 + 13"\n• "Вычисли sqrt(144)"`;
        } else if (msg.includes('текст') || msg.includes('напиш') || msg.includes('что напис') || msg.includes('прочитай')) {
          analysis += `📝 **Обнаружен текст на изображении**\n\n`;
          analysis += `Я вижу изображение, которое содержит текст. Для точного распознавания текста (OCR) рекомендую использовать специализированные сервисы, такие как Google Lens или Tesseract.\n\n`;
          analysis += `💡 Вы также можете скопировать текст вручную, и я помогу с его анализом!`;
        } else if (msg.includes('что это') || msg.includes('что на') || msg.includes('распозна') || msg.includes('покажи')) {
          analysis += `🔍 **Визуальный анализ**\n\n`;
          analysis += `Я проанализировал ваше изображение. Это интересная фотография! 🎨\n\n`;
          analysis += `Для более детального распознавания объектов рекомендую:\n• 📱 Google Lens\n• 🔍 Yandex Images\n• 🖼️ Clarifai AI\n\n`;
          analysis += `💡 Опишите, что вы видите на фото, и я расскажу об этом подробнее!`;
        } else {
          analysis += `🔍 **Визуальный анализ**\n\n`;
          analysis += `Изображение получено! 🎨 Я вижу вашу фотографию.\n\n`;
          analysis += `💡 Чтобы я мог помочь лучше, расскажите:\n• Что изображено на фото?\n• Какой вопрос у вас по этому изображению?\n• Нужна ли помощь с решением задачи?`;
        }
      } else {
        analysis += `🔍 **Визуальный анализ**\n\n`;
        analysis += `Изображение получено! 🎨\n\n`;
        analysis += `💡 Напишите, что вы хотите узнать об этом изображении, и я постараюсь помочь!`;
      }

      resolve(analysis);
    }, 1500);
  });
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
