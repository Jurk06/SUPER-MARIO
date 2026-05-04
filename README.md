# Super Mario JS Bros

A vanilla JavaScript platformer game inspired by Super Mario Bros, featuring multiple stages with increasing difficulty and visual themes.

## 🎮 Features

- **Classic Platformer Gameplay**: Pixel-art style mechanics inspired by the original
- **10+ Unique Stages**: Procedurally generated levels with increasing difficulty
  - Levels 1-3: Classic brick platforms
  - Levels 4-6: Elevated platforms with gaps
  - Levels 7-9: Triple stacked platforms and floating gauntlets
  - Level 10+: Ultimate challenges (staircase of doom, enemy fortress, sky bridge)
- **Dynamic Visual Themes**: 
  - DAY (Levels 1-3): Classic blue sky
  - DUSK (Levels 4-6): Orange sunset overlay
  - DAWN (Levels 7-9): Golden sunrise glow
  - ABYSS (Level 10+): Deep purple mysterious atmosphere
- **Score System**: Earn points by defeating enemies and collecting coins
- **Sound Effects**: Retro-style audio for jumping, shooting, and collisions
- **Responsive Controls**: Keyboard (Arrow Keys, WASD) and on-screen touch controls
- **Power-ups**: Fire flower enables shooting fireballs at enemies

## 🕹️ How to Play

### Controls
| Action | Keyboard | Touch |
|--------|----------|-------|
| Move Left | ← / A | Left Arrow Button |
| Move Right | → / D | Right Arrow Button |
| Jump | ↑ / W / Space | Jump Button |
| Shoot Fire | F | Fire Button |

### Gameplay Tips
- Jump on enemies' heads to defeat them (except turtles when they're hiding)
- Collect coins for bonus points
- Reach the flagpole at the end of each level to progress
- Grab fire flowers to gain shooting abilities
- Watch out for pits and falling off the screen!

## 🚀 Playing Locally

You have several options to run the game on your local machine:

### Option 1: Direct Browser Open (Simplest)
Simply open the `index.html` file directly in your web browser:

**Windows:**
```cmd
start index.html
```

**macOS:**
```bash
open index.html
```

**Linux:**
```bash
xdg-open index.html
```

Or just double-click `index.html` in your file explorer.

### Option 2: Using a Local Web Server (Recommended)

Running a local server avoids potential CORS issues and provides a better development experience.

#### Using Python 3
```bash
# Navigate to the project directory
cd /workspace

# Start a simple HTTP server
python3 -m http.server 8000

# Open your browser and go to:
# http://localhost:8000
```

#### Using Python 2
```bash
python -m SimpleHTTPServer 8000
```

#### Using Node.js (http-server)
```bash
# Install http-server globally (if not already installed)
npm install -g http-server

# Start the server
http-server -p 8000

# Open your browser and go to:
# http://localhost:8000
```

#### Using PHP
```bash
php -S localhost:8000
```

### Option 3: Using VS Code Live Server

If you use Visual Studio Code:

1. Install the "Live Server" extension by Ritwick Dey
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. The game will automatically open in your default browser

### Option 4: Using Docker

If you prefer containerization:

```bash
# Build the Docker image
docker build -t super-mario-js .

# Run the container
docker run -p 8000:80 super-mario-js

# Open your browser and go to:
# http://localhost:8000
```

## 📁 Project Structure

```
/workspace/
├── index.html      # Main HTML file
├── main.js         # Game logic and rendering
├── README.md       # This file
└── Dockerfile      # Container configuration (if deploying)
```

## 🌐 Deployment

This game can be deployed on various static hosting platforms:

- **GitHub Pages**: Push to the `main` branch and enable GitHub Pages in repository settings
- **Hugging Face Spaces**: Deploy as a static space
- **Netlify/Vercel**: Connect your repository for automatic deployments
- **Any static host**: Upload the `index.html` and `main.js` files

> **Note for GitHub Pages**: Make sure to merge pull requests into the `main` branch before deployment. GitHub Pages does not deploy directly from pull request branches for security reasons.

## 🛠️ Development

The game is built with:
- **Vanilla JavaScript**: No frameworks or libraries required
- **HTML5 Canvas**: For rendering graphics
- **Web Audio API**: For sound effects
- **CSS3**: For styling and responsive design

### Modifying the Game

To customize the game:
- Edit `main.js` to change game mechanics, add new features, or modify existing ones
- Update level generation logic in the `generateLevel()` function
- Adjust player physics in the `updatePlayer()` function
- Add new enemy types or power-ups by extending the entity classes

## 📝 License

This is a fan-made project inspired by Nintendo's Super Mario Bros. All game assets and code are created for educational purposes.

## 🎉 Enjoy the Game!

Have fun playing Super Mario JS Bros! Feel free to contribute, modify, or share your own versions.

---

*Made with ❤️ using vanilla JavaScript*
