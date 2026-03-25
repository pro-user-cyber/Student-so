console.log('🤖 AI ASSISTANT LOADED!');

// 🔥 GLOBAL AI INSTANCE
let aiAssistant = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 Starting AI Assistant...');
    aiAssistant = new AIBrain();
    console.log('✅ AI BRAIN ACTIVE!');
});

class AIBrain {
    constructor() {
        this.notes = '';
        this.chatHistory = [];
        this.questionsAsked = 0;
        this.init();
    }

    init() {
        this.getElements();
        if (!this.allElementsExist()) {
            console.error('❌ Missing HTML elements');
            return;
        }
        
        this.loadNotes();
        this.setupEvents();
        this.updateDisplay();
        console.log('✅ All systems go!');
    }

    getElements() {
        this.notesInput = document.getElementById('notes-input');
        this.questionInput = document.getElementById('question-input');
        this.chatMessages = document.getElementById('chat-messages');
        this.notesStatus = document.getElementById('notes-status');
        this.notesInfo = document.getElementById('notes-info');
        this.notesCount = document.getElementById('notes-count-display');
        this.chatStatus = document.getElementById('chat-notes-status');
        this.questionsCount = document.getElementById('questions-count-display');
        this.saveBtn = document.getElementById('save-notes-btn');
        this.clearBtn = document.getElementById('clear-notes-btn');
        this.sendBtn = document.getElementById('send-btn');
    }

    allElementsExist() {
        return this.notesInput && this.questionInput && this.chatMessages && 
               this.notesStatus && this.saveBtn && this.sendBtn;
    }

    setupEvents() {
        // Question input
        this.questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.askQuestion();
        });
        
        // Save button
        this.saveBtn.addEventListener('click', () => this.saveNotes());
        
        // Clear button  
        this.clearBtn.addEventListener('click', () => this.clearNotes());
        
        // Send button
        this.sendBtn.addEventListener('click', () => this.askQuestion());
        
        // Live notes counter
        this.notesInput.addEventListener('input', () => {
            setTimeout(() => this.updateDisplay(), 100);
        });
    }

    saveNotes() {
        this.notes = this.notesInput.value.trim();
        if (!this.notes) {
            this.showStatus('⚠️ No notes to save!', 'error');
            return;
        }
        
        localStorage.setItem('ai_notes', this.notes);
        const stats = this.getStats();
        this.showStatus(`✅ SAVED! ${stats.words} words`, 'success');
        this.updateDisplay();
        console.log('💾 Notes saved:', stats.words, 'words');
    }

    clearNotes() {
        if (confirm('🗑️ Delete all notes?')) {
            this.notesInput.value = '';
            this.notes = '';
            localStorage.removeItem('ai_notes');
            this.showStatus('🗑️ Cleared!', 'info');
            this.updateDisplay();
        }
    }

    loadNotes() {
        const saved = localStorage.getItem('ai_notes');
        if (saved) {
            this.notes = saved;
            this.notesInput.value = saved;
            this.updateDisplay();
            console.log('📥 Loaded saved notes');
        }
    }

    askQuestion() {
        const question = this.questionInput.value.trim();
        if (!question) {
            this.showStatus('⚠️ Enter a question!', 'error');
            return;
        }

        if (!this.notes) {
            this.addMessage('user', question);
            this.addMessage('assistant', `❌ No notes saved!<br>
                💡 <strong>Steps:</strong><br>
                1. Type notes above<br>
                2. Click 💾 Save Notes<br>
                3. Ask again!`);
            this.questionInput.value = '';
            return;
        }

        // Add question to chat
        this.addMessage('user', question);
        this.questionInput.value = '';
        this.questionsAsked++;

        // Show AI thinking
        const thinkingId = this.addMessage('assistant', '🧠 AI searching notes...');

        // AI Response
        setTimeout(() => {
            this.removeMessage(thinkingId);
            const answer = this.findAnswer(question);
            this.addMessage('assistant', answer);
            this.updateDisplay();
        }, 600);
    }

    findAnswer(question) {
        console.log('🔍 Searching for:', question);
        
        // Split notes into sentences
        const sentences = this.notes
            .split(/[\n.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 15);

        // Keywords from question
        const qWords = question.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2);

        let bestMatch = '';
        let bestScore = 0;

        sentences.forEach(sentence => {
            let score = 0;
            qWords.forEach(word => {
                if (sentence.toLowerCase().includes(word)) {
                    score += word.length / 10;
                }
            });

            if (score > bestScore && score > 0.8) {
                bestScore = score;
                bestMatch = sentence;
            }
        });

        if (bestMatch) {
            return `📖 <strong>Found in notes:</strong><br>
                "${this.capitalize(bestMatch)}"<br>
                <small>🔍 Match score: ${Math.round(bestScore * 100)}%</small>`;
        }

        return `🤔 No exact match for "${question}"<br>
            💡 <strong>Tips:</strong><br>
            - Use exact words from notes<br>
            - Add more detailed notes<br>
            - Try related terms`;
    }

    addMessage(type, text) {
        const message = {
            id: Date.now(),
            type: type,
            text: text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
        };
        this.chatHistory.push(message);
        this.renderChat();
        return message.id;
    }

    removeMessage(id) {
        this.chatHistory = this.chatHistory.filter(msg => msg.id !== id);
        this.renderChat();
    }

    renderChat() {
        // Keep last 12 messages
        this.chatHistory = this.chatHistory.slice(-12);
        
        this.chatMessages.innerHTML = this.chatHistory.map(msg => `
            <div class="message ${msg.type}">
                <time>${msg.time}</time>
                ${msg.text}
            </div>
        `).join('');
        
        // Auto scroll
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    updateDisplay() {
        const stats = this.getStats();
        
        // Notes info
        if (stats.words > 0) {
            this.notesInfo.textContent = 'Saved ✓';
            this.notesCount.textContent = `${stats.words} words`;
            this.chatStatus.textContent = `${stats.words} words loaded`;
        } else {
            this.notesInfo.textContent = 'Not saved';
            this.notesCount.textContent = '0 words';
            this.chatStatus.textContent = 'No notes';
        }
        
        // Questions count
        this.questionsCount.textContent = `${this.questionsAsked} asked`;
    }

    getStats() {
        const text = this.notesInput.value.trim();
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        return { words };
    }

    showStatus(message, type = 'info') {
        this.notesStatus.textContent = message;
        this.notesStatus.style.color = type === 'success' ? '#10b981' : 
                                     type === 'error' ? '#ef4444' : 'var(--accent-blue)';
        this.notesStatus.style.display = 'block';
        setTimeout(() => {
            this.notesStatus.style.display = 'none';
        }, 2500);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

console.log('🎉 AI ASSISTANT READY!');
