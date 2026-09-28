# Folhas compartilhadas do protótipo — como não duplicar o mesmo bug duas vezes

Há **duas famílias de base CSS independentes**, cada uma extraída separadamente do `<style>` inline que suas telas tinham antes de 26/09 (ver comentário no topo de cada arquivo):

| Arquivo | Superfície | Telas |
|---|---|---|
| `app.css` | Aprendiz, Onboarding, Grupo (visão do aluno), estados | `docs/prototype/learner/`, `onboarding/`, `leader/`, `shared/states.html` |
| `site.css` + `public.css` | Site público (marketing, legal, Contato, Ajuda) | `docs/prototype/public/` |
| `admin.css` (em `docs/prototype/admin/`) | Admin | `docs/prototype/admin/` |

**Elas não são a mesma folha e não são sincronizadas automaticamente.** Os tokens de design (`DESIGN.md`) são idênticos nas três, mas cada arquivo tem sua própria cópia de cada regra — inclusive para primitivos comuns como `.field`/`.input`/`.btn`. Editar uma não propaga para a outra.

## O bug que isso já causou (2026-09-28)

`app.css` tinha `.input select{appearance:none;-webkit-appearance:none;font-weight:700;cursor:pointer}` desde a extração de 26/09 (usado pelos filtros do Admin via `.sel`, mas a regra vive em `.input`). `site.css` nunca ganhou essa regra porque nenhuma tela pública tinha usado `<select>` dentro de `.field .input` antes de `contato.html`. Resultado: o select da tela de Contato renderizava com a seta nativa do navegador **e** o chevron customizado ao mesmo tempo — dois indicadores, fora do padrão visual do resto do formulário.

**Isso resolveu só o estado fechado.** O founder reportou de novo que o dropselect "continua sem nosso estilo aplicado" mesmo depois do `appearance:none`. Causa raiz de verdade: **nenhum navegador permite estilizar a lista de opções aberta de um `<select>` nativo com CSS puro** — é chrome do sistema operacional, não da página. `appearance:none` remove a seta e o fundo do estado fechado (isso sim funciona e vale a pena manter), mas o popup que abre ao clicar continua 100% fora do nosso controle, em qualquer navegador.

**A correção definitiva foi trocar `<select>` por um listbox customizado** (`docs/prototype/public/contato.html`, classes `.csel`/`.csel-trigger`/`.csel-panel`/`.csel-opt`, JS `toggleCsel`/`closeAllCsels`/`selectCsel`): um `<button>` que abre um painel próprio (`role="listbox"`, opções `role="option"` com `aria-selected`, item atual em negrito com `✓`), com Escape, clique fora e setas ↑↓ para navegar. Não é invenção nova: é o mesmo padrão já usado e testado no Admin para menus de ação por linha (`admin.css` `.row-menu`/`.row-menu-wrap`, funções `toggleRowMenu`/`closeAllRowMenus` em `assets-pending.html`/`assets-candidates.html`) — só adaptado de `role="menu"` (ações) para `role="listbox"` (seleção única).

**Regra prática**: `<select>` nativo é aceitável só quando o estado aberto não precisa do nosso estilo (ex.: filtro secundário de tabela no Admin, onde ninguém repara). Qualquer campo de formulário primário e visível (como "Assunto" num formulário de Contato) precisa do padrão `.csel`, não de `<select>` + CSS. Copiar `appearance:none` de outra folha resolve o sintoma do estado fechado, não o problema.

## Regra prática antes de usar um controle de formulário pela primeira vez numa superfície

Antes de usar `<select>`, `<textarea>`, `radio`, `checkbox` ou qualquer padrão de `.field`/`.input` que a tela nova é a **primeira** a usar naquela superfície:

1. `grep` o mesmo seletor (`.input select`, `.input textarea`, etc.) nas **outras duas** folhas base. Se existir lá e não na sua, **copie a regra**, não invente uma nova.
2. Rode `impeccable detect --json` na tela nova antes de considerar pronta. Achados como `cramped-padding` em cima de um `<select>`/`<textarea>` dentro de `.input` geralmente significam que falta um variant (`.input.area`, `.input.select`) que talvez só exista, até agora, na outra superfície.
3. Se a tela nova introduz uma combinação genuinamente nova (nenhuma superfície tinha), adicione o variant CSS nas **duas** folhas base (site.css e app.css) na mesma passada — mesmo que a outra superfície não use ainda —, para a próxima tela que precisar não repetir a mesma investigação. Foi o que aconteceu aqui: `.input.select{padding:6px 14px}` (correção do `cramped-padding` num `<select>` dentro de `.input`, que nenhuma tela de nenhuma superfície tinha combinado antes) entrou nas duas folhas de uma vez.

## Variants já existentes em `.input` (checar antes de reescrever inline)

- `.input.area` — para `<textarea>` (padding maior, `align-items:flex-start`, `textarea{resize:vertical}` embutido).
- `.input.select` — para `<select>` (padding vertical extra; sem isso o detector acusa `cramped-padding`).
- `.input.sm` — variante compacta (só em `site.css`; filtros densos).

Nunca resolva um achado do detector com `style=""` inline na tela quando o problema é estrutural do componente — o inline esconde o sintoma numa tela e deixa a próxima tela cair na mesma armadilha. Corrija a regra na folha base.
