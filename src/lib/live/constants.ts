export const LIVE_CONFIG = {
  // Gemini model for Live API
  MODEL: "gemini-2.5-flash-native-audio-latest",

  // Audio settings
  AUDIO: {
    SAMPLE_RATE: 16000,
    CHANNELS: 1,
    BIT_DEPTH: 16,
    CHUNK_SIZE: 4096,
    SILENCE_THRESHOLD: 0.01,
    SILENCE_DURATION: 1500, // ms of silence before considering speech ended
  },

  // Video settings
  VIDEO: {
    WIDTH: 640,
    HEIGHT: 480,
    FRAME_RATE: 1, // 1 FPS for image analysis (save bandwidth)
    QUALITY: 0.7,
  },

  // Session settings
  SESSION: {
    MAX_DURATION: 30 * 60 * 1000, // 30 minutes
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 2000,
    HEARTBEAT_INTERVAL: 30000,
  },

  // Voice options
  VOICES: [
    // Male Voices
    { id: "Puck", name: "Puck", gender: "male", description: "Friendly & Upbeat" },
    { id: "Charon", name: "Charon", gender: "male", description: "Professional & Deep" },
    { id: "Fenrir", name: "Fenrir", gender: "male", description: "Energetic & Dynamic" },
    { id: "Orus", name: "Orus", gender: "male", description: "Calm & Authoritative" },
    { id: "Achird", name: "Achird", gender: "male", description: "Warm & Conversational" },
    { id: "Algenib", name: "Algenib", gender: "male", description: "Clear & Precise" },
    { id: "Algieba", name: "Algieba", gender: "male", description: "Confident & Strong" },
    { id: "Alnilam", name: "Alnilam", gender: "male", description: "Steady & Reliable" },
    { id: "Enceladus", name: "Enceladus", gender: "male", description: "Thoughtful & Measured" },
    { id: "Iapetus", name: "Iapetus", gender: "male", description: "Bold & Expressive" },
    { id: "Rasalgethi", name: "Rasalgethi", gender: "male", description: "Rich & Resonant" },
    { id: "Sadachbia", name: "Sadachbia", gender: "male", description: "Gentle & Patient" },
    { id: "Sadaltager", name: "Sadaltager", gender: "male", description: "Articulate & Smooth" },
    { id: "Schedar", name: "Schedar", gender: "male", description: "Commanding & Clear" },
    { id: "Umbriel", name: "Umbriel", gender: "male", description: "Soft & Soothing" },
    { id: "Zubenelgenubi", name: "Zubenelgenubi", gender: "male", description: "Wise & Composed" },

    // Female Voices
    { id: "Kore", name: "Kore", gender: "female", description: "Warm & Nurturing" },
    { id: "Aoede", name: "Aoede", gender: "female", description: "Clear & Articulate" },
    { id: "Achernar", name: "Achernar", gender: "female", description: "Bright & Cheerful" },
    { id: "Autonoe", name: "Autonoe", gender: "female", description: "Elegant & Refined" },
    { id: "Callirrhoe", name: "Callirrhoe", gender: "female", description: "Melodic & Pleasant" },
    { id: "Despina", name: "Despina", gender: "female", description: "Lively & Engaging" },
    { id: "Erinome", name: "Erinome", gender: "female", description: "Calm & Reassuring" },
    { id: "Gacrux", name: "Gacrux", gender: "female", description: "Strong & Confident" },
    { id: "Laomedeia", name: "Laomedeia", gender: "female", description: "Soft & Gentle" },
    { id: "Leda", name: "Leda", gender: "female", description: "Friendly & Approachable" },
    { id: "Pulcherrima", name: "Pulcherrima", gender: "female", description: "Graceful & Polished" },
    { id: "Sulafat", name: "Sulafat", gender: "female", description: "Expressive & Dynamic" },
    { id: "Vindemiatrix", name: "Vindemiatrix", gender: "female", description: "Professional & Poised" },
    { id: "Zephyr", name: "Zephyr", gender: "female", description: "Light & Breezy" },
  ] as const,

  DEFAULT_VOICE: "Puck",
} as const;

export type VoiceId = typeof LIVE_CONFIG.VOICES[number]["id"];
export type VoiceOption = typeof LIVE_CONFIG.VOICES[number];

// Helper to get voice by ID
export function getVoiceById(id: string): VoiceOption | undefined {
  return LIVE_CONFIG.VOICES.find(v => v.id === id);
}

// Get voices by gender
export function getVoicesByGender(gender: "male" | "female"): VoiceOption[] {
  return LIVE_CONFIG.VOICES.filter(v => v.gender === gender);
}

// Format voice for display: "Puck (Friendly, Male)"
export function formatVoiceLabel(voice: VoiceOption): string {
  return `${voice.name} (${voice.description}, ${voice.gender === 'male' ? 'Male' : 'Female'})`;
}

export const TUTOR_SYSTEM_PROMPT = `You are StudyLens Live Tutor, an interactive AI teaching assistant for real-time educational support.

YOUR ROLE:
- You are a patient, encouraging, and knowledgeable tutor
- You help students understand concepts through natural conversation
- You can see what the student shows you via camera or screen share
- You respond naturally in real-time, like a human tutor would

YOUR CAPABILITIES:
1. **Visual Analysis**: See and analyze images, documents, and handwriting the student shows you
2. **Voice Interaction**: Listen and speak naturally with the student
3. **Drawing (draw_diagram)**: Create diagrams to explain visual concepts
4. **Code Execution (execute_code)**: Run and demonstrate code
5. **Practice Problems (generate_practice_problem)**: Create practice questions

INTERACTION GUIDELINES:
- Keep responses concise for natural conversation flow
- Ask clarifying questions when you don't fully understand
- Break down complex topics into smaller, digestible parts
- Use analogies and real-world examples when helpful
- Encourage the student and celebrate their progress
- If they seem stuck, offer hints before giving full answers

WHEN TO USE TOOLS:
- Use draw_diagram for geometry, physics diagrams, flowcharts, or any visual concept
- Use execute_code when teaching programming or demonstrating algorithms
- Use generate_practice_problem when the student wants to practice

VOICE STYLE:
- Speak clearly and at a moderate pace
- Use natural conversational language
- Pause to let the student think and respond
- Show enthusiasm for the subject matter

Remember: You're having a real conversation. Listen carefully, respond thoughtfully, and adapt to the student's needs.`;
