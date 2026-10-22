// MAF GUIDE STAGE 2 : guide complet. Illustrations de demonstration, aucune action financiere ou de jeu.
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/maf-guide.css';
import '../styles/maf-guide-cards.css';

const SECTIONS = [
  {
    id: 'essentiels', label: 'Essentiels', glyph: '✦', description: 'Les petits détails qui rendent ton expérience plus fluide.',
    cards: [
      { id: 'refresh', icon: '↻', title: 'Ta boule alliée', tagline: 'Elle voyage partout avec toi.', art: 'orb', body: 'Cette boule flottante t’accompagne dans l’application. Un appui lance une actualisation des données : dépôt, retrait, salons ou partie. Tu peux aussi la déplacer où tu veux avec le doigt.', note: 'Dans ce guide, la boule est une reproduction visuelle : elle ne déclenche aucune action.' },
      { id: 'signal', icon: '▂', title: 'Les barres de connexion', tagline: 'Un indice avant chaque duel.', art: 'signal', body: 'Regarde les petites barres sous ton pseudo : une barre rouge indique une connexion instable, deux barres jaunes appellent à la prudence et trois ou quatre barres vertes indiquent une meilleure connexion.', note: 'Ces barres sont une estimation, pas une garantie de stabilité.' },
      { id: 'profil', icon: '◈', title: 'Ton pseudo, ton identité', tagline: 'C’est ton nom dans l’arène.', art: 'pseudo', body: 'Le pseudo affiché dans ton profil sert à te reconnaître dans les salons et les matchs. Sur le profil, les pseudos trop longs peuvent être raccourcis visuellement.' },
      { id: 'more', icon: '•••', title: 'Le menu More', tagline: 'Des outils, sans encombrer le Profil.', art: 'more', body: 'More ouvre le second menu du Profil. Il contient le Guide, le Studio 3D et la Déconnexion. Une flèche Retour te ramène aux boutons principaux.' },
    ],
  },
  {
    id: 'portefeuille', label: 'Portefeuille', glyph: '◉', description: 'Comprendre ses crédits et chaque opération.',
    cards: [
      { id: 'solde', icon: '◉', title: 'Solde et bonus', tagline: 'Deux compteurs, deux indications.', art: 'balance', body: 'Le solde en F CFA montre ton argent principal. Le bonus en V est un crédit distinct, soumis aux règles de l’application. Vérifie toujours les informations affichées avant une opération.', note: 'Les chiffres de la miniature sont uniquement des exemples.' },
      { id: 'depot', icon: '+', title: 'Recharger ton compte', tagline: 'Suis le montant, puis sa validation.', art: 'deposit', body: 'Entre ton numéro et le montant souhaité, vérifie le total à payer, effectue le paiement puis suis la validation dans l’application. Pour 100 F de crédit, avec 1 % de frais, le total à payer est 101 F.', note: 'La validation du dépôt dépend du traitement de la demande, pas du bouton de rafraîchissement.' },
      { id: 'retrait', icon: '↗', title: 'Faire un retrait', tagline: 'Regarde bien le montant débité.', art: 'withdraw', body: 'Choisis le montant à recevoir et consulte le détail des prélèvements avant de confirmer. Avec la configuration actuelle : 18 % de commission propriétaire et 1 % de frais de service. Pour recevoir 100 F, le total débité est 119 F.', note: 'Le retrait reste soumis à validation. Consulte toujours les montants effectivement indiqués par le formulaire.' },
      { id: 'historique', icon: '≋', title: 'Suivre tes opérations', tagline: 'Ton journal de bord.', art: 'history', body: 'L’Historique permet de revoir les opérations enregistrées sur ton compte : recharges, retraits et mouvements associés. C’est le premier endroit à consulter lorsqu’une opération te semble en attente.' },
      { id: 'commissions', icon: '◆', title: 'Mes commissions', tagline: 'Réservé au compte propriétaire.', art: 'owner', body: 'Le compte propriétaire « 999 » possède un accès à ses commissions. Lorsque le retrait d’un joueur est validé, la commission propriétaire de 18 % est enregistrée au bonus du propriétaire. Le tableau indique les gains journaliers et cumulés.', note: 'Ce bouton n’est pas visible sur les comptes joueurs ordinaires.' },
    ],
  },
  {
    id: 'duels', label: 'Duels', glyph: '⚔', description: 'Défier un adversaire sans se perdre dans les menus.',
    cards: [
      { id: 'salon', icon: '#', title: 'Les salons de jeu', tagline: 'Ton rendez-vous avec l’adversaire.', art: 'room', body: 'Crée un salon, rejoins un salon ouvert ou retrouve une partie grâce à son code à quatre chiffres. Un salon de duel contient deux joueurs et permet de préparer le match.' },
      { id: 'mises', icon: '◇', title: 'Les mises', tagline: 'Choisis avant de jouer.', art: 'stake', body: 'Avant certains duels, chaque joueur engage une mise. Les mises sont retenues selon les règles du salon, puis le serveur détermine le règlement : cagnotte au gagnant ou remboursement si le résultat est nul.', note: 'Une mise implique un risque de perte. Les règles affichées au lancement font foi.' },
      { id: 'retour', icon: '⏳', title: '80 secondes pour revenir', tagline: 'Ne laisse pas le chrono décider.', art: 'timer', body: 'Si tu quittes une partie en cours, une alerte t’indique le temps restant pour revenir. Tu disposes de 80 secondes ; si le délai expire, tu peux perdre le duel par forfait. Revenir ne relance pas le compte à rebours.' },
      { id: 'nul', icon: '🤝', title: 'Proposer un match nul', tagline: 'À deux, rien ne se décide seul.', art: 'draw', body: 'Dans les jeux qui le prévoient, tu peux proposer un nul. Confirme d’abord ta demande. Tant qu’elle n’a pas été acceptée, tu peux l’annuler. L’autre joueur peut accepter ou refuser.' },
      { id: 'reactions', icon: '😂', title: 'Réagis sans parler', tagline: 'Le petit langage des duels.', art: 'reactions', body: 'Selon le jeu, tu peux envoyer un rire 😂, un sourire sournois 😏 ou des applaudissements 👏. L’émoji apparaît en animation au centre puis disparaît, sans modifier le résultat.' },
    ],
  },
  {
    id: 'jeux', label: 'Les jeux', glyph: '🎮', description: 'Trois univers, trois façons de prendre l’avantage.',
    cards: [
      { id: 'foot', icon: '⚽', title: 'Tir au but', tagline: 'Une décision peut changer le score.', art: 'foot', body: 'Affronte ton adversaire dans une séance de tirs au but. Choisis la direction de ton tir ou de ton arrêt selon ton rôle. Les joueurs alternent les actions, et le score final décide du vainqueur.' },
      { id: 'dames', icon: '♛', title: 'Le jeu de dames', tagline: 'Anticipe les coups, contrôle le plateau.', art: 'checkers', body: 'Les dames internationales utilisent un plateau de 10 × 10. Les prises sont obligatoires ; il faut privilégier la séquence qui capture le plus de pièces. Avance jusqu’au bout pour obtenir une dame. Le dernier déplacement est mis en évidence.' },
      { id: 'tank', icon: '🚀', title: 'Tank Battle', tagline: 'Vise, tire et transforme le terrain.', art: 'tank', body: 'Deux chars se font face sur des collines destructibles. Gère ton carburant pour te déplacer, oriente le canon, choisis un missile et tire. Chaque arme a sa trajectoire et ses dégâts ; les explosions creusent le sol.', note: 'Selon le déploiement, ce jeu peut encore évoluer et être en phase de test.' },
    ],
  },
  {
    id: 'outils', label: 'Autres outils', glyph: '✧', description: 'Les fonctions utiles qui complètent ton profil.',
    cards: [
      { id: 'chat', icon: '💬', title: 'Le Chat', tagline: 'Un message, et tu restes connecté au groupe.', art: 'chat', body: 'Utilise le Chat pour échanger avec les autres. Un appui court affiche les bulles ; un appui long peut ouvrir le chat en plein écran.' },
      { id: 'studio', icon: '◈', title: 'Studio 3D', tagline: 'Ton espace pour découvrir les personnages.', art: 'studio', body: 'Accessible depuis More, Studio 3D permet de découvrir l’univers visuel des personnages. La personnalisation du Profil permet aussi de choisir une apparence disponible.' },
      { id: 'coupons', icon: '🎟', title: 'Coupons', tagline: 'Le bon code au bon endroit.', art: 'coupon', body: 'L’espace Coupons sert aux codes prévus par l’application. Les opérations spéciales restent soumises aux règles du système ; ne communique jamais ton code de connexion personnel.' },
    ],
  },
];

