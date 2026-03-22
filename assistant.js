// js/assistant.js - FIXED VERSION

console.log('🔧 Assistant script loaded!'); // Debug

// DOM Elements
const notesInput = document.getElementById('notes-input');
const questionInput = document.getElementById('question-input');
const chatMessages = document.getElementById('chat-messages');
const notesStatus = document.getElementById('notes-status');
const notesInfo = document.getElementById('notes-info');

// Global variables
let chatHistory = [];

// === INIT ON PAGE LOAD ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing...');
    
    // Load everything
    loadNotes();
    loadChatHistory();
    updateNotesInfo();
    
    // Event listeners
    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askQuestion();
    });
    
    notesInput.addEventListener('input', updateNotesInfo);
    
    console.log('✅ Assistant fully initialized!');
});

// === NOTES FUNCTIONS ===
function saveNotes() {
    console.log('💾 Saving notes...');
    
    const notes = notesInput.value.trim();
    
    if (!notes) {
        showStatus('⚠️ Please type some notes first!', 'error');
        return;
    }
    
    try {
        // Save to localStorage
        localStorage.setItem('student_os_notes', notes);
        
        // Calculate stats
        const sentences = notes.split(/[.!?]+/).filter(s => s.trim()).length;
        showStatus(`✅ Saved! ${sentences} sentences (${Math.round(notes.length/100)} words)`, 'success');
        updateNotesInfo();
        
        console.log('✅ Notes saved successfully');
        
    } catch (error) {
        console.error('❌ Save error:', error);
        showStatus('❌ Save failed! Check browser storage.', 'error');
    }
}

function clearNotes() {
    if (confirm('🗑️ Clear all notes? This cannot be undone.')) {
        notesInput.value = '';
        localStorage.removeItem('student_os_notes');
        showStatus('🗑️ Notes cleared!', 'info');
        updateNotesInfo();
        console.log('🗑️ Notes cleared');
    }
}

function loadNotes() {
    try {
        const savedNotes = localStorage.getItem('student_os_notes');
        console.log('📥 Loading notes:', savedNotes ? 'Found' : 'None');
        
        if (savedNotes) {
            notesInput.value = savedNotes;
        }
    } catch (error) {
        console.error('❌ Load notes error:', error);
    }
}

function updateNotesInfo() {
    try {
        const notes = localStorage.getItem('student_os_notes') || '';
        const words = notes.trim().split(/\s+/).length;
        
        if (notes) {
            notesInfo.innerHTML = `📊 ${words} words loaded <span style="color: var(--accent-blue);">✓</span>`;
        } else {
            notesInfo.textContent = 'No notes loaded';
        }
    } catch (error) {
        console.error('❌ Update info error:', error);
    }
}

// === AI QUESTION ANSWERING ===
function askQuestion() {
    const question = questionInput.value.trim();
    console.log('❓ Question:', question);
    
    if (!question) {
        showStatus('⚠️ Please type a question!', 'error');
        return;
    }

    // Add question to chat
    addMessage('question', question);
    questionInput.value = '';

    // Check notes
    const notes = localStorage.getItem('student_os_notes');
    if (!notes || notes.trim() === '') {
        addMessage('assistant', '❌ <strong>No notes found!</strong><br>Save some study notes first, then ask questions.');
        return;
    }

    // Show searching
    const searchId = addMessage('assistant', '🔍 Searching your notes...');
    
    // Fake delay for realism
    setTimeout(() => {
        removeMessage(searchId);
        const answer = findBestAnswer(question, notes);
        addMessage('assistant', answer);
        saveChatHistory();
    }, 500);
}

function findBestAnswer(question, notes) {
    console.log('🔍 Finding answer for:', question);
    
    // Clean and split notes into sentences
    const sentences = notes
        .split(/[\n.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 15) // Meaningful sentences only
        .map(s => s.toLowerCase());
    
    // Extract question keywords (3+ letters)
    const keywords = question
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 3);
    
    console.log('Keywords:', keywords);
    console.log('Sentences found:', sentences.length);
    
    if (keywords.length === 0) {
        return '🤔 Try asking with specific words from your notes!';
    }
    
    // Score each sentence
    let bestSentence = null;
    let bestScore = 0;
    
    sentences.forEach(sentence => {
        let score = 0;
        
        // Count keyword matches
        keywords.forEach(keyword => {
            if (sentence.includes(keyword)) {
                score += (keyword.length / 3); // Longer matches worth more
            }
        });
        
        // Multiple keyword bonus
        const matches = keywords.filter(kw => sentence.includes(kw)).length;
        if (matches >= 2) score += 2;
        
        if (score > bestScore && score >= 1.5) {
            bestScore = score;
            bestSentence = sentence;
        }
    });
    
    if (bestSentence) {
        // Clean up answer
        const cleanAnswer = bestSentence.charAt(0).toUpperCase() + bestSentence.slice(1);
        return `📖 <strong>Found in your notes:</strong><br>"${cleanAnswer}"<br><small>Score: ${Math.round(bestScore*10)/10}</small>`;
    } else {
        return `🤔 No good matches found for "${question}".<br>
        💡 <strong>Tips:</strong><br>
        - Use keywords from your notes<br>
        - Add more detailed notes<br>
        - Try synonyms`;
    }
}

// === CHAT SYSTEM ===
function addMessage(type, text) {
    const id = Date.now();
    const message = {
        id: id,
        type: type,
        text: text,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
    };
    
    chatHistory.push(message);
    renderChat();
    return id;
}

function removeMessage(id) {
    chatHistory = chatHistory.filter(msg => msg.id != id);
    renderChat();
}

function renderChat() {
    // Limit to last 15 messages
    chatHistory = chatHistory.slice(-15);
    
    chatMessages.innerHTML = chatHistory.map(msg => {
        return `
            <div class="message ${msg.type}">
                <time>${msg.time}</time>
                ${msg.text}
            </div>
        `;
    }).join('');
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveChatHistory() {
    try {
        localStorage.setItem('student_os_chat_history', JSON.stringify(chatHistory.slice(-20)));
    } catch (e) {
        console.warn('Chat history too large, not saving');
    }
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem('student_os_chat_history');
        if (saved) {
            chatHistory = JSON.parse(saved);
            renderChat();
        }
    } catch (e) {
        console.error('Chat history load error:', e);
    }
}

// === STATUS MESSAGES ===
function showStatus(message, type = 'info') {
    notesStatus.innerHTML = message;
    notesStatus.style.display = 'block';
    
    // Color coding
    if (type === 'success') {
        notesStatus.style.color = '#10b981';
        notesStatus.style.background = 'rgba(16, 185, 129, 0.2)';
    } else if (type === 'error') {
        notesStatus.style.color = '#ef4444';
        notesStatus.style.background = 'rgba(239, 68, 68, 0.2)';
    } else {
        notesStatus.style.color = 'var(--accent-pink)';
        notesStatus.style.background = 'rgba(255, 117, 140, 0.2)';
    }
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        notesStatus.style.display = 'none';
    }, 4000);
}
