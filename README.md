# 🌌 Chaos Universe - Audio-Reactive Particle Visualization

An immersive, audio-reactive 3D particle visualization built with **React**, **TypeScript**, **Three.js**, and **Vite**. Experience stunning visual effects that respond to your music in real-time!

![Chaos Universe](https://img.shields.io/badge/status-live-brightgreen) ![Build](https://img.shields.io/badge/build-passing-success)

## ✨ Features

- **🎵 Audio-Reactive Animations**: Particles respond dynamically to bass and treble frequencies
- **🎨 Multiple Visual Styles**: 8 unique render styles (Universe, Ink, Oil, Forest, Sketch, Cell, Ocean, Fire)
- **💎 Material Effects**: 6 different particle materials (Particle, Glass, Plant, Silk, Metal, Rock)
- **🔮 Shape Morphing**: Transform particles between 10+ geometric shapes (Sphere, Cube, Torus, DNA Helix, etc.)
- **🎭 Neural Network Lines**: Dynamic connection visualization between particles
- **🎹 XY Mode**: Interactive audio modulation with mouse/touch controls
- **📱 Mobile Support**: Full touch gesture support for mobile devices
- **🎮 Hotkey Controls**:
  - **Tab**: Cycle through render styles
  - **Space**: Cycle through material effects

## 🚀 Live Demo

Experience it live: [https://YOUR_USERNAME.github.io/audio_universe](https://YOUR_USERNAME.github.io/audio_universe)

## 📦 Installation

### Prerequisites
- Node.js v16 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/audio_universe.git
cd audio_universe

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🛠️ Build for Production

```bash
# Build the project
npm run build

# Preview the production build locally
npm run preview
```

## 📱 Mobile Usage

On mobile devices, use the following touch gestures:
- **2-finger tap**: Cycle render styles (equivalent to Tab key)
- **3-finger tap**: Cycle material effects (equivalent to Space key)
- **Single touch drag**: Rotate the scene
- **Touch + XY Mode**: Modulate audio filters in real-time

## 🎛️ Controls

### Simulation Core
- **Particle Count**: Adjust the number of particles (5,000 - 50,000)
- **Simulation Speed**: Control animation speed
- **Auto Rotation**: Toggle automatic scene rotation
- **Rotation Speed**: Adjust rotation speed when auto-rotation is enabled

### Dimensional Reconstructor
- **Shape Selection**: Choose from various 3D shapes
- **Morph Speed**: Control the speed of shape transitions

### Sonic Resonance Field
- **Audio Source**: Switch between File Upload and Microphone
- **Volume**: Adjust audio volume
- **Bass/Treble Sensitivity**: Fine-tune audio reactivity
- **XY Mode**: Enable interactive audio filter modulation
- **Distortion**: Add audio distortion effect

### Synaptic Density
- **Neural Density**: Control the visibility of connection lines

### Visual Style Matrix
- **Render Style**: Choose visual rendering style
- **Material Effect**: Select particle material appearance
- **Color Cycle**: Enable automatic color cycling
- **Line Color**: Customize neural connection colors

## 🏗️ Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety and better developer experience
- **Three.js** - 3D graphics rendering
- **Vite** - Fast build tool and dev server
- **@tweenjs/tween.js** - Smooth animations
- **Web Audio API** - Real-time audio analysis

## 📂 Project Structure

```
audio_universe/
├── src/
│   ├── components/
│   │   ├── App.tsx           # Main app component
│   │   └── UI/
│   │       ├── MainPanel.tsx # Control panel UI
│   │       └── Tags.tsx      # Tag components for controls
│   ├── core/
│   │   ├── Engine.ts         # Three.js engine and scene management
│   │   ├── Audio.ts          # Audio manager and analysis
│   │   ├── Generators.ts     # Particle shape generators
│   │   └── Shaders.ts        # Vertex and fragment shaders
│   ├── styles/
│   │   └── hologram.css      # UI styling
│   └── main.tsx              # App entry point
├── public/                    # Static assets
├── dist/                      # Production build (generated)
└── package.json              # Project dependencies
```

## 🌐 Deployment to GitHub Pages

### Using GitHub Actions (Recommended)

1. Push your code to GitHub
2. Go to **Settings** > **Pages**
3. Set **Source** to "GitHub Actions"
4. The workflow will automatically build and deploy

### Manual Deployment

```bash
# Build the project
npm run build

# The dist/ folder contains your production build
# Deploy this folder to any static hosting service
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by generative art and audio-reactive visualizations
- Built with passion for creative coding and interactive experiences

## 📧 Contact

Have questions or suggestions? Feel free to reach out!

---

**Enjoy the chaos! 🌌✨**
