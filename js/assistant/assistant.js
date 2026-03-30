(function() {
  'use strict';

  // 🔥 BULLETPROOF API CONFIG - Works everywhere
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://student-so.onrender.com';

  console.log('🔗 API:', API_BASE);

  function init() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const sendButton = chatForm?.querySelector('button');

    if (!chatForm || !chatInput || !chatMessages) {
      console.error('❌ Missing chat elements');
      return;
    }

    let isSending = false;

    // Auto-resize textarea + send button state
    chatInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      sendButton.disabled = !this.value.trim();
    });

    // Event listeners
    chatForm.addEventListener('submit', sendMessage);
    chatInput.addEventListener('keydown', handleEnter);

    // Initial setup
    chatInput.dispatchEvent(new Event('input'));
    testConnection();
    
    function testConnection() {
      fetch(`${API_BASE}/health`, { cache: 'no-store' })
        .then(res => res.ok ? 
          appendMessage('assistant', '🚀 Connected! Ready to chat.') : 
          console.warn('⚠️ Backend issue:', res.status)
        )
        .catch(() => appendMessage('assistant', '⚠️ Offline mode'));
    }

    async function sendMessage(e) {
      e.preventDefault();
      if (isSending) return;

      const message = chatInput.value.trim();
      if (!message) return;

      // Add user message
      appendMessage('user', message);
      chatInput.value = '';
      chatInput.style.height = 'auto';
      sendButton.disabled = true;
      isSending = true;

      const thinkingId = appendThinking();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();
        removeElement(thinkingId);

        if (response.ok && data?.reply) {
          appendMessage('assistant', data.reply);
        } else {
          appendMessage('assistant', `❌ ${data?.error || 'Server error'}`);
        }
      } catch (error) {
        console.error('Request failed:', error);
        removeElement(thinkingId);
        
        const errorMsg = error.name === 'AbortError' 
          ? '⏰ Request timeout' 
          : `🌐 Network error - ${API_BASE}`;
          
        appendMessage('assistant', `❌ ${errorMsg}`);
      } finally {
        isSending = false;
        sendButton.disabled = !chatInput.value.trim();
      }
    }

    function handleEnter(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isSending) chatForm.requestSubmit();
      }
    }

    function appendMessage(type, text) {
      const div = createMessageEl(type, text);
      chatMessages.appendChild(div);
      scrollToBottom();
    }

    function appendThinking() {
      const id = `thinking-${Date.now()}`;
      const div = createMessageEl('assistant', '🤔 Thinking...');
      div.id = id;
      chatMessages.appendChild(div);
      scrollToBottom();
      return id;
    }

    function createMessageEl(type, text) {
      const div = document.createElement('div');
      div.className = `message ${type}`;
      div.innerHTML = `
        <div class="message-content">
          <span class="message-sender">${type === 'user' ? 'You' : 'AI'}</span>
          <div class="message-text">${escapeHtml(text)}</div>
        </div>
      `;
      return div;
    }

    function removeElement(id) {
      const el = document.getElementById(id);
      el?.remove();
    }

    function scrollToBottom() {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
