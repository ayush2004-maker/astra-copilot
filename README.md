# Astra Copilot

A production-quality Windows desktop AI assistant built with **Electron**, **React**, **TypeScript**, **Tailwind CSS**, **SQLite**, and **OS-level secure credential storage (DPAPI)**.

Astra Copilot remains available while you work in other applications. It features a floating circular assistant button, an intelligent model router, multi-model consensus ("Best Answer" mode), live web search, global keyboard text capture, local OCR fallback, and dedicated assistants for Coding, Quantitative Aptitude, and Concept Explanations.

---

## Features

- 🌟 **Floating Assistant Button**:
  - Always-on-top, frameless, transparent background.
  - Smooth hover scale & glowing gradient animation.
  - Draggable with screen position memory across restarts.
  - Non-intrusive focus management (does not steal focus from games or IDEs).
  - Configurable always-on-top setting.

- 💬 **Compact Modern Chat Interface**:
  - Responsive window (450px × 640px) with dark-first glassmorphic UI.
  - Markdown rendering with GitHub Flavored Markdown (GFM).
  - Code syntax highlighting with language badges and one-click copy buttons.
  - Message regeneration and generation stop control.
  - Integrated live Web Search with cited source pills and direct external links.

- 🤖 **Modular AI Providers**:
  - **OpenAI**: GPT-4o, GPT-4o Mini, o1, o3-mini.
  - **Google Gemini**: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 1.5 Flash.
  - **Anthropic Claude**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus.
  - Real-time token streaming over isolated IPC channels.
  - Test Connection tool for each provider in Settings.

- 🧠 **Intelligent Model Routing & "Best Answer" Mode**:
  - Intent classification across 10 domains: *programming*, *debugging*, *mathematics*, *aptitude*, *reasoning*, *general knowledge*, *writing*, *summarization*, *current information*, *web research*.
  - Automatically routes queries to the optimal configured model.
  - **Best Answer Mode**: Simultaneously queries multiple AI models, audits discrepancies and errors, and synthesizes one verified, cohesive answer.

- ⌨️ **Global Keyboard Shortcut & Active Screen Capture**:
  - Global shortcut (`Ctrl + Shift + Space` by default, rebindable in Settings).
  - Automatically captures selected text from the foreground application (VS Code, Chrome, Word, Notepad, etc.) with zero clipboard pollution (clipboard is safely backed up and restored).
  - **"Ask About This" Workflow**: Automatically displays captured text with quick action chips:
    - *Explain*
    - *Solve*
    - *Summarize*
    - *Debug*
    - *Translate*
    - *Answer*
    - *Generate Code*
    - *Simplify*

- 🔍 **Local OCR Fallback**:
  - Screen text extraction using local Tesseract.js engine.
  - Zero cloud image uploads; screenshots are processed in memory and shredded immediately.

- 💻 **Dedicated Coding Mode**:
  - Deep technical support for 10 languages: Python, Java, C, C++, JavaScript, TypeScript, HTML, CSS, SQL, PHP.
  - Syntax highlighted code blocks with language identifiers.
  - Explains compiler errors, writes unit tests, optimizes time/space complexity.

- 📐 **Dedicated Aptitude & Math Mode**:
  - Structured 5-step problem-solving format:
    1. Problem identification
    2. Relevant formula
    3. Step-by-step calculation
    4. Verification
    5. Short final answer
  - Local arithmetic verification engine to guard against language model arithmetic slips.

- 🔐 **Enterprise-Grade Security & Privacy**:
  - API keys encrypted on disk using Windows Data Protection API (DPAPI) via `safeStorage`.
  - Keys are kept exclusively in the Electron main process; never exposed to renderer JavaScript.
  - Context isolation enabled, Node integration disabled, strict Content Security Policy (CSP).
  - No arbitrary shell execution of AI-generated text.
  - "Remember conversations" toggle: When OFF, chat history is kept purely in volatile memory.

---

## Project Structure

