function abrirlink() {
  const links = [
    'https://share.google/xVHj8czE9GIBSz17X',
    'https://novabrasilfm.com.br/jornalismo/noticias-jornalismo/hilda-hilst-conheca-as-6-maiores-obras-da-poeta',
    'https://www.revistaprosaversoearte.com/8-belissimos-poemas-de-hilda-hilst/#goog_rewarded'
  ];

  const indiceAleatorio = Math.floor(Math.random() * links.length);
  const linkSelecionado = links[indiceAleatorio];

  window.open(linkSelecionado, '_blank');
}
