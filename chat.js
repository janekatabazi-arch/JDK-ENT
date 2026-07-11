let selectedChat = null;
try { selectedChat = JSON.parse(localStorage.getItem("selectedChat")); } catch { selectedChat = null; }

const chatName = document.getElementById("chatName");
const chatImage = document.getElementById("chatImage");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendMessage");

if (!selectedChat) {
    window.location.replace("messages.html");
} else {
    chatName.textContent = selectedChat.name;
    chatImage.src = selectedChat.image;
}

const storageKey = selectedChat ? "chatMessages_" + selectedChat.id : "chatMessages_unknown";
let messages = [];
try { messages = JSON.parse(localStorage.getItem(storageKey)) || []; } catch { messages = []; }
if (selectedChat && !messages.length) messages = [{ text:selectedChat.message, sender:"seller", time:Date.now() }];

function saveMessages() { localStorage.setItem(storageKey, JSON.stringify(messages)); }

function displayChat() {
    if (!chatMessages) return;
    chatMessages.innerHTML = "";
    messages.forEach(message => {
        const bubble = document.createElement("div");
        bubble.classList.add("chatBubble", message.sender);
        bubble.textContent = message.text;
        chatMessages.appendChild(bubble);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const text = chatInput?.value.trim();
    if (!text || !selectedChat) return;
    messages.push({ text, sender:"customer", time:Date.now() });
    saveMessages();
    chatInput.value = "";
    displayChat();

    /* Demo marketplace response until a real backend is connected. */
    window.setTimeout(() => {
        messages.push({ text:getDemoReply(), sender:"seller", time:Date.now() });
        saveMessages();
        displayChat();
    }, 700);
}

function getDemoReply() {
    if (String(selectedChat.id).startsWith("worker-")) return "Thanks for contacting me. Please tell me the service you need and your area.";
    if (selectedChat.id === "delivery-team") return "Please share your order details and delivery area.";
    if (selectedChat.id === "electronics-seller") return "Tell me which electronic product you are interested in.";
    return "Thank you for your message. JDK Support has received it and will assist you.";
}

sendButton?.addEventListener("click", sendMessage);
chatInput?.addEventListener("keydown", event => { if (event.key === "Enter") sendMessage(); });
document.getElementById("backChat")?.addEventListener("click", () => window.location.href = "messages.html");

displayChat();
