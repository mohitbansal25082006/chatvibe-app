import { Bot, Message, BotPersonality, MoodAnalysis } from '../types';

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
// ADVANCED MOOD DETECTION
// ========================================

export const detectMood = async (text: string): Promise<MoodAnalysis> => {
  const lowerText = text.toLowerCase();
  
  // Enhanced keyword-based mood detection with weights
  const moodKeywords = {
    happy: { 
      keywords: ['happy', 'excited', 'great', 'wonderful', 'amazing', 'fantastic', 'joyful', 'cheerful', 'delighted', 'pleased'], 
      weight: 0.9 
    },
    sad: { 
      keywords: ['sad', 'down', 'unhappy', 'depressed', 'melancholy', 'gloomy', 'miserable', 'sorrowful', 'dejected'], 
      weight: 0.9 
    },
    angry: { 
      keywords: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated', 'furious', 'enraged', 'outraged', 'resentful'], 
      weight: 0.9 
    },
    anxious: { 
      keywords: ['anxious', 'worried', 'nervous', 'apprehensive', 'uneasy', 'restless', 'tense', 'concerned', 'troubled'], 
      weight: 0.9 
    },
    tired: { 
      keywords: ['tired', 'exhausted', 'sleepy', 'fatigued', 'weary', 'drained', 'worn out', 'spent', 'burned out'], 
      weight: 0.9 
    },
    confused: { 
      keywords: ['confused', 'puzzled', 'baffled', 'perplexed', 'bewildered', 'uncertain', 'unsure', 'lost'], 
      weight: 0.8 
    },
    excited: { 
      keywords: ['excited', 'thrilled', 'enthusiastic', 'eager', 'ecstatic', 'jubilant', 'elated', 'exhilarated'], 
      weight: 0.9 
    },
    calm: { 
      keywords: ['calm', 'relaxed', 'peaceful', 'serene', 'tranquil', 'composed', 'collected', 'unperturbed'], 
      weight: 0.8 
    }
  };
  
  // Calculate mood scores
  const moodScores: { [key: string]: number } = {};
  let totalWeight = 0;
  
  for (const [mood, data] of Object.entries(moodKeywords)) {
    let score = 0;
    for (const keyword of data.keywords) {
      if (lowerText.includes(keyword)) {
        score += data.weight;
      }
    }
    if (score > 0) {
      moodScores[mood] = score;
      totalWeight += score;
    }
  }
  
  // Normalize scores
  if (totalWeight > 0) {
    for (const mood in moodScores) {
      moodScores[mood] = moodScores[mood] / totalWeight;
    }
  }
  
  // Determine dominant mood
  let dominantMood = 'neutral';
  let maxScore = 0;
  for (const [mood, score] of Object.entries(moodScores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantMood = mood;
    }
  }
  
  // Calculate sentiment (simplified)
  const positiveWords = ['good', 'great', 'wonderful', 'amazing', 'fantastic', 'love', 'like', 'enjoy', 'happy', 'pleased'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'annoyed', 'disappointed'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of positiveWords) {
    if (lowerText.includes(word)) positiveCount++;
  }
  
  for (const word of negativeWords) {
    if (lowerText.includes(word)) negativeCount++;
  }
  
  const totalSentimentWords = positiveCount + negativeCount;
  const sentiment = totalSentimentWords > 0 
    ? (positiveCount - negativeCount) / totalSentimentWords 
    : 0;
  
  // Map to emotions (simplified)
  const emotions = {
    joy: dominantMood === 'happy' || dominantMood === 'excited' ? 0.8 : 0.2,
    sadness: dominantMood === 'sad' ? 0.8 : 0.2,
    anger: dominantMood === 'angry' ? 0.8 : 0.2,
    fear: dominantMood === 'anxious' ? 0.8 : 0.2,
    surprise: dominantMood === 'confused' ? 0.6 : 0.2,
    disgust: 0.2
  };
  
  return {
    mood: dominantMood,
    confidence: maxScore,
    emotions,
    sentiment
  };
};

