console.log('🤖 AI ASSISTANT v2.0 LOADED! 🚀');

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

    // 🔥 Initialize everything
    init() {
        console.log('🔥 Initializing AI Brain...');
        this.getElements();
        if (!this.allElementsExist()) {
            console.error('❌ Missing DOM elements!');
            return;
        }
        this.loadSavedData();
        this.setupEvents();
        this.updateDisplay();
        console.log('✅ AI Brain fully initialized!');
    }

    // 🔍 Get all DOM elements
    getElements() {
        const ids = [
            'notes-input', 'question-input', 'chat-messages', 'notes-status',
            'notes-info', 'notes-count-display', 'chat-notes-status', 'questions-count-display',
            'save-notes-btn', 'clear-notes-btn', 'send-btn', 'api-key-input',
            'save-api-key-btn', 'api-status', 'filter-topic-input', 'analyze-btn',
            'filter-results', 'filter-sentences', 'filter-correction'
        ];
        
        ids.forEach(id => {
            this[id.replace(/-/g, '_')] = document.getElementById(id);
        });
    }

    allElementsExist() {
        return !!this.notes_input && !!this.question_input && !!this.chat_messages &&
               !!this.save_notes_btn && !!this.send_btn && !!this.api_key_input;
    }

    // 💾 Load saved data
    loadSavedData() {
        // Load API key
        this.apiKey = localStorage.getItem('groq_api_key') || '';
        if (this.api_key_input) this.api_key_input.value = this.apiKey;
        this.updateApiStatus(this.apiKey ? '✅ Valid key loaded' : '🔑 Enter API key');

        // Load notes
        const savedNotes = localStorage.getItem('ai_notes');
        if (savedNotes) {
            this.notes = savedNotes;
            if (this.notes_input) this.notes_input.value = savedNotes;
        }
    }

    // 🔑 API Key Management (with TEST message!)
    async testApiKey() {
        if (!this.apiKey.trim()) {
            this.updateApiStatus('⚠️ No API key entered', 'error');
            return false;
        }

        this.updateApiStatus('🧪 Testing API key...', 'info');
        this.api_key_input.disabled = true;
        this.save_api_key_btn.disabled = true;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama3-8b-8192',
                    messages: [{ role: 'user', content: 'Say "API works!"' }],
                    max_tokens: 10
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.choices?.[0]?.message?.content?.includes('API works')) {
                throw new Error('Invalid response');
            }

            // ✅ SUCCESS - Save and show confirmation message!
            localStorage.setItem('groq_api_key', this.apiKey);
            this.updateApiStatus('✅ API Key VALIDATED! Ready to use.', 'success');
            
            // 🎉 Add success message to chat
            this.addMessage('assistant', '🎉 <strong>API Key Verified!</strong><br>✅ Chat AI & Filter AI are now active!<br>🚀 Ask away!');
            
            return true;
        } catch (error) {
            console.error('API Test failed:', error);
            localStorage.removeItem('groq_api_key');
            this.updateApiStatus('❌ Invalid API key. Get free key: groq.com', 'error');
            return false;
        } finally {
            this.api_key_input.disabled = false;
            this.save_api_key_btn.disabled = false;
            this.save_api_key_btn.textContent = '✅ Test & Save';
        }
    }

    updateApiStatus(message, type = 'info') {
        if (!this.api_status) return;
        
        this.api_status.textContent = message;
        this.api_status.className = `api-status ${type}`;
        
        // Color overrides
        const colors = {
            success: '#10b981',
            error: '#ef4444', 
            info: 'var(--accent-blue)'
        };
        this.api_status.style.color = colors[type] || colors.info;
    }

    // 🧠 Core API Request (Production Ready)
    async apiRequest(messages, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama3-8b-8192',
                    messages,
                    temperature: options.temperature || 0.1,
                    max_tokens: options.max_tokens || 1000,
                    ...options
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error ${response.status}: ${errorText.slice(0, 100)}`);
            }

            const data = await response.json();
            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Invalid API response format');
            }

            return data.choices[0].message.content.trim();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - try again');
            }
            throw error;
        }
    }

    // 💬 CHAT AI (Strict Notes-Only)
    async chatAI(message) {
        if (!this.hasValidApiKey()) {
            return '🔑 <strong>API Key Required</strong><br>Get free key at <a href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</a>';
        }

        const recentNotes = this.notes.slice(-4000);
        const prompt = `You are a strict academic study assistant using ONLY these notes:

${'='.repeat(50)}
NOTES:
"""${recentNotes}"""
${'='.repeat(50)}

RULES (MANDATORY):
1. Answer using ONLY content from notes above
2. If not explicitly in notes: "❌ Not found in notes"
3. NO outside knowledge, NO guessing
4. Quote exact text when possible
5. Be concise & academic

QUESTION: ${message}`;

        try {
            const response = await this.apiRequest([
                { role: 'system', content: prompt },
                { role: 'user', content: message }
            ], { max_tokens: 800, temperature: 0.1 });

            return this.escapeHTML(response);
        } catch (error) {
            console.error('Chat AI error:', error);
            return `⚠️ AI Error: ${error.message}<br>Try again or check your API key.`;
        }
    }

    // 🔍 FILTER AI (Note Analyzer)
    async filterAI(topic, notes) {
        if (!this.hasValidApiKey()) {
            return this.filterFallback(topic, notes);
        }

        const prompt = `ANALYZE THESE NOTES FOR TOPIC: "${topic}"

Return ONLY valid JSON - NO other text!

FORMAT:
{
  "analysis": [
    {"sentence": "exact sentence text", "status": "relevant|irrelevant", "reason": "brief reason"}
  ],
  "correction": "1-2 sentence academic feedback",
  "summary": "1 sentence topic summary"
}

NOTES (max 6000 chars):
"""${notes.substring(0, 6000)}"""

RULES:
- Extract REAL sentences (don't modify)
- "relevant" = directly mentions topic/keywords
- "irrelevant" = no clear connection
- Max 20 sentences
- JSON must be parseable`;

        try {
            const response = await this.apiRequest([{ role: 'user', content: prompt }], {
                max_tokens: 2000,
                temperature: 0.0
            });

            // Parse JSON safely
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No valid JSON');

            const result = JSON.parse(jsonMatch[0]);
            if (!result.analysis?.length) throw new Error('Invalid analysis format');

            // Sanitize
            result.analysis = result.analysis.slice(0, 25).map(item => ({
                sentence: this.escapeHTML(item.sentence || ''),
                status: item.status || 'irrelevant',
                reason: this.escapeHTML(item.reason || '')
            }));

            return result;
        } catch (error) {
            console.error('Filter AI error:', error);
            return this.filterFallback(topic, notes);
        }
    }

    // 🔧 Smart Fallbacks
    filterFallback(topic, notes) {
        const sentences = notes
            .split(/[.?!;]\s*|\n\s*\n/)
            .map(s => s.trim())
            .filter(s => s.length > 8)
            .slice(0, 25);

        const topicWords = topic.toLowerCase().split(/\W+/).filter(w => w.length > 2);

        return {
            analysis: sentences.map(sentence => {
                const score = topicWords.filter(word => 
                    sentence.toLowerCase().includes(word)
                ).length;
                
                return {
                    sentence: this.escapeHTML(sentence),
                    status: score > 0 ? 'relevant' : 'irrelevant',
                    reason: score > 0 ? 'Contains topic keywords' : 'No topic match'
                };
            }),
            correction: '💡 <strong>Upgrade to AI Analysis:</strong> Enter valid Groq API key for smart relevance scoring.',
            summary: `Keyword match on "${topicWords.join(', ')}"`
        };
    }

    // 📝 Notes Management
    saveNotes() {
        this.notes = this.notes_input.value.trim();
        if (!this.notes) {
            this.showStatus('⚠️ No notes to save!', 'error');
            return;
        }
        localStorage.setItem('ai_notes', this.notes);
        this.showStatus(`✅ Saved! ${this.getWordCount(this.notes)} words`, 'success');
        this.updateDisplay();
    }

    clearNotes() {
        if (!confirm('🗑️ Delete ALL notes?')) return;
        this.notes = '';
        this.notes_input.value = '';
        localStorage.removeItem('ai_notes');
        this.chatHistory = [];
        this.renderChat();
        if (this.filter_results) this.filter_results.style.display = 'none';
        this.showStatus('🗑️ Notes cleared!', 'info');
        this.updateDisplay();
    }

    // 💬 Chat Functions
    async askQuestion() {
        if (this.isChatLoading) return;
        
        const question = this.question_input.value.trim();
        if (!question) return this.showStatus('⚠️ Enter a question!', 'error');
        if (!this.notes) return this.showStatus('⚠️ Save notes first!', 'error');

        this.isChatLoading = true;
        this.question_input.disabled = true;
        this.send_btn.disabled = true;
        this.send_btn.textContent = '⏳ AI Thinking...';

        try {
            // Add user message
            this.addMessage('user', this.escapeHTML(question));
            this.question_input.value = '';

            // Show thinking
            const thinkingId = this.addMessage('assistant', '🧠 Thinking... <em>(using your notes)</em>');

            // Get AI response
            const answer = await this.chatAI(question);
            this.removeMessage(thinkingId);
            this.addMessage('assistant', answer);

            this.questionsAsked++;
            this.updateDisplay();
        } catch (error) {
            this.addMessage('assistant', `⚠️ Error: ${error.message}`);
        } finally {
            this.isChatLoading = false;
            this.question_input.disabled = false;
            this.send_btn.disabled = false;
            this.send_btn.textContent = 'Send 🚀';
        }
    }

    // 🔍 Analyze Notes
    async analyzeNotes() {
        if (this.isFilterLoading) return;
        
        const topic = this.filter_topic_input.value.trim();
        if (!topic) return this.showStatus('⚠️ Enter analysis topic!', 'error');
        if (!this.notes) return this.showStatus('⚠️ No notes saved!', 'error');

        this.isFilterLoading = true;
        this.analyze_btn.disabled = true;
        this.analyze_btn.textContent = '⏳ Analyzing...';

        try {
            const result = await this.filterAI(topic, this.notes);
            this.renderFilterResults(result);
        } catch (error) {
            this.showStatus(`⚠️ Analysis failed: ${error.message}`, 'error');
        } finally {
            this.isFilterLoading = false;
            this.analyze_btn.disabled = false;
            this.analyze_btn.textContent = '🔍 Analyze Notes';
        }
    }

    renderFilterResults(result) {
        const html = result.analysis.map(item => `
            <div style="margin-bottom: 1rem; padding: 1rem; border-radius: 12px; 
                background: ${item.status === 'relevant' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};
                border-left: 4px solid ${item.status === 'relevant' ? '#10b981' : '#ef4444'};">
                <div style="font-weight: 700; margin-bottom: 0.5rem;">
                    ${item.status === 'relevant' ? '✅ RELEVANT' : '❌ IRRELEVANT'}
                </div>
                <div style="font-style: italic; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">
                    ${item.reason || ''}
                </div>
                <div>"${item.sentence}"</div>
            </div>
        `).join('');

        this.filter_sentences.innerHTML = html;
        this.filter_correction.innerHTML = `<strong>💡 Feedback:</strong> ${result.correction}`;
        
        if (result.summary) {
            this.filter_correction.innerHTML += `<br><br><strong>📋 Summary:</strong> ${result.summary}`;
        }

        this.filter_results.style.display = 'block';
        this.filter_results.scrollIntoView({ behavior: 'smooth' });
    }

    // 🎨 UI Helpers
    addMessage(type, text) {
        this.chatHistory.push({
            id: Date.now(),
            type: type === 'user' ? 'user' : 'assistant',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        this.renderChat();
    }

    removeMessage(id) {
        this.chatHistory = this.chatHistory.filter(msg => msg.id !== id);
        this.renderChat();
    }

    renderChat() {
        // Keep last 15 messages
        this.chatHistory = this.chatHistory.slice(-15);
        
        this.chat_messages.innerHTML = this.chatHistory.map(msg => `
            <div class="message ${msg.type}">
                <small style="opacity: 0.7; display: block; margin-bottom: 0.25rem;">
                    ${msg.time}
                </small>
                <div>${msg.text}</div>
            </div>
        `).join('');

        this.chat_messages.scrollTop = this.chat_messages.scrollHeight;
    }

    getWordCount(text) {
        return text.trim().split(/\s+/).filter(w => w.length).length;
    }

    updateDisplay() {
        const wordCount = this.getWordCount(this.notes_input?.value || '');
        
        if (this.notes_info) this.notes_info.textContent = wordCount > 0 ? '✅ Saved' : 'Not saved';
        if (this.notes_count_display) this.notes_count_display.textContent = `${wordCount} words`;
        if (this.chat_notes_status) this.chat_notes_status.textContent = wordCount > 0 ? `${wordCount} words ready` : 'Load notes first';
        if (this.questions_count_display) this.questions_count_display.textContent = `${this.questionsAsked}`;
    }

    showStatus(message, type = 'info') {
        if (!this.notes_status) return;
        
        this.notes_status.textContent = message;
        this.notes_status.className = `status ${type}`;
        this.notes_status.style.display = 'block';
        
        setTimeout(() => {
            this.notes_status.style.display = 'none';
        }, 3000);
    }

    // ⌨️ Event Listeners
    setupEvents() {
        // Notes
        this.notes_input?.addEventListener('input', debounce(() => this.updateDisplay(), 300));
        this.save_notes_btn?.addEventListener('click', () => this.saveNotes());
        this.clear_notes_btn?.addEventListener('click', () => this.clearNotes());

        // Chat
        this.question_input?.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.askQuestion();
            }
        });
        this.send_btn?.addEventListener('click', () => this.askQuestion());

        // API
        this.api_key_input?.addEventListener('keypress', e => {
            if (e.key === 'Enter') this.testApiKey();
        });
        this.save_api_key_btn?.addEventListener('click', () => this.testApiKey());

        // Filter
        this.filter_topic_input?.addEventListener('keypress', e => {
            if (e.key === 'Enter') this.analyzeNotes();
        });
        this.analyze_btn?.addEventListener('click', () => this.analyzeNotes());
    }
}

// 🛠️ Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 🚀 Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.aiAssistant = new AIBrain();
        console.log('🎉 AI ASSISTANT FULLY ACTIVE!');
    });
} else {
    window.aiAssistant = new AIBrain();
    console.log('🎉 AI ASSISTANT FULLY ACTIVE!');
}
