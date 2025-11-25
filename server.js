require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simple request logger to make debugging easier
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Basic chat endpoint. If OPENAI_API_KEY is set, requests will be proxied to OpenAI's Chat Completions API.
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], subject = 'General' } = req.body;

    // Get the user's last message to check if it's appropriate for the subject
    const userMessage = messages && messages.length ? messages[messages.length - 1].content : '';
    
    // Check if the question is appropriate for the selected subject
    const subjectCheck = checkSubjectRelevance(subject, userMessage);
    if (!subjectCheck.isValid) {
      return res.json({ 
        reply: subjectCheck.message,
        restricted: true 
      });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;

    console.log(`Received chat request (subject=${subject}). Using ${openaiKey ? 'OpenAI' : 'fallback'} engine.`);
    // Log a short summary of the incoming message for debugging (do not log full API keys)
    try {
      const last = messages && messages.length ? messages[messages.length - 1].content : '(no message)';
      console.log('Chat payload summary:', { subject, messagesCount: messages.length, lastMessage: String(last).slice(0, 200) });
    } catch (e) {
      console.log('Could not summarize incoming messages', e?.message || e);
    }

    if (openaiKey) {
      // Enhanced system message for detailed explanations
      const systemMessage = { 
        role: 'system', 
        content: `You are BearBrain.ai, a comprehensive and detailed tutor specialized in ${subject}. 

IMPORTANT: Only answer questions related to ${subject}. If asked about other subjects, politely redirect them to use the appropriate subject tab.

FORMAT YOUR RESPONSES FOR EASY READING:
- Use clear headings (## Main Topic, ### Subtopic)
- Break information into bullet points using •
- Add blank lines between sections for breathing room
- Use numbered steps for processes (1., 2., 3.)
- Keep paragraphs short and digestible (2-3 sentences max)
- Use **bold** for key concepts and important terms
- Add proper spacing between different topics

Your responses should include:
1. **Clear Definition** - What is the concept?
2. **Step-by-Step Explanation** - How does it work?
3. **Real-World Examples** - Where do we see this?
4. **Key Formulas/Principles** (if relevant) - Important equations
5. **Common Misconceptions** - What students often get wrong
6. **Study Tips** - How to remember and practice this
7. **Practice Question** - A simple problem to try

Format everything like ChatGPT - clean, well-spaced, and easy to scan.` 
      };
      
      const payload = {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [systemMessage, ...messages],
        max_tokens: 1200, // Increased for more detailed responses
        temperature: 0.7
      };

      const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        }
      });

      const reply = response.data.choices?.[0]?.message?.content || 'Sorry, I had trouble generating a reply.';
      return res.json({ reply });
    }

    // If no OpenAI key, but a Google API key is provided, try calling Google's Gemini API
    if (!openaiKey && googleKey) {
      try {
        console.log('Proxying request to Google Gemini API using GOOGLE_API_KEY');
        const userMessage = (messages || []).map(m => m.content).join('\n');
        const systemPrompt = `You are BearBrain.ai, a friendly and clear tutor specialized in ${subject}.

IMPORTANT: Only answer questions related to ${subject}. If asked about other subjects, politely redirect them.

Response Format Requirements:
- Keep explanations SHORT and EASY-TO-UNDERSTAND
- Use BULLET POINTS (•) for main points
- Write in simple, clear language
- Structure your response like this:

**Topic Name**
Brief 1-2 sentence introduction.

**Main Points:**
• First key point - simple explanation
• Second key point - simple explanation  
• Third key point - simple explanation
• Fourth key point - simple explanation

**Why it matters:**
Quick sentence about importance or real-world application.

Keep responses concise but informative. Focus on the most important concepts students need to know.`;
        
        const fullPrompt = `${systemPrompt}\n\nUser question: ${userMessage}`;

        // Try multiple model endpoints with current available models
        const models = ['models/gemini-2.5-flash', 'models/gemini-2.5-pro', 'models/gemini-flash-latest'];
        let gReply = null;
        
        for (const model of models) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${googleKey}`;
            
            const gPayload = {
              contents: [{
                parts: [{
                  text: fullPrompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024
              }
            };

            const gResp = await axios.post(url, gPayload, { headers: { 'Content-Type': 'application/json' } });
            gReply = gResp?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (gReply) {
              console.log(`Gemini AI response received successfully using model: ${model}`);
              return res.json({ reply: String(gReply), ai: 'gemini', model: model });
            }
          } catch (modelErr) {
            console.log(`Model ${model} failed:`, modelErr?.response?.status, modelErr?.response?.data?.error?.message || modelErr.message);
            continue;
          }
        }
        
        console.log('All Gemini models failed, falling back to enhanced local responses');
      } catch (gErr) {
        console.error('Gemini API general error:', gErr?.response?.status, gErr?.response?.data || gErr.message || gErr);
      }
    }

    // Enhanced fallback with subject restrictions
    if (!checkSubjectRelevance(subject, userMessage).isValid) {
      const reply = checkSubjectRelevance(subject, userMessage).message;
      return res.json({ reply, fallback: true, restricted: true });
    }

    const reply = generateDetailedFallbackReply(subject, userMessage);
    return res.json({ reply, fallback: true });
  } catch (err) {
    // More detailed axios error logging so we can see status/code when proxying
    if (err && err.response) {
      console.error('Chat proxy error status:', err.response.status);
      console.error('Chat proxy error data:', err.response.data);
    } else {
      console.error('Chat error', err?.message || err);
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), env: process.env.NODE_ENV || 'development' });
});

// Subject relevance checker
function checkSubjectRelevance(subject, question) {
  if (!question || question.trim().length === 0) {
    return { isValid: true, message: '' };
  }

  const questionLower = question.toLowerCase();
  
  const subjectKeywords = {
    'Math': [
      'algebra', 'geometry', 'calculus', 'trigonometry', 'statistics', 'probability',
      'equation', 'formula', 'solve', 'calculate', 'derivative', 'integral', 'function',
      'variable', 'graph', 'theorem', 'proof', 'number', 'fraction', 'decimal',
      'polynomial', 'logarithm', 'matrix', 'vector', 'limit', 'infinite', 'sum',
      'product', 'ratio', 'percentage', 'square root', 'exponent', 'factorial'
    ],
    'Biology': [
      'biology', 'cell', 'dna', 'rna', 'protein', 'enzyme', 'genetics', 'evolution',
      'organism', 'ecosystem', 'photosynthesis', 'respiration', 'metabolism',
      'anatomy', 'physiology', 'taxonomy', 'species', 'mutation', 'chromosome',
      'mitosis', 'meiosis', 'bacteria', 'virus', 'plant', 'animal', 'fungi',
      'biodiversity', 'adaptation', 'natural selection', 'heredity', 'gene'
    ],
    'Physics': [
      'force', 'energy', 'motion', 'velocity', 'acceleration', 'gravity', 'friction',
      'momentum', 'wave', 'light', 'sound', 'electricity', 'magnetism', 'circuit',
      'voltage', 'current', 'resistance', 'power', 'work', 'heat', 'temperature',
      'pressure', 'mass', 'weight', 'density', 'volume', 'time', 'speed', 'newton',
      'joule', 'watt', 'volt', 'ohm', 'quantum', 'atom', 'electron', 'proton', 'neutron'
    ],
    'Chemistry': [
      'element', 'compound', 'molecule', 'atom', 'ion', 'bond', 'reaction', 'equation',
      'solution', 'solvent', 'solute', 'concentration', 'molarity', 'ph', 'acid',
      'base', 'salt', 'oxidation', 'reduction', 'catalyst', 'enzyme', 'organic',
      'inorganic', 'carbon', 'hydrogen', 'oxygen', 'nitrogen', 'periodic table',
      'electron', 'proton', 'neutron', 'isotope', 'chemical', 'formula'
    ]
  };

  // Check if question contains subject-related keywords
  const keywords = subjectKeywords[subject] || [];
  const hasRelevantKeywords = keywords.some(keyword => 
    questionLower.includes(keyword) || 
    questionLower.includes(keyword.replace(' ', ''))
  );

  // Also check for mathematical symbols or science notation
  const hasMathSymbols = /[+\-*/=<>^√∫∑π∞]|\b(sin|cos|tan|log|ln)\b/.test(questionLower);
  const hasNumbers = /\d/.test(question);

  if (subject === 'Math' && (hasRelevantKeywords || hasMathSymbols || (hasNumbers && questionLower.includes('solve')))) {
    return { isValid: true, message: '' };
  }

  if (subject !== 'Math' && hasRelevantKeywords) {
    return { isValid: true, message: '' };
  }

  // If not relevant, provide redirection message
  return {
    isValid: false,
    message: `I'm currently set to help with ${subject} questions. Your question seems to be about a different subject. 

Please switch to the appropriate subject tab above:
• 📊 Math - for mathematics, algebra, calculus, statistics
• 🔬 Science - for biology, chemistry, earth science  
• ⚛️ Physics - for mechanics, electricity, waves, energy
• 🧪 Chemistry - for reactions, molecules, elements, compounds

Then ask your question in the correct subject area, and I'll provide a detailed explanation!`
  };
}