// ========================================
// ADVANCED PERSONALITY-BASED RESPONSE GENERATION
// ========================================

const adjustResponseForPersonality = async (
  response: string, 
  personality: BotPersonality,
  userMood?: MoodAnalysis
): Promise<string> => {
  let adjustedResponse = response;
  
  // Create a more nuanced adjustment based on personality and user mood
  const personalityFactors = {
    humor: (personality.humor - 50) / 50, // -1 to 1
    empathy: (personality.empathy - 50) / 50,
    creativity: (personality.creativity - 50) / 50,
    formality: (personality.formality - 50) / 50
  };
  
  // Adjust for humor with more nuance
  if (personalityFactors.humor > 0.3) {
    // Add humor, but consider user mood
    if (userMood && (userMood.mood === 'sad' || userMood.mood === 'angry')) {
      // Be more sensitive with humor when user is in negative mood
      adjustedResponse = addSensitiveHumorToResponse(adjustedResponse, personalityFactors.humor);
    } else {
      adjustedResponse = addHumorToResponse(adjustedResponse, personalityFactors.humor);
    }
  } else if (personalityFactors.humor < -0.3) {
    adjustedResponse = removeHumorFromResponse(adjustedResponse);
  }
  
  // Adjust for empathy with more nuance
  if (personalityFactors.empathy > 0.3) {
    // Add empathetic language, but tailor it to user mood
    if (userMood) {
      adjustedResponse = addMoodSpecificEmpathy(adjustedResponse, userMood, personalityFactors.empathy);
    } else {
      adjustedResponse = addEmpathyToResponse(adjustedResponse, personalityFactors.empathy);
    }
  } else if (personalityFactors.empathy < -0.3) {
    adjustedResponse = makeResponseMoreDirect(adjustedResponse);
  }
  
  // Adjust for creativity with more nuance
  if (personalityFactors.creativity > 0.3) {
    adjustedResponse = addCreativityToResponse(adjustedResponse, personalityFactors.creativity);
  } else if (personalityFactors.creativity < -0.3) {
    adjustedResponse = makeResponseMoreStraightforward(adjustedResponse);
  }
  
  // Adjust for formality with more nuance
  if (personalityFactors.formality > 0.3) {
    adjustedResponse = makeResponseMoreFormal(adjustedResponse, personalityFactors.formality);
  } else if (personalityFactors.formality < -0.3) {
    adjustedResponse = makeResponseMoreCasual(adjustedResponse, personalityFactors.formality);
  }
  
  return adjustedResponse;
};

const addHumorToResponse = (response: string, humorLevel: number): string => {
  // More sophisticated humor addition based on level
  const humorPhrases = [
    { level: 0.3, phrases: ["Just a thought: ", "Here's something to consider: "] },
    { level: 0.5, phrases: ["On a lighter note, ", "Here's a fun thought: ", "Speaking of which, "] },
    { level: 0.7, phrases: ["Just kidding! ", "Here's a funny thought: ", "Did you know? "] },
    { level: 0.9, phrases: ["Speaking of which, did you hear the one about... ", "Here's a joke for you: "] }
  ];
  
  // Find appropriate humor level
  const appropriateHumor = humorPhrases
    .filter(h => h.level <= humorLevel)
    .sort((a, b) => b.level - a.level)[0];
  
  if (!appropriateHumor) return response;
  
  const randomPhrase = appropriateHumor.phrases[
    Math.floor(Math.random() * appropriateHumor.phrases.length)
  ];
  
  // Add humor at appropriate points in the response
  const sentences = response.split('. ');
  if (sentences.length > 1) {
    const insertIndex = Math.floor(sentences.length / 2);
    sentences[insertIndex] = `${randomPhrase}${sentences[insertIndex]}`;
    return sentences.join('. ');
  }
  
  return response.replace(/([.!?])\s/g, `${randomPhrase}$1 `);
};

