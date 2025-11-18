// --- CONFIGURAÇÃO DO FIREBASE ---
// COLE AQUI O OBJETO firebaseConfig QUE VOCÊ COPIOU DO SEU PROJETO
const firebaseConfig = {
  apiKey: "AIzaSyBpsekaPa-W0N8WGROTPRS7e1PWqDpdqCc",
  authDomain: "hilda-572b9.firebaseapp.com",
  projectId: "hilda-572b9",
  storageBucket: "hilda-572b9.firebasestorage.app",
  messagingSenderId: "551142021716",
  appId: "1:551142021716:web:0748f7a79989f1c69c2bc1",
  measurementId: "G-FN15HEJ1TX"
};

// Inicializar o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Usaremos o Firestore
const fieldValue = firebase.firestore.FieldValue; // Para operações atômicas (punir)

// --- REFERÊNCIAS DO DOM ---
const screens = document.querySelectorAll('.screen');
const loginScreen = document.getElementById('login-screen');
const playerSetupScreen = document.getElementById('player-setup-screen');
const waitingRoomScreen = document.getElementById('waiting-room-screen');
const gameScreen = document.getElementById('game-screen');
const captchaScreen = document.getElementById('captcha-screen');
const scoreboardScreen = document.getElementById('scoreboard-screen');
const adminPanelScreen = document.getElementById('admin-panel-screen');

// Botões e Inputs
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const joinGameButton = document.getElementById('join-game-button');
const playerNameInput = document.getElementById('player-name');
const playerAvatarUrlInput = document.getElementById('player-avatar-url');
const avatarPreview = document.getElementById('avatar-preview');
const colorSwatchContainer = document.getElementById('color-swatch-container');
const quizForm = document.getElementById('quiz-form');
const captchaPlayerId = document.getElementById('captcha-player-id');
const submitCaptchaButton = document.getElementById('submit-captcha');
const captchaButtons = document.querySelectorAll('.captcha-btn');

// Admin
const startGameButton = document.getElementById('start-game-button');
const viewScoreboardButton = document.getElementById('view-scoreboard-button');
const backToAdminButton = document.getElementById('back-to-admin');
const adminPlayerList = document.getElementById('admin-player-list');
const adminBanButton = document.getElementById('admin-ban-button'); // Botão Deletar
const adminPunishButton = document.getElementById('admin-punish-button');

// CHAT DOM (Jogador)
const chatModal = document.getElementById('chat-modal');
const chatMessagesContainer = document.getElementById('chat-messages-container');
const chatInput = document.getElementById('chat-input');
const sendChatMessageButton = document.getElementById('send-chat-message-button');
const openChatButton = document.getElementById('open-chat-button');
const openChatButtonGame = document.getElementById('open-chat-button-game');
const closeChatModalButton = document.getElementById('close-chat-modal-button');

// CHAT DOM (Admin)
const adminChatSection = document.getElementById('admin-chat-section');
const adminActiveChatsList = document.getElementById('admin-active-chats-list');
const adminChatMessagesContainer = document.getElementById('admin-chat-messages-container');
const adminChatInput = document.getElementById('admin-chat-input');
const adminSendChatMessageButton = document.getElementById('admin-send-chat-message-button');

// --- ESTADO GLOBAL ---
const defaultAvatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuz1HKNz1zEXryZ8_K0H7SNkZhpdGIAgNuHQ&s";
const colorPalette = [
    '#3e2723', '#d32f2f', '#c2185b', '#7b1fa2', '#512da8', '#303f9f',
    '#1976d2', '#0288d1', '#0097a7', '#00796b', '#388e3c', '#689f38',
    '#afb42b', '#fbc02d', '#ffa000', '#f57c00', '#e64a19', '#5d4037',
    '#616161', '#455a64', '#000000'
];
let selectedColor = colorPalette[0]; 

let currentPlayer = {
    id: null,
    name: null,
    score: 0,
    avatar: defaultAvatar,
    color: selectedColor   
};
let adminCurrentChatId = null; 
let captchaQ3Answer = null;

