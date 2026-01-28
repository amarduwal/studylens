import { FunctionDeclaration } from "@/types/live.ts";


export const TUTOR_TOOLS: FunctionDeclaration[] = [
  {
    name: "draw_diagram",
    description: "Draw a diagram, chart, or illustration on the whiteboard to help explain a concept visually. Use this when visual representation would aid understanding.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the diagram"
        },
        elements: {
          type: "array",
          description: "List of elements to draw",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["circle", "rectangle", "line", "arrow", "text", "curve"],
                description: "Type of element to draw"
              },
              x: { type: "number", description: "X coordinate (0-100)" },
              y: { type: "number", description: "Y coordinate (0-100)" },
              width: { type: "number", description: "Width (for rectangles)" },
              height: { type: "number", description: "Height (for rectangles)" },
              radius: { type: "number", description: "Radius (for circles)" },
              endX: { type: "number", description: "End X (for lines/arrows)" },
              endY: { type: "number", description: "End Y (for lines/arrows)" },
              text: { type: "string", description: "Text content" },
              color: { type: "string", description: "Color (e.g., 'blue', '#FF0000')" },
              fontSize: { type: "number", description: "Font size for text" }
            },
            required: ["type", "x", "y"]
          }
        },
        explanation: {
          type: "string",
          description: "Brief explanation of what the diagram shows"
        }
      },
      required: ["title", "elements"]
    }
  },
  {
    name: "execute_code",
    description: "Execute code to demonstrate programming concepts or solve computational problems. Shows the output to the student.",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          enum: ["javascript", "python"],
          description: "Programming language"
        },
        code: {
          type: "string",
          description: "Code to execute"
        },
        explanation: {
          type: "string",
          description: "Explanation of what the code does"
        }
      },
      required: ["language", "code"]
    }
  },
  {
    name: "generate_practice_problem",
    description: "Generate a practice problem for the student based on the current topic. Use when the student wants to practice or test their understanding.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The topic for the practice problem"
        },
        difficulty: {
          type: "string",
          enum: ["easy", "medium", "hard"],
          description: "Difficulty level"
        },
        type: {
          type: "string",
          enum: ["multiple_choice", "short_answer", "calculation", "coding", "explanation"],
          description: "Type of problem"
        },
        includeHints: {
          type: "boolean",
          description: "Whether to include hints"
        }
      },
      required: ["topic", "difficulty", "type"]
    }
  },
  {
    name: "show_step_by_step",
    description: "Display a step-by-step solution or explanation. Use for math problems, procedures, or any sequential process.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the solution"
        },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stepNumber: { type: "number" },
              action: { type: "string", description: "What to do in this step" },
              explanation: { type: "string", description: "Why we do this" },
              formula: { type: "string", description: "Any formula or equation (optional)" },
              result: { type: "string", description: "Result of this step (optional)" }
            },
            required: ["stepNumber", "action", "explanation"]
          }
        },
        finalAnswer: {
          type: "string",
          description: "The final answer or conclusion"
        }
      },
      required: ["title", "steps", "finalAnswer"]
    }
  },
  {
    name: "create_flashcard",
    description: "Create a flashcard for the student to help them memorize a concept or term.",
    parameters: {
      type: "object",
      properties: {
        front: {
          type: "string",
          description: "Question or term (front of card)"
        },
        back: {
          type: "string",
          description: "Answer or definition (back of card)"
        },
        topic: {
          type: "string",
          description: "Topic category"
        }
      },
      required: ["front", "back"]
    }
  },
  {
    name: "set_timer",
    description: "Set a timer for timed practice or breaks. Useful for practice tests or pomodoro technique.",
    parameters: {
      type: "object",
      properties: {
        duration: {
          type: "number",
          description: "Duration in seconds"
        },
        label: {
          type: "string",
          description: "What the timer is for"
        },
        alertMessage: {
          type: "string",
          description: "Message to show when timer ends"
        }
      },
      required: ["duration", "label"]
    }
  }
];

export function getToolsForGemini() {
  return [
    {
      functionDeclarations: TUTOR_TOOLS
    }
  ];
}
