# Waifu RNG — Anime Gacha Simulator

Aplicação front-end completa em HTML5, CSS3 e JavaScript Vanilla ES6+.

## Arquivos

- `index.html` — estrutura da interface.
- `style.css` — tema dark/neon, responsividade, cards e animações.
- `script.js` — banco de dados, RNG ponderado, gemas, recompensa diária, coleção e `localStorage`.

## Como executar

Não é necessário Node.js ou build system.

1. Baixe os três arquivos.
2. Coloque-os na mesma pasta.
3. Abra `index.html` no navegador.

Para usar um servidor local opcional:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Regras do RNG

- Comum: 50%
- Rara: 30%
- Épica: 15%
- Lendária: 5%
- Cada roll: 10 gemas
- Saldo inicial: 100 gemas
- Recompensa diária: 50 gemas

O sorteio seleciona primeiro a raridade usando pesos cumulativos e depois escolhe uma personagem aleatória dentro da raridade.

## Persistência

O progresso é salvo em `localStorage` com a chave:

`waifuRngStateV1`

Para resetar a conta, abra o DevTools do navegador e execute:

```js
localStorage.removeItem("waifuRngStateV1");
location.reload();
```

## Imagens

O mock usa `placehold.co`, então as imagens são funcionais sem depender de arquivos locais. Elas podem ser substituídas posteriormente por artes próprias ou URLs de um CDN.

## Observação

Os nomes e obras utilizados são personagens/franquias conhecidas. Este projeto é um mock front-end para estudo/prototipagem; as imagens são placeholders e não representam artes oficiais.