function GuideOrbPreview() {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const maskId = `${raw}-guide-mask`;
  const gradientId = `${raw}-guide-gradient`;
  return <div className="maf-guide-orb-demo" aria-hidden="true">
    <span className="maf-guide-orb-demo__ball">
      <svg viewBox="0 0 100 100" width="76" height="76">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="30%" stopColor="var(--accent-2,#55d7ff)" />
            <stop offset="70%" stopColor="var(--accent,#168bda)" />
          </linearGradient>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100" style={{ maskType: 'luminance' }}>
            <g className="maf-guide-orb-demo__mask">
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              <polygon points="25,25 75,25 50,75" fill="white" />
              <polygon points="50,25 75,75 25,75" fill="white" />
              {[0,1,2,3].map(i => <polygon key={i} points="35,35 65,35 50,65" fill="white" />)}
            </g>
          </mask>
        </defs>
        <circle cx="50" cy="50" r="48" className="maf-guide-orb-demo__rim" />
        <rect width="100" height="100" fill={`url(#${gradientId})`} mask={`url(#${maskId})`} />
      </svg>
    </span>
    <span className="maf-guide-orb-demo__caption">Illustration · non cliquable</span>
  </div>;
}

function GuideIllustration({ kind }) {
  if (kind === 'orb') return <GuideOrbPreview />;
  if (kind === 'signal') return <div className="maf-guide-demo-signal" aria-hidden="true">
    {[1,2,3,4].map(n => <span key={n} className="maf-guide-signal-group"><span className={`maf-guide-signal-bars level-${n}`}>{[1,2,3,4].map(i => <i key={i} style={{height:`${8+i*6}px`}} />)}</span><small>{n === 1 ? 'Faible' : n === 2 ? 'Moyen' : 'Bon'}</small></span>)}
  </div>;
  if (kind === 'pseudo') return <div className="maf-guide-demo-pseudo"><span>JOUEUR99</span><span className="maf-guide-signal-bars level-4" aria-hidden="true">{[1,2,3,4].map(i => <i key={i} style={{height:`${8+i*6}px`}} />)}</span></div>;
  if (kind === 'more') return <div className="maf-guide-demo-more"><span>← Retour</span><span>❔ Guide</span><span>◈ Studio 3D</span><span>⇥ Déconnexion</span></div>;
  if (kind === 'balance') return <div className="maf-guide-demo-balance"><div><small>SOLDE</small><strong>1 250 F</strong></div><div><small>BONUS</small><strong>50 V</strong></div><em>EXEMPLE</em></div>;
  if (kind === 'deposit') return <div className="maf-guide-demo-money"><span>Montant crédité <b>100 F</b></span><span>Frais 1 % <b>+1 F</b></span><strong>Total à payer : 101 F</strong></div>;
  if (kind === 'withdraw') return <div className="maf-guide-demo-money"><span>Montant reçu <b>100 F</b></span><span>Commission 18 % <b>18 F</b></span><span>Frais 1 % <b>1 F</b></span><strong>Débité : 119 F</strong></div>;
  if (kind === 'history') return <div className="maf-guide-demo-history"><span>↓ Dépôt <b>Validé</b></span><span>↑ Retrait <b>En attente</b></span></div>;
  if (kind === 'owner') return <div className="maf-guide-demo-owner"><span>◈ MES COMMISSIONS</span><strong>+18 V</strong><small>Exemple de commission</small></div>;
  if (kind === 'room') return <div className="maf-guide-demo-room"><span>SALON #</span><strong>4 2 8 1</strong><small>2 joueurs · 1 duel</small></div>;
  if (kind === 'stake') return <div className="maf-guide-demo-stake"><span>JOUEUR 1 <b>500 F</b></span><b>VS</b><span>JOUEUR 2 <b>500 F</b></span></div>;
  if (kind === 'timer') return <div className="maf-guide-demo-timer"><span>REVIENS VITE</span><strong>80</strong><span>SECONDES</span></div>;
  if (kind === 'draw') return <div className="maf-guide-demo-draw"><span>🤝 Proposition de nul</span><strong>Accepter</strong><strong>Refuser</strong></div>;
  if (kind === 'reactions') return <div className="maf-guide-demo-reactions" aria-label="Émojis de réaction">😂 <span>😏</span> 👏</div>;
  if (kind === 'foot') return <div className="maf-guide-demo-game">⚽<span>🥅</span><small>VISER · TIRER · MARQUER</small></div>;
  if (kind === 'checkers') return <div className="maf-guide-demo-checkers" aria-label="Mini plateau de dames">{Array.from({length:32},(_,i)=><span key={i} className={(Math.floor(i/8)+i%8)%2 ? 'dark' : 'light'}>{[9,17].includes(i) ? '●' : [21].includes(i) ? '♛' : ''}</span>)}</div>;
  if (kind === 'tank') return <div className="maf-guide-demo-tank"><span>🚜</span><span>💥</span><span>🚜</span><div className="maf-guide-tank-hill" /></div>;
  if (kind === 'chat') return <div className="maf-guide-demo-chat"><span>Salut ! 👋</span><span>Prêt pour le duel ?</span></div>;
  if (kind === 'studio') return <div className="maf-guide-demo-icon">◈<small>STUDIO 3D</small></div>;
  return <div className="maf-guide-demo-icon">🎟<small>CODE COUPON</small></div>;
}

