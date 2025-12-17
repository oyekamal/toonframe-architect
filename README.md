
# ToonFrame Architect 🎬

**AI-Powered Animation Storyboard Generator**

ToonFrame Architect is a web application that transforms written stories and scripts into detailed animation storyboards using Google's Gemini AI. Perfect for animators, storytellers, and content creators who want to quickly visualize their narratives.

## ✨ Features

- **Script-to-Storyboard Conversion**: Transform written scripts into visual storyboards with consistent characters and environments
- **Consistency Bible**: Maintains character and environment consistency across all frames
- **Dual-Frame Generation**: Creates start and end frames for each scene with detailed motion prompts
- **Character Reference Sheets**: Generates character sheets for animation consistency
- **Multiple Image Sizes**: Support for 1K, 2K, and 4K image generation
- **Download Options**: Export storyboards as PDF or ZIP files
- **Modern 2D Cartoon Style**: Optimized for Western cartoon animation aesthetics

## 🛠️ Technology Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **AI Service**: Google Gemini API (gemini-3-pro-preview & gemini-3-pro-image-preview)
- **Styling**: Modern CSS with responsive design
- **Export**: PDF generation (jsPDF) and ZIP compression (JSZip)

## 🚀 Getting Started

### Prerequisites

- **Node.js** (version 18 or higher)
- **Google Gemini API Key** (from a paid project)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/oyekamal/toonframe-architect.git
   cd toonframe-architect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your API key:**
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
   - **Note**: You need a paid Google AI Studio project for image generation features

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to `http://localhost:5173` (or the port shown in your terminal)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 📖 How to Use

1. **Enter Your Script**: Write or paste your story/script in the text area
2. **Select Image Size**: Choose between 1K, 2K, or 4K resolution
3. **Generate Storyboard**: Click "Generate Storyboard" to process your script
4. **Review Results**: The AI will create:
   - A consistency bible for characters and environments
   - Multiple scenes with start/end frames
   - Detailed motion prompts for animation
5. **Download**: Export your storyboard as PDF or download all images as ZIP

## 🎨 Generated Content

The application creates:

- **Consistency Bible**: Character and environment descriptions for consistency
- **Scene Breakdown**: 5-8 key scenes from your script
- **Dual Images**: Start and end frames for each scene
- **Motion Prompts**: Detailed animation instructions
- **Character Metadata**: Direction, expression, and pose tracking

## 🔧 Configuration

The application uses several configuration files:

- `constants.ts` - AI model settings and prompts
- `types.ts` - TypeScript interfaces and data structures
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript compiler options

## 📁 Project Structure

```
├── components/          # React components
│   ├── BibleCard.tsx   # Displays consistency bible
│   ├── SceneCard.tsx   # Individual scene display
│   ├── LoadingSpinner.tsx
│   └── ...
├── services/           # API and utility services
│   ├── geminiService.ts    # Google Gemini API integration
│   └── downloadService.ts # Export functionality
├── App.tsx            # Main application component
├── types.ts           # TypeScript type definitions
├── constants.ts       # Configuration and prompts
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

- **API Key Issues**: Ensure you're using a paid Google AI Studio project
- **Image Generation Fails**: Check your API quota and billing status
- **Build Issues**: Try deleting `node_modules` and running `npm install` again
