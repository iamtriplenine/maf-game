import { useCallback, useEffect, useState } from "react";
import ProfileStage from "../components/ProfileStage";
import ProfileIdentity from "../components/ProfileIdentity";
import Sheet from "../components/Sheet";
import AccountHistory from "../components/AccountHistory";
import WithdrawalForm from "../components/WithdrawalForm";
import { IconWithdraw, IconHistory } from "../components/Icons";
import { IconChat, IconCube, IconLogin, IconLogout, IconPalette, IconPlus, IconUserPlus } from "../components/Icons";
import ChatFeed from "../components/ChatFeed";
import ChatComposer from "../components/ChatComposer";
import ChatScreen from "../components/ChatScreen";
import { useLongPress } from "../chat/useLongPress";
import { useChat } from "../chat/useChat";
import { useSession } from "../auth/useSession";
import AuthForm from "../components/AuthForm";
import AdminPanel from "../components/AdminPanel";
import OwnerCommissionSummary from "../components/OwnerCommissionSummary";
import { wakeServer, saveSkin } from "../api/accounts";
import { DEFAULT_SKIN, SKINS, validSkin } from "../characters/skins";
import { clearAdminAccess } from "../api/accounts";
import { WalletBalances, CouponForm, RechargeForm } from "../components/WalletForms";
import { IconVoucher } from "../components/Icons";
import "../styles/profile.css";
import "../styles/profile-identity.css";
import "../styles/chat.css";

const CHAT_KEY = "maf-chat-on";
const GUEST_SKIN_KEY = "maf-guest-skin";
const readGuestSkin = () => {
  try { return validSkin(localStorage.getItem(GUEST_SKIN_KEY)); }
  catch { return DEFAULT_SKIN; }
};
const readChatPref = () => {
  try {
    return localStorage.getItem(CHAT_KEY) === "1";
  } catch {
    return false;
  }
};

// Nom affiche sur la page (une ligne par element)
const APP_NAME = ["VIVA", "CENTER"];

