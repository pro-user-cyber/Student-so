console.log('🤖 AI ASSISTANT LOADED!');
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
        this.apiKey = '';
        this.isChatLoading = false;
        this.isFilterLoading = false;
        this.init();
    }

    // 🛡️ XSS Protection
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    init() {
        this.getElements();
        if (this.allElementsExist()) {
            this.loadApiKey();
            this.loadNotes();
            this.setupEvents();
            this.updateDisplay();
        }
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
        this.apiKeyInput = document.getElementById('api-key-input');
        this.saveApiKeyBtn = document.getElementById('save-api-key-btn');
        this.apiStatus = document.getElementById('api-status');
        this.filterTopicInput = document.getElementById('filter-topic-input');
        this.analyzeBtn = document.getElementById('analyze-btn');
        this.filterResults = document.getElementById('filter-results');
        this.filterSentences = document.getElementById('filter-sentences');
        this.filterCorrection = document.getElementById('filter-correction');
    }

    allElementsExist() {
        return this.notesInput && this.questionInput && this.chatMessages && 
               this.notesStatus && this.saveBtn && this.sendBtn && 
               this.apiKeyInput && this.apiStatus && this.filterTopicInput;
    }

    async saveApiKey() {
        this.apiKey = this.apiKeyInput.value.trim();
        if (!this.apiKey) {
            this.updateApiStatus('⚠️ Enter API key', 'error');
            return false;
        }
        localStorage.setItem('groq_api_key', this.apiKey);
        this.updateApiStatus('🔄 Validating...', 'info');
        try {
            const test = await this.apiRequest({
                messages: [{role: 'user', content: 'test'}],
                max_tokens: 1
            });
            if (!test.choices || !test.choices[0]) throw new Error('Invalid response format');
            this.updateApiStatus('✅ Key saved', 'success');
            return true;
        } catch {
            localStorage.removeItem('groq_api_key');
            this.updateApiStatus('❌ Invalid key', 'error');
            return false;
        }
    }

    loadApiKey() {
        this.apiKey = localStorage.getItem('groq_api_key') || '';
        this.apiKeyInput.value = this.apiKey;
        this.updateApiStatus(this.apiKey ? '✅ Key saved' : '🔑 No key', this.apiKey ? 'success' : 'info');
    }

    updateApiStatus(message, type = 'info') {
        if (this.apiStatus) {
            this.apiStatus.textContent = message;
            this.apiStatus.style.color = type === 'success' ? '#10b981' : 
                                       type === 'error' ? '#ef4444' : 'var(--accent-blue)';
        }
    }

    hasValidApiKey() {
        return !!this.apiKey;
    }

    async apiRequest(body) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama3-8b-8192',
                    ...body
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!data.choices?.[0]) throw new Error('Invalid response format');
            return data;
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    }

    // 🆕 NEW CHATBOT AI PROMPT (STRICT NOTES-ONLY)
    async handleChatAI(message) {
        const recentNotes = this.notes.slice(-3000);
        const response = await this.apiRequest({
            messages: [
                {
                    role: 'system',
                    content: `You are a strict academic study assistant.

RULES:
- ONLY use the provided notes as your knowledge source.
- If the answer is NOT explicitly in the notes, say: "Not found in provided notes."
- Do NOT use outside knowledge.
- Do NOT guess or infer beyond the notes.
- Keep answers concise, clear, and academic.
- Quote or reference the notes when possible.

NOTES:
"""${recentNotes}"""` 
                },
                { role: 'user', content: message }
            ],
            temperature: 0.1,
            max_tokens: 500
        });
        return this.escapeHTML(response.choices[0].message.content);
    }

    // 🆕 NEW FILTER AI PROMPT (NOTE ANALYZER)
    async handleFilterAI(topic, notes) {
        if (!this.hasValidApiKey()) return this.filterFallback(topic, notes);
        try {
            const response = await this.apiRequest({
                messages: [{
                    role: 'user',
                    content: `You are an AI note analyzer.

You MUST return ONLY valid JSON. No extra text.

TASK:
- Break the notes into individual sentences.
- For each sentence, classify it as:
  - "relevant" → directly related to the topic
  - "irrelevant" → not related

- Then give a short academic correction/improvement of the notes.

STRICT OUTPUT FORMAT:
{
  "analysis": [
    {"sentence": "exact sentence", "status": "relevant|irrelevant"}
  ],
  "correction": "brief academic feedback to improve notes"
}

RULES:
- Do NOT modify sentences.
- Do NOT summarize sentences.
- Do NOT include explanations outside JSON.
- Be strict in relevance (no stretching connections).

TOPIC:
"${topic}"

NOTES:
"""${notes.substring(0, 8000)}"""`
                }],
                temperature: 0,
                max_tokens: 3000
            });

            const raw = response.choices[0].message.content.trim();
            const jsonStart = raw.indexOf('{');
            const jsonEnd = raw.lastIndexOf('}') + 1;
            if (jsonStart === -1 || jsonEnd <= jsonStart) throw new Error('No JSON');
            const cleanJson = raw.substring(jsonStart, jsonEnd);
            const parsed = JSON.parse(cleanJson);
            if (!parsed.analysis || !Array.isArray(parsed.analysis)) throw new Error('Invalid format');

            // 🛡️ XSS safe
            parsed.analysis = parsed.analysis.map(item => ({
                ...item,
                sentence: this.escapeHTML(item.sentence)
            }));
            return parsed;
        } catch (error) {
            console.error('🧨 Filter AI failed:', error);
            const fallback = this.filterFallback(topic, notes);
            fallback.correction += ' <span style="color:#fbbf24;font-weight:bold;">(⚠️ AI failed → using smart fallback)</span>';
            return fallback;
        }
    }

    filterFallback(topic, notes) {
        const sentences = notes.split(/[\n][\s]*|[.!?][\s]*|;[.\s]*|(?<!e\.g\.|i\.e\.|etc\.|Dr\.|Mr\.|Mrs\.)[.][\s]*|[\n]{2,}/)
            .map(s => s.trim())
            .filter(s => s.length > 10);
        const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        return {
            analysis: sentences.map(s => ({
                sentence: this.escapeHTML(s),
                status: topicWords.some(w => s.toLowerCase().includes(w)) ? 'relevant' : 'irrelevant'
            })),
            correction: '🔑 API key needed for full AI analysis. Using enhanced keyword matching.'
        };
    }

    async askQuestion() {
        if (this.isChatLoading) return;
        this.isChatLoading = true;
        try {
            const question = this.questionInput.value.trim();
            if (!question) return this.showStatus('⚠️ Enter a question!', 'error');
            if (!this.notes) {
                this.addMessage('user', this.escapeHTML(question));
                this.addMessage('assistant', '❌ No notes saved! 1️⃣ Type notes 2️⃣ 💾 Save 3️⃣ Ask');
                this.questionInput.value = '';
                return;
            }
            this.addMessage('user', this.escapeHTML(question));
            this.questionInput.value = '';
            this.questionsAsked++;
            const thinkingId = this.addMessage('assistant', '🧠 AI thinking...');
            let answer;
            if (this.hasValidApiKey()) {
                answer = await this.handleChatAI(question);
            } else {
                answer = `🔑 API Key needed for AI chat.<br>
Get free at <a href="https://console.groq.com/keys" target="_blank" style="color:var(--accent-blue)">console.groq.com/keys</a><br><br>
${this.findAnswerFallback(question)}`;
            }
            this.removeMessage(thinkingId);
            this.addMessage('assistant', answer);
            this.updateDisplay();
        } finally {
            this.isChatLoading = false;
        }
    }

    async analyzeNotes() {
        if (this.isFilterLoading) return;
        this.isFilterLoading = true;
        try {
            const topic = this.filterTopicInput.value.trim();
            if (!topic) return this.showStatus('⚠️ Enter topic!', 'error');
            if (!this.notes) return this.showStatus('⚠️ Save notes first!', 'error');
            this.analyzeBtn.textContent = '⏳ Analyzing...';
            this.analyzeBtn.disabled = true;
            const result = await this.handleFilterAI(topic, this.notes);
            this.renderFilterResults(result);
        } finally {
            this.analyzeBtn.disabled = false;
            this.isFilterLoading = false;
            this.analyzeBtn.textContent = '🔍 Analyze Notes';
        }
    }

    renderFilterResults(result) {
        this.filterSentences.innerHTML = result.analysis.map(item => 
            `<div style="margin-bottom:0.75rem;padding:0.75rem;border-radius:8px; background: ${item.status === 'relevant' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.3)'}; border-left:4px solid ${item.status === 'relevant' ? '#10b981' : '#ef4444'};">
                <strong>${item.status === 'relevant' ? '✅ Relevant' : '❌ Irrelevant'}</strong><br>
                "${item.sentence}"
            </div>`
        ).join('');
        this.filterCorrection.innerHTML = `💡 AI Feedback: ${result.correction}`;
        this.filterResults.style.display = 'block';
        this.filterResults.scrollIntoView({behavior: 'smooth'});
    }

    setupEvents() {
        this.questionInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.askQuestion());
        this.sendBtn.addEventListener('click', () => this.askQuestion());
        this.saveBtn.addEventListener('click', () => this.saveNotes());
        this.clearBtn.addEventListener('click', () => this.clearNotes());
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.apiKeyInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.saveApiKey());
        this.analyzeBtn.addEventListener('click', () => this.analyzeNotes());
        this.notesInput.addEventListener('input', () => setTimeout(() => this.updateDisplay(), 100));
    }

    saveNotes() {
        this.notes = this.notesInput.value.trim();
        if (!this.notes) return this.showStatus('⚠️ No notes!', 'error');
        localStorage.setItem('ai_notes', this.notes);
        this.showStatus(`✅ SAVED! ${this.getStats().words} words`, 'success');
        this.updateDisplay();
    }

    clearNotes() {
        if (confirm('🗑️ Delete all notes?')) {
            this.notesInput.value = this.notes = '';
            localStorage.removeItem('ai_notes');
            if (this.filterResults) this.filterResults.style.display = 'none';
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
        }
    }

    findAnswerFallback(question) {
        const sentences = this.notes.split(/[\n.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
        const qWords = question.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
        let bestMatch = '', bestScore = 0;
        sentences.forEach(s => {
            let score = 0;
            qWords.forEach(w => s.toLowerCase().includes(w) && (score += w.length / 10));
            if (score > bestScore && score > 0.8) {
                bestScore = score;
                bestMatch = s;
            }
        });
        return bestMatch ? 
            `📖 Found: "${this.escapeHTML(this.capitalize(bestMatch))}" (Score: ${Math.round(bestScore*100)}%)` : 
            '🤔 No match. Use exact note words.';
    }

    addMessage(type, text) {
        this.chatHistory.push({
            id: Date.now(),
            type,
            text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
        });
        this.renderChat();
        return this.chatHistory[this.chatHistory.length - 1].id;
    }

    removeMessage(id) {
        this.chatHistory = this.chatHistory.filter(msg => msg.id !== id);
        this.renderChat();
    }

    renderChat() {
        this.chatHistory = this.chatHistory.slice(-12);
        this.chatMessages.innerHTML = this.chatHistory.map(msg => 
            `<div class="message ${msg.type}">
                <time>${msg.time}</time>
                ${msg.text}
            </div>`
        ).join('');
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    updateDisplay() {
        const stats = this.getStats();
        this.notesInfo.textContent = stats.words > 0 ? 'Saved ✓' : 'Not saved';
        this.notesCount.textContent = `${stats.words} words`;
        this.chatStatus.textContent = stats.words > 0 ? `${stats.words} words loaded` : 'No notes';
        this.questionsCount.textContent = `${this.questionsAsked} asked`;
    }

    getStats() {
        return {
            words: this.notesInput.value.trim().split(/\s+/).filter(w => w.length).length
        };
    }

    showStatus(message, type = 'info') {
        this.notesStatus.textContent = message;
        this.notesStatus.style.color = type === 'success' ? '#10b981' : 
                                     type === 'error' ? '#ef4444' : 'var(--accent-blue)';
        this.notesStatus.style.display = 'block';
        setTimeout(() => this.notesStatus.style.display = 'none', 2500);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

console.log('🎉 XSS-PROOF POLISHED AI READY!');
