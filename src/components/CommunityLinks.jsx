// Liens officiels communiques par le proprietaire de MAF Game.
import '../styles/maf-community.css';

const WHATSAPP_GROUP = 'https://chat.whatsapp.com/CAYSmZysGI5LnQWeyPA3mo';
const WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029Vb9PE8w65yDCeiR79T1F';

const items = [
  {
    id: 'group', icon: '💬', eyebrow: 'LES DISCUSSIONS',
    title: 'Groupe WhatsApp',
    description: 'Rencontre les autres joueurs, discute des matchs et échange avec la communauté.',
    action: 'Rejoindre le groupe', href: WHATSAPP_GROUP,
  },
  {
    id: 'channel', icon: '📣', eyebrow: 'LES ANNONCES',
    title: 'Chaîne WhatsApp',
    description: 'Suis les annonces, les nouveautés et les informations partagées autour de MAF Game.',
    action: 'Suivre la chaîne', href: WHATSAPP_CHANNEL,
  },
];

export default function CommunityLinks() {
  return <div className="maf-community">
    <div className="maf-community__hero">
      <span className="maf-community__kicker">✦ RESTONS CONNECTÉS</span>
      <h3>Rejoins la communauté !</h3>
      <p>Joue, discute, partage et découvre les nouveautés. Choisis l'espace WhatsApp qui te correspond.</p>
    </div>
    <div className="maf-community__cards">
      {items.map(item => <article className={`maf-community__card maf-community__card--${item.id}`} key={item.id}>
        <div className="maf-community__icon" aria-hidden="true">{item.icon}</div>
        <div className="maf-community__copy">
          <span className="maf-community__eyebrow">{item.eyebrow}</span>
          <h4>{item.title}</h4>
          <p>{item.description}</p>
        </div>
        <a className="maf-community__link" href={item.href} target="_blank" rel="noopener noreferrer"
          aria-label={`${item.action} sur WhatsApp (nouvel onglet)`}>
          <span>{item.action}</span> <span aria-hidden="true">↗</span>
        </a>
      </article>)}
    </div>
    <p className="maf-community__note">Ces liens ouvrent WhatsApp. Tu restes libre de rejoindre le groupe et de suivre la chaîne.</p>
  </div>;
}