const addSensitiveHumorToResponse = (response: string, humorLevel: number): string => {
  // More sensitive humor for when user is in a negative mood
  const sensitiveHumorPhrases = [
    "Sometimes a little humor can help. ",
    "I hope this brings a slight smile: ",
    "Here's a gentle thought: "
  ];
  
  const randomPhrase = sensitiveHumorPhrases[
    Math.floor(Math.random() * sensitiveHumorPhrases.length)
  ];
  
  return response.replace(/([.!?])\s/g, `${randomPhrase}$1 `);
};

const removeHumorFromResponse = (response: string): string => {
  // Remove common humor indicators
  return response
    .replace(/just kidding/gi, '')
    .replace(/lol/gi, '')
    .replace(/haha/gi, '')
    .replace(/funny/gi, '')
    .replace(/joke/gi, '')
    .replace(/humor/gi, '');
};

const addMoodSpecificEmpathy = (
  response: string, 
  userMood: MoodAnalysis, 
  empathyLevel: number
): string => {
  let empathyPhrase = "";
  
  // Tailor empathy based on user mood
  switch (userMood.mood) {
    case 'sad':
      empathyPhrase = empathyLevel > 0.6 
        ? "I can see you're feeling down, and I want you to know that's completely valid. "
        : "I understand you're feeling sad. ";
      break;
    case 'angry':
      empathyPhrase = empathyLevel > 0.6 
        ? "I can sense your frustration, and it's completely understandable to feel that way. "
        : "I understand you're feeling angry. ";
      break;
    case 'anxious':
      empathyPhrase = empathyLevel > 0.6 
        ? "I can tell you're feeling anxious, and I want to help ease those concerns. "
        : "I understand you're feeling worried. ";
      break;
    case 'tired':
      empathyPhrase = empathyLevel > 0.6 
        ? "I can sense you're feeling exhausted, and I hope we can find a solution that doesn't require too much energy. "
        : "I understand you're feeling tired. ";
      break;
    case 'confused':
      empathyPhrase = empathyLevel > 0.6 
        ? "I can tell you're feeling confused, and I'll do my best to provide clarity. "
        : "I understand you're feeling confused. ";
      break;
    case 'happy':
    case 'excited':
      empathyPhrase = empathyLevel > 0.6 
        ? "I can see you're feeling positive, and that's wonderful to see! "
        : "I'm glad you're feeling good! ";
      break;
    default:
      empathyPhrase = empathyLevel > 0.6 
        ? "I understand how you feel. "
        : "I hear you. ";
  }
  
  return empathyPhrase + response;
};

const addEmpathyToResponse = (response: string, empathyLevel: number): string => {
  // Add empathetic phrases based on level
  const empathyPhrases = [
    { level: 0.3, phrases: ["I understand. ", "I hear you. "] },
    { level: 0.5, phrases: ["I understand how you feel. ", "That sounds challenging. "] },
    { level: 0.7, phrases: ["I can see why you'd feel that way. ", "It's completely valid to feel that way. "] },
    { level: 0.9, phrases: ["I'm here to support you through this. ", "Your feelings are completely valid. "] }
  ];
  
  // Find appropriate empathy level
  const appropriateEmpathy = empathyPhrases
    .filter(e => e.level <= empathyLevel)
    .sort((a, b) => b.level - a.level)[0];
  
  if (!appropriateEmpathy) return response;
  
  const randomPhrase = appropriateEmpathy.phrases[
    Math.floor(Math.random() * appropriateEmpathy.phrases.length)
  ];
  
  return randomPhrase + response;
};

const makeResponseMoreDirect = (response: string): string => {
  // Remove filler words and phrases
  return response
    .replace(/I think that/gi, '')
    .replace(/It seems like/gi, '')
    .replace(/Perhaps/gi, '')
    .replace(/Maybe/gi, '')
    .replace(/I believe/gi, '')
    .replace(/I guess/gi, '')
    .replace(/I suppose/gi, '');
};