function GuideCard({ card, index }) {
  return <article className="maf-guide-card" id={`maf-guide-${card.id}`}>
    <div className="maf-guide-card__top"><span className="maf-guide-card__index">{String(index+1).padStart(2,'0')}</span><span className="maf-guide-card__icon" aria-hidden="true">{card.icon}</span></div>
    <div className="maf-guide-card__visual"><GuideIllustration kind={card.art} /></div>
    <h4>{card.title}</h4>
    <strong className="maf-guide-card__tagline">{card.tagline}</strong>
    <p>{card.body}</p>
    {card.note && <p className="maf-guide-card__note">✦ {card.note}</p>}
  </article>;
}

export default function GuidePage({ onClose }) {
  const backRef = useRef(null);
  const scrollRef = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    backRef.current?.focus();
    const escape = event => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('keydown', escape); before?.focus?.(); };
  }, [onClose]);
  const jumpTo = id => {
    const target = scrollRef.current?.querySelector(`#maf-guide-section-${id}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return createPortal(
    <div className="maf-guide-overlay" role="dialog" aria-modal="true" aria-label="Guide MAF Game">
      <button className="maf-guide-backdrop" type="button" aria-label="Fermer le guide" onClick={onClose} />
      <section className="maf-guide-shell">
        <header className="maf-guide-header">
          <button ref={backRef} type="button" className="maf-guide-back" onClick={onClose} aria-label="Retour a More">← Retour</button>
          <span className="maf-guide-header__tag">CENTRE D'AIDE</span>
          <span aria-hidden="true">✦</span>
        </header>
        <div ref={scrollRef} className="maf-guide-scroll">
          <div className="maf-guide-hero">
            <span className="maf-guide-kicker">TON COMPAGNON DE JEU</span>
            <h2>LE GUIDE <em>MAF GAME</em></h2>
            <p>Les petits secrets du jeu, expliqués simplement pour que tu profites de chaque partie.</p>
            <span className="maf-guide-pill">✦ Découvre, comprends, joue.</span>
          </div>
          <nav className="maf-guide-nav" aria-label="Thèmes du guide">
            {SECTIONS.map(section => <button key={section.id} type="button" onClick={() => jumpTo(section.id)}>{section.glyph} {section.label}</button>)}
          </nav>
          {SECTIONS.map(section => <section id={`maf-guide-section-${section.id}`} key={section.id} className="maf-guide-topic">
            <header className="maf-guide-topic__head"><span aria-hidden="true">{section.glyph}</span><div><h3>{section.label}</h3><p>{section.description}</p></div></header>
            <div className="maf-guide-cards">{section.cards.map((card,index) => <GuideCard card={card} key={card.id} index={index} />)}</div>
          </section>)}
          <div className="maf-guide-end"><span>✦</span><strong>Te voilà prêt pour l'arène.</strong><p>Reviens ici quand tu veux : ce guide pourra grandir avec MAF Game.</p><button type="button" onClick={onClose}>← Retour à More</button></div>
        </div>
      </section>
    </div>, document.body
  );
}
