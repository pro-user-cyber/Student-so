
import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm@0.2.6";

// Global variables
let engine = null;
let isReady = false;
let currentMode = 'general';
let messageCount = 0;

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');
const notesInput = document.getElementById('notes-input');
const notesBtn = document.getElementById('analyze-btn');
const clearBtn = document.getElementById('clear-btn');
const chatStatus = document.getElementById('chat-status');
const notesStatus = document.getElementById('notes-status');
const notesResults = document.getElementById('notes-results');
const notesContent = document.getElementById('notes-content');
const sessionStats = document.getElementById('session-stats');
const connectionStatus = document.getElementById('connection-status');
const currentModeDisplay = document.getElementById('current-mode-display');
const modeDescription = document.getElementById('mode-description');

// Status display function
function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = 'status ' + type;
}

// Add message to chat window
function addMessage(type, text) {
    if (!chatMessages) return;
    
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `<div class="message-sender">${type === 'user' ? 'You' : 'AI'}</div>${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    messageCount++;
    return div;
}

// Show typing indicator
function showTyping() {
    if (!chatMessages) return;
    
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'typing-indicator';
    div.innerHTML = `
        <div class="message-sender">AI</div>
        <div class="typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
}

// Switch between modes
function switchMode(mode) {
    currentMode = mode;
    const chatSection = chatForm ? chatForm.closest('.glass-panel') : null;
    const notesSection = document.getElementById('notes-section');
    
    const generalBtn = document.getElementById('general-mode-btn');
    const notesBtnMode = document.getElementById('notes-mode-btn');
    
    if (generalBtn) generalBtn.classList.toggle('active', mode === 'general');
    if (notesBtnMode) notesBtnMode.classList.toggle('active', mode === 'notes');
    
    if (mode === 'notes') {
        if (notesSection) notesSection.style.display = 'block';
        if (chatSection) chatSection.style.display = 'none';
        if (currentModeDisplay) currentModeDisplay.textContent = '📝 Notes Helper';
        if (modeDescription) modeDescription.textContent = 'Paste notes for AI analysis';
    } else {
        if (notesSection) notesSection.style.display = 'none';
        if (chatSection) chatSection.style.display = 'block';
        if (currentModeDisplay) currentModeDisplay.textContent = '💬 Live Chat';
        if (modeDescription) modeDescription.textContent = 'AI runs locally in your browser';
    }
}

// Initialize AI Model
async function initAI() {
    showStatus('chat-status', '🔄 Downloading AI model (30-80MB)...', 'loading');

    try {
        engine = await CreateMLCEngine(
            "Phi-3.5-mini-instruct-q4f16_1-MLC",
            {
                initProgressCallback: (progress) => {
                    const percent = (progress * 100).toFixed(0);
                    if (sessionStats) {
                        sessionStats.textContent = `📥 ${percent}%`;
                        sessionStats.style.color = '#a855f7';
                    }
                    if (connectionStatus) connectionStatus.textContent = 'Downloading model...';
                    showStatus('chat-status', `🔄 Loading AI: ${percent}%`, 'loading');
                }
            }
        );

        isReady = true;
        if (sessionStats) {
            sessionStats.textContent = '🟢 Ready';
            sessionStats.style.color = '#10b981';
        }
        if (connectionStatus) connectionStatus.textContent = 'AI running locally';
        showStatus('chat-status', '🟢 AI Ready! Ask me anything.', 'success');
        
        if (sendBtn) sendBtn.disabled = false;
        if (notesBtn) notesBtn.disabled = false;

        addMessage('assistant', '🚀 AI Study Assistant ready! Ask me about math, science, history, coding, or any subject. You can also switch to Notes Helper mode to analyze your lecture notes!');

    } catch (error) {
        console.error('AI Init Error:', error);
        if (sessionStats) {
            sessionStats.textContent = '❌ Error';
            sessionStats.style.color = '#ef4444';
        }
        if (connectionStatus) connectionStatus.textContent = error.message;
        showStatus('chat-status', '❌ Failed to load AI: ' + error.message, 'error');
    }
}

// Handle chat submission
async function handleChat(e) {
    e.preventDefault();
    if (!chatInput || !engine || !isReady) return;
    
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    chatInput.value = '';
    addMessage('user', userMessage);
    showTyping();

    try {
        const messages = [
            { role: "system", content: "You are a helpful AI study assistant. Give clear, educational answers. Format with bullet points when appropriate." },
            { role: "user", content: userMessage }
        ];

        const chunks = await engine.chat.completions.create(
            messages,
            { temperature: 0.7, max_tokens: 512 }
        );

        hideTyping();
        const response = chunks.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        addMessage('assistant', response);

    } catch (error) {
        hideTyping();
        addMessage('assistant', '❌ Error: ' + error.message);
    }
}

// Handle notes analysis
async function analyzeNotes() {
    if (!notesInput || !engine || !isReady) return;
    
    const notes = notesInput.value.trim();
    if (!notes) return;

    showStatus('notes-status', '🔄 Analyzing your notes...', 'loading');
    if (notesBtn) notesBtn.disabled = true;

    try {
        const prompt = `Analyze these study notes and provide:
1. A brief summary (2-3 sentences)
2. Key concepts to remember
3. Any errors or misconceptions
4. Suggestions for improvement

Notes: ${notes}`;

        const messages = [
            { role: "system", content: "You are a helpful AI study assistant. Analyze the notes and provide structured feedback." },
            { role: "user", content: prompt }
        ];

        const chunks = await engine.chat.completions.create(
            messages,
            { temperature: 0.7, max_tokens: 800 }
        );

        const response = chunks.choices[0]?.message?.content || 'No analysis generated.';
        
        if (notesContent) {
            notesContent.innerHTML = response.replace(/\n/g, '<br>').replace(/•/g, '•');
        }
        if (notesResults) notesResults.classList.add('show');
        showStatus('notes-status', '✅ Analysis complete!', 'success');

    } catch (error) {
        showStatus('notes-status', '❌ Error: ' + error.message, 'error');
    } finally {
        if (notesBtn) notesBtn.disabled = false;
    }
}

// Clear notes
function clearNotes() {
    if (notesInput) notesInput.value = '';
    if (notesResults) notesResults.classList.remove('show');
    if (notesContent) notesContent.innerHTML = '';
    showStatus('notes-status', '', '');
}

// Setup event listeners
function setupEventListeners() {
    // Mode buttons
    const generalBtn = document.getElementById('general-mode-btn');
    const notesBtnMode = document.getElementById('notes-mode-btn');
    
    if (generalBtn) {
        generalBtn.addEventListener('click', () => switchMode('general'));
    }
    if (notesBtnMode) {
        notesBtnMode.addEventListener('click', () => switchMode('notes'));
    }
    
    // Chat form
    if (chatForm) {
        chatForm.addEventListener('submit', handleChat);
    }
    
    // Notes buttons
    if (notesBtn) {
        notesBtn.addEventListener('click', analyzeNotes);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', clearNotes);
    }
}

// Initialize everything
function init() {
    console.log('🤖 Student OS AI Assistant initializing...');
    setupEventListeners();
    initAI();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export functions for external use if needed
window.StudentOS_AI = {
    switchMode,
    handleChat,
    analyzeNotes,
    clearNotes,
    isReady: () => isReady
};