// --- FUNÇÕES DE NAVEGAÇÃO ---
function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// --- LÓGICA DE LOGIN ---
loginButton.addEventListener('click', () => {
    const pass = passwordInput.value;
    if (pass === '2024Admin') {
        showScreen('admin-panel-screen');
        adminInit(); 
    } else if (pass === 'piec2024') {
        showScreen('player-setup-screen');
    } else {
        loginError.textContent = 'Senha incorreta.';
    }
});

// --- LÓGICA DO JOGADOR ---

// Gerar as amostras de cores
function populateColorSwatches() {
    colorPalette.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.classList.add('color-swatch');
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        
        if (index === 0) {
            swatch.classList.add('selected');
        }

        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            selectedColor = color;
        });
        
        colorSwatchContainer.appendChild(swatch);
    });
}

// Listener para a pré-visualização do avatar
playerAvatarUrlInput.addEventListener('input', () => {
    const url = playerAvatarUrlInput.value.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        avatarPreview.src = url;
    } else {
        avatarPreview.src = defaultAvatar;
    }
});

// Entrar no Jogo
joinGameButton.addEventListener('click', () => {
    const playerName = playerNameInput.value;
    let characterUrl = playerAvatarUrlInput.value.trim();

    if (playerName.trim() === '') {
        alert('Por favor, insira seu nome.');
        return;
    }
    
    if (characterUrl === '' || (!characterUrl.startsWith('http://') && !characterUrl.startsWith('https://'))) {
        characterUrl = defaultAvatar;
    }

    currentPlayer.id = playerName.toLowerCase().replace(/\s/g, '_') + "_" + Date.now();
    currentPlayer.name = playerName;
    currentPlayer.avatar = characterUrl;
    currentPlayer.color = selectedColor;

    db.collection('players').doc(currentPlayer.id).set({
        name: playerName,
        character: characterUrl,
        color: currentPlayer.color,
        score: 0,
        status: 'waiting'
    })
    .then(() => {
        showScreen('waiting-room-screen');
        listenForGameStart();
        listenForPlayerDeletion(); // Novo listener para remoção de conta
    })
    .catch(error => {
        console.error("Erro ao registrar jogador: ", error);
    });
});

// Sala de Espera
function listenForGameStart() {
    db.collection('gameStatus').doc('main')
        .onSnapshot((doc) => {
            if (doc.exists && doc.data().status === 'started') {
                db.collection('players').doc(currentPlayer.id).get().then(playerDoc => {
                    if (playerDoc.exists && playerDoc.data().status !== 'banned') {
                        showScreen('game-screen');
                    }
                });
            }
        });
}

// Enviar Quiz
quizForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let score = 0;

    const q1Answer = quizForm.q1.value;
    if (q1Answer === 'a') {
        score += 10;
    }
    
    const q2Answer = document.getElementById('q2').value;
    const q3Answer = document.getElementById('q3').value;
    const q4Year = document.getElementById('q4-year').value;
    const q4Month = document.getElementById('q4-month').value;
    const q4Answer = q4Month ? `${q4Year}-${q4Month}` : q4Year;

    currentPlayer.score = score;

    db.collection('players').doc(currentPlayer.id).update({
        score: score,
        answers: { q1: q1Answer, q2: q2Answer, q3: q3Answer, q4: q4Answer },
        status: 'finished_quiz'
    })
    .then(() => {
        captchaPlayerId.textContent = currentPlayer.name;
        showScreen('captcha-screen');
    });
});

// Lógica do CAPTCHA
captchaButtons.forEach(button => {
    button.addEventListener('click', () => {
        captchaButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        captchaQ3Answer = button.getAttribute('data-answer');
    });
});

