(function() {
  'use strict';

  // 🔥 BULLETPROOF: No crashes, works everywhere
  let API_BASE;
  
  try {
    // GitHub Pages / Production
    API_BASE = window.ENV?.API_URL;
    
    // Local fallback (no bundler check needed)
    if (!API_BASE) API_BASE = 'http://localhost:3000';
    
    console.log('🔗 Using API:', API_BASE);
  } catch (e) {
    API_BASE = 'http://localhost:3000';
    console.warn('⚠️ Config error, using localhost');
  }

  function init() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const sendButton = chatForm.querySelector('button');

    if (!chatForm || !chatInput || !chatMessages) {
      console.error('❌ Chat elements missing');
      return;
    }

    let isSending = false;

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      sendButton.disabled = !this.value.trim();
    });

    // Event listeners
    chatForm.addEventListener('submit', sendMessage);
    chatInput.addEventListener('keydown', handleEnter);

    // Initial resize
    chatInput.dispatchEvent(new Event('input'));

    // Test connection
    testConnection();

    function testConnection() {
      fetch(`${API_BASE}/health`, { cache: 'no-store' })
        .then(res => {
          if (res.ok) {
            console.log('✅ Backend connected:', API_BASE);
            appendMessage('assistant', '🚀 Connected! Ready to help.');
          } else {
            console.warn('⚠️ Backend issue:', res.status);
          }
        })
        .catch(err => {
          console.warn('⚠️ Backend unreachable:', err);
          appendMessage('assistant', '⚠️ Offline - connect backend for AI');
        });
    }

    async function sendMessage(e) {
      e.preventDefault();
      if (isSending) return;

      const message = chatInput.value.trim();
      if (!message) return;

      // User message
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

        const text = await response.text();
        let data;
        
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Invalid JSON');
        }

        removeElement(thinkingId);

        if (response.ok && data?.reply) {
          appendMessage('assistant', data.reply);
        } else {
          appendMessage('assistant', `❌ ${data?.error || 'Error ' + response.status}`);
        }
      } catch (error) {
        console.error('Request failed:', error);
        removeElement(thinkingId);
        
        let errorMsg;
        if (error.name === 'AbortError') errorMsg = '⏰ Timeout';
        else if (error.message.includes('fetch') || error.message.includes('Failed')) 
          errorMsg = `🌐 Network - Check ${API_BASE}`;
        else errorMsg = error.message;
          
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
      const id = `thinking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