const addCreativityToResponse = (response: string, creativityLevel: number): string => {
  // Add creative elements based on level
  const creativePhrases = [
    { level: 0.3, phrases: ["Consider this: ", "What if: "] },
    { level: 0.5, phrases: ["Imagine if ", "What if we ", "Here's a creative approach: "] },
    { level: 0.7, phrases: ["Thinking outside the box, ", "Let's explore an unconventional idea: ", "Here's a creative perspective: "] },
    { level: 0.9, phrases: ["Let's push the boundaries of conventional thinking: ", "What if we completely reimagined this: "] }
  ];
  
  // Find appropriate creativity level
  const appropriateCreativity = creativePhrases
    .filter(c => c.level <= creativityLevel)
    .sort((a, b) => b.level - a.level)[0];
  
  if (!appropriateCreativity) return response;
  
  const randomPhrase = appropriateCreativity.phrases[
    Math.floor(Math.random() * appropriateCreativity.phrases.length)
  ];
  
  return response.replace(/([.!?])\s/g, `${randomPhrase}$1 `);
};

const makeResponseMoreStraightforward = (response: string): string => {
  // Remove creative elements
  return response
    .replace(/imagine if/gi, '')
    .replace(/what if/gi, '')
    .replace(/creative/gi, '')
    .replace(/unconventional/gi, '')
    .replace(/thinking outside the box/gi, '');
};