export default function ProfilePage({ onOpenStudio }) {
  const { session, login, register, logout, updateUser } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // login | signup | account | recharge
  const [chatOn, setChatOn] = useState(readChatPref);
  const [chatFull, setChatFull] = useState(false); // chat global en plein ecran
  const [guestSkin, setGuestSkin] = useState(readGuestSkin);
  const [pendingSkin, setPendingSkin] = useState(null);
  const [skinSaving, setSkinSaving] = useState(false);
  const [skinError, setSkinError] = useState("");
  const selectedSkin = pendingSkin || (session ? validSkin(session.skin_id) : guestSkin);
  const changeSkin = async (id) => {
    if (skinSaving || selectedSkin === id) return;
    setSkinError("");
    if (!session) {
      setGuestSkin(id);
      try { localStorage.setItem(GUEST_SKIN_KEY, id); } catch { /* facultatif */ }
      return;
    }
    setPendingSkin(id);
    setSkinSaving(true);
    try {
      const user = await saveSkin(id);
      updateUser(user);
      setPendingSkin(null);
    } catch (error) {
      setPendingSkin(null);
      setSkinError(error.message || "Enregistrement impossible. Reessaie.");
    } finally {
      setSkinSaving(false);
    }
  };
  const chat = useChat(chatOn || chatFull);
  const toggleChat = () => {
    setChatOn((on) => {
      try {
        localStorage.setItem(CHAT_KEY, on ? "0" : "1");
      } catch {
        /* stockage facultatif */
      }
      return !on;
    });
  };
  const close = useCallback(() => {
    if (sheet === "admin") clearAdminAccess();
    setSheet(null);
  }, [sheet]);
  // Appui long sur Chat : on ferme tout et on ouvre le chat global en plein ecran
  const chatButton = useLongPress({
    onClick: toggleChat,
    onLong: () => {
      close();
      setChatFull(true);
    },
  });
  const closeChatFull = useCallback(() => setChatFull(false), []);
  useEffect(() => {
    wakeServer();
  }, []);
  useEffect(() => {
    setPendingSkin(null);
    setSkinError("");
    setMoreOpen(false);
  }, [session?.id]);


  return (
    <>
      <main className="profile">
        <div className="profile__bar">
          <WalletBalances user={session} />
          <ProfileIdentity pseudo={session?.pseudo} />
        </div>

        <section className="profile__stage" aria-label="Personnage">
          <ProfileStage skinId={selectedSkin} />
          <h1 className="profile__title title-tech">
            {APP_NAME[0]}
            <span>{APP_NAME[1]}</span>
          </h1>
        </section>

        {chatOn && !chatFull && (
          <>
            <ChatFeed messages={chat.messages} myId={session?.id} />
            <ChatComposer session={session} onSend={chat.send} onNeedLogin={() => setSheet("login")} />
          </>
        )}

        <div className="profile__actions">
          {session ? (
            <>
              <button
                type="button"
                className="btn btn--glass profile__btn"
                onClick={() => setSheet("coupons")}
              >
                <IconVoucher />
                Coupons
              </button>
              <button
                type="button"
                className="btn btn--primary profile__btn"
                onClick={() => setSheet("recharge")}
              >
                <IconPlus />
                Recharger
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--glass profile__btn"
                onClick={() => setSheet("login")}
              >
                <IconLogin />
                Login
              </button>
              <button
                type="button"
                className="btn btn--primary profile__btn"
                onClick={() => setSheet("signup")}
              >
                <IconUserPlus />
                Sign Up
              </button>
            </>
          )}
        </div>

        <section className="profile__panel" aria-label="Menu">
          {!session && (
            <p className="profile__hint">
              Connecte-toi avec ton pseudo et ton code pour retrouver ton compte.
            </p>
          )}
          {moreOpen ? (
            <div key="more" className="menu-grid menu-grid--more" aria-label="Options supplémentaires">
              <button type="button" className="menu-btn menu-btn--back" onClick={() => setMoreOpen(false)}>
                <span className="menu-btn__symbol" aria-hidden="true">←</span>
                <span>Retour</span>
              </button>
              <button type="button" className="menu-btn" onClick={() => { setMoreOpen(false); onOpenStudio?.(); }}>
                <IconCube />
                <span>Studio 3D</span>
              </button>
              {session && (
                <button type="button" className="menu-btn menu-btn--danger" onClick={() => setSheet("logout")}>
                  <IconLogout />
                  <span>Déconnexion</span>
                </button>
              )}
            </div>
          ) : (
            <div key="main" className="menu-grid menu-grid--main" aria-label="Menu principal">
              <button
                type="button"
                className={`menu-btn${chatOn ? " is-on" : ""}${chatButton.pressing ? " is-pressing" : ""}`}
                aria-pressed={chatOn}
                title="Appui court : afficher les bulles. Appui long : ouvrir le chat"
                {...chatButton.handlers}
              >
                <IconChat />
                <span>Chat</span>
              </button>
              <button
                type="button"
                className="menu-btn"
                onClick={() => { setSkinError(""); setSheet("personalize"); }}
              >
                <IconPalette />
                <span>Personnalisation</span>
              </button>
              <button type="button" className="menu-btn" onClick={() => setSheet(session ? "withdrawal" : "login")}>
                <IconWithdraw />
                <span>Retrait</span>
              </button>
              <button type="button" className="menu-btn" onClick={() => setSheet(session ? "history" : "login")}>
                <IconHistory />
                <span>Historique</span>
              </button>
              {session?.pseudo === '999' && (
                <button type="button" className="menu-btn" onClick={() => setSheet('owner-commissions')}>
                  <span aria-hidden="true" style={{fontSize:22}}>◈</span>
                  <span>Mes commissions</span>
                </button>
              )}
              <button type="button" className="menu-btn menu-btn--more" onClick={() => setMoreOpen(true)} aria-label="Plus d'options">
                <span className="menu-btn__symbol" aria-hidden="true">•••</span>
                <span>More</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {chatFull && (
        <ChatScreen
          messages={chat.messages}
          myId={session?.id}
          session={session}
          onSend={chat.send}
          onNeedLogin={() => {
            setChatFull(false);
            setSheet("login");
          }}
          onClose={closeChatFull}
        />
      )}

      <Sheet open={sheet === "personalize"} title="Personnalisation" onClose={close}>
        <div className="skins-head">
          <p className="sheet__text">Skins : choisis le personnage qui apparait sur ton profil.</p>
          <span className="skins-free">GRATUIT POUR LE MOMENT</span>
        </div>
        <div className="skins-grid" aria-label="Choisir un skin">
          {SKINS.map((skin) => (
            <button
              key={skin.id}
              type="button"
              className={`skin-choice${selectedSkin === skin.id ? " is-selected" : ""}`}
              aria-pressed={selectedSkin === skin.id}
              disabled={skinSaving}
              onClick={() => changeSkin(skin.id)}
            >
              <span className="skin-choice__icon"><IconUserPlus size={24} /></span>
              <span className="skin-choice__info">
                <strong>{skin.name}</strong>
                <small>{skin.movement}</small>
              </span>
              <span className="skin-choice__status">
                {selectedSkin === skin.id ? "Actif" : "Choisir"}
              </span>
            </button>
          ))}
        </div>
        {skinSaving && <p className="skins-message" role="status">Enregistrement de ton skin...</p>}
        {skinError && <p className="sheet__error" role="alert">{skinError}</p>}
        <p className="skins-footnote">
          Chaque skin garde son animation d'origine : marche, defile ou danse.
          Messi reste statique car son fichier n'a pas d'animation.
          {session ? " Ton choix est conserve dans ton compte." : " Sans connexion, ton choix reste sur cet appareil."}
          {" "}Les themes et d'autres options arriveront ici plus tard.
        </p>
      </Sheet>

      <Sheet open={sheet === "login"} title="Login" onClose={close}>
        <AuthForm
          mode="login"
          onSubmit={async (pseudo, code) => {
            await login(pseudo, code);
            close();
          }}
        />
      </Sheet>

      <Sheet open={sheet === "signup"} title="Sign Up" onClose={close}>
        <AuthForm
          mode="signup"
          onSubmit={async (pseudo, code) => {
            await register(pseudo, code);
            close();
          }}
        />
      </Sheet>

      <Sheet open={sheet === "account"} title="Mon compte" onClose={close}>
        {session && (
          <>
            <p className="sheet__text">
              Pseudo : <strong>{session.pseudo}</strong>
              <br />
              Solde : <strong>{session.balance}</strong>
            </p>
            <button
              type="button"
              className="btn btn--glass btn--block"
              onClick={() => setSheet("logout")}
            >
              Se deconnecter
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={sheet === "logout"} title="Deconnexion" onClose={close}>
        <p className="sheet__text">
          Tu veux vraiment te deconnecter de ton compte ? Pour te reconnecter, il faudra ton pseudo et ton code a 10 chiffres.
        </p>
        <div className="confirm-actions">
          <button type="button" className="btn btn--glass" onClick={close}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              logout();
              close();
            }}
          >
            Oui, me deconnecter
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "coupons"} title="Coupons" onClose={close}>
        {session && <CouponForm onUser={updateUser} onAdmin={() => setSheet("admin")} />}
      </Sheet>
      {sheet === "admin" && session && <AdminPanel key={session.id} onClose={close} />}
      <Sheet open={sheet === "owner-commissions"} title="Mes commissions" onClose={close}>
        {session?.pseudo === '999' && <OwnerCommissionSummary key={session.id} />}
      </Sheet>
      <Sheet open={sheet === "history"} title="Historique" onClose={close}>
        {session && <AccountHistory key={session.id} />}
      </Sheet>
      <Sheet open={sheet === "withdrawal"} title="Retrait" onClose={close}>
        {session && <WithdrawalForm key={session.id} user={session} onUser={updateUser} onRecharge={() => setSheet("recharge")} />}
      </Sheet>
      <Sheet open={sheet === "recharge"} title="Recharger" onClose={close}>
        {session && <RechargeForm user={session} onUser={updateUser} />}
      </Sheet>
    </>
  );
}
