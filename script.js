// js/assistant.js - Notes-Based Study Assistant

// DOM Elements
const notesInput = document.getElementById('notes-input');
const questionInput = document.getElementById('question-input');
const chatMessages = document.getElementById('chat-messages');
const notesStatus = document.getElementById('notes-status');
const notesInfo = document.getElementById('notes-info');

// Load data from localStorage on page load
window.onload = function() {
    loadNotes();
    loadChatHistory();
    updateNotesInfo();
};

// === NOTES MANAGEMENT ===
function saveNotes() {
    const notes = notesInput.value.trim();
    
    if (!notes) {
        showStatus('Please add some notes first!', 'error');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('student_os_notes', notes);
    showStatus('✅ Notes saved! (' + (notes.length / 1000).toFixed(1) + ' KB)', 'success');
    updateNotesInfo();
    
    // Auto-focus question input
    questionInput.focus();
}

function clearNotes() {
    if (confirm('Clear all notes?')) {
        notesInput.value = '';
        localStorage.removeItem('student_os_notes');
        showStatus('🗑️ Notes cleared', 'info');
        updateNotesInfo();
    }
}

function loadNotes() {
    const savedNotes = localStorage.getItem('student_os_notes');
    if (savedNotes) {
        notesInput.value = savedNotes;
    }
}

function updateNotesInfo() {
    const notes = localStorage.getItem('student_os_notes') || '';
    const sentenceCount = notes.split(/[.!?]+/).filter(s => s.trim()).length;
    
    if (notes) {
        notesInfo.textContent = `${sentenceCount} sentences loaded`;
        notesInfo.style.color = 'var(--accent-blue)';
    } else {
        notesInfo.textContent = 'No notes loaded';
        notesInfo.style.color = 'var(--text-secondary)';
    }
}

// === QUESTION ANSWERING ===
async function askQuestion() {
    const question = questionInput.value.trim();
    if (!question) return;

    // Add user question to chat
    addMessage('question', question);
    questionInput.value = '';

    // Check if notes exist
    const notes = localStorage.getItem('student_os_notes');
    if (!notes) {
        addMessage('assistant', '❌ Please save some notes first, then ask questions!');
        return;
    }

    // Show searching message
    const searchMsg = addMessage('assistant', '🔍 Searching your notes...');
    
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Remove search message
    removeMessage(searchMsg.id);
    
    // Find answer
    const answer = findAnswer(question, notes);
    addMessage('assistant', answer);
    
    // Save to history
    saveChatHistory();
    questionInput.focus();
}

function findAnswer(question, notes) {
    // Split notes into sentences
    const sentences = notes
        .split(/[.!?]+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 10); // Filter short fragments
    
    // Extract keywords from question
    const questionWords = question
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2); // Words longer than 2 chars
    
    if (questionWords.length === 0) {
        return 'Please ask a more specific question!';
    }
    
    // Score sentences based on keyword matches
    let bestMatch = null;
    let bestScore = 0;
    
    sentences.forEach(sentence => {
        let score = 0;
        questionWords.forEach(word => {
            if (sentence.includes(word)) {
                score += 2; // Exact word match
            }
        });
        
        // Bonus for multiple matches
        if (questionWords.filter(word => sentence.includes(word)).length > 1) {
            score += 1;
        }
        
        if (score > bestScore && score > 2) {
            bestScore = score;
            bestMatch = sentence;
        }
    });
    
    if (bestMatch && bestScore > 2) {
        return `📖 "${bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1)}"`;
    } else {
        return `🤔 No direct match found in your notes for "${question}". 
Try different keywords or add more detailed notes! 💡`;
    }
}

// === CHAT UI ===
function addMessage(type, text) {
    const id = Date.now();
    const message = {
        id,
        type,
        text,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
    };
    
    chatHistory.push(message);
    renderChat();
    return message;
}

function removeMessage(id) {
    chatHistory = chatHistory.filter(msg => msg.id !== id);
    renderChat();
}

let chatHistory = [];

function renderChat() {
    // Keep only last 20 messages
    chatHistory = chatHistory.slice(-20);
    
    chatMessages.innerHTML = chatHistory.map(msg => `
        <div class="message ${msg.type}">
            <time>${msg.time}</time>
            ${msg.text}
        </div>
    `).join('');
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveChatHistory() {
    localStorage.setItem('student_os_chat_history', JSON.stringify(chatHistory));
}

function loadChatHistory() {
    const saved = localStorage.getItem('student_os_chat_history');
    if (saved) {
        chatHistory = JSON.parse(saved);
        renderChat();
    }
}

// === UTILITIES ===
function showStatus(message, type = 'info') {
    notesStatus.textContent = message;
    notesStatus.style.display = 'block';
    
    if (type === 'success') {
        notesStatus.style.color = '#10b981';
        notesStatus.style.background = 'rgba(16, 185, 129, 0.2)';
    } else if (type === 'error') {
        notesStatus.style.color = '#ef4444';
        notesStatus.style.background = 'rgba(239, 68, 68, 0.2)';
    }
    
    setTimeout(() => {
        notesStatus.style.display = 'none';
    }, 3000);
}

// === EVENT LISTENERS ===
questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        askQuestion();
    }
});

notesInput.addEventListener('input', updateNotesInfo);