// Enhanced fallback reply generator with detailed explanations
function generateDetailedFallbackReply(subject, question) {
  const subjectIntros = {
    'Math': 'Mathematics is the foundation of logical thinking and problem-solving.',
    'Science': 'Science helps us understand the natural world through observation and experimentation.',
    'Physics': 'Physics explains how matter and energy interact in our universe.',
    'Chemistry': 'Chemistry studies the composition, structure, and behavior of matter.'
  };

  const studyTips = {
    'Math': [
      'Break complex problems into smaller, manageable steps',
      'Practice regularly with varied problem types',
      'Draw diagrams or graphs to visualize concepts',
      'Check your work by substituting answers back into original equations',
      'Understand the "why" behind formulas, not just memorize them'
    ],
    'Science': [
      'Connect new concepts to real-world examples',
      'Use diagrams and flowcharts to map processes',
      'Practice explaining concepts in your own words',
      'Make connections between different topics',
      'Keep a science vocabulary journal'
    ],
    'Physics': [
      'Master the fundamental concepts before moving to complex problems',
      'Practice unit conversions and dimensional analysis',
      'Draw free-body diagrams for mechanics problems',
      'Understand the physical meaning behind equations',
      'Work through problems step-by-step showing all calculations'
    ],
    'Chemistry': [
      'Memorize common elements and their symbols',
      'Practice balancing chemical equations regularly',
      'Understand periodic trends and patterns',
      'Use molecular models to visualize structures',
      'Connect chemical properties to real-world applications'
    ]
  };

  const intro = subjectIntros[subject] || subjectIntros['Science'];
  const tips = studyTips[subject] || studyTips['Science'];
  
  let response = `## 🧠 ${subject} Learning Assistant\n\n`;
  response += `${intro}\n\n`;
  
  if (question && question.trim().length > 0) {
    response += `**Your Question:** "${question}"\n\n`;
    response += `I'd be happy to help you with this ${subject.toLowerCase()} topic! Here's how I can assist:\n\n`;
  }
  
  response += `## 📚 Effective Study Strategies for ${subject}\n\n`;
  tips.forEach((tip, index) => {
    response += `**${index + 1}.** ${tip}\n\n`;
  });
  
  response += `## 💡 How to Get the Best Help\n\n`;
  response += `• **Be specific** about what you're struggling with\n\n`;
  response += `• **Include details** like equations or formulas you're working with\n\n`;
  response += `• **Mention your level** (high school, college, etc.)\n\n`;
  response += `• **Ask follow-up questions** for deeper understanding\n\n`;
  
  response += `## 🎯 Practice Suggestion\n\n`;
  response += `Try explaining a ${subject.toLowerCase()} concept you recently learned to someone else (or even to yourself out loud). `;
  response += `This helps identify areas where your understanding might need strengthening.\n\n`;
  
  response += `---\n\n`;
  response += `**Ready to learn?** Ask me any specific ${subject.toLowerCase()} questions, and I'll provide detailed, step-by-step explanations! 🚀`;
  
  return response;
}

function generateFallbackReply(subject, question) {
  return generateDetailedFallbackReply(subject, question);
}

app.listen(PORT, () => {
  console.log(`BearBrain.ai running on http://localhost:${PORT}`);
});
