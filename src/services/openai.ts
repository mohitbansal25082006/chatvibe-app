import { Bot, Message } from '../types';

// ========================================
// OPENAI API CONFIGURATION
// ========================================

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
  console.warn(
    '⚠️ OpenAI API key not found. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file'
  );
}

// ========================================
// SYSTEM PROMPTS
// ========================================

const generateSystemPrompt = (bot: Bot): string => {
  const basePrompt = `You are ${bot.name}, an AI assistant with the following characteristics:
  
  Role: ${bot.role}
  Tone: ${bot.tone}
  Emoji: ${bot.emoji}
  
  ${bot.description ? `Description: ${bot.description}` : ''}
  
  Please respond in a way that reflects your role and tone. Use your emoji occasionally to express emotions.
  Keep your responses concise but engaging. You are having a one-on-one conversation with the user.`;

  return bot.system_prompt || basePrompt;
};

// ========================================
// CHAT COMPLETION
// ========================================

export const generateBotResponse = async (
  bot: Bot,
  messages: Message[]
): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Format messages for OpenAI API
    const formattedMessages = [
      {
        role: 'system' as const,
        content: generateSystemPrompt(bot),
      },
      ...messages.map((msg) => ({
        role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      })),
    ];

    // Make API request
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: formattedMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate response');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};