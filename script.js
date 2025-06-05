const API_KEY = 'AIzaSyAAZTTMAB4hzEDwGIss9fV_BuSpfMi4JDI';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash';
let analyzedData = null;
let chatContext = [];

document.getElementById('analyzeBtn').addEventListener('click', analyzeImages);
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

async function analyzeImages() {
    const fileInput = document.getElementById('imageUpload');
    const files = fileInput.files;
    
    if (files.length === 0) {
        alert('Please select some chat screenshots first.');
        return;
    }

    const loadingMessage = addMessageToChat('ai', 'Analyzing images... Please wait...');
    
    try {
        const imagePromises = Array.from(files).map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        const images = await Promise.all(imagePromises);
        
        // Send images to Gemini API for analysis
        const analysisResult = await analyzeImagesWithGemini(images);
        
        // Store analysis results
        analyzedData = analysisResult;
        localStorage.setItem('chatAnalysis', JSON.stringify(analysisResult));
        
        loadingMessage.textContent = 'Analysis complete! Chat personality learned.';
    } catch (error) {
        console.error('Error:', error);
        loadingMessage.textContent = 'Error processing images. Please try again.';
    }
}

async function analyzeImagesWithGemini(images) {
    const response = await fetch(`${API_URL}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    {
                        text: "Analyze these chat screenshots and learn the communication style, common phrases, and personality traits. Summarize the findings."
                    },
                    ...images.map(img => ({
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: img.split(',')[1]
                        }
                    }))
                ]
            }]
        })
    });

    const data = await response.json();
    return data.candidates[0].content;
}

function sendMessage() {
    if (!analyzedData) {
        alert('Please analyze some chat screenshots first!');
        return;
    }

    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message) {
        addMessageToChat('user', message);
        messageInput.value = '';
        messageInput.focus();
        
        setTimeout(() => {
            generateAIResponse(message);
        }, 1000);
    }
}

function addMessageToChat(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

async function generateAIResponse(userMessage) {
    try {
        // Add user message to context
        chatContext.push({ role: "user", message: userMessage });
        
        const response = await fetch(`${API_URL}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Context: You are simulating a chat conversation based on the analyzed chat patterns.
                              Previous analysis: ${JSON.stringify(analyzedData)}
                              Chat history: ${JSON.stringify(chatContext)}
                              User message: ${userMessage}
                              Respond naturally in the same style as analyzed from the chat screenshots.`
                    }]
                }]
            })
        });

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Add AI response to context
        chatContext.push({ role: "assistant", message: aiResponse });
        
        // Store chat history
        localStorage.setItem('chatHistory', JSON.stringify(chatContext));
        
        addMessageToChat('ai', aiResponse);
    } catch (error) {
        console.error('Error generating response:', error);
        addMessageToChat('ai', 'Sorry, I had trouble generating a response. Please try again.');
    }
}

// Load saved data on startup
window.addEventListener('load', () => {
    const savedAnalysis = localStorage.getItem('chatAnalysis');
    const savedHistory = localStorage.getItem('chatHistory');
    
    if (savedAnalysis) {
        analyzedData = JSON.parse(savedAnalysis);
    }
    
    if (savedHistory) {
        chatContext = JSON.parse(savedHistory);
        // Display previous messages
        chatContext.forEach(msg => {
            addMessageToChat(msg.role === 'user' ? 'user' : 'ai', msg.message);
        });
    }
});