```
ai_chatbot/
├── package.json
├── tsconfig.json            # Renderer TypeScript config
├── tsconfig.node.json       # Electron Main/Preload TypeScript config
├── vite.config.ts           # Vite bundler config
├── tailwind.config.js       # Tailwind dark-first theme & animations
├── postcss.config.js
├── electron-builder.json    # Windows NSIS and Portable packaging config
├── resources/
│   ├── icon.png             # Application icon
│   └── icon.ico             # Windows executable icon
├── test/
│   ├── unitTests.ts         # Automated unit tests for Router, MathEngine, IPCGuard
│   └── databaseTests.ts     # Automated tests for SQLite persistence & CRUD
├── src/
│   ├── types/
│   │   ├── ai.ts            # Provider, Model, Message, Mode, Router types
│   │   ├── capture.ts       # TextCapture, QuickActions & OCR types
│   │   ├── search.ts        # Search query & result types
│   │   ├── settings.ts      # App preferences & settings types
│   │   └── electron.d.ts    # contextBridge window.astraAPI definitions
│   ├── main/
│   │   ├── main.ts          # Electron entry, app lifecycle, IPC & system tray
│   │   ├── preload.ts       # Secure isolated contextBridge API
│   │   ├── windows/
│   │   │   └── windowManager.ts    # Floating assistant bubble & chat window transitions
│   │   ├── shortcuts/
│   │   │   └── shortcutManager.ts  # Global shortcut registration & active app capture
│   │   ├── capture/
│   │   │   ├── win32Capture.ts     # Active window detection & clipboard text capture
│   │   │   ├── ocrService.ts       # Local Tesseract.js OCR engine
│   │   │   └── textCaptureManager.ts # Text capture strategy manager
│   │   ├── security/
│   │   │   ├── credentialStorage.ts # Windows DPAPI (safeStorage) encrypted vault
│   │   │   └── ipcGuard.ts          # Strict IPC payload validation
│   │   ├── storage/
│   │   │   ├── database.ts         # SQLite WebAssembly engine (sql.js)
│   │   │   └── conversationStore.ts# Conversations, messages, search, export
│   │   ├── search/
│   │   │   ├── searchProvider.ts   # Web search abstraction
│   │   │   └── webSearch.ts        # Live DuckDuckGo search & citation extractor
│   │   └── ai/
│   │       ├── providers/
│   │       │   ├── provider.ts     # Base AIProvider interface
│   │       │   ├── openai.ts       # OpenAI provider
│   │       │   ├── gemini.ts       # Google Gemini provider
│   │       │   ├── anthropic.ts    # Anthropic Claude provider
│   │       │   └── providerRegistry.ts # Provider registry & factory
│   │       ├── router/
│   │       │   └── modelRouter.ts  # Intent classification & routing
│   │       ├── judge/
│   │       │   └── bestAnswerJudge.ts # Multi-model consensus & synthesis judge
│   │       ├── context/
│   │       │   └── contextCompressor.ts # Auto context summarization & compression
│   │       └── prompts/
│   │           ├── systemPrompts.ts# Prompts for Coding, Aptitude, Explain modes
│   │           └── mathEngine.ts   # Arithmetic evaluation & step verification
│   └── renderer/
│       ├── index.html       # Entry HTML with Content Security Policy
│       ├── main.tsx         # React root
│       ├── App.tsx          # Main UI coordinator
│       ├── components/
│       │   ├── AssistantButton.tsx    # Draggable circular floating button
│       │   ├── ChatWindow.tsx         # Compact modern chat interface
│       │   ├── ChatMessage.tsx        # Markdown, code blocks, sources & candidate views
│       │   ├── CodeBlock.tsx          # Syntax highlighting & copy button
│       │   ├── CapturedTextBanner.tsx # "Captured text" quick actions banner
│       │   ├── ModeSelector.tsx       # Mode switch (Chat, Coding, Aptitude, Explain)
│       │   ├── ModelSelector.tsx      # Model dropdown & Web/Best Answer toggles
│       │   ├── ConversationDrawer.tsx # Chat history, search, rename, delete, export
│       │   └── SettingsModal.tsx      # Full settings modal (5 tabs)
│       ├── hooks/
│       │   ├── useChat.ts             # Chat state & real-time streaming
│       │   └── useSettings.ts         # App settings state
│       └── styles/
│           └── globals.css            # Dark-first theme, glassmorphism & scrollbars
```