const makeResponseMoreFormal = (response: string, formalityLevel: number): string => {
  // Replace informal language with formal alternatives based on level
  let formalResponse = response;
  
  if (formalityLevel > 0.3) {
    formalResponse = formalResponse
      .replace(/don't/gi, 'do not')
      .replace(/can't/gi, 'cannot')
      .replace(/won't/gi, 'will not')
      .replace(/I'm/gi, 'I am')
      .replace(/it's/gi, 'it is')
      .replace(/that's/gi, 'that is')
      .replace(/yeah/gi, 'yes')
      .replace(/okay/gi, 'acceptable')
      .replace(/cool/gi, 'excellent');
  }
  
  if (formalityLevel > 0.6) {
    formalResponse = formalResponse
      .replace(/hi/gi, 'Greetings')
      .replace(/hello/gi, 'Hello')
      .replace(/thanks/gi, 'Thank you')
      .replace(/thank you/gi, 'I appreciate your')
      .replace(/good/gi, 'beneficial')
      .replace(/bad/gi, 'detrimental')
      .replace(/big/gi, 'substantial')
      .replace(/small/gi, 'minimal');
  }
  
  if (formalityLevel > 0.8) {
    formalResponse = formalResponse
      .replace(/help/gi, 'assist')
      .replace(/show/gi, 'demonstrate')
      .replace(/tell/gi, 'inform')
      .replace(/give/gi, 'provide')
      .replace(/get/gi, 'obtain');
  }
  
  return formalResponse;
};

const makeResponseMoreCasual = (response: string, casualLevel: number): string => {
  // Replace formal language with casual alternatives based on level
  let casualResponse = response;
  
  if (casualLevel > 0.3) {
    casualResponse = casualResponse
      .replace(/do not/gi, "don't")
      .replace(/cannot/gi, "can't")
      .replace(/will not/gi, "won't")
      .replace(/I am/gi, "I'm")
      .replace(/it is/gi, "it's")
      .replace(/that is/gi, "that's")
      .replace(/yes/gi, "yeah")
      .replace(/acceptable/gi, "okay")
      .replace(/excellent/gi, "cool");
  }
  
  if (casualLevel > 0.6) {
    casualResponse = casualResponse
      .replace(/hello/gi, "hi")
      .replace(/thank you/gi, "thanks")
      .replace(/appreciate/gi, "like")
      .replace(/wonderful/gi, "awesome")
      .replace(/great/gi, "cool")
      .replace(/good/gi, "nice");
  }
  
  if (casualLevel > 0.8) {
    casualResponse = casualResponse
      .replace(/assist/gi, "help")
      .replace(/demonstrate/gi, "show")
      .replace(/inform/gi, "tell")
      .replace(/provide/gi, "give")
      .replace(/obtain/gi, "get")
      .replace(/utilize/gi, "use")
      .replace(/purchase/gi, "buy");
  }
  
  return casualResponse;
};

// ========================================
// ADVANCED SYSTEM PROMPTS
// ========================================

const generateSystemPrompt = (
  bot: Bot, 
  userMood?: MoodAnalysis, 
  memory?: any,
  conversationContext?: any
): string => {
  // Build a more sophisticated system prompt
  let prompt = `You are ${bot.name}, an AI assistant with the following characteristics:
  
  Role: ${bot.role}
  Tone: ${bot.tone}
  Emoji: ${bot.emoji}
  
  ${bot.description ? `Description: ${bot.description}` : ''}
  `;
  
  // Add personality details if available
  if (bot.personality) {
    prompt += `
  Personality traits: 
  - Humor: ${bot.personality.humor}% (${bot.personality.humor > 70 ? 'Very humorous' : bot.personality.humor > 30 ? 'Moderately humorous' : 'Serious'})
  - Empathy: ${bot.personality.empathy}% (${bot.personality.empathy > 70 ? 'Very empathetic' : bot.personality.empathy > 30 ? 'Moderately empathetic' : 'Direct'})
  - Creativity: ${bot.personality.creativity}% (${bot.personality.creativity > 70 ? 'Very creative' : bot.personality.creativity > 30 ? 'Moderately creative' : 'Practical'})
  - Formality: ${bot.personality.formality}% (${bot.personality.formality > 70 ? 'Very formal' : bot.personality.formality > 30 ? 'Moderately formal' : 'Casual'})
    `;
  }
  
  // Add background story if available
  if (bot.background_story) {
    prompt += `
  Background story: ${bot.background_story}
    `;
  }
  
  // Add user mood information if available
  if (userMood) {
    prompt += `
  Current user mood analysis:
  - Primary mood: ${userMood.mood} (confidence: ${(userMood.confidence * 100).toFixed(1)}%)
  - Sentiment: ${userMood.sentiment > 0.3 ? 'Positive' : userMood.sentiment < -0.3 ? 'Negative' : 'Neutral'} (${userMood.sentiment.toFixed(2)})
  - Emotional profile: Joy (${(userMood.emotions.joy * 100).toFixed(1)}%), Sadness (${(userMood.emotions.sadness * 100).toFixed(1)}%), Anger (${(userMood.emotions.anger * 100).toFixed(1)}%), Fear (${(userMood.emotions.fear * 100).toFixed(1)}%), Surprise (${(userMood.emotions.surprise * 100).toFixed(1)}%), Disgust (${(userMood.emotions.disgust * 100).toFixed(1)}%)
  
  Please adjust your response style to be appropriate for the user's current emotional state.
    `;
  }
  
  // Add memory information if available
  if (memory) {
    prompt += `
  Previous conversation summary: ${memory.conversation_summary || 'No previous conversation summary available.'}
    `;
    
    if (memory.user_preferences && Object.keys(memory.user_preferences).length > 0) {
      prompt += `
  User preferences: ${JSON.stringify(memory.user_preferences)}
      `;
    }
    
    if (memory.important_dates && memory.important_dates.length > 0) {
      prompt += `
  Important dates mentioned: ${memory.important_dates.join(', ')}
      `;
    }
    
    if (memory.learned_responses && memory.learned_responses.length > 0) {
      prompt += `
  Previous feedback and learning: ${memory.learned_responses.join('. ')}
      `;
    }
  }
  
  // Add conversation context if available
  if (conversationContext) {
    prompt += `
  Current conversation context:
  - Topic: ${conversationContext.topic || 'General conversation'}
  - Duration: ${conversationContext.duration || 'Unknown'}
  - Message count: ${conversationContext.message_count || 'Unknown'}
    `;
  }
  
  // Add instructions for response style
  prompt += `
  
  Response guidelines:
  - Respond in a way that reflects your role and tone
  - Use your emoji occasionally to express emotions
  - Keep your responses concise but engaging
  - Adapt your language to match your personality traits
  - Be sensitive to the user's emotional state
  - Reference previous conversations when relevant
  - Ask follow-up questions when appropriate to deepen the conversation
  - Provide helpful, accurate information
  - If you don't know something, admit it honestly
  `;
  
  // Use custom system prompt if available
  return bot.system_prompt || prompt;
};

// ========================================
// ADVANCED CHAT COMPLETION
// ========================================

export const generateBotResponse = async (
  bot: Bot,
  messages: Message[],
  memory?: any
): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Detect user mood from the last message
    let userMood: MoodAnalysis | undefined;
    if (messages.length > 0 && messages[messages.length - 1].sender === 'user') {
      userMood = await detectMood(messages[messages.length - 1].content);
    }
    
    // Analyze conversation context
    const conversationContext = analyzeConversationContext(messages);
    
    // Format messages for OpenAI API
    const formattedMessages = [
      {
        role: 'system' as const,
        content: generateSystemPrompt(bot, userMood, memory, conversationContext),
      },
      ...messages.map((msg) => ({
        role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      })),
    ];

    // Make API request with advanced parameters
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
        temperature: bot.personality?.creativity ? (bot.personality.creativity / 100) * 0.5 + 0.5 : 0.7,
        top_p: 0.9,
        frequency_penalty: bot.personality?.humor && bot.personality.humor > 70 ? 0.3 : 0.1,
        presence_penalty: bot.personality?.creativity && bot.personality.creativity > 70 ? 0.3 : 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate response');
    }

    const data = await response.json();
    let botResponse = data.choices[0].message.content.trim();
    
    // Adjust response based on personality and user mood
    if (bot.personality) {
      botResponse = await adjustResponseForPersonality(botResponse, bot.personality, userMood);
    }
    
    return botResponse;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

// ========================================
// CONVERSATION CONTEXT ANALYSIS
// ========================================

const analyzeConversationContext = (messages: Message[]): any => {
  if (!messages || messages.length === 0) {
    return {};
  }
  
  // Calculate conversation duration
  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];
  const duration = new Date(lastMessage.created_at).getTime() - new Date(firstMessage.created_at).getTime();
  const durationMinutes = Math.floor(duration / (1000 * 60));
  
  // Extract topics (simplified)
  const userMessages = messages.filter(msg => msg.sender === 'user');
  const allText = userMessages.map(msg => msg.content).join(' ').toLowerCase();
  
  // Simple topic extraction using keyword frequency
  const commonWords = ['what', 'how', 'why', 'when', 'where', 'who', 'help', 'need', 'want', 'think', 'feel', 'know', 'understand'];
  const topicKeywords: { [key: string]: number } = {};
  
  for (const word of commonWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = allText.match(regex);
    if (matches) {
      topicKeywords[word] = matches.length;
    }
  }
  
  // Find the most common topic keyword
  let topic = 'General conversation';
  let maxCount = 0;
  
  for (const [word, count] of Object.entries(topicKeywords)) {
    if (count > maxCount) {
      maxCount = count;
      topic = word;
    }
  }
  
  return {
    topic,
    duration: durationMinutes,
    message_count: messages.length,
    user_message_count: userMessages.length,
    topic_keywords: topicKeywords
  };
};

// ========================================
// ADVANCED CONVERSATION SUMMARY
// ========================================

export const generateConversationSummary = async (
  messages: Message[]
): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Analyze conversation context first
    const context = analyzeConversationContext(messages);
    
    // Format messages for OpenAI API
    const formattedMessages = [
      {
        role: 'system' as const,
        content: `Please provide a concise summary of the following conversation. 
        Focus on the main topics discussed, any important decisions or insights, and the overall tone of the conversation.
        The conversation lasted approximately ${context.duration} minutes and included ${context.message_count} messages.
        The primary topic appears to be: ${context.topic}.
        
        Format your response as a clear, concise paragraph that captures the essence of the conversation.`,
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
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate summary');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

// ========================================
// ADVANCED SMART SUGGESTIONS
// ========================================

export const generateSmartSuggestions = async (
  bot: Bot,
  messages: Message[]
): Promise<string[]> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Analyze conversation context
    const context = analyzeConversationContext(messages);
    
    // Format messages for OpenAI API
    const formattedMessages = [
      {
        role: 'system' as const,
        content: `You are ${bot.name}, an AI assistant. Based on the conversation, suggest 3-5 possible responses the user might want to send.
        Each suggestion should be a short phrase or question that logically follows the conversation.
        Consider the bot's role (${bot.role}) and tone (${bot.tone}) when generating suggestions.
        The conversation topic appears to be: ${context.topic}.
        
        Format your response as a JSON array of strings, like: ["suggestion 1", "suggestion 2", "suggestion 3"]`,
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
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate suggestions');
    }

    const data = await response.json();
    const suggestionsText = data.choices[0].message.content.trim();
    
    try {
      // Parse the JSON array
      const suggestions = JSON.parse(suggestionsText);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (parseError) {
      // If parsing fails, try to extract suggestions manually
      console.error('Error parsing suggestions:', parseError);
      
      // Try to extract suggestions from plain text
      const matches = suggestionsText.match(/"([^"]+)"/g);
      if (matches) {
        return matches.map((match: string) => match.replace(/"/g, ''));
      }
      
      return [];
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

// ========================================
// ADVANCED LEARN FROM FEEDBACK
// ========================================

export const learnFromFeedback = async (
  bot: Bot,
  messages: Message[],
  feedbackScore: number
): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Find the last bot message
    const lastBotMessageIndex = messages.findLastIndex(msg => msg.sender === 'bot');
    
    if (lastBotMessageIndex === -1) {
      return '';
    }
    
    const lastBotMessage = messages[lastBotMessageIndex];
    
    // Analyze conversation context
    const context = analyzeConversationContext(messages);
    
    // Format messages for OpenAI API
    const formattedMessages = [
      {
        role: 'system' as const,
        content: `You are ${bot.name}, an AI assistant with the following characteristics:
        Role: ${bot.role}
        Tone: ${bot.tone}
        ${bot.personality ? `Personality: Humor ${bot.personality.humor}%, Empathy ${bot.personality.empathy}%, Creativity ${bot.personality.creativity}%, Formality ${bot.personality.formality}%` : ''}
        
        The user gave your last response a ${feedbackScore > 0 ? 'positive' : 'negative'} feedback.
        Please analyze what might have been ${feedbackScore > 0 ? 'good' : 'problematic'} about your response and suggest a brief improvement.
        Focus on the content and tone of your response in relation to your bot characteristics.
        The conversation topic appears to be: ${context.topic}.
        
        Provide a concise analysis of what worked well or what could be improved, and a specific suggestion for future responses.`,
      },
      ...messages.slice(0, lastBotMessageIndex + 1).map((msg) => ({
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
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to learn from feedback');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

// ========================================
// ADVANCED MEMORY EXTRACTION
// ========================================

export const extractMemoryFromConversation = async (
  messages: Message[]
): Promise<{
  summary: string;
  userPreferences: Record<string, any>;
  importantDates: string[];
  topics: string[];
}> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Format messages for OpenAI API
    const formattedMessages = [
      {
        role: 'system' as const,
        content: `Please analyze the following conversation and extract:
        1. A concise summary of the conversation
        2. Any user preferences mentioned (e.g., likes, dislikes, interests)
        3. Any important dates mentioned
        4. Main topics discussed
        
        Format your response as JSON with the following structure:
        {
          "summary": "Conversation summary",
          "userPreferences": {"preference1": "value1", "preference2": "value2"},
          "importantDates": ["date1", "date2"],
          "topics": ["topic1", "topic2"]
        }`,
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
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to extract memory');
    }

    const data = await response.json();
    const memoryText = data.choices[0].message.content.trim();
    
    try {
      // Parse the JSON
      const memory = JSON.parse(memoryText);
      return {
        summary: memory.summary || '',
        userPreferences: memory.userPreferences || {},
        importantDates: memory.importantDates || [],
        topics: memory.topics || []
      };
    } catch (parseError) {
      console.error('Error parsing memory:', parseError);
      
      // Return default values if parsing fails
      return {
        summary: memoryText,
        userPreferences: {},
        importantDates: [],
        topics: []
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};