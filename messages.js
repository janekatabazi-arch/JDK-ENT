const messagesContainer = document.getElementById("messagesContainer");
const searchInput = document.getElementById("getData");

function getChats() { return window.JDKMessages ? JDKMessages.getConversations() : []; }

function displayMessages(list = getChats()) {
    if (!messagesContainer) return;
    messagesContainer.innerHTML = "";
    if (!list.length) {
        messagesContainer.innerHTML = `<div class="emptyMessages"><h3>No messages found</h3><p>Start a conversation from a worker profile.</p></div>`;
        return;
    }
    list.forEach(chat => {
        const card = document.createElement("div");
        card.className = "messageCard";
        card.innerHTML = `
            <img src="${chat.image}" class="profilePic" alt="${chat.name}">
            <div class="messageInfo"><h3>${chat.name}</h3><p>${getPreview(chat)}</p></div>
            <span class="time">${chat.time || "Chat"}</span>`;
        card.addEventListener("click", () => {
            localStorage.setItem("selectedChat", JSON.stringify(chat));
            window.location.href = "chat.html";
        });
        messagesContainer.appendChild(card);
    });
}

function getPreview(chat) {
    try {
        const history = JSON.parse(localStorage.getItem("chatMessages_" + chat.id)) || [];
        return history.length ? history[history.length - 1].text : chat.message;
    } catch { return chat.message; }
}

searchInput?.addEventListener("input", () => {
    const text = searchInput.value.trim().toLowerCase();
    displayMessages(getChats().filter(chat => chat.name.toLowerCase().includes(text) || getPreview(chat).toLowerCase().includes(text)));
});

displayMessages();