---

## Installation & Setup

## GitHub Distribution

This repository is source code for the Windows x64 application. Build artifacts are intentionally excluded from Git so the repository stays small and reproducible.

### Download the application

1. Open the repository's **Releases** page on GitHub.
2. Download the `Astra Copilot Setup ... .exe` installer, or the portable `.exe` if you do not want to install it.
3. Run the application on Windows 10 or Windows 11 x64.

Pushing a tag such as `v1.0.0` starts the included GitHub Actions workflow. It installs dependencies, runs type checks and tests, builds the Windows installer and portable executable, and attaches them to a GitHub Release. A manual build can also be started from the repository's **Actions** tab.

### Build from a clone

```powershell
git clone <your-github-repository-url>
cd ai_chatbot
npm ci
npm run dist
```

The generated installer and portable executable are written to `dist-package/`.

API keys and conversation data are stored locally on each Windows device. They are not uploaded to GitHub or synchronized between devices, so configure provider keys separately after installing on a new device.

### Prerequisites

- **Node.js**: v18.0.0 or higher (v24 LTS tested)
- **Windows**: Windows 10 or Windows 11 (x64)

### 1. Install Dependencies

```powershell
npm install
```

*(Note: In PowerShell, if script execution policy restricts `npm`, use `npm.cmd install`)*

---

## Running in Development

Start Vite dev server and launch Electron with Hot Module Replacement (HMR):

```powershell
npm run dev:electron
```

Or run the renderer in the browser for UI prototyping:

```powershell
npm run dev
```

---

## Running Automated Tests

Run the full automated test suite (Model Router intent classification, MathEngine verification, IPCGuard security filters, and SQLite local storage CRUD):

```powershell
npm test
```

---

## Building & Compiling

Compile both the React renderer (Vite) and Electron main process (TypeScript):

```powershell
npm run build
```

Verify TypeScript types across the entire codebase:

```powershell
npm run typecheck
```

---

## Packaging into a Windows `.exe`

Astra Copilot is configured with `electron-builder` to produce both an **NSIS Installer (.exe)** and a **Portable Executable (.exe)**.

### Create Unpacked Windows Application (Fast Testing)

```powershell
npm run pack
```
This generates the standalone Windows folder at `dist-package/win-unpacked/` containing `Astra Copilot.exe`.

### Create Windows Installer and Portable Executables

```powershell
npm run dist
```
This produces:
- `dist-package/Astra Copilot Setup 1.0.0.exe` (NSIS Installer)
- `dist-package/Astra Copilot 1.0.0.exe` (Portable executable)

---

## Configuring API Keys

1. Launch Astra Copilot.
2. Click the floating assistant button in the bottom-right of your screen.
3. Click the **Gear icon** (Settings) in the top-right of the chat window.
4. Go to the **Providers** tab.
5. Enter your API key(s):
   - **Google Gemini**: [Google AI Studio](https://aistudio.google.com/)
   - **OpenAI**: [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Anthropic Claude**: [Anthropic Console](https://console.anthropic.com/)
6. Click **Save** (encrypted immediately in Windows DPAPI storage).
7. Click **Test** to verify connection to the provider.

---

## How to Use the Global Shortcut

1. Highlight any text in **Visual Studio Code**, **Chrome**, **Slack**, **PDF Reader**, or **Notepad**.
2. Press `Ctrl + Shift + Space`.
3. Astra Copilot instantly opens with the captured text and displays the quick actions:
   - Click **Explain** to explain the concept.
   - Click **Debug** to find and fix errors in highlighted code.
   - Click **Solve** to solve quantitative aptitude or math problems.
   - Click **Generate Code** to write implementation code.
