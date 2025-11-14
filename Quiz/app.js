// --- CONFIGURAÇÃO DO FIREBASE ---
// COLE AQUI O OBJETO firebaseConfig QUE VOCÊ COPIOU DO SEU PROJETO
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
// MODIFICADO: Referências para o input de URL e preview
const playerAvatarUrlInput = document.getElementById('player-avatar-url');
const avatarPreview = document.getElementById('avatar-preview');
const quizForm = document.getElementById('quiz-form');
const captchaPlayerId = document.getElementById('captcha-player-id');
const submitCaptchaButton = document.getElementById('submit-captcha');
const requestHintButton = document.getElementById('request-hint');
const captchaButtons = document.querySelectorAll('.captcha-btn');

// Admin
const startGameButton = document.getElementById('start-game-button');
const viewScoreboardButton = document.getElementById('view-scoreboard-button');
const backToAdminButton = document.getElementById('back-to-admin');
const adminPlayerList = document.getElementById('admin-player-list');
const adminBanButton = document.getElementById('admin-ban-button');
const adminPunishButton = document.getElementById('admin-punish-button');
const adminHintRequestsList = document.getElementById('admin-hint-requests');
const adminHintPrompt = document.getElementById('admin-hint-prompt');
const adminSendHintButton = document.getElementById('admin-send-hint-button');

// --- ESTADO GLOBAL ---
let currentPlayer = {
    id: null,
    name: null,
    score: 0,
    avatar: null // Avatar URL
};
let adminCurrentHintTarget = { playerId: null, requestId: null };
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

// NOVO: Listener para a pré-visualização do avatar
playerAvatarUrlInput.addEventListener('input', () => {
    const url = playerAvatarUrlInput.value.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        avatarPreview.src = url;
    } else {
        avatarPreview.src = "https://via.placeholder.com/80/e0e0e0/000000?text=Avatar"; // Placeholder
    }
});

// 2. Entrar no Jogo (MODIFICADO)
joinGameButton.addEventListener('click', () => {
    const playerName = playerNameInput.value;
    // Alterado: Obtém o valor do input de URL
    const characterUrl = playerAvatarUrlInput.value.trim();

    if (playerName.trim() === '') {
        alert('Por favor, insira seu nome.');
        return;
    }
    
    // Validação simples de URL
    if (characterUrl === '' || (!characterUrl.startsWith('http://') && !characterUrl.startsWith('https://'))) {
        alert('Por favor, insira um link de imagem válido (começando com http:// ou https://).');
        return;
    }

    currentPlayer.id = playerName.toLowerCase().replace(/\s/g, '_') + "_" + Date.now(); // ID único
    currentPlayer.name = playerName;
    currentPlayer.avatar = characterUrl; // Salva a URL do avatar

    // Salva o jogador no Firestore
    db.collection('players').doc(currentPlayer.id).set({
        name: playerName,
        character: characterUrl, // Salva a URL do avatar
        score: 0,
        status: 'waiting'
    })
    .then(() => {
        showScreen('waiting-room-screen');
        listenForGameStart();
        listenForHints(); 
        listenForBan(); 
    })
    .catch(error => {
        console.error("Erro ao registrar jogador: ", error);
    });
});

// 3. Sala de Espera
function listenForGameStart() {
    db.collection('gameStatus').doc('main')
        .onSnapshot((doc) => {
            if (doc.exists && doc.data().status === 'started') {
                db.collection('players').doc(currentPlayer.id).get().then(playerDoc => {
                    if (playerDoc.exists && playerDoc.data().status !== 'banned') {
                        showScreen('game-screen');
                    } else if (!playerDoc.exists) {
                         alert('Seu perfil de jogador não foi encontrado ou foi removido.');
                         passwordInput.value = '';
                         showScreen('login-screen');
                    }
                });
            }
        });
}

// 4. Enviar Quiz
quizForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let score = 0;

    const q1Answer = quizForm.q1.value;
    if (q1Answer === 'a') {
        score += 10;
    }
    
    const q2Answer = document.getElementById('q2').value;
    const q3Answer = document.getElementById('q3').value;
    const q4Answer = document.getElementById('q4').value;

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

// 5. Lógica do CAPTCHA
captchaButtons.forEach(button => {
    button.addEventListener('click', () => {
        captchaButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        captchaQ3Answer = button.getAttribute('data-answer');
    });
});