submitCaptchaButton.addEventListener('click', () => {
    const q1_selected = document.querySelector('input[name="captcha_q1"]:checked');
    const q1 = q1_selected ? q1_selected.value : null;
    const q2_1 = document.getElementById('captcha-q2-1').value;
    const q2_2 = document.getElementById('captcha-q2-2').value;
    
    const q1_pass = (q1 === '1930');
    const validQ2Options = ['poesia', 'prosa', 'teatro'];
    const q2_pass = validQ2Options.includes(q2_1) && validQ2Options.includes(q2_2) && q2_1 !== q2_2;
    const q3_pass = (captchaQ3Answer === 'Casa do Sol');

    if (q1_pass && q2_pass && q3_pass) {
        currentPlayer.score += 5;

        db.collection('players').doc(currentPlayer.id).update({
            score: currentPlayer.score,
            status: 'completed'
        })
        .then(() => {
            alert('Parabéns, você concluiu! Pontuação final: ' + currentPlayer.score);
            passwordInput.value = '';
            showScreen('login-screen'); 
        });
    } else {
        alert('Uma ou mais respostas do CAPTCHA estão incorretas. Tente novamente.');
    }
});

// ----------------------------------------------------
// --- LÓGICA DE CHAT DO JOGADOR ---
// ----------------------------------------------------

// Abrir Modal de Chat
openChatButton.addEventListener('click', () => { chatModal.style.display = 'flex'; listenForChatMessages(); });
openChatButtonGame.addEventListener('click', () => { chatModal.style.display = 'flex'; listenForChatMessages(); });
closeChatModalButton.addEventListener('click', () => { chatModal.style.display = 'none'; });


// Enviar Mensagem (Jogador)
sendChatMessageButton.addEventListener('click', () => {
    const messageText = chatInput.value.trim();
    if (messageText === '') return;
    
    // 1. Verificar pontuação
    db.collection('players').doc(currentPlayer.id).get().then(doc => {
        const currentScore = doc.data().score;
        if (currentScore < 2) {
            alert('Você precisa de no mínimo 2 pontos para solicitar ajuda.');
            chatInput.value = '';
            return;
        }

        // 2. Deduzir pontos
        db.collection('players').doc(currentPlayer.id).update({
            score: fieldValue.increment(-2)
        }).then(() => {
            // 3. Enviar mensagem para a coleção 'chats'
            const messageData = {
                sender: currentPlayer.name,
                text: messageText,
                timestamp: new Date(),
                isPlayer: true
            };
            
            db.collection('chats').doc(currentPlayer.id).set({
                playerId: currentPlayer.id,
                playerName: currentPlayer.name,
                playerColor: currentPlayer.color,
                lastUpdate: new Date(),
                status: 'active',
                messages: fieldValue.arrayUnion(messageData)
            }, { merge: true }) // Usa merge para não apagar o campo 'messages' se já existir
            .then(() => {
                chatInput.value = '';
            });
        });
    });
});

// Ouvir Mensagens do Chat (Jogador)
function listenForChatMessages() {
    db.collection('chats').doc(currentPlayer.id)
        .onSnapshot((doc) => {
            if (doc.exists && doc.data().messages) {
                renderChatMessages(doc.data().messages, chatMessagesContainer);
            } else {
                chatMessagesContainer.innerHTML = '<p class="chat-placeholder">Inicie a conversa! Sua primeira mensagem custará 2 pontos.</p>';
            }
        });
}

// Renderizar Mensagens
function renderChatMessages(messages, container) {
    container.innerHTML = '';
    
    // As mensagens no arrayUnion não vêm ordenadas, então ordenamos no cliente
    messages.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate()); 

    messages.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-message');
        msgDiv.classList.add(msg.isPlayer ? 'player-message' : 'admin-message');
        
        const senderName = msg.isPlayer ? 'Você' : 'Admin';
        const senderColor = msg.isPlayer ? currentPlayer.color : '#303f9f';

        msgDiv.innerHTML = `
            <span style="color: ${senderColor}; font-weight: bold;">${senderName}:</span> ${msg.text}
        `;
        container.appendChild(msgDiv);
    });
    
    container.scrollTop = container.scrollHeight;
}

// 5d. Ouvir se o jogador foi Deletado
function listenForPlayerDeletion() {
     db.collection('players').doc(currentPlayer.id)
        .onSnapshot((doc) => {
            if (!doc.exists) {
                alert('Sua conta foi removida permanentemente pelo administrador.');
                passwordInput.value = '';
                showScreen('login-screen');
            }
        });
}