submitCaptchaButton.addEventListener('click', () => {
    const q1 = document.getElementById('captcha-q1').value;
    const q2_1 = document.getElementById('captcha-q2-1').value;
    const q2_2 = document.getElementById('captcha-q2-2').value;
    
    const q1_pass = (q1 === '1930');
    
    const validQ2Options = ['poesia', 'prosa', 'teatro'];
    const q2_pass = validQ2Options.includes(q2_1) && 
                    validQ2Options.includes(q2_2) && 
                    q2_1 !== q2_2;
    
    const q3_pass = (captchaQ3Answer === 'Casa do Sol');

    if (q1_pass && q2_pass && q3_pass) {
        currentPlayer.score += 5; // Bônus

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

// 5b. Pedir Dica
requestHintButton.addEventListener('click', () => {
    currentPlayer.score -= 2; 
    db.collection('players').doc(currentPlayer.id).update({ 
        score: fieldValue.increment(-2)
    });

    db.collection('hintRequests').add({
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        timestamp: new Date(),
        status: 'pending'
    });
    alert('Pedido de dica enviado ao Admin. Você perdeu 2 pontos.');
});

// 5c. Ouvir Dicas do Admin
function listenForHints() {
    db.collection('hints').where('toPlayerId', '==', currentPlayer.id)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const hint = change.doc.data();
                    alert(`DICA DO ADMIN: \n"${hint.text}"`);
                    db.collection('hints').doc(change.doc.id).delete();
                }
            });
        });
}

// 5d. Ouvir se foi Banido
function listenForBan() {
     db.collection('players').doc(currentPlayer.id)
        .onSnapshot((doc) => {
            if (doc.exists && doc.data().status === 'banned') {
                alert('Você foi banido pelo administrador.');
                passwordInput.value = '';
                showScreen('login-screen'); 
            }
        });
}

// --- LÓGICA DO ADMIN ---

function adminInit() {
    loadPlayersIntoAdminList();
    listenForHintRequests();
    listenForGameStatusChanges();
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

        if (position <= 3) {
            const li = document.createElement('li');
            li.textContent = `${player.name} - ${player.score} pontos`;
            top3List.appendChild(li);
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${position}</td>
            <td>${player.name}</td>
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
            if (player.status !== 'banned') { 
                const option = document.createElement('option');
                option.value = doc.id; 
                option.textContent = player.name;
                adminPlayerList.appendChild(option);
            }
        });
        
        adminPlayerList.value = savedSelection;
    });
}

// 3b. Botão Banir
adminBanButton.addEventListener('click', () => {
    const selectedPlayerId = adminPlayerList.value;
    if (!selectedPlayerId) {
        alert('Selecione um jogador para banir.');
        return;
    }
    
    if (confirm(`Tem certeza que deseja banir o jogador ${adminPlayerList.options[adminPlayerList.selectedIndex].text}?`)) {
        db.collection('players').doc(selectedPlayerId).update({
            status: 'banned',
            score: 0 
        })
        .then(() => alert('Jogador banido.'));
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


// 4. Auxiliar Jogadores (Ouvir Pedidos)
function listenForHintRequests() {
    db.collection('hintRequests').where('status', '==', 'pending').orderBy('timestamp')
        .onSnapshot(snapshot => {
        
        adminHintRequestsList.innerHTML = ''; 
        
        snapshot.forEach(doc => {
            const request = doc.data();
            const li = document.createElement('li');
            li.textContent = `Pedido de: ${request.playerName}`;
            li.dataset.playerId = request.playerId; 
            li.dataset.requestId = doc.id; 

            li.addEventListener('click', () => {
                adminHintRequestsList.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
                li.classList.add('selected');
                
                adminCurrentHintTarget = {
                    playerId: li.dataset.playerId,
                    requestId: li.dataset.requestId,
                    playerName: request.playerName
                };
                adminHintPrompt.placeholder = `Digite a dica para ${request.playerName}...`
                adminHintPrompt.focus();
            });
            
            adminHintRequestsList.appendChild(li);
        });
    });
}

// 4b. Enviar Dica
adminSendHintButton.addEventListener('click', () => {
    const hintText = adminHintPrompt.value;
    if (!adminCurrentHintTarget.playerId) {
        alert('Selecione um pedido de dica na lista acima.');
        return;
    }
    if (hintText.trim() === '') {
        alert('Escreva uma dica.');
        return;
    }

    db.collection('hints').add({
        toPlayerId: adminCurrentHintTarget.playerId,
        text: hintText,
        timestamp: new Date()
    })
    .then(() => {
        db.collection('hintRequests').doc(adminCurrentHintTarget.requestId).update({
            status: 'completed',
            adminResponse: hintText
        });
        
        adminHintPrompt.value = '';
        adminHintPrompt.placeholder = 'Digite a dica para o jogador selecionado...';
        adminCurrentHintTarget = { playerId: null, requestId: null, playerName: null };
        
        alert('Dica enviada!');
    });
});


// --- INICIALIZAÇÃO ---
showScreen('login-screen'); // Mostra a tela de login ao carregar