// --- LÓGICA DO ADMIN ---

function adminInit() {
    loadPlayersIntoAdminList();
    listenForGameStatusChanges();
    listenForActiveChats(); // Novo listener para o chat
}

function listenForGameStatusChanges() {
    db.collection('gameStatus').doc('main').onSnapshot(doc => {
        if (doc.exists) {
            const status = doc.data().status;
            if (status === 'started') {
                startGameButton.textContent = 'Jogo ATIVO';
                startGameButton.disabled = true;
            } else {
                startGameButton.textContent = '1. Iniciar o Jogo';
                startGameButton.disabled = false;
            }
        }
    });
}

// 1. Iniciar Jogo
startGameButton.addEventListener('click', () => {
    db.collection('gameStatus').doc('main').set({
        status: 'started',
        startTime: new Date()
    })
    .then(() => {
        alert('Jogo Iniciado!');
    });
});

// 2. Ver Placar
viewScoreboardButton.addEventListener('click', () => {
    loadScoreboard();
    showScreen('scoreboard-screen');
});

backToAdminButton.addEventListener('click', () => {
    showScreen('admin-panel-screen');
});

// Carregar placar com cores
async function loadScoreboard() {
    const top3List = document.getElementById('top-3-list');
    const fullBody = document.getElementById('full-scoreboard-body');

    top3List.innerHTML = '';
    fullBody.innerHTML = '';

    const snapshot = await db.collection('players').orderBy('score', 'desc').get();

    if (snapshot.empty) {
        fullBody.innerHTML = '<tr><td colspan="5">Nenhum jogador encontrado.</td></tr>';
        return;
    }

    let position = 1;
    snapshot.forEach(doc => {
        const player = doc.data();
        const color = player.color || '#3e2723';

        // Jogadores deletados não aparecem, pois a conta foi removida.
        // Se houver um campo 'banned', não o mostramos.
        if (player.status === 'banned') {
            return;
        }

        if (position <= 3) {
            const li = document.createElement('li');
            li.innerHTML = `<span style="color: ${color}; font-weight: bold;">${player.name}</span> - ${player.score} pontos`;
            top3List.appendChild(li);
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${position}</td>
            <td><strong style="color: ${color};">${player.name}</strong></td>
            <td><img src="${player.character}" alt="avatar" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;"></td>
            <td>${player.score}</td>
            <td>${player.status}</td>
        `;
        fullBody.appendChild(row);

        position++;
    });
}

// 3. Gerenciar Jogadores (Carregar lista)
function loadPlayersIntoAdminList() {
    db.collection('players').onSnapshot(snapshot => {
        const savedSelection = adminPlayerList.value; 
        adminPlayerList.innerHTML = '<option value="">Selecione um jogador</option>'; 
        
        snapshot.forEach(doc => {
            const player = doc.data();
            // Mostra apenas jogadores ativos
            if (player.status !== 'banned') { 
                const option = document.createElement('option');
                option.value = doc.id; 
                option.textContent = player.name;
                adminPlayerList.appendChild(option);
            }
        });
        
        if (Array.from(adminPlayerList.options).some(o => o.value === savedSelection)) {
             adminPlayerList.value = savedSelection;
        }
    });
}

// 3b. Botão DELETAR (Modificado para remover a conta)
adminBanButton.addEventListener('click', () => {
    const selectedPlayerId = adminPlayerList.value;
    if (!selectedPlayerId) {
        alert('Selecione um jogador para deletar.');
        return;
    }
    
    const selectedPlayerName = adminPlayerList.options[adminPlayerList.selectedIndex].text;
    
    if (confirm(`ATENÇÃO! Tem certeza que deseja DELETAR PERMANENTEMENTE a conta do jogador ${selectedPlayerName}? Esta ação é irreversível e o jogador será desconectado.`)) {
        
        // Comando principal: Deletar o documento do jogador
        db.collection('players').doc(selectedPlayerId).delete()
        .then(() => {
             // Opcional: deletar o chat também
            db.collection('chats').doc(selectedPlayerId).delete().catch(() => {});
            alert('Conta do jogador deletada com sucesso.');
        })
        .catch(error => {
            console.error("Erro ao deletar conta: ", error);
            alert("Erro ao deletar conta. Verifique o console.");
        });
    }
});


// 3c. Botão Punir
adminPunishButton.addEventListener('click', () => {
    const selectedPlayerId = adminPlayerList.value;
    if (!selectedPlayerId) {
        alert('Selecione um jogador para punir.');
        return;
    }
    
    db.collection('players').doc(selectedPlayerId).update({
        score: fieldValue.increment(-5)
    })
    .then(() => alert(`Jogador ${adminPlayerList.options[adminPlayerList.selectedIndex].text} punido (-5 pontos).`));
});


// ----------------------------------------------------
// --- LÓGICA DE CHAT DO ADMIN ---
// ----------------------------------------------------

// Ouvir Chats Ativos (Admin)
function listenForActiveChats() {
    db.collection('chats').where('status', '==', 'active').orderBy('lastUpdate', 'desc')
        .onSnapshot(snapshot => {
            adminActiveChatsList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const chat = doc.data();
                const color = chat.playerColor || '#3e2723';
                const li = document.createElement('li');
                li.innerHTML = `<strong style="color: ${color};">${chat.playerName}</strong>`;
                li.dataset.playerId = doc.id;
                li.classList.add('chat-entry');

                if (doc.id === adminCurrentChatId) {
                    li.classList.add('selected');
                }

                li.addEventListener('click', () => {
                    adminActiveChatsList.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
                    li.classList.add('selected');
                    adminCurrentChatId = doc.id;
                    adminChatMessagesContainer.innerHTML = '';
                    adminChatInput.disabled = false;
                    adminSendChatMessageButton.disabled = false;
                    listenForAdminChatMessages(adminCurrentChatId, chat.playerName);
                });

                adminActiveChatsList.appendChild(li);
            });

            // Se a lista ficar vazia, desativa o campo de input
            if(snapshot.empty) {
                adminChatInput.disabled = true;
                adminSendChatMessageButton.disabled = true;
                adminChatMessagesContainer.innerHTML = '<p class="chat-placeholder">Não há chats ativos no momento.</p>';
            }
        });
}

// Ouvir Mensagens do Chat Selecionado (Admin)
function listenForAdminChatMessages(chatId, playerName) {
    db.collection('chats').doc(chatId)
        .onSnapshot((doc) => {
            // Verifica se o chat ainda está ativo e se é o chat que o admin está visualizando
            if (doc.exists && doc.data().messages && adminCurrentChatId === chatId) {
                renderChatMessages(doc.data().messages, adminChatMessagesContainer);
                adminChatInput.placeholder = `Responder a ${playerName}...`;
            } else if (!doc.exists && adminCurrentChatId === chatId) {
                // Se o jogador sair e o chat for deletado (opcional)
                adminCurrentChatId = null;
                adminChatMessagesContainer.innerHTML = '<p class="chat-placeholder">O jogador saiu ou o chat foi encerrado.</p>';
                adminChatInput.disabled = true;
                adminSendChatMessageButton.disabled = true;
            }
        });
}

// Enviar Mensagem (Admin)
adminSendChatMessageButton.addEventListener('click', () => {
    const messageText = adminChatInput.value.trim();
    if (!adminCurrentChatId) {
        alert('Selecione um chat ativo.');
        return;
    }
    if (messageText === '') return;

    const messageData = {
        sender: 'Admin',
        text: messageText,
        timestamp: new Date(),
        isPlayer: false
    };

    db.collection('chats').doc(adminCurrentChatId).update({
        lastUpdate: new Date(),
        messages: fieldValue.arrayUnion(messageData)
    }).then(() => {
        adminChatInput.value = '';
    });
});


// --- INICIALIZAÇÃO ---
populateColorSwatches();
showScreen('login-screen');
